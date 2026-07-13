import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransition,
  assertTransition,
  meetsThreshold,
  progressToTip,
  decideTip,
  isPastCutoff,
} from './deal-state-machine.ts';

test('legal and illegal transitions', () => {
  assert.ok(canTransition('OPEN', 'LOCKED'));
  assert.ok(canTransition('LOCKED', 'CONFIRMED'));
  assert.ok(canTransition('LOCKED', 'FAILED'));
  assert.ok(!canTransition('OPEN', 'CONFIRMED')); // must lock first
  assert.ok(!canTransition('FULFILLED', 'PROCURING')); // terminal
  assert.throws(() => assertTransition('FAILED', 'CONFIRMED'));
});

test('threshold of 1 (both null) always tips', () => {
  const t = { minUnits: null, minValue: null };
  assert.ok(meetsThreshold(t, { totalUnits: 0, totalValue: 0 }));
  assert.equal(decideTip(t, { totalUnits: 0, totalValue: 0 }).nextState, 'CONFIRMED');
});

test('units threshold', () => {
  const t = { minUnits: 30, minValue: null };
  assert.ok(!meetsThreshold(t, { totalUnits: 29, totalValue: 0 }));
  assert.ok(meetsThreshold(t, { totalUnits: 30, totalValue: 0 }));
});

test('both constraints must be satisfied when both set', () => {
  const t = { minUnits: 30, minValue: 100000 };
  assert.ok(!meetsThreshold(t, { totalUnits: 30, totalValue: 99999 }));
  assert.ok(meetsThreshold(t, { totalUnits: 30, totalValue: 100000 }));
});

test('progress is honest and governed by the slowest constraint, capped at 1', () => {
  const t = { minUnits: 100, minValue: 100000 };
  // 62 units (0.62) but only 40% of value (0.40) -> honest progress is 0.40
  assert.equal(progressToTip(t, { totalUnits: 62, totalValue: 40000 }), 0.4);
  assert.equal(progressToTip(t, { totalUnits: 200, totalValue: 200000 }), 1);
});

test('failed decision explains why', () => {
  const d = decideTip({ minUnits: 30, minValue: null }, { totalUnits: 12, totalValue: 0 });
  assert.equal(d.tipped, false);
  assert.match(d.reason, /12\/30 units/);
});

test('cut-off check', () => {
  const cutoff = new Date('2026-07-13T20:00:00Z');
  assert.ok(!isPastCutoff(cutoff, new Date('2026-07-13T19:59:59Z')));
  assert.ok(isPastCutoff(cutoff, new Date('2026-07-13T20:00:00Z')));
});
