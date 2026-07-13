import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../common/timeline.service';
import { PolicyService } from '../policy/policy.service';
import { PaymentRegistry } from './payment-registry.service';
import { resolveRefundDestination } from '../pricing/refund-policy';

/**
 * Orchestrates money movement through whatever provider is active. Business logic
 * (group-buying, orders) calls these methods and stays provider-agnostic.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PaymentRegistry,
    private readonly timeline: TimelineService,
    private readonly policy: PolicyService,
  ) {}

  /** Create a payment intent for an order using the active provider. */
  async initiate(orderId: string, providerRef?: string, proofUrl?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const provider = this.registry.active();
    const result = await provider.charge({
      orderId,
      amount: Number(order.total),
      currency: order.currency,
      customerPhone: order.customer.phone,
      providerRef,
      proofUrl,
    });

    const state =
      result.state === 'CAPTURED'
        ? 'CAPTURED'
        : result.state === 'HELD'
          ? 'HELD'
          : result.state === 'FAILED'
            ? 'FAILED'
            : 'PENDING';

    const payment = await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        amount: order.total,
        currency: order.currency,
        method: provider.key as any,
        state: state as any,
        providerRef: result.providerRef ?? providerRef,
        proofUrl,
        capturedAt: state === 'CAPTURED' ? new Date() : null,
      },
      update: {
        state: state as any,
        providerRef: result.providerRef ?? providerRef,
        proofUrl,
      },
    });

    await this.timeline.record({
      type: 'PAYMENT_INITIATED',
      orderId,
      data: { state, method: provider.key },
    });
    return { payment, message: result.message };
  }

  /**
   * A Payment Reviewer confirms a manual MoMo transfer. Guardrail: only a PAYMENT_REVIEWER
   * (enforced at the controller/guard layer) reaches here.
   */
  async verify(orderId: string, reviewerId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.prisma.payment.update({
      where: { orderId },
      data: { state: 'CAPTURED', capturedAt: new Date(), verifiedById: reviewerId },
    });
    await this.timeline.record({
      type: 'PAYMENT_VERIFIED',
      orderId,
      actor: reviewerId,
      data: { amount: Number(payment.amount), currency: payment.currency },
    });
    return updated;
  }

  /**
   * Refund an order. Destination (MoMo vs wallet credit) resolved from configurable
   * policy + optional customer preference (ADR-0011). Runs in the caller's transaction
   * when provided so refund + wallet credit + audit are atomic.
   */
  async refund(
    orderId: string,
    opts: { customerPreference?: 'MOMO_REFUND' | 'WALLET_CREDIT'; actor?: string; tx?: Prisma.TransactionClient } = {},
  ) {
    const client = opts.tx ?? this.prisma;
    const payment = await client.payment.findUnique({ where: { orderId }, include: { order: true } });
    if (!payment) throw new NotFoundException('Payment not found');

    const destination = resolveRefundDestination({
      policyDefault: await this.policy.refundDefault(),
      customerPreference: opts.customerPreference ?? null,
      allowCustomerChoice: await this.policy.allowCustomerRefundChoice(),
    });

    await client.payment.update({
      where: { orderId },
      data: { state: 'REFUNDED', refundedAt: new Date() },
    });

    if (destination === 'WALLET_CREDIT') {
      await client.walletCredit.upsert({
        where: { customerId_currency: { customerId: payment.order.customerId, currency: payment.currency } },
        create: { customerId: payment.order.customerId, currency: payment.currency, balance: payment.amount },
        update: { balance: { increment: payment.amount } },
      });
    }
    // MOMO_REFUND at launch is executed by Finance out-of-band; recorded here for audit.

    await this.timeline.record({
      type: 'REFUND_ISSUED',
      orderId,
      actor: opts.actor ?? 'system',
      data: { destination, amount: Number(payment.amount), currency: payment.currency },
      tx: opts.tx,
    });
    return { destination };
  }
}
