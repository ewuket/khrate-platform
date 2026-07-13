import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDeliveryFee } from './pricing-engine.ts';
import type { PricingRule } from './pricing-engine.ts';
import {
  resolveRefundDestination,
  parseRefundDefault,
} from './refund-policy.ts';

const base: Omit<PricingRule, 'id' | 'priority'> = {
  zoneId: null,
  isActive: true,
  mode: null,
  groupOnly: null,
  minOrderValue: null,
  baseFee: 0,
  percentBps: 0,
  minFee: null,
  maxFee: null,
  freeAboveValue: null,
};

test('no matching rule => zero fee (never invent a charge)', () => {
  const r = resolveDeliveryFee([], { zoneId: 'z', mode: 'HOME_DELIVERY', isGroup: false, subtotal: 10000 });
  assert.equal(r.fee, 0);
  assert.equal(r.ruleId, null);
  assert.ok(r.free);
});

test('first matching rule by priority wins', () => {
  const rules: PricingRule[] = [
    { ...base, id: 'group-drop', priority: 10, mode: 'DROP_POINT', groupOnly: true, baseFee: 500 },
    { ...base, id: 'catch-all', priority: 100, baseFee: 2000 },
  ];
  // Group drop-point order -> cheap dense fee
  const g = resolveDeliveryFee(rules, { zoneId: 'z', mode: 'DROP_POINT', isGroup: true, subtotal: 30000 });
  assert.equal(g.ruleId, 'group-drop');
  assert.equal(g.fee, 500);
  // Solo home order -> catch-all higher fee
  const s = resolveDeliveryFee(rules, { zoneId: 'z', mode: 'HOME_DELIVERY', isGroup: false, subtotal: 30000 });
  assert.equal(s.ruleId, 'catch-all');
  assert.equal(s.fee, 2000);
});

test('percent + clamps, integer maths', () => {
  const rules: PricingRule[] = [
    { ...base, id: 'pct', priority: 1, baseFee: 300, percentBps: 250, minFee: 500, maxFee: 1500 },
  ];
  // 2.5% of 30000 = 750, + 300 base = 1050 (within clamps)
  assert.equal(resolveDeliveryFee(rules, { zoneId: 'z', mode: 'DROP_POINT', isGroup: true, subtotal: 30000 }).fee, 1050);
  // small order clamps up to minFee
  assert.equal(resolveDeliveryFee(rules, { zoneId: 'z', mode: 'DROP_POINT', isGroup: true, subtotal: 1000 }).fee, 500);
  // huge order clamps down to maxFee
  assert.equal(resolveDeliveryFee(rules, { zoneId: 'z', mode: 'DROP_POINT', isGroup: true, subtotal: 1_000_000 }).fee, 1500);
});

test('free above threshold', () => {
  const rules: PricingRule[] = [
    { ...base, id: 'free', priority: 1, baseFee: 1000, freeAboveValue: 50000 },
  ];
  assert.equal(resolveDeliveryFee(rules, { zoneId: 'z', mode: 'DROP_POINT', isGroup: true, subtotal: 60000 }).fee, 0);
  assert.equal(resolveDeliveryFee(rules, { zoneId: 'z', mode: 'DROP_POINT', isGroup: true, subtotal: 40000 }).fee, 1000);
});

test('refund default is configurable; customer choice honoured when allowed', () => {
  assert.equal(parseRefundDefault('WALLET_CREDIT'), 'WALLET_CREDIT');
  assert.equal(parseRefundDefault(undefined), 'MOMO_REFUND'); // trust-first fallback
  assert.equal(
    resolveRefundDestination({ policyDefault: 'MOMO_REFUND', customerPreference: 'WALLET_CREDIT', allowCustomerChoice: true }),
    'WALLET_CREDIT',
  );
  assert.equal(
    resolveRefundDestination({ policyDefault: 'MOMO_REFUND', customerPreference: 'WALLET_CREDIT', allowCustomerChoice: false }),
    'MOMO_REFUND',
  );
});
