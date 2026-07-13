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

## Phase 2 — Customer web (thin, fast)
- Next.js: zone selection, deal discovery, join a deal, cart, checkout (manual MoMo),
  order status, WhatsApp-share invite. Built on the design tokens (KHRATE orange).
- Works on weak data / low-end devices; PWA-capable.

## Phase 3 — Admin & ops platform
- Deal board, order/packing queue, payment review, delivery board, finance, catalogue,
  support — role-gated, audited. See [operations/10](operations/10_ADMIN_AND_OPS.md).

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
**Phase 0 & 1 complete.** The backend runs: a customer can log in by phone OTP, discover
zone deals, join a group deal, and the cut-off engine confirms winners and auto-refunds
failures — all against a live Postgres, all audited. Nothing is deployed. No paid services,
real customer data, or real payment credentials are in use. 17 unit tests + full HTTP e2e green.
**Next: Phase 2 — the customer web app.**
