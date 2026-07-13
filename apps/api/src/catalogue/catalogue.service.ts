import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Read surface for discovery: zone deals first, then bundles, then solo products
 * (docs/product/06). Kept deliberately simple — no fake urgency or popularity.
 */
@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  /** Open group deals a customer in this zone can actually receive. */
  async openDealsForZone(zoneId: string) {
    const deals = await this.prisma.groupDeal.findMany({
      where: { zoneId, state: 'OPEN', cutoffAt: { gt: new Date() } },
      include: {
        lines: { include: { product: true, bundle: true } },
        fulfilmentOptions: { include: { location: true } },
      },
      orderBy: { cutoffAt: 'asc' },
    });
    // Present honest saving on each line (group vs solo). Never a fake reference price.
    return deals.map((d) => ({
      id: d.id,
      title: d.title,
      currency: d.currency,
      cutoffAt: d.cutoffAt,
      visibility: d.visibility,
      fulfilment: d.fulfilmentOptions.map((o) => ({ mode: o.mode, location: o.location?.name ?? null })),
      lines: d.lines.map((l) => ({
        id: l.id,
        name: l.product?.name ?? l.bundle?.name ?? 'Item',
        groupPrice: Number(l.groupPrice),
        soloPrice: Number(l.soloPrice),
        saving: Math.max(0, Number(l.soloPrice) - Number(l.groupPrice)),
      })),
    }));
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
