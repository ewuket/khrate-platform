/**
 * The seam that keeps ALL business logic independent of how money actually moves
 * (founder clarification #2 / ADR-0008). Launch uses MOMO_MANUAL; adding MTN MoMo,
 * Airtel Money, or anything else is a new class implementing this interface + config,
 * with zero changes to order/deal logic.
 */

export type PaymentMethodKey =
  | 'MOMO_MANUAL'
  | 'MOMO_API'
  | 'AIRTEL_MONEY'
  | 'CASH_ON_COLLECT'
  | 'WALLET_CREDIT';

export interface ChargeRequest {
  orderId: string;
  amount: number; // minor units
  currency: string;
  customerPhone: string;
  /** Customer-supplied reference or proof id, for manual/assisted flows. */
  providerRef?: string;
  proofUrl?: string;
}

export interface ChargeResult {
  /**
   * HELD  -> funds reserved/authorised, capture on deal tip (ideal).
   * PENDING_VERIFICATION -> manual flow: awaiting a Payment Reviewer.
   * CAPTURED -> money taken now (solo / instant flows).
   * FAILED -> could not charge.
   */
  state: 'HELD' | 'PENDING_VERIFICATION' | 'CAPTURED' | 'FAILED';
  providerRef?: string;
  message?: string;
}

export interface CaptureResult {
  state: 'CAPTURED' | 'FAILED';
  message?: string;
}

export interface RefundResult {
  state: 'REFUNDED' | 'FAILED';
  message?: string;
}

/** Every payment provider implements this. Business code depends only on the interface. */
export interface PaymentProvider {
  readonly key: PaymentMethodKey;
  /** Whether captures require a human step (true for manual MoMo at launch). */
  readonly requiresManualVerification: boolean;

  charge(req: ChargeRequest): Promise<ChargeResult>;
  capture(providerRef: string, amount: number, currency: string): Promise<CaptureResult>;
  refund(providerRef: string, amount: number, currency: string): Promise<RefundResult>;
}
