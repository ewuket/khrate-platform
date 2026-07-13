# 08 — Payments

## Rwanda reality

Cards are rare; **Mobile Money is the norm** — MTN MoMo (dominant) and Airtel Money.
Customers trust MoMo, know how to use it, and expect it. KHRATE must be MoMo-first.

## The staged approach (ADR-0006)

Payments sit behind a single `PaymentProvider` interface so business logic never changes
as we upgrade the mechanism.

### Stage 1 — Controlled launch: assisted / manual MoMo
- Customer places order; at confirmation they send MoMo to a KHRATE till/number and enter
  the transaction reference (or upload proof).
- A **Payment Reviewer** (staff role) verifies against the MoMo statement; order moves to
  paid. Refunds are issued manually (MoMo send or wallet credit).
- **Why start here:** direct MoMo API access requires a signed commercial agreement and
  onboarding with MTN/Airtel — a **founder action** with cost and legal weight. We do not
  block the whole platform on it, and a controlled launch can run on assisted verification
  with the audit trail (TimelineEvent) making it accountable.

### Stage 2 — Scale: MoMo Collections API
- Automated collection requests (customer approves a prompt on their phone) and automated
  refunds. Same interface; swap the implementation.

## Money handling rules

- Held vs. captured: for group deals, funds should be **held/authorised** and only
  **captured when the deal tips**; if it FAILS, holds are released / refunded
  automatically (see [group-buying model](03_GROUP_BUYING_MODEL.md)). Manual-stage
  approximation: don't ask for payment until the deal is likely to tip, or refund promptly
  on fail — the exact flow is a launch-ops choice recorded here.
- All amounts are integer minor units + currency (RWF has none). See `packages/money`.
- Every capture/refund is a TimelineEvent.

## Fraud controls (from research — this is where these businesses die)

- Payment proof verified by a dedicated role, never auto-trusted at manual stage.
- Organiser payouts/credits are capped, transparent, and audited.
- Collection ("did the customer actually receive?") is confirmed and logged.

## Founder decisions required before any live payment

1. **Approve pursuing MTN MoMo / Airtel Money merchant agreements** (cost, legal, KYC).
   *Recommendation:* begin the MTN MoMo merchant onboarding now, in parallel with the
   Stage-1 launch, since lead times are long.
2. **Refund default:** instant MoMo refund vs. KHRATE wallet credit.
   *Recommendation:* offer both; default to instant refund — trust matters more than float
   this early.
3. **Solo-order fee vs. group discount split.** *Recommendation:* flat transparent delivery
   fee; group delivery discounted to reflect real density savings.

No real payment credentials, tills, or API keys are configured in this repo.
