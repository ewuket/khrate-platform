/**
 * Refund destination resolution — configurable, not hardcoded (founder clarification #3
 * / ADR-0011). Both MoMo refund and wallet credit exist; the DEFAULT is a runtime policy
 * value, and the customer may express a preference that (within policy) wins.
 *
 * Launch stance: trust-first. Default = MOMO_REFUND. The business can flip the default
 * later by editing the `refund.default` Policy — no deploy.
 */

export type RefundDestination = 'MOMO_REFUND' | 'WALLET_CREDIT';

export interface RefundContext {
  /** Business default from Policy `refund.default`. */
  policyDefault: RefundDestination;
  /** What the customer chose, if anything. */
  customerPreference?: RefundDestination | null;
  /**
   * Whether the customer is allowed to override the policy default. Lets the business
   * force a destination (e.g. temporarily wallet-only) if ever needed, without code changes.
   */
  allowCustomerChoice: boolean;
}

export function resolveRefundDestination(ctx: RefundContext): RefundDestination {
  if (ctx.allowCustomerChoice && ctx.customerPreference) {
    return ctx.customerPreference;
  }
  return ctx.policyDefault;
}

/** Safe fallback if policy is missing/misconfigured: trust-first MoMo refund. */
export const REFUND_DEFAULT_FALLBACK: RefundDestination = 'MOMO_REFUND';

export function parseRefundDefault(raw: string | undefined | null): RefundDestination {
  return raw === 'WALLET_CREDIT' ? 'WALLET_CREDIT' : REFUND_DEFAULT_FALLBACK;
}
