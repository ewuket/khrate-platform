import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money, add, multiply, saving, format } from './index.ts';

test('rejects non-integer minor units', () => {
  assert.throws(() => money(1.5, 'RWF'));
});

test('rejects cross-currency arithmetic', () => {
  assert.throws(() => add(money(100, 'RWF'), money(100, 'USD')));
});

test('multiply by quantity', () => {
  assert.deepEqual(multiply(money(1500, 'RWF'), 3), money(4500, 'RWF'));
});

test('saving never goes negative and computes percent', () => {
  const s = saving(money(2000, 'RWF'), money(1500, 'RWF'));
  assert.equal(s.amount.amount, 500);
  assert.equal(s.percent, 25);
  const none = saving(money(1000, 'RWF'), money(1200, 'RWF'));
  assert.equal(none.amount.amount, 0);
});

test('formats RWF with no decimals and USD with two', () => {
  assert.equal(format(money(1500, 'RWF')), 'RWF 1,500');
  assert.equal(format(money(150, 'USD')), 'USD 1.50');
});
