import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveDeliveryFee, PricingResult } from '../pricing/pricing-engine';
import { parseRefundDefault, RefundDestination } from '../pricing/refund-policy';
import { FulfilmentMode } from '../pricing/fulfilment';

/**
 * Business rules as data (ADR-0010/0011). Reads the Policy and PricingRule tables so the
 * business can change delivery pricing and refund behaviour without a deploy.
 */
@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(key: string): Promise<string | null> {
    const row = await this.prisma.policy.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  /** Configurable refund default (trust-first fallback = MoMo refund). */
  async refundDefault(): Promise<RefundDestination> {
    return parseRefundDefault(await this.getPolicy('refund.default'));
  }

  /** Whether customers may override the refund default with their own preference. */
  async allowCustomerRefundChoice(): Promise<boolean> {
    return (await this.getPolicy('refund.allowCustomerChoice')) !== 'false';
  }

  /** Resolve the delivery fee for an order via the configurable pricing engine. */
  async deliveryFee(ctx: {
    zoneId: string;
    mode: FulfilmentMode;
    isGroup: boolean;
    subtotal: number;
  }): Promise<PricingResult> {
    const rules = await this.prisma.pricingRule.findMany({
      where: {
        isActive: true,
        OR: [{ zoneId: null }, { zoneId: ctx.zoneId }],
      },
    });
    // Map Prisma BigInt columns to the pure engine's number contract (minor units).
    const mapped = rules.map((r) => ({
      id: r.id,
      zoneId: r.zoneId,
      priority: r.priority,
      isActive: r.isActive,
      mode: r.mode as FulfilmentMode | null,
      groupOnly: r.groupOnly,
      minOrderValue: r.minOrderValue == null ? null : Number(r.minOrderValue),
      baseFee: Number(r.baseFee),
      percentBps: r.percentBps,
      minFee: r.minFee == null ? null : Number(r.minFee),
      maxFee: r.maxFee == null ? null : Number(r.maxFee),
      freeAboveValue: r.freeAboveValue == null ? null : Number(r.freeAboveValue),
    }));
    return resolveDeliveryFee(mapped, ctx);
  }
}
