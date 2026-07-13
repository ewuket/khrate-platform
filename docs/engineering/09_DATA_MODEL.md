# 09 — Data Model

The authoritative schema is [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma)
(heavily commented). This doc is the narrative map.

## Entity map

```
Zone ──< DropZone ──< GroupDeal ──< DealLine ──< OrderItem >── Order >── Customer
  │                       │            │                         │
  └── currency            │            ├─ Product / Bundle        ├── Payment
                          │                                       └── Delivery
                          └──< Order (group members)
TimelineEvent ── (Deal | Order) + actor   // append-only audit of everything
StaffUser (role)                          // internal ops, least privilege
OtpChallenge ── Customer                  // phone-OTP login
```

## Key ideas

- **Zone + DropZone** are the geography of the group model and the unit of expansion.
  A DropZone is a real place a bulk delivery goes (estate/office/campus/pickup/custom circle).
- **GroupDeal** carries the window (`openedAt`/`cutoffAt`), the threshold (`minUnits`/`minValue`,
  both null ⇒ always tips), visibility (PUBLIC zone deal / PRIVATE circle), an optional
  organiser, and the `DealState` lifecycle. Logic lives in
  [`deal-state-machine.ts`](../../apps/api/src/group-buying/deal-state-machine.ts).
- **DealLine** prices a product or bundle with both `groupPrice` and `soloPrice` (honest saving).
- **Order** is a member's participation (group) or a standalone solo purchase; **OrderItem**
  snapshots price and records fulfilment reality (`fulfilledQuantity`, `substitutionNote`).
- **Payment** is provider-agnostic (`PaymentMethod`), with HELD→CAPTURED / REFUNDED states
  matching the tip/fail flow.
- **Delivery** tracks the physical drop with its own state and driver assignment.
- **TimelineEvent** is append-only; every money movement, state change, and PII access
  writes one. It powers ops, analytics, and fraud investigation.

## Money

All monetary columns are `BigInt` **minor units** with a sibling `currency` string. RWF has
no minor unit. Formatting/arithmetic via [`@khrate/money`](../../packages/money/src/index.ts).

## Migrations

Prisma migrations under `apps/api/prisma/migrations` (created once a database is connected;
none applied yet — see roadmap).
