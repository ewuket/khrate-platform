# 10 — Admin & Operations Platform

The internal system KHRATE actually runs on. Not a screenshot dashboard — the tool that
lets staff operate the business with accountability and least privilege.

## The operating day (the workflow the tools serve)

A grocery group-buying business runs on a daily rhythm. Each numbered step maps to a tool
surface below — the software exists to make this loop fast, accountable, and hard to get wrong.

**Evening (deal day):**
1. ~20:00 — deals hit cut-off. The engine tips or fails each one automatically.
   Coordinator reviews outcomes on the **Deal board**; failed deals auto-refund and the
   coordinator schedules the roll-forward deal for tomorrow.
2. Payment Reviewer clears the **verification queue** (manual MoMo refs/proofs) so
   confirmed demand = verified money before anything is bought.

**Early morning (fulfilment day):**
3. Coordinator exports the **procurement list** per confirmed deal (aggregated quantities
   across all orders — this is the buy list for the wholesaler/market run).
4. Goods arrive; **Order Ops** works the packing queue: per-order pick lists, records
   actual weights (`fulfilledQuantity`) and substitutions, quality check, mark READY.
5. **Delivery Coordinator** schedules the drop runs (one vehicle → one location), assigns
   drivers, prints/loads manifests.

**Midday/afternoon:**
6. Driver delivers to the drop point; collection/receipt confirmed (order → COLLECTED).
7. **Support** handles issues (missing/short/spoiled) → refund request → **Finance** approves
   (never the requester) → policy-driven refund executes.

**Weekly:** Leadership reviews the handful of metrics that matter (tip rate, density,
realised saving, waste/refund rates, contribution margin) and adjusts pricing rules,
thresholds, and zones — all as configuration, no deploys.

## Roles (least privilege — see `StaffRole` in schema)

| Role | Can do | Cannot do |
|---|---|---|
| ADMIN | Everything, incl. staff management | — |
| CATALOGUE_MANAGER | Products, bundles, prices, images | Payments, refunds, deliveries |
| GROUP_COORDINATOR | Create/seed & run group deals, set thresholds, act as organiser for seeded zones | Verify payments, issue refunds |
| ORDER_OPS | Order preparation, packing, record substitutions/weights | Prices, refunds |
| PAYMENT_REVIEWER | Verify MoMo payments/proofs, flag suspicious | Change prices, issue refunds |
| FINANCE | Refunds, organiser payouts, financial reports | Edit catalogue |
| DELIVERY_COORDINATOR | Assign drivers, schedule drops, track deliveries | Payments |
| SUPPORT | View orders, handle complaints, initiate refund requests | Approve own refunds |
| DRIVER | See assigned deliveries, confirm receipt | Everything else |

Every sensitive action (refund, price change, PII access, payout) writes a TimelineEvent
with the actor. This is the audit backbone.

## Core operational surfaces (build priority)

1. **Deal board (Group Coordinator).** Live deals, progress-to-tip, cut-off countdowns,
   tip/fail outcomes, and a control to seed a new zone deal. The nerve centre of the moat.
2. **Order & packing queue (Order Ops).** Per confirmed deal: pick/pack lists, weight &
   substitution capture, quality check.
3. **Payment review (Payment Reviewer).** Queue of pending MoMo verifications with proof;
   approve/reject with reason.
4. **Delivery board (Delivery Coordinator).** Drop schedule by zone, driver assignment,
   delivery/collection confirmation, failed-delivery handling.
5. **Finance (Finance).** Refunds, organiser payouts (capped/transparent), reconciliation.
6. **Catalogue (Catalogue Manager).** Products (sale unit, fresh flag, weight), bundles,
   honest solo/group pricing.
7. **Support (Support).** Customer lookup, order history, complaint → refund request.
8. **Leadership view (Admin).** The few metrics that matter (below), not vanity dashboards.

## Metrics that actually matter (data & BI)

Deliberately short — no dashboards for their own sake:
- **Tip rate** (% of deals that reach threshold) — the health of the moat.
- **Density** (avg orders per drop) — the source of the logistics saving.
- **Realised saving** (group vs solo, audited) — proves the value is real, not fake.
- **Waste / substitution / refund rates** — grocery-operations health.
- **Retention & repeat rate** — did group buying create a habit?
- **Contribution margin per deal** — are we making money without subsidy?

## Operational guardrails encoded

- No one approves their own refund (SUPPORT requests → FINANCE approves).
- Payment never auto-trusted at manual stage.
- Organiser rewards capped and visible.
- Orders can't be packed before payment is verified.
