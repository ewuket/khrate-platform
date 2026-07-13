# 07 — Fulfilment & Delivery Model

## Principle: density beats speed

KHRATE does **not** do on-demand doorstep delivery (Instacart/Ocado economics are
impossible here). It does **scheduled, pre-sold, single-drop group delivery**. One vehicle
serves one drop zone at one time — the cheapest possible last mile, and the structural
saving that funds the group price.

## The flow (group deal)

1. **Deal confirms (tips)** at cut-off → demand is now known and paid/held.
2. **Procurement** buys against confirmed demand (wholesalers/markets). Because it's
   pre-sold, spoilage and dead stock ≈ 0 on group lines. (Asset-light: no owned farms.)
3. **Packing & quality check** per member order; weight-sold items packed to nominal,
   variance recorded on the OrderItem (`fulfilledQuantity`), substitutions noted.
4. **One bulk drop** to the drop zone at the scheduled time.
5. **Collection / receipt:** members collect from the drop point (or organiser distributes);
   receipt is confirmed and logged. Solo orders get an individual drop (at a fee).
6. **Issue resolution:** missing/spoiled → partial refund or credit, recorded.

## Handling grocery reality (not hidden from customers)

- **Weight variance:** items sold by KG show nominal weight; the packed weight and any
  price adjustment are transparent.
- **Substitutions:** allowed only with a clear rule per product; the customer sees what was
  substituted and can decline (refund) — never a silent swap.
- **Availability:** if a market item is unavailable after tipping, the affected line is
  refunded, not quietly dropped.

## Delivery pricing (transparent)

- Group delivery: low flat fee per member (density makes it cheap).
- Solo delivery: higher fee reflecting true individual-drop cost.
- Fees always shown before payment. No hidden charges.

## Drivers & partners

- Drivers are staff (role `DRIVER`) or contracted partners; each delivery is assigned and
  its state tracked (SCHEDULED → PACKED → OUT_FOR_DELIVERY → DELIVERED → COLLECTED).
- Failed deliveries are a first-class state with a reason and a customer-comms step.
- No live GPS at launch (ADR-0007); WhatsApp status updates cover customer expectation.

## What can go wrong (and where it's handled)

| Failure | Handling |
|---|---|
| Deal doesn't tip | Auto refund/release, roll-forward offer (state machine). |
| Item unavailable post-tip | Line refunded, customer notified. |
| Weight short | Adjust price / partial refund, recorded on OrderItem. |
| Customer doesn't collect | Delivery FAILED state, support follow-up, restock/credit policy (founder policy TBD). |
| Payment unverified | Order held by Payment Reviewer; not packed until resolved. |
