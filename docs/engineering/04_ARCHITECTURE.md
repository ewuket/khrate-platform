# 04 — Technical Architecture

## Guiding constraints (from the market, not fashion)

- Customers on **low-cost Android phones and weak/intermittent data** → thin clients,
  small payloads, offline tolerance, low JS/asset weight.
- **One small team must maintain web + Android + iOS + admin** → maximise shared code and
  a stack the team already knows.
- **Mobile Money, not cards.** Payment layer must be pluggable (manual/assisted at launch
  → MoMo API at scale) without touching business logic.
- **Kigali now, Africa later** → multi-zone, multi-currency-ready from the schema up.
- **Asset-light, low burn** → managed/boring infrastructure, no premature microservices.

## The stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Monorepo | npm workspaces + Turborepo | One repo, shared packages, fast CI. Team already uses this pattern. |
| Backend | **NestJS (TypeScript)** modular monolith, global prefix `/api/v1` | Proven, structured (services/DTOs/guards), one language across BE+web, matches team's existing skill set. Monolith not microservices — right for this stage. |
| Database | **PostgreSQL + Prisma** | Relational integrity for money/orders/state machines; Prisma migrations + type safety. |
| Cache/queue | **Redis** (BullMQ) | Deal cut-off jobs, notifications, refunds — needs reliable background jobs. |
| Web (customer + admin) | **Next.js (App Router) + Tailwind** | SSR for fast first paint on weak data; shared design tokens; PWA-capable. Admin is a separate Next app in the same repo. |
| Mobile (Android + iOS) | **Flutter** | One codebase → both platforms, genuinely native feel, good on low-end Android. A startup cannot afford separate Swift + Kotlin teams. Consumes the frozen V1 API as documented. |
| Shared | `packages/` — API types/contract, money utils, design tokens | Single source of truth shared by web, admin, and (mirrored) Flutter. |
| Auth | Phone-number + OTP (SMS/WhatsApp), JWT sessions | Rwanda reality: phone is the identity. Email optional. |
| Notifications | WhatsApp Business API + SMS fallback + push (FCM) | WhatsApp-first, as the growth loop demands. Pluggable provider. |
| Infra | Containerised (Docker); managed Postgres + Redis; single region to start | Boring, cheap, portable. No cloud lock-in in business logic. |
| Maps/geo | Zone-based (drop zones), not live tracking at launch | Density model doesn't need per-order GPS early; add later. |

Full rationale per decision in the [Decision Log](05_DECISION_LOG.md).

## Repository structure

```
khrate/
├── apps/
│   ├── api/        NestJS backend (domain services, Prisma, /api/v1)
│   ├── web/        Next.js customer web app
│   ├── admin/      Next.js internal operations platform
│   └── mobile/     Flutter customer app (Android + iOS)
├── packages/
│   ├── contract/   Shared API types / DTO contract (TS) — the frozen V1 surface
│   ├── money/      Integer-minor-unit money + currency helpers
│   └── tokens/     Design tokens (KHRATE orange brand) for web/admin
└── docs/           This documentation
```

## Cross-cutting rules (enforced, not aspirational)

- **Money is integer minor units** stored with its currency. RWF has **no minor unit**
  (1 RWF = 1 unit). No floats for money, ever. Lives in `packages/money`.
- **Business logic lives in services** (domain layer). Controllers are thin. Every input
  is a DTO with `class-validator`.
- **Every meaningful event is an append-only `TimelineEvent`** (order placed, deal tipped,
  refund issued, delivery confirmed) — this is the audit trail that powers ops,
  analytics, and fraud investigation.
- **The group-deal state machine is explicit** and lives in one service. State transitions
  are logged and, where money moves, transactional.
- **Payments are behind a `PaymentProvider` interface.** Launch = manual/assisted MoMo
  confirmation (proof upload + staff verify). Scale = MoMo Collection API. Business code
  never knows which is active.
- **Multi-zone / multi-currency ready:** `Zone` and `currency` are first-class; expansion
  is data, not code.

## Scaling path (deliberately deferred)

Monolith → extract high-load domains (catalogue reads, notifications) only when metrics
demand it. Read replicas before sharding. This is documented so future engineers know the
deferral is intentional, not an oversight.

## Security & privacy (summary; detail in security doc)

- Phone-OTP auth; JWT with short-lived access + refresh; role-based access control for the
  admin platform (least privilege — a driver ≠ a finance user ≠ an admin).
- PII (phone, address) access is role-gated and audited. Members can't see each other.
- No real customer data, no real payment credentials, no third-party contact in dev.
- All money movements and PII access are TimelineEvent-audited.
