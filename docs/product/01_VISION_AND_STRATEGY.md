# 01 — KHRATE Vision & Strategy

## What KHRATE is

KHRATE lets people in Kigali buy groceries online and receive them reliably, and
saves them money by **combining neighbours' orders into group buys** — so a whole
estate, office, or family circle effectively buys together at a better price with a
cheaper, denser delivery.

KHRATE is not "another online shop with a discount tab." Group buying is the product,
not a promotion.

## The one-sentence model

> Customers join a **group deal** for their location (estate, office, campus, or a
> private circle they create). Orders are collected until a **cut-off**. If the group
> reaches its threshold, KHRATE procures against confirmed demand and delivers **once,
> in bulk, to a single drop point**, where members collect or receive their share.

This is the "pre-sell then buy, deliver dense" model proven in China/Indonesia,
adapted to Kigali and stripped of the subsidy trap. See
[research](../research/02_GROUP_BUYING_RESEARCH.md).

## Why this wins in Kigali specifically

- **Mobile Money (MTN MoMo, Airtel Money) is near-universal** → digital payment without cards.
- **WhatsApp is how communities already coordinate** → the invite/share loop is native.
- **Collective buying is culturally familiar** (stokvel/ikimina savings-and-buying clubs)
  → we formalise a known behaviour, not import a strange one.
- **Kigali is dense and organised** (estates, gated communities, office parks, campuses)
  → natural, high-trust drop points.
- **On-demand doorstep delivery is unaffordable** for most → scheduled group delivery is
  both cheaper for KHRATE and cheaper for the customer.

## Who we serve first (in priority order)

1. **Estate / apartment communities** — a resident organiser, a WhatsApp group, a gate/lobby drop point.
2. **Offices** — colleagues ordering weekly staples to a reception drop.
3. **University communities** — price-sensitive, dense, socially connected.
4. **Family & friend circles** — private groups, one payer, split collection.

An individual can still buy solo ("Buy now, deliver to me") — but the app always
shows the cheaper group price to nudge toward the differentiated behaviour.

## How KHRATE makes money (unit economics, honestly)

Margin comes from **three real sources**, none of which is investor subsidy:

1. **Procurement spread.** Buying confirmed, aggregated volume from wholesalers/markets
   is cheaper per unit than a household buying retail. KHRATE keeps part of that spread;
   the customer sees the rest as the group price.
2. **Logistics efficiency.** One bulk drop to 20 households in an estate costs a fraction
   of 20 individual deliveries. This saving is structural and hard to copy.
3. **Reduced waste & working capital.** Because we buy only what's pre-sold, spoilage and
   dead stock approach zero on group-buy lines.

A modest **delivery/service fee** covers last-mile; a **solo-order premium** reflects the
higher cost of individual delivery. Group leaders earn a small commission or credit for
coordinating — funded out of the logistics saving they create, not out of thin air.

**We do not sell below cost.** Ever. (This is the lesson that killed Facily and half the
China players.)

## Non-negotiable principles (founder brief, encoded)

- No fake urgency, fake reviews, fake popularity, or misleading messages.
- Honest pricing: the customer always sees exactly what they pay and why the group price
  is lower.
- Fresh-produce reality is handled openly (weight variance, substitutions, availability),
  never hidden.
- Simple enough for a first-time digital shopper on a low-cost Android phone on weak data.

## Long-term direction (not built yet, but architected for)

- More Kigali neighbourhoods → secondary Rwandan cities → regional (EAC) → wider Africa.
- Adjacent **B2B micro-retail aggregation** (supplying kiosks/dukas) — a proven-profitable
  African direction (Sabi/Omnibiz) that reuses the same procurement + logistics engine.
- The architecture ([04](../engineering/04_ARCHITECTURE.md)) is multi-zone / multi-currency
  ready so expansion is configuration, not a rewrite.

## Biggest risks we are managing

| Risk | Mitigation |
|---|---|
| Cold-start (no groups, no density) | Seed a few estates/offices with a KHRATE-run group + a trusted organiser. Don't spread thin. |
| Fresh-produce quality/variance | Launch on shelf-stable staples + bundles; add fresh per-category with clear weight/substitution rules. |
| Fraud (leader payouts, fake collection, MoMo proof) | Operational controls + audit trail from day one (see admin/ops docs). |
| Payment friction | MoMo-first; assisted/manual confirmation acceptable for a controlled launch (see [08](08_PAYMENTS.md)). |
| Subsidy temptation | Board-level principle: growth from real savings only. |
