# KHRATE

Grocery buying, **group buying**, and delivery platform for Kigali, Rwanda — built to grow
across Africa. Customers combine their orders into zone-based group deals that unlock better
prices and cheaper, denser delivery.

> **This is the moat:** pre-sell to a cut-off → procure against confirmed demand → deliver
> once in bulk to a drop point. Not "another online shop with a discount tab."

## Start here
- 📚 [Documentation index](docs/README.md)
- 🧭 [Vision & strategy](docs/product/01_VISION_AND_STRATEGY.md)
- 🔑 [The group-buying model](docs/product/03_GROUP_BUYING_MODEL.md)
- 🏗️ [Architecture](docs/engineering/04_ARCHITECTURE.md) · [Decision log](docs/engineering/05_DECISION_LOG.md)
- 🗺️ [Roadmap & current status](docs/00_ROADMAP.md)

## Repository layout
```
apps/     api (NestJS) · web (Next.js) · admin (Next.js) · mobile (Flutter)
packages/ money · contract · tokens
docs/     product · research · engineering · operations
```

## Develop
Requires Node ≥ 20, Docker (Postgres + Redis), Flutter (mobile).
```
npm install
docker compose up -d          # local Postgres + Redis (added in Phase 1)
npm run dev:api               # backend
npm run dev:web               # customer web
```

## Test what exists today
```
node --test packages/money/src/*.test.ts
node --test apps/api/src/group-buying/*.test.ts
```

## Ground rules
Money is integer minor units + currency (RWF has none). Business logic lives in services;
every meaningful event is an append-only `TimelineEvent`. No fake urgency/reviews/popularity.
No paid services, real customer data, or real payment credentials in this repo.
