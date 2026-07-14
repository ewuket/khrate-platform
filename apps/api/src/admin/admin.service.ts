import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../common/timeline.service';
import { meetsThreshold, progressToTip } from '../group-buying/deal-state-machine';

/**
 * Operational logic behind the admin platform (docs/operations/10). Every mutating
 * action records its staff actor in the audit trail.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  // ---- Deal board (Group Coordinator) --------------------------------------

  /** All non-terminal deals with live progress — the coordinator's nerve centre. */
  async dealBoard() {
    const deals = await this.prisma.groupDeal.findMany({
      where: { state: { in: ['OPEN', 'LOCKED', 'CONFIRMED', 'PROCURING', 'OUT_FOR_DELIVERY'] } },
      include: { zone: true, orders: { include: { items: true } } },
      orderBy: { cutoffAt: 'asc' },
    });
    return deals.map((d) => {
      const active = d.orders.filter((o) => ['AWAITING_TIP', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.state));
      const demand = {
        totalUnits: active.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0),
        totalValue: active.reduce((n, o) => n + Number(o.subtotal), 0),
      };
      const threshold = { minUnits: d.minUnits, minValue: d.minValue == null ? null : Number(d.minValue) };
      return {
        id: d.id,
        title: d.title,
        zone: d.zone.name,
        state: d.state,
        cutoffAt: d.cutoffAt,
        orders: active.length,
        demand,
        threshold,
        fraction: progressToTip(threshold, demand),
        wouldTip: meetsThreshold(threshold, demand),
      };
    });
  }

  async createDeal(params: {
    title: string;
    zoneId: string;
    cutoffAt: Date;
    minUnits?: number;
    minValue?: number;
    lines: { productId?: string; bundleId?: string; groupPrice: number; soloPrice: number }[];
    fulfilment: { mode: string; locationId?: string }[];
    actor: string;
  }) {
    if (params.lines.length === 0) throw new BadRequestException('Deal needs at least one line');
    for (const l of params.lines) {
      if (!l.productId === !l.bundleId) {
        throw new BadRequestException('Each line needs exactly one of productId/bundleId');
      }
      if (l.groupPrice > l.soloPrice) {
        // Honest-pricing rule: the group price may never exceed the solo reference.
        throw new BadRequestException('groupPrice must not exceed soloPrice');
      }
    }
    const zone = await this.prisma.zone.findUnique({ where: { id: params.zoneId } });
    if (!zone) throw new NotFoundException('Zone not found');

    const deal = await this.prisma.groupDeal.create({
      data: {
        title: params.title,
        zoneId: params.zoneId,
        currency: zone.currency,
        cutoffAt: params.cutoffAt,
        minUnits: params.minUnits ?? null,
        minValue: params.minValue == null ? null : BigInt(params.minValue),
        lines: {
          create: params.lines.map((l) => ({
            productId: l.productId,
            bundleId: l.bundleId,
            groupPrice: BigInt(l.groupPrice),
            soloPrice: BigInt(l.soloPrice),
            currency: zone.currency,
          })),
        },
        fulfilmentOptions: {
          create: params.fulfilment.map((f) => ({ mode: f.mode as never, locationId: f.locationId })),
        },
      },
      include: { lines: true, fulfilmentOptions: true },
    });
    await this.timeline.record({ type: 'DEAL_CREATED', dealId: deal.id, actor: params.actor });
    return deal;
  }

  /**
   * The buy list: aggregated confirmed demand per product for a CONFIRMED deal. This is
   * what procurement takes to the wholesaler — pre-sold quantities, nothing speculative.
   */
  async procurementList(dealId: string) {
    const deal = await this.prisma.groupDeal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');
    const items = await this.prisma.orderItem.findMany({
      where: { order: { dealId, state: { in: ['CONFIRMED', 'PREPARING', 'READY'] } } },
      include: {
        dealLine: { include: { product: true, bundle: { include: { items: { include: { product: true } } } } } },
      },
    });
    // Explode bundles into their component products so the buy list is product-level.
    const byProduct = new Map<string, { name: string; saleUnit: string; quantity: number }>();
    for (const item of items) {
      const line = item.dealLine;
      const components = line.product
        ? [{ product: line.product, per: 1 }]
        : (line.bundle?.items ?? []).map((bi) => ({ product: bi.product, per: bi.quantity }));
      for (const c of components) {
        const prev = byProduct.get(c.product.id);
        const qty = item.quantity * c.per;
        if (prev) prev.quantity += qty;
        else byProduct.set(c.product.id, { name: c.product.name, saleUnit: c.product.saleUnit, quantity: qty });
      }
    }
    return {
      dealId,
      state: deal.state,
      items: [...byProduct.entries()].map(([productId, v]) => ({ productId, ...v })),
    };
  }

  // ---- Packing queue (Order Ops) -------------------------------------------

  /** Orders to pack for a confirmed deal, with pick lists. */
  async packingQueue(dealId: string) {
    return this.prisma.order.findMany({
      where: { dealId, state: { in: ['CONFIRMED', 'PREPARING', 'READY'] } },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { dealLine: { include: { product: true, bundle: true } } } },
        payment: { select: { state: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Record packing reality: actual quantity/weight and substitutions. Audited. */
  async recordFulfilment(
    orderItemId: string,
    data: { fulfilledQuantity?: number; substitutionNote?: string },
    actor: string,
  ) {
    const item = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data,
    });
    await this.timeline.record({
      type: 'ITEM_FULFILMENT_RECORDED',
      orderId: item.orderId,
      actor,
      data: { orderItemId, ...data },
    });
    return item;
  }

  /** Move an order through preparation. Guardrail: cannot pack an unverified payment. */
  async setOrderState(orderId: string, state: 'PREPARING' | 'READY', actor: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.payment?.state !== 'CAPTURED') {
      throw new BadRequestException('Payment not verified — order cannot be packed');
    }
    const updated = await this.prisma.order.update({ where: { id: orderId }, data: { state } });
    await this.timeline.record({ type: `ORDER_${state}`, orderId, actor });
    return updated;
  }

  // ---- Reports (leadership) — the few metrics that matter -------------------

  async report() {
    const [deals, orders, payments, events] = await Promise.all([
      this.prisma.groupDeal.groupBy({ by: ['state'], _count: true }),
      this.prisma.order.groupBy({ by: ['state'], _count: true }),
      this.prisma.payment.groupBy({ by: ['state'], _sum: { amount: true }, _count: true }),
      this.prisma.timelineEvent.groupBy({ by: ['type'], _count: true }),
    ]);
    const dealCount = (s: string) => deals.find((d) => d.state === s)?._count ?? 0;
    const decided = dealCount('CONFIRMED') + dealCount('PROCURING') + dealCount('OUT_FOR_DELIVERY') + dealCount('FULFILLED') + dealCount('FAILED');
    const tipped = decided - dealCount('FAILED');
    // Realised saving: sum over confirmed order items of (solo - group) * qty.
    const confirmedItems = await this.prisma.orderItem.findMany({
      where: { order: { state: { in: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'COLLECTED'] } } },
      include: { dealLine: true },
    });
    const realisedSaving = confirmedItems.reduce(
      (n, i) => n + (Number(i.dealLine.soloPrice) - Number(i.dealLine.groupPrice)) * i.quantity,
      0,
    );
    return {
      deals: Object.fromEntries(deals.map((d) => [d.state, d._count])),
      tipRate: decided > 0 ? tipped / decided : null,
      orders: Object.fromEntries(orders.map((o) => [o.state, o._count])),
      payments: payments.map((p) => ({ state: p.state, count: p._count, total: Number(p._sum.amount ?? 0) })),
      realisedSavingMinor: realisedSaving,
      auditEvents: Object.fromEntries(events.map((e) => [e.type, e._count])),
    };
  }
}
