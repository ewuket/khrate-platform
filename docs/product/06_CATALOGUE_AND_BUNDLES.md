# 06 — Grocery Catalogue & Bundles

## Grocery ≠ ordinary e-commerce

Products vary in weight, quality, availability, season, and price. The model handles this
openly rather than pretending groceries are SKUs on a shelf.

## Products

Each product has a **sale unit** that drives the buying UX (see `SaleUnit` in schema):
- `EACH` — sold individually (a tin, a loaf).
- `KG` — sold by weight; shows nominal grams, packed weight & any adjustment transparent.
- `BUNCH` / `PACK` — natural grocery groupings.
- `isFresh` flags produce that needs weight/substitution/availability handling.

Categories launch shelf-stable-first (rice, oil, flour, sugar, packaged goods), then fresh
per-category as operations mature — the [research](../research/02_GROUP_BUYING_RESEARCH.md)
lesson from Indonesia (Super).

## Bundles — curated convenience

A **Bundle** is a fixed set of products for a need: *Family Weekly*, *Student Starter*,
*Office Pantry*, *Budget Basket*. Bundles:
- Make the first purchase effortless (no decision fatigue for a first-time digital shopper).
- Are ideal group-deal lines — one bundle, many households, easy to procure in volume.
- Have transparent contents; substitutions follow the same open rule as products.
- Are managed by the Catalogue Manager; contents/prices versioned via normal edits.

## Pricing honesty (enforced)

Every group-priced line stores both **groupPrice** and **soloPrice**; the displayed saving
is derived and auditable. A "saving" must reflect real procurement/logistics economics —
never an inflated fake reference price. This is a brand principle, not a UI nicety.

## Discovery (kept simple)

Customer sees, in order: **group deals for their zone** → **bundles** → **solo shop**.
No overcrowded storefront, no fake urgency counters, no fake popularity. Search and a small
set of clear categories. The cheaper group price is always visible next to the solo price
to nudge the differentiated behaviour honestly.
