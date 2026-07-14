import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../common/timeline.service';

/**
 * Customer-facing read surface for orders. Translates internal operational states into
 * the honest, plain-language journey the customer sees — the operational complexity
 * (PROCURING, PREPARING, packing, driver assignment) stays hidden.
 */
@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  /**
   * Customer submits the Mobile Money reference for their order after paying. This does
   * NOT confirm payment — it hands a reviewer what they need to verify against the MoMo
   * statement (payment is never auto-trusted). Records the reference on the payment.
   */
  async submitPaymentRef(customerId: string, orderId: string, providerRef: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('Not your order');
    if (!order.payment) throw new BadRequestException('No payment to reference on this order');
    if (order.payment.state === 'CAPTURED') throw new BadRequestException('This order is already paid');

    await this.prisma.payment.update({
      where: { orderId },
      data: { providerRef, state: 'PENDING' },
    });
    await this.timeline.record({
      type: 'PAYMENT_REF_SUBMITTED',
      orderId,
      actor: customerId,
      data: { providerRef },
    });
    return { ok: true };
  }

  /** One customer's orders, newest first, with a customer-friendly status. */
  async myOrders(customerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      include: {
        deal: { select: { title: true, state: true, cutoffAt: true } },
        items: { include: { dealLine: { include: { product: true, bundle: true } } } },
        payment: { select: { state: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.present(o));
  }

  async myOrder(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        deal: { select: { title: true, state: true, cutoffAt: true } },
        items: { include: { dealLine: { include: { product: true, bundle: true } } } },
        payment: { select: { state: true } },
        location: { select: { name: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('Not your order');
    return { ...this.present(order), dropPoint: order.location?.name ?? null };
  }

  /**
   * Map internal state → the customer's mental model. Deliberately few, clear stages so a
   * first-time digital shopper always knows what's happening and what's next.
   */
  private present(o: {
    id: string;
    state: string;
    total: bigint;
    currency: string;
    createdAt: Date;
    deal: { title: string; state: string; cutoffAt: Date } | null;
    payment: { state: string } | null;
    items: { quantity: number; dealLine: { product: { name: string } | null; bundle: { name: string } | null } }[];
  }) {
    return {
      id: o.id,
      title: o.deal?.title ?? 'Your KHRATE order',
      total: Number(o.total),
      currency: o.currency,
      createdAt: o.createdAt,
      paymentVerified: o.payment?.state === 'CAPTURED',
      status: this.customerStatus(o.state, o.payment?.state ?? null),
      items: o.items.map((i) => ({
        name: i.dealLine.product?.name ?? i.dealLine.bundle?.name ?? 'Item',
        quantity: i.quantity,
      })),
    };
  }

  private customerStatus(orderState: string, paymentState: string | null): {
    key: string;
    label: string;
    detail: string;
  } {
    if (orderState === 'REFUNDED') {
      return { key: 'refunded', label: 'Refunded', detail: 'This group didn’t reach its goal in time, so you’ve been fully refunded.' };
    }
    if (orderState === 'CANCELLED') {
      return { key: 'cancelled', label: 'Cancelled', detail: 'This order was cancelled.' };
    }
    if (['DELIVERED', 'COLLECTED'].includes(orderState)) {
      return { key: 'delivered', label: 'Delivered', detail: 'Enjoy! Thanks for shopping with KHRATE.' };
    }
    if (orderState === 'OUT_FOR_DELIVERY') {
      return { key: 'on_the_way', label: 'On the way', detail: 'Your groceries are heading to your drop point today.' };
    }
    if (['PREPARING', 'READY', 'PACKED', 'PROCURING'].includes(orderState)) {
      return { key: 'preparing', label: 'Being prepared', detail: 'We’re buying fresh and packing your order.' };
    }
    if (orderState === 'AWAITING_TIP') {
      if (paymentState !== 'CAPTURED') {
        return { key: 'confirming_payment', label: 'Confirming payment', detail: 'We’re confirming your Mobile Money payment. Your spot is reserved.' };
      }
      return { key: 'gathering_group', label: 'Gathering the group', detail: 'You’re in! We’re waiting for enough neighbours to join before the deadline.' };
    }
    if (orderState === 'CONFIRMED') {
      return { key: 'confirmed', label: 'Group confirmed', detail: 'The group succeeded — your order is confirmed and moving to preparation.' };
    }
    return { key: 'received', label: 'Received', detail: 'We’ve received your order.' };
  }
}
