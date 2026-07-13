# 03 — The KHRATE Group-Buying Model

This is the moat, defined precisely enough to build. It is the answer to every "how
should group buying work" question in the founder brief.

## Core concept: the Group Deal

A **Group Deal** is an offer of specific products at a **group price**, open for a
window of time, tied to a **drop zone** (a place a bulk delivery can go), that only
"tips" (confirms) if enough demand is collected before the **cut-off**.

```
Group Deal
├── Products & group prices (vs. solo prices)
├── Drop Zone (estate / office / campus / custom pickup point)
├── Window: opens_at → cutoff_at
├── Threshold: min_units or min_value to tip (may be 1 = always tips)
├── Organiser (optional): a member who coordinates & earns a small reward
└── State: OPEN → LOCKED → CONFIRMED → PROCURING → OUT_FOR_DELIVERY → FULFILLED
                     └────────────→ FAILED (threshold not met) → auto-refund
```

## The customer journey (happy path)

1. **Discover.** On opening the app, the customer sees group deals **for their zone**
   first ("Kimironko Estate — closes tonight 8pm"), plus curated bundles and solo shop.
2. **Join.** They add items at the group price. Their money is **authorised/held**, not
   captured, until the deal tips. (In the MoMo launch reality, see Payments — this may be
   pay-on-confirm.)
3. **Invite (optional, WhatsApp-first).** One tap shares a deep link to the deal. More
   members = more likely to tip = better for everyone. The share message is honest
   ("Join our Kimironko grocery group, closes 8pm") — no fake counts.
4. **Cut-off.** At `cutoff_at` the deal LOCKS. No new orders.
5. **Tip check.** If threshold met → **CONFIRMED**, payments captured, procurement begins.
   If not met → **FAILED**, all holds released / money refunded, everyone notified with a
   clear reason and an offer to roll into the next window.
6. **Procure → pack → deliver once** to the drop zone.
7. **Collect / receive.** Member confirms receipt (or organiser confirms group receipt).
8. **Resolve** any issue (missing/spoiled item) → partial refund or credit.

## Key design decisions (and why)

### Groups: both KHRATE-created and customer-created
- **KHRATE-created zone deals** solve cold-start and guarantee supply planning. This is
  the default the customer sees.
- **Customer-created private circles** (family/friends/colleagues) drive organic growth
  and trust. A customer creates a circle, invites via WhatsApp, everyone orders to one
  drop point.
- Public discovery is **zone-scoped**, not a global feed — you only see deals you can
  actually receive. This also protects privacy (you don't browse strangers' orders).

### Group leaders / organisers: yes, but lightweight and honest
- An organiser is optional. Where one exists (estate WhatsApp admin, office colleague),
  they get: a simple dashboard for their group, and a **modest reward** (delivery credit
  or small commission) **funded by the logistics saving their density creates** — never a
  subsidy. Rewards are transparent and capped to avoid the fraud incentives that sank
  Facily.
- KHRATE staff (a "Group-Buying Coordinator" role) can act as organiser for seeded zones.

### Location is central
- Every deal is tied to a **Drop Zone**. No zone → no group delivery. This is what makes
  the logistics cheap and is the unit of expansion.

### Privacy
- Members see the deal, the group price, progress toward threshold (as an honest
  fraction, e.g. "62% to unlock"), and *their own* order. They do **not** see other
  members' identities, contacts, or order contents. Organisers see names needed to
  coordinate collection only.

### Failed group purchases (must be flawless — this is where trust is won or lost)
- If a deal FAILS: automatic, immediate release of holds / refund; a plain-language
  notification ("Kimironko deal didn't reach enough orders tonight — you've been fully
  refunded. Want to join tomorrow's?"); and a one-tap roll-forward. No money is ever
  captured for a deal that didn't tip.

### Threshold can be 1
- Some deals (staple bundles) always tip. The same machinery handles "always-on group
  price for this zone" and "must reach 30 units to unlock this fresh-produce deal." One
  model, two configurations — no special cases in code.

## Pricing honesty (encoded as a rule)

Every group-priced item shows: **group price**, **solo price**, and the **saving**. The
saving must be *real* (derived from procurement + logistics economics), auditable in the
admin platform. No item may show a "saving" against an inflated fake reference price.

## Why this is hard to copy

An ordinary grocery-delivery app can add a "group discount" button, but it cannot cheaply
replicate: zone-based demand aggregation, pre-sell-then-procure supply, single-drop
logistics, an organiser trust network, and the operational muscle to run tip/fail/refund
reliably. The moat is the **operating system**, not the discount.

## Open founder-level questions (flagged, not blocking)

These are genuine founder decisions; the platform is being built to support either choice,
with a recommended default:
- Organiser reward structure (recommend: delivery credit, capped) — see Payments/Ops.
- Whether solo orders carry a small premium or a flat delivery fee (recommend: flat,
  transparent delivery fee; group delivery discounted for density).
- Refund default: instant MoMo refund vs. KHRATE wallet credit (recommend: customer
  choice, defaulting to instant refund for trust).
