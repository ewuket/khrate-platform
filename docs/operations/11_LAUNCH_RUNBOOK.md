# 11 — Launch Runbook: Deployment, Recovery & Pilot Operations

The practical manual for running KHRATE as a real service during the controlled Kigali
pilot. Written for a small team on a single-host deployment; every procedure was designed
to be executable by one person under stress. Scaling paths are noted at the end.

---

## 1. Deployment (single host, controlled pilot)

**Shape:** one Linux host (or one cloud VM) running Docker Compose: the API container +
Postgres, with a TLS reverse proxy (Caddy recommended — automatic HTTPS) in front. The
customer web and admin apps deploy to any static/Node host (e.g. the same box behind the
proxy). Nothing else. No Kubernetes, no queues, no managed extras until volume demands them.

**First deployment:**
1. Copy the repo to the server (`git clone` from the private GitHub repo).
2. `cp apps/api/.env.production.example .env.production` and fill every value
   (`openssl rand -base64 48` for `JWT_SECRET`). Never commit this file.
3. `cp docker-compose.prod.example.yml docker-compose.prod.yml`.
4. `docker compose -f docker-compose.prod.yml up -d --build`.
5. Verify: `curl localhost:3001/api/v1/health` → `{"status":"ok","db":"up"}`.
6. Point the TLS proxy at `127.0.0.1:3001`; verify HTTPS from a phone on mobile data.
7. Seed **real** staff accounts (see §7) and disable/replace all `[SAMPLE]` data.

**Builder resources:** the API image install (`npm ci`) needs a Docker builder with **≥ 4 GB
memory**. On an under-provisioned Docker VM npm can crash with "Exit handler never called!"
(observed locally with a 2 GB Docker Desktop VM). Raise Docker Desktop → Settings →
Resources → Memory to 4–6 GB, or build on the server/CI where memory is adequate. The
Dockerfile itself is verified: the identical `npm ci → prisma generate → nest build` sequence
runs cleanly on the host in seconds.

**Releases:** `git pull && docker compose -f docker-compose.prod.yml up -d --build`.
The container runs `prisma migrate deploy` on start — only committed migrations run, so a
release is exactly what was tested in git. Deploy during the mid-morning lull (after
cut-off processing, before packing), never during the 19:00–21:00 cut-off window.

**Rollback:** every release is a git commit.
1. `git checkout <last-good-commit>`;
2. `docker compose -f docker-compose.prod.yml up -d --build`.
Migrations are additive-only by policy (see engineering/35), so the previous app version
always runs against the newer schema. If a migration itself misbehaved, restore the
pre-release backup (§2) — that is the true rollback of data.

**The API refuses to boot in production** with a default JWT secret, missing DB URL, or
missing CORS allow-list — if it exits immediately, check `.env.production`.

## 2. Backups & restore

- **Automatic:** cron on the host — `15 2 * * * /srv/khrate/scripts/db-backup.sh khrate-db-1 /srv/khrate/backups`
  (02:15, after the evening cut-off and refunds settle). 14-day retention built in.
- **Before every release:** run the backup script manually.
- **Off-host copy (required):** sync `/srv/khrate/backups` daily to a second location
  (object storage or a second machine). A backup on the same disk is not a backup.
- **Restore:** `./scripts/db-restore.sh <dumpfile>` (asks for confirmation; destructive).
  After restore verify: health endpoint, a staff login, the deal board, and
  `GET /admin/reports/reconciliation` → `clean: true`.
- **Test the restore quarterly.** An untested backup is a hope, not a plan. (The
  round-trip was tested during Phase 6 — backup → restore → verified.)

## 3. Health, monitoring & alerts (pilot-scale)

- **Health:** `GET /api/v1/health` is DB-aware. The Docker HEALTHCHECK hits it every 30s.
- **Uptime alert:** point any free uptime monitor (or a cron + curl on a second machine) at
  `https://<api-host>/api/v1/health`; alert to the ops WhatsApp group on failure. External
  account creation (e.g. UptimeRobot) = founder approval first.
- **Logs:** the API writes one structured line per request (JSON in production: method,
  path, status, duration, IP — never bodies). `docker compose logs -f api` is the pilot
  log view; `grep '"status":5'` finds server errors.
- **Daily ops glance (2 minutes):** health OK → payment queue drained → reconciliation
  `clean: true` → yesterday's backup file exists and is non-trivial in size.

## 4. Incident response

**Severity ladder:** S1 = customers cannot pay/order, or money is wrong. S2 = a staff
surface is down but orders flow. S3 = cosmetic/deferable.

**S1 playbook:**
1. Announce in the ops WhatsApp group ("incident, I'm on it") — one person leads.
2. `docker compose ps` + `docker compose logs --tail 200 api` — is it the app, DB, or host?
3. App crash-looping → `git checkout <last-good>` + rebuild (§1 rollback).
4. Data looks wrong → **stop taking orders** (deactivate deals via the deal board), fix,
   reconcile (§6), reopen.
5. Never fix money records by hand-editing the DB in the moment. Record what happened; use
   the refund flow and the audit trail; correct root causes in code.
6. Afterwards: a short written post-mortem in `operations/incidents/` — what broke, why,
   what changed so it can't repeat.

**Customer communication during S1:** the support number posts a brief honest note to
affected customers ("payment confirmations are delayed ~1h; your money and spot are safe").
Silence, not the outage, is what destroys trust.

## 5. Payment review & refund safeguards (enforced by the platform)

- Payments are **never auto-trusted**: a PAYMENT_REVIEWER must verify each MoMo reference
  against the statement. Orders cannot be packed until payment is CAPTURED (server-enforced).
- **Refunds are FINANCE-only** with a mandatory written reason; both land in the audit
  trail under the named actor. Support raises requests; Finance executes — two pairs of
  eyes on every outbound franc.
- Refund destination (MoMo vs wallet credit) follows the configurable policy; changes to
  the policy are themselves audited (`POLICY_CHANGED`).

## 6. Reconciliation (Finance, daily)

`GET /api/v1/admin/reports/reconciliation` checks three invariants:
1. every CAPTURED payment equals its order total;
2. no order is being fulfilled without captured money;
3. no refunded payment sits on a live order.
Run it after the evening cut-off and after any incident. Anything non-empty gets resolved
**today** — small books stay clean only if kept clean daily. Cross-check the MoMo statement
balance against the day's CAPTURED total from the reports screen.

## 7. Staff accounts, onboarding & recovery

- **Least privilege:** give each person exactly one role (the platform enforces the rest).
  New packer → ORDER_OPS only. Never share accounts; the audit trail must mean something.
- **Onboarding:** create the account (ADMIN), have them log in and change the password on
  day one, walk their single surface (deal board / payment queue / packing / deliveries),
  and show them §4 severity rules.
- **Offboarding:** deactivate the account (`isActive=false`) the same day access ends.
- **Admin recovery:** if the only ADMIN is locked out, reset from the host (this is why
  host access itself must be limited to the founder + one trusted engineer):
  `docker exec -it <db> psql -U khrate -d khrate` then update the admin's `passwordHash`
  with a scrypt hash generated by `node -e` using the API's `passwords.ts` logic — the
  exact command is documented in `scripts/` comments. Rotate it immediately after login.
- Passwords: 12+ chars; the login endpoint doesn't leak which emails exist; staff JWTs
  expire in 12h. Sessions are stateless — force-expiry = rotate `JWT_SECRET` (logs out
  everyone; acceptable at pilot scale).

## 8. Launch checklist (go/no-go)

Technical — all must be true:
- [ ] `.env.production` filled; API boots (fail-fast passes); HTTPS live end-to-end.
- [ ] Real MoMo till/merchant number configured (replaces `[SAMPLE]`) — **founder input**.
- [ ] Real support WhatsApp number configured (replaces `[SAMPLE]`) — **founder input**.
- [ ] All `[SAMPLE]` catalogue/zone/deal data replaced with real Kigali data.
- [ ] Real staff accounts created; dev accounts (`*@khrate.local`) deactivated.
- [ ] Backup cron running; one restore drill completed on the server.
- [ ] Uptime alert live to the ops WhatsApp group.
- [ ] Reconciliation returns `clean: true` on the eve of launch.

Operational:
- [ ] One named person per role for launch week (coordinator, reviewer, packer, delivery,
      finance, support) — one person may hold several hats, but each hat is named.
- [ ] Drop-point agreement confirmed (Kimironko pilot location, time window, contact).
- [ ] Wholesaler/procurement contact confirmed for the pilot SKUs.
- [ ] Founder has approved the pilot pricing rules and refund default in Settings.

## 9. Controlled pilot procedure (recommended shape)

- **Scope:** ONE zone (Kimironko), ONE drop point, 3–5 staple SKUs, ~2 deals/day,
  20–50 known customers (staff networks + estate WhatsApp group).
- **Cadence:** deals open in the morning, cut off 20:00, procurement at dawn, delivery to
  the drop point midday, collection window 17:00–19:00.
- **Measure daily (already in Reports):** tip rate, participants/deal, realised saving,
  refunds, payment-verification lag, collection no-shows.
- **Kill criteria:** tip rate <40% after 2 weeks → thresholds/pricing wrong — pause and
  re-price rather than subsidise silently. Verification lag >3h median → the manual MoMo
  flow needs another reviewer or the MoMo API integration gets prioritised.
- **Exit criteria to expand (zone #2):** 4 consecutive weeks of ≥60% tip rate, <5% refund
  rate, and contribution-positive unit economics on the pilot's own numbers.

## 10. Customer support operating guide

- Channel: WhatsApp (the configured support number). Tone: plain, warm, honest.
- **Payment not confirmed yet** → check the reviewer queue first; typical answer: "a person
  confirms every payment; yours is in the queue — your spot is reserved."
- **Missing/short/spoiled item** → apologise, raise a refund request to Finance with the
  order id; Finance refunds with reason (policy default destination). Target: same day.
- **Deal failed** → the refund is automatic; point them to the order screen; invite them to
  tomorrow's deal.
- Every complaint that recurs twice becomes a line in the ops review — support is the
  cheapest product-research KHRATE has.

## 11. Data privacy & retention (pilot policy)

- **We hold:** phone numbers, names (optional), orders, payment references, delivery
  locations, staff accounts, audit events. **We do not hold:** MoMo PINs, card data,
  passwords for customers (OTP-only), precise GPS traces.
- Customer data is used to fulfil orders and support customers — nothing else during the
  pilot; no data is sold or shared with third parties.
- Access is role-gated; every staff read/write surface is authenticated and audited.
- OTP codes are stored hashed and expire in 5 minutes; consumed challenges are inert.
- **Retention:** operational data is kept while the account is active. On a verified
  deletion request: personal fields are anonymised (phone → tombstone) while money records
  and audit events are preserved in anonymised form (bookkeeping integrity). Backups age
  out on the 14-day cycle.
- When Rwanda DPO registration / formal DPIA is needed for scale-up, that is a
  founder-level legal step (Law No. 058/2021 on personal data protection).

## 12. Scaling path (when the pilot outgrows this)

In order, each step only when a real limit is hit: managed Postgres (backups/failover
outsourced) → second API instance behind the proxy (stateless already; throttle store
moves to Redis) → move cut-off scheduling from polling to BullMQ on the existing Redis →
object storage for payment-proof images → observability stack. None of this is needed to
serve the first thousands of orders.
