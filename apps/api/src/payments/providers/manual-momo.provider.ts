import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  ChargeRequest,
  ChargeResult,
  CaptureResult,
  RefundResult,
} from '../payment-provider.interface';

/**
 * Launch payment provider (ADR-0006): the customer sends Mobile Money to a KHRATE
 * till/number and supplies the transaction reference (or a proof image). No funds move
 * through code here — a Payment Reviewer verifies against the MoMo statement. This
 * provider records intent and defers to the human verification step.
 *
 * Deliberately holds NO real credentials, tills, or API keys. Swapping in the automated
 * MTN MoMo Collections provider later is a new class + config; nothing else changes.
 */
@Injectable()
export class ManualMomoProvider implements PaymentProvider {
  readonly key = 'MOMO_MANUAL' as const;
  readonly requiresManualVerification = true;

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    // We cannot confirm receipt automatically; mark it awaiting a human reviewer.
    return {
      state: 'PENDING_VERIFICATION',
      providerRef: req.providerRef,
      message:
        'Awaiting Mobile Money verification by KHRATE. Send to the KHRATE MoMo number ' +
        'and enter your transaction reference.',
    };
  }

  async capture(): Promise<CaptureResult> {
    // Capture == a reviewer confirmed the transfer. The verification action (in
    // PaymentsService) is what flips state; nothing to do at the provider boundary.
    return { state: 'CAPTURED' };
  }

  async refund(): Promise<RefundResult> {
    // Manual refund: Finance sends MoMo back (or issues wallet credit). Recorded, not automated.
    return { state: 'REFUNDED', message: 'Manual MoMo refund to be executed by Finance.' };
  }
}
