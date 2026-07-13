/**
 * KHRATE development seed. ALL data here is clearly-labelled SAMPLE data for local
 * development and demos only — no real customers, prices, or credentials.
 *
 * Run: npm run seed  (after prisma migrate)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding KHRATE sample data (development only)...');

  const zone = await prisma.zone.upsert({
    where: { id: 'zone-kigali' },
    create: { id: 'zone-kigali', name: 'Kigali [SAMPLE]', country: 'RW', currency: 'RWF' },
    update: {},
  });

  const dropPoint = await prisma.location.upsert({
    where: { id: 'loc-kimironko' },
    create: { id: 'loc-kimironko', zoneId: zone.id, name: 'Kimironko Estate — Gate B [SAMPLE]', mode: 'DROP_POINT' },
    update: {},
  });

  // Configurable pricing rules (ADR-0010). Group drop-point is cheap (density);
  // home delivery costs more; free above a threshold.
  await prisma.pricingRule.deleteMany({});
  await prisma.pricingRule.createMany({
    data: [
      { id: 'pr-group-drop', name: 'Group drop-point [SAMPLE]', priority: 10, mode: 'DROP_POINT', groupOnly: true, baseFee: 500n, freeAboveValue: 30000n },
      { id: 'pr-home', name: 'Home delivery [SAMPLE]', priority: 20, mode: 'HOME_DELIVERY', baseFee: 2000n },
      { id: 'pr-catch-all', name: 'Default [SAMPLE]', priority: 100, baseFee: 1000n },
    ],
  });

  // Configurable policies (ADR-0011): trust-first launch defaults.
  await prisma.policy.upsert({
    where: { key: 'refund.default' },
    create: { key: 'refund.default', value: 'MOMO_REFUND', description: 'Launch: trust-first instant MoMo refund.' },
    update: {},
  });
  await prisma.policy.upsert({
    where: { key: 'refund.allowCustomerChoice' },
    create: { key: 'refund.allowCustomerChoice', value: 'true', description: 'Customers may choose wallet credit.' },
    update: {},
  });

  const rice = await prisma.product.upsert({
    where: { id: 'p-rice' }, update: {},
    create: { id: 'p-rice', name: 'Rice 25kg bag [SAMPLE]', category: 'Grains', saleUnit: 'EACH' },
  });
  const oil = await prisma.product.upsert({
    where: { id: 'p-oil' }, update: {},
    create: { id: 'p-oil', name: 'Cooking oil 5L [SAMPLE]', category: 'Cooking', saleUnit: 'EACH' },
  });
  const tomato = await prisma.product.upsert({
    where: { id: 'p-tomato' }, update: {},
    create: { id: 'p-tomato', name: 'Tomatoes (per kg) [SAMPLE]', category: 'Fresh', saleUnit: 'KG', isFresh: true, nominalGrams: 1000 },
  });

  const bundle = await prisma.bundle.upsert({
    where: { id: 'b-family' }, update: {},
    create: {
      id: 'b-family', name: 'Family Weekly Basket [SAMPLE]',
      items: { create: [{ productId: rice.id, quantity: 1 }, { productId: oil.id, quantity: 1 }] },
    },
  });

  const staff = await prisma.staffUser.upsert({
    where: { email: 'ops@khrate.local' }, update: {},
    create: { email: 'ops@khrate.local', name: 'Sample Coordinator', role: 'GROUP_COORDINATOR', passwordHash: 'SAMPLE-not-a-real-hash' },
  });

  // A deal that should TIP easily (threshold small) and a fresh-produce deal that needs volume.
  const now = Date.now();
  const stapleDeal = await prisma.groupDeal.upsert({
    where: { id: 'deal-staples' }, update: {},
    create: {
      id: 'deal-staples', title: 'Kimironko Staples — closes tonight [SAMPLE]', zoneId: zone.id, currency: 'RWF',
      cutoffAt: new Date(now + 6 * 3600_000), minUnits: 5,
      lines: { create: [
        { id: 'dl-rice', productId: rice.id, groupPrice: 22000n, soloPrice: 25000n, currency: 'RWF' },
        { id: 'dl-oil', productId: oil.id, groupPrice: 8500n, soloPrice: 9500n, currency: 'RWF' },
        { id: 'dl-family', bundleId: bundle.id, groupPrice: 29000n, soloPrice: 33000n, currency: 'RWF' },
      ] },
      fulfilmentOptions: { create: [{ mode: 'DROP_POINT', locationId: dropPoint.id, pricingRuleId: 'pr-group-drop' }] },
    },
  });

  await prisma.groupDeal.upsert({
    where: { id: 'deal-fresh' }, update: {},
    create: {
      id: 'deal-fresh', title: 'Kimironko Fresh Tomatoes — needs 30kg [SAMPLE]', zoneId: zone.id, currency: 'RWF',
      cutoffAt: new Date(now + 12 * 3600_000), minUnits: 30,
      organiserId: null,
      lines: { create: [{ id: 'dl-tomato', productId: tomato.id, groupPrice: 900n, soloPrice: 1200n, currency: 'RWF' }] },
      fulfilmentOptions: { create: [{ mode: 'DROP_POINT', locationId: dropPoint.id, pricingRuleId: 'pr-group-drop' }] },
    },
  });

  console.log(`Seeded zone=${zone.name}, staple deal=${stapleDeal.id}, staff=${staff.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
