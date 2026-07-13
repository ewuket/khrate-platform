import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../common/timeline.service';
import { PolicyService } from '../policy/policy.service';
import { PaymentsService } from '../payments/payments.service';
import {
  assertTransition,
  decideTip,
  isPastCutoff,
  meetsThreshold,
  progressToTip,
  DealState,
} from './deal-state-machine';
import { FulfilmentMode } from '../pricing/fulfilment';

interface JoinLine {
  dealLineId: string;
  quantity: number;
}

/**
 * The differentiator, made operational. Ties the pure state machine
 * (deal-state-machine.ts) to orders, the configurable pricing engine, the pluggable
 * payment layer, and the append-only audit trail.
 */
@Injectable()
export class GroupBuyingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly policy: PolicyService,
    private readonly payments: PaymentsService,
  ) {}

  /** Aggregate live demand for a deal from its confirmed-intent orders. */
  private async demandFor(dealId: string): Promise<{ totalUnits: number; totalValue: number }> {
    const items = await this.prisma.orderItem.findMany({
      where: { order: { dealId, state: { in: ['AWAITING_TIP', 'CONFIRMED'] } } },
    });
    return items.reduce(
      (acc, i) => ({
        totalUnits: acc.totalUnits + i.quantity,
        totalValue: acc.totalValue + Number(i.lineTotal),
      }),
      { totalUnits: 0, totalValue: 0 },
    );
  }

  /** Honest progress for display ("62% to unlock") + whether it would currently tip. */
  async progress(dealId: string) {
    const deal = await this.prisma.groupDeal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');
    const threshold = { minUnits: deal.minUnits, minValue: deal.minValue == null ? null : Number(deal.minValue) };
    const demand = await this.demandFor(dealId);
    return {
      state: deal.state,
      cutoffAt: deal.cutoffAt,
      demand,
      threshold,
      fraction: progressToTip(threshold, demand),
      wouldTip: meetsThreshold(threshold, demand),
    };
  }

  /**
   * A customer joins a deal: creates an order at the deal's group prices, resolves the
   * delivery fee via the configurable pricing engine, and starts the payment intent.
   * The order sits in AWAITING_TIP until the cut-off decides.
   */
  async join(params: {
    dealId: string;
    customerId: string;
    lines: JoinLine[];
    fulfilmentMode: FulfilmentMode;
    fulfilmentOptionId?: string;
    locationId?: string;
    addressId?: string;
    paymentRef?: string;
  }) {
    if (params.lines.length === 0) throw new BadRequestException('Order has no lines');

    const deal = await this.prisma.groupDeal.findUnique({
      where: { id: params.dealId },
      include: { lines: true },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.state !== 'OPEN') throw new BadRequestException(`Deal is ${deal.state}, not open`);
    if (isPastCutoff(deal.cutoffAt, new Date())) throw new BadRequestException('Deal cut-off has passed');

    const lineById = new Map(deal.lines.map((l) => [l.id, l]));
    let subtotal = 0;
    const itemsData = params.lines.map((jl) => {
      const dl = lineById.get(jl.dealLineId);
      if (!dl) throw new BadRequestException(`Line ${jl.dealLineId} not in this deal`);
      if (jl.quantity <= 0) throw new BadRequestException('Quantity must be positive');
      const unitPrice = Number(dl.groupPrice);
      const lineTotal = unitPrice * jl.quantity;
      subtotal += lineTotal;
      return { dealLineId: dl.id, quantity: jl.quantity, unitPrice: BigInt(unitPrice), lineTotal: BigInt(lineTotal) };
    });

    const fee = await this.policy.deliveryFee({
      zoneId: deal.zoneId,
      mode: params.fulfilmentMode,
      isGroup: true,
      subtotal,
    });
    const total = subtotal + fee.fee;

    const order = await this.prisma.order.create({
      data: {
        customerId: params.customerId,
        dealId: deal.id,
        currency: deal.currency,
        subtotal: BigInt(subtotal),
        deliveryFee: BigInt(fee.fee),
        total: BigInt(total),
        state: 'AWAITING_TIP',
        fulfilmentMode: params.fulfilmentMode as any,
        fulfilmentOptionId: params.fulfilmentOptionId,
        locationId: params.locationId,
        addressId: params.addressId,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    await this.timeline.record({
      type: 'ORDER_JOINED_DEAL',
      dealId: deal.id,
      orderId: order.id,
      actor: params.customerId,
      data: { subtotal, deliveryFee: fee.fee, total, units: itemsData.reduce((n, i) => n + i.quantity, 0) },
    });

    // Start the payment intent (manual MoMo at launch -> awaits verification).
    await this.payments.initiate(order.id, params.paymentRef);

    return order;
  }

  /**
   * The cut-off decision — the moment money is on the line. Locks the deal, evaluates the
   * threshold via the pure decider, then CONFIRMS (capture proceeds) or FAILS (refund
   * everyone). Idempotent-ish: only acts on OPEN/LOCKED deals past cut-off.
   */
  async processCutoff(dealId: string, now: Date = new Date()) {
    const deal = await this.prisma.groupDeal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.state !== 'OPEN' && deal.state !== 'LOCKED') return { state: deal.state, changed: false };
    if (!isPastCutoff(deal.cutoffAt, now)) return { state: deal.state, changed: false };

    // Lock first (OPEN -> LOCKED) so no new orders race the decision.
    if (deal.state === 'OPEN') {
      assertTransition('OPEN', 'LOCKED');
      await this.prisma.groupDeal.update({ where: { id: dealId }, data: { state: 'LOCKED' } });
      await this.timeline.record({ type: 'DEAL_LOCKED', dealId });
    }

    const threshold = { minUnits: deal.minUnits, minValue: deal.minValue == null ? null : Number(deal.minValue) };
    const demand = await this.demandFor(dealId);
    const decision = decideTip(threshold, demand);

    if (decision.tipped) {
      return this.confirmDeal(dealId, demand);
    }
    return this.failDeal(dealId, decision.reason, demand);
  }

  private async confirmDeal(dealId: string, demand: { totalUnits: number; totalValue: number }) {
    assertTransition('LOCKED', 'CONFIRMED');
    await this.prisma.$transaction(async (tx) => {
      await tx.groupDeal.update({ where: { id: dealId }, data: { state: 'CONFIRMED' } });
      await tx.order.updateMany({
        where: { dealId, state: 'AWAITING_TIP' },
        data: { state: 'CONFIRMED' },
      });
      await this.timeline.record({ type: 'DEAL_TIPPED', dealId, data: demand, tx });
    });
    return { state: 'CONFIRMED' as DealState, changed: true, demand };
  }

  private async failDeal(dealId: string, reason: string, demand: { totalUnits: number; totalValue: number }) {
    assertTransition('LOCKED', 'FAILED');
    const orders = await this.prisma.order.findMany({ where: { dealId, state: 'AWAITING_TIP' } });

    await this.prisma.$transaction(async (tx) => {
      await tx.groupDeal.update({ where: { id: dealId }, data: { state: 'FAILED' } });
      for (const order of orders) {
        // Auto refund/release every participant — flawless failure is where trust is won.
        await this.payments.refund(order.id, { actor: 'system', tx });
        await tx.order.update({ where: { id: order.id }, data: { state: 'REFUNDED' } });
      }
      await this.timeline.record({ type: 'DEAL_FAILED', dealId, data: { reason, ...demand }, tx });
    });
    return { state: 'FAILED' as DealState, changed: true, reason, refundedOrders: orders.length };
  }
}
