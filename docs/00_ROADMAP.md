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

## Phase 3 — Customer web (thin, fast)
- Next.js: zone selection, deal discovery, join a deal, cart, checkout (manual MoMo),
  order status, WhatsApp-share invite. Built on the design tokens (KHRATE orange).
- Works on weak data / low-end devices; PWA-capable. Now sits on **working** business
  capabilities (verified payment, packing, delivery) rather than stubs.

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
**Phase 0, 1 & 2 complete** (Phase 2 = admin/ops, resequenced ahead of customer web per
ADR-0012). The business can now be *operated*: staff sign in under least-privilege roles and
run the full day — create deals, verify MoMo payments, pull the procurement buy list, pack
orders (blocked until payment is verified), schedule and confirm deliveries, and read the few
metrics that matter — every mutation audited to a named actor. The customer-side engine
(OTP, discovery, join, cut-off tip/fail + auto-refund) remains green underneath.

The full operating-day loop was driven end-to-end this session over HTTP **and** through the
admin UI in a real browser against live Postgres. Nothing is deployed; no paid services, real
customer data, or real payment credentials are in use. **Next: Phase 3 — the customer web app**,
now built on working operational capabilities rather than stubs.
