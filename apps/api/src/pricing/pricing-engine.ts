/**
 * KHRATE pricing engine — pure, configurable delivery/service fee resolution.
 *
 * Fees are DATA, not code (founder clarification #4 / ADR-0010). Rules come from the
 * `PricingRule` table; this resolver interprets them. Keeping it pure means we can prove
 * the money maths and evolve pricing without touching order/deal logic.
 *
 * Evaluation: active rules sorted by `priority` ascending; the FIRST rule whose conditions
 * match the context computes the fee. If none match, the fee is zero (safe default —
 * KHRATE never invents a charge the config didn't specify).
 */

import type { FulfilmentMode } from './fulfilment.ts';

export interface PricingRule {
  id: string;
  zoneId: string | null; // null = any zone
  priority: number;
  isActive: boolean;
  mode: FulfilmentMode | null; // null = any mode
  groupOnly: boolean | null; // true=group only, false=solo only, null=both
  minOrderValue: number | null; // minor units
  baseFee: number;
  percentBps: number; // basis points of subtotal
  minFee: number | null;
  maxFee: number | null;
  freeAboveValue: number | null;
}

export interface PricingContext {
  zoneId: string;
  mode: FulfilmentMode;
  isGroup: boolean;
  subtotal: number; // minor units
}

export interface PricingResult {
  fee: number; // minor units
  ruleId: string | null; // which rule applied (null = no rule matched -> 0)
  free: boolean;
}

function matches(rule: PricingRule, ctx: PricingContext): boolean {
  if (!rule.isActive) return false;
  if (rule.zoneId !== null && rule.zoneId !== ctx.zoneId) return false;
  if (rule.mode !== null && rule.mode !== ctx.mode) return false;
  if (rule.groupOnly !== null && rule.groupOnly !== ctx.isGroup) return false;
  if (rule.minOrderValue !== null && ctx.subtotal < rule.minOrderValue) return false;
  return true;
}

function computeFee(rule: PricingRule, ctx: PricingContext): number {
  if (rule.freeAboveValue !== null && ctx.subtotal >= rule.freeAboveValue) {
    return 0;
  }
  // Integer maths only: percent of subtotal in basis points, floored.
  const percentPart = Math.floor((ctx.subtotal * rule.percentBps) / 10000);
  let fee = rule.baseFee + percentPart;
  if (rule.minFee !== null) fee = Math.max(fee, rule.minFee);
  if (rule.maxFee !== null) fee = Math.min(fee, rule.maxFee);
  return Math.max(0, fee);
}

export function resolveDeliveryFee(
  rules: PricingRule[],
  ctx: PricingContext,
): PricingResult {
  const ordered = [...rules].sort((a, b) => a.priority - b.priority);
  for (const rule of ordered) {
    if (matches(rule, ctx)) {
      const fee = computeFee(rule, ctx);
      return { fee, ruleId: rule.id, free: fee === 0 };
    }
  }
  return { fee: 0, ruleId: null, free: true };
}
