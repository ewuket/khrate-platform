# 00 — Roadmap, Phasing & Current Status

Honest build order. Each phase leaves a *genuinely working* increment, not disconnected
screens. Status is updated as work lands.

## Phase 0 — Foundation & decisions ✅ (done this session)
- Repo, monorepo layout, `.gitignore`, git initialised.
- Full business/product/research/architecture documentation (this `docs/` tree).
- Group-buying model defined precisely enough to build.
- `@khrate/money` package (integer minor units) — **tested, passing**.
- Prisma domain schema (zones, catalogue, group deals, orders, payments, delivery, audit, staff).
- Group-deal **state machine** (tip/fail/threshold/transitions) as pure logic — **tested, passing (7 tests)**.

## Phase 1 — Backend core ✅ (done)
- NestJS app wiring: config, global Prisma module, health check (DB-aware), `/api/v1` prefix,
  whitelist ValidationPipe, BigInt-safe JSON — **boots, health green**.
- Phone-OTP auth (dev returns code; no SMS/WhatsApp provider connected) — **verified over HTTP**.
- Catalogue module (zone deal discovery with honest savings, products, bundles) + seed with
  clearly-labelled **[SAMPLE]** data — **verified over HTTP**.
- Group-buying module: join (place order), honest progress, and the scheduled **cut-off
  sweep** that runs `decideTip` and drives CONFIRM / FAIL + auto-refund — **all paths
  verified against a live Postgres**: tip→confirm, fail→refund (order+payment REFUNDED,
  audit event, configurable trust-first MoMo default).
- Pluggable **PaymentProvider** interface + manual-MoMo launch provider + config-selected
  registry (ADR-0008) — verified.
- Configurable **pricing engine** (ADR-0010) and **policy-driven refunds** (ADR-0011) —
  unit-tested + exercised live (free-delivery threshold and group drop-point fee both fired).
- Generalized **multi-strategy fulfilment** (ADR-0009): FulfilmentMode + Location + Address.
- Tests: 17 unit tests passing (money, state machine, pricing/refund); full HTTP e2e of
  discovery, OTP, join, tip, fail-refund.

Deferred within Phase 1 (small, non-blocking): move cut-off from a 60s poll to Redis/BullMQ
per-deal jobs; `packages/contract` extraction; SMS/WhatsApp OTP delivery provider; staff
JWT + RBAC guards on admin/staff endpoints (endpoints exist; guard layer lands with Phase 3
admin). These are logged here so they are not forgotten.

## Phase 2 — Admin & ops platform ✅ (done — RESEQUENCED ahead of customer web per ADR-0012)
Founder call: build the tools KHRATE operates on before the customer surface, because
KHRATE is an operations business. The internal platform now covers the full operating day
(docs/operations/10):
- **Staff auth + RBAC**: email+password (scrypt, no dependency), staff JWT, `StaffGuard` +
  `@Roles` least-privilege guards. 9 sample staff, one per role — **verified**: packer gets
  403 on the deal board, anonymous gets 401.
- **Deal board** (coordinator): live progress-to-tip, cut-off, demand; **create deal** with
  the honest-pricing guardrail (groupPrice ≤ soloPrice enforced server-side — **verified 400**).
- **Procurement list**: aggregated, bundle-exploded, pre-sold buy list per confirmed deal.
- **Payment review** (reviewer): manual-MoMo verification queue; verifying flips PENDING→
  CAPTURED with the reviewer recorded as audit actor — **verified in the browser** (queue
  2→1) and in the DB (`verifiedById` set, `PAYMENT_VERIFIED` actor = staff id, not system).
- **Packing** (order ops): per-order pick lists, record actual quantity/substitution,
  PREPARING→READY — with the guardrail that an **unverified order cannot be packed**
  (**verified 400**).
- **Deliveries** (coordinator + driver): schedule runs; drivers see only their own
  assignments; state through to COLLECTED syncs the order — **verified** driver-scoped view
  + collection.
- **Catalogue** (catalogue mgr), **Reports** (finance: tip rate, realised saving, money
  states), **Settings** (admin: configurable refund default + pricing rules, audited).
- Next.js admin app (12 routes, all <90 kB first load) on KHRATE orange tokens — **builds,
  driven live in-browser**.

## Phase 3 — Customer web ✅ (done)
`apps/web` (Next.js, KHRATE orange, phone-first, ~90 kB first load). Complete connected
journeys against the real backend (ADR-0013, ADR-0014):
- **Landing → location → shop**: 5-second pitch, real zone/drop-point picker, deal list with
  honest inline progress ("be the first to join", never fake counts).
- **Deal → join**: quantity steppers, refund reassurance, drop-point choice, live total.
  Selection survives the sign-in bounce (sessionStorage).
- **Phone-OTP sign-in**: two calm steps; dev code surfaced (clearly labelled), never in prod.
  Join requires the JWT — `customerId` never comes from the body.
- **Checkout**: manual-MoMo instructions + reference capture. No fake "instant" confirmation.
- **Order tracking**: operational states translated to a 6-stage plain-language timeline;
  WhatsApp share appears while the group is gathering.

**Verified end-to-end in a real mobile browser (375×812) against live Postgres**, and
cross-checked in the backend + admin: landing → pick Kigali → open deal → add items
(RWF total correct) → OTP sign-in → join (real order created) → MoMo checkout → submit
reference → tracking shows "confirming payment". The order then appeared in the admin
Payment Review queue with the **exact reference typed in the browser**; a reviewer verified
it; the customer's tracking advanced to "gathering the group" and the shop honestly showed
the deal unlocked (1 real participant, 100%). Full audit trail attributes each action to the
customer or the named reviewer.

## Phase 4 — Flutter mobile (Android-first, then iOS)
- Consumes the frozen V1 API. Native feel, offline tolerance, push (FCM), WhatsApp share.

## Phase 5 — Hardening & launch prep
- Security review, load sanity, monitoring, backups, runbooks.
- Founder-gated external actions prepared but NOT executed (MoMo merchant onboarding,
  WhatsApp Business API, hosting, app-store publishing).

## What is deliberately NOT being built yet
- Live GPS tracking (ADR-0007), automated MoMo API (needs founder agreement), B2B
  micro-retail aggregation (future adjacency), microservices (premature).

## Founder decisions outstanding (do not block current work)
1. Approve pursuing MTN MoMo / Airtel merchant agreements (long lead time).
2. Refund default (instant vs wallet credit) — recommend both, default instant.
3. Delivery-fee policy (flat fee vs solo premium) — recommend flat, transparent.
4. Organiser reward structure — recommend capped delivery credit.
See [08 Payments](product/08_PAYMENTS.md) and [03 Model](product/03_GROUP_BUYING_MODEL.md).

## Current status snapshot
**Phases 0–3 complete.** KHRATE now has a working three-surface platform on one API:
- **Customer web** — discover → join a group deal → pay by MoMo → track the order.
- **Admin/ops** — the full operating day: deal board, payment verification, procurement,
  packing, deliveries, reports, configurable policies.
- **Backend** — group-buying engine (tip/fail + auto-refund), pluggable payments,
  configurable pricing/refunds, phone-OTP + staff RBAC, append-only audit.

A single customer journey was driven through a **real mobile browser** and followed all the
way into the **admin platform and database**: the order a customer placed on the web showed
up in the staff payment queue with the reference they typed, a reviewer verified it, and the
customer's tracking advanced — every step audited to a named actor. Nothing is deployed; no
paid services, real customer data, or real payment credentials are in use.

**Next: Phase 4 — Flutter mobile (Android-first, then iOS)** on the same frozen V1 API.
