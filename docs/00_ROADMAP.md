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

## Phase 4 — Flutter mobile (Android-first, then iOS) ✅ (code complete; device builds pending SDKs)
One shared Flutter app (apps/mobile) on the frozen V1 API — see
[engineering/34](engineering/34_MOBILE_ARCHITECTURE.md), ADR-0014, ADR-0015.
- **Journeys built & wired to the real backend:** onboarding, location pick, deal discovery
  (honest progress), deal detail + item/drop-point selection, phone-OTP sign-in (basket
  preserved), manual-MoMo checkout + reference submission, live order tracking, WhatsApp
  invite/support (url_launcher).
- **Resilience:** Dio auth/timeout/retry interceptors; offline banner; **idempotent join**
  (ADR-0015) so a dropped connection can't create a duplicate order/payment.
- **Verified — and stated precisely (no overclaiming):**
  - Shared Flutter code **compiled**: `flutter analyze` clean; `flutter build web --release` ✓.
  - App **tested via web build**: rendered in a mobile-viewport browser (splash confirmed).
  - **Integration/widget tests against the real backend: 3/3 pass** — data layer, full
    journey (OTP→join→idempotent retry→payment-ref→tracked), LocationScreen live render.
  - **Cross-system:** app-created order appeared in the admin Payment Review queue (correct
    amount/reference); retried join produced **zero** duplicates (DB-confirmed, 1 order/key).
- **NOT done (environment limits, reported honestly):** Android build/emulator/device — **not
  possible here, no Android SDK** (`flutter doctor` Android ✗, no APK). iOS build/simulator/
  device — **not performed**, Xcode toolchain incomplete. Push (FCM/APNs), per-platform
  deep-link registration, and store signing are prepared in design but need founder-gated
  services.

## Phase 5 — Mobile device builds + launch hardening ✅ (Android on emulator; iOS pending Xcode)
See [engineering/35](engineering/35_DEVICE_SETUP_AND_HARDENING.md), ADR-0016/0017/0018.
- **Android toolchain provisioned** (JDK 17 + Google cmdline tools, SDK 35/36, emulator,
  arm64 image, mid-range AVD) — `flutter doctor` Android ✓.
- **Android debug APK produced** and **run on an emulator**; the **full customer journey was
  tested on-device** against the real local backend: location → discovery → deal → OTP login
  → join → MoMo reference → tracking. Cross-checked in the **admin Payment Review queue**.
- **On-device found & fixed 2 real bugs:** a 47px row overflow (→ `Wrap`) and a reopen-shows-
  onboarding race (→ splash awaits persisted state). Verified fixed on-device.
- **Weak-connectivity** (offline banner + auto-recover), **app recovery** (reopen keeps zone +
  session), **rotation** — all verified on the emulator.
- **iOS:** shared code compiles, but **no Xcode → no iOS build/simulator/device testing.**
  Manual setup steps documented (engineering/35).
- **Hardening:** OTP throttle (anti SMS-bomb/enumeration), `helmet` security headers,
  config-driven CORS, debug-only cleartext. Dependency audit triaged (0 critical; highs are
  non-reachable/build-time). Backend 12/12 tests pass; web+admin+API build clean; Flutter 3/3.
- **NOT done:** physical devices, iOS anything, FCM/APNs accounts, real MoMo/support numbers,
  store publishing — all founder/external-gated.

## Phase 6 — Pre-launch operations & deployment prep ✅ (launch pack done; iOS still blocked on Xcode)
Launch hardening + deployment groundwork (ADR-0019, operations/11 runbook):
- **Backend hardening:** production fail-fast config guard (refuses to boot on default
  secret / missing DB URL / missing CORS), per-IP rate limiting (@nestjs/throttler), JSON
  structured request logging (no bodies), **FINANCE-only audited refunds** (mandatory
  reason), and a **reconciliation** endpoint (money-invariant checks). All verified live.
- **Deployment prep:** multi-stage **non-root API Dockerfile** (standalone, reproducible via
  a committed api-scoped lockfile), `.dockerignore`, production compose example (DB never
  exposed, loopback-only API behind a TLS proxy), production `.env` template, and **tested
  backup + restore scripts** (14-day retention; backup→restore→verify round-trip run live).
- **Launch runbook (operations/11):** deploy/rollback, backups, health/monitoring, incident
  response, refund/reconciliation procedures, staff onboarding + admin recovery, launch
  checklist, controlled-pilot plan, support guide, data-retention/privacy.
- **iOS: genuinely attempted, environment-blocked.** Full Xcode is not installed on this
  machine (no `Xcode.app`, `xcode-select` → CommandLineTools, no `simctl`/simulators,
  CocoaPods absent). iOS ATS config for local dev was added and the project is build-ready,
  but **no iOS build was produced and nothing ran on a simulator.** Requires a manual Xcode
  install (App Store, ~15–40 GB, founder action) — exact steps in the Phase 6 report.
- **Container build:** attempted 6× locally; blocked by this machine's under-resourced Docker
  VM (npm crash at 279s vs 6s on host). Dockerfile logic verified on the host; needs a
  builder with ≥4 GB memory (runbook §1).
- Founder-gated externals still prepared but NOT executed (MoMo merchant onboarding, push
  service accounts, hosting, app-store publishing).

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
**Phases 0–6 complete.** KHRATE spans four surfaces on one API. The mobile app is built and
**tested on an Android emulator** end-to-end against the real backend; the platform has a
launch-hardening pass, a deployment/backup toolchain, and a full operations runbook. **iOS
build + simulator testing remain genuinely undone** — full Xcode is not installed on this
machine (manual founder step). Precise per-platform testing vocabulary and the security
review are in engineering/35; the launch runbook is operations/11.

Verification this phase (all green unless noted): backend 12/12 unit tests + build; customer
web + admin builds ✓; Flutter analyze clean + 3/3 integration tests vs live backend; Android
debug APK builds; backup→restore round-trip + reconciliation `clean`. **Not done:** iOS build/
simulator (no Xcode); local container image (Docker VM under-resourced — Dockerfile verified
on host).

_(Earlier snapshot — still true:)_
**Phases 0–4 complete.** KHRATE spans four surfaces on one API:
- **Customer web** — discover → join a group deal → pay by MoMo → track the order.
- **Admin/ops** — the full operating day: deal board, payment verification, procurement,
  packing, deliveries, reports, configurable policies.
- **Backend** — group-buying engine (tip/fail + auto-refund), pluggable payments,
  configurable pricing/refunds, idempotent orders, phone-OTP + staff RBAC, append-only audit.
  12/12 unit tests pass; builds clean.
- **Mobile (Flutter)** — one shared codebase for Android + iOS. Journeys built and verified
  against the real backend via **web build + integration/widget tests (3/3)**; an
  app-created order surfaced in the **admin Payment Review queue** with the right amount and
  reference, and a retried join produced **zero duplicates** (DB-confirmed).

**Precise limits (no overclaiming):** the mobile app's shared code was **compiled** and
**tested via its web build and Dart tests against the live backend**. It was **not** built
for or run on Android (no Android SDK — `flutter doctor` Android ✗) or iOS (Xcode toolchain
incomplete). No APK/IPA produced; no emulator/simulator/physical-device testing.

Nothing is deployed; no paid services, real customer data, or real payment credentials in use.

**Next: Phase 7 — iOS build-out once Xcode is installed (simulator journey testing), then
physical-device passes on both platforms and the founder-gated launch steps (real MoMo/
support numbers, hosting on a ≥4 GB host, push accounts).**

_(Superseded planning note from Phase 4:)_
**Next: Phase 5 — Android/iOS device build-out (install Android SDK + Xcode, produce signed
builds, emulator/simulator + physical-device testing, FCM/APNs push), then hardening &
launch prep.**
