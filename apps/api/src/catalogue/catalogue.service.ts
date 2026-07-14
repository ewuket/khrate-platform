import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { meetsThreshold, progressToTip } from '../group-buying/deal-state-machine';

/**
 * Read surface for discovery: zone deals first, then bundles, then solo products
 * (docs/product/06). Kept deliberately simple — no fake urgency or popularity.
 */
@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Open group deals a customer in this zone can receive — each already carrying its honest
   * progress-to-tip, so the shop renders in ONE request (kind to weak connections).
   */
  async openDealsForZone(zoneId: string) {
    const deals = await this.prisma.groupDeal.findMany({
      where: { zoneId, state: 'OPEN', cutoffAt: { gt: new Date() } },
      include: {
        lines: { include: { product: true, bundle: true } },
        fulfilmentOptions: { include: { location: true } },
        orders: {
          where: { state: { in: ['AWAITING_TIP', 'CONFIRMED'] } },
          select: { items: { select: { quantity: true, lineTotal: true } } },
        },
      },
      orderBy: { cutoffAt: 'asc' },
    });
    return deals.map((d) => {
      const demand = d.orders.reduce(
        (acc, o) => {
          for (const i of o.items) {
            acc.totalUnits += i.quantity;
            acc.totalValue += Number(i.lineTotal);
          }
          return acc;
        },
        { totalUnits: 0, totalValue: 0 },
      );
      const threshold = { minUnits: d.minUnits, minValue: d.minValue == null ? null : Number(d.minValue) };
      return {
        id: d.id,
        title: d.title,
        currency: d.currency,
        cutoffAt: d.cutoffAt,
        visibility: d.visibility,
        // Honest progress — real orders only. Never inflated.
        progress: progressToTip(threshold, demand),
        unlocked: meetsThreshold(threshold, demand),
        participants: d.orders.length,
        fulfilment: d.fulfilmentOptions.map((o) => ({ mode: o.mode, location: o.location?.name ?? null })),
        lines: d.lines.map((l) => ({
          id: l.id,
          name: l.product?.name ?? l.bundle?.name ?? 'Item',
          isBundle: !!l.bundleId,
          groupPrice: Number(l.groupPrice),
          soloPrice: Number(l.soloPrice),
          saving: Math.max(0, Number(l.soloPrice) - Number(l.groupPrice)),
        })),
      };
    });
  }

  /** Active served zones and their active drop points, for location selection. */
  async listZones() {
    const zones = await this.prisma.zone.findMany({
      where: { isActive: true },
      include: { locations: { where: { isActive: true }, select: { id: true, name: true, mode: true } } },
      orderBy: { name: 'asc' },
    });
    return zones.map((z) => ({
      id: z.id,
      name: z.name,
      currency: z.currency,
      dropPoints: z.locations,
    }));
  }

  /** Full detail for one open deal — the deal page the customer decides on. */
  async dealDetail(id: string) {
    const d = await this.prisma.groupDeal.findFirst({
      where: { id, state: 'OPEN' },
      include: {
        zone: { select: { name: true } },
        lines: { include: { product: true, bundle: { include: { items: { include: { product: true } } } } } },
        fulfilmentOptions: { include: { location: true } },
      },
    });
    if (!d) return null;
    return {
      id: d.id,
      title: d.title,
      zone: d.zone.name,
      currency: d.currency,
      cutoffAt: d.cutoffAt,
      visibility: d.visibility,
      minUnits: d.minUnits,
      fulfilment: d.fulfilmentOptions.map((o) => ({ id: o.id, mode: o.mode, location: o.location?.name ?? null, locationId: o.locationId })),
      lines: d.lines.map((l) => ({
        id: l.id,
        name: l.product?.name ?? l.bundle?.name ?? 'Item',
        description: l.product?.description ?? null,
        isBundle: !!l.bundleId,
        bundleContents: l.bundle?.items.map((bi) => ({ name: bi.product.name, quantity: bi.quantity })) ?? null,
        saleUnit: l.product?.saleUnit ?? 'PACK',
        groupPrice: Number(l.groupPrice),
        soloPrice: Number(l.soloPrice),
        saving: Math.max(0, Number(l.soloPrice) - Number(l.groupPrice)),
      })),
    };
  }

  async listProducts() {
    return this.prisma.product.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async listBundles() {
    return this.prisma.bundle.findMany({
      where: { isActive: true },
      include: { items: { include: { product: true } } },
    });
  }
}
