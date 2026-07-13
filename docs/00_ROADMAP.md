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

## Phase 1 — Backend core (next)
- NestJS app wiring: config, Prisma module, health check, `/api/v1` prefix.
- Phone-OTP auth (dev OTP stub; no SMS provider connected).
- Catalogue module (products, bundles) + seed script with clearly-labelled **sample data**.
- Group-buying module: create deal, join (place order), progress, and the scheduled
  **cut-off job** (Redis/BullMQ) that runs `decideTip` and drives CONFIRM/FAIL + refund.
- `PaymentProvider` interface + manual/assisted-MoMo implementation (proof + staff verify).
- API contract package (`packages/contract`) as the frozen V1 surface.
- Automated tests for the join→tip→confirm and join→fail→refund paths against a test DB.

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
**Phase 0 complete.** Nothing is deployed. No paid services, real customer data, or real
payment credentials are in use. Tested code: `@khrate/money`, deal state machine.
