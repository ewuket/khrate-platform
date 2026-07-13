/**
 * KHRATE group-deal state machine — pure domain logic.
 *
 * This is the heart of the differentiator (docs/product/03_GROUP_BUYING_MODEL.md).
 * It is deliberately free of Prisma/Nest/IO so the tip/fail rules — the part that
 * moves customers' money — can be proven correct in isolation.
 *
 * State: OPEN -> LOCKED -> CONFIRMED -> PROCURING -> OUT_FOR_DELIVERY -> FULFILLED
 *                    \-> FAILED (threshold not met -> refund/release)
 *        (any active) -> CANCELLED (staff)
 */

export type DealState =
  | 'OPEN'
  | 'LOCKED'
  | 'CONFIRMED'
  | 'PROCURING'
  | 'OUT_FOR_DELIVERY'
  | 'FULFILLED'
  | 'FAILED'
  | 'CANCELLED';

export interface DealThreshold {
  /** Minimum total units across all orders to tip. Null = not constrained by units. */
  minUnits: number | null;
  /** Minimum total order value (minor units) to tip. Null = not constrained by value. */
  minValue: number | null;
}

export interface DealDemand {
  totalUnits: number;
  totalValue: number; // minor units
}

/** Allowed forward transitions. Everything else is rejected. */
const TRANSITIONS: Record<DealState, DealState[]> = {
  OPEN: ['LOCKED', 'CANCELLED'],
  LOCKED: ['CONFIRMED', 'FAILED', 'CANCELLED'],
  CONFIRMED: ['PROCURING', 'CANCELLED'],
  PROCURING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['FULFILLED', 'CANCELLED'],
  FULFILLED: [],
  FAILED: [],
  CANCELLED: [],
};

export function canTransition(from: DealState, to: DealState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: DealState, to: DealState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal deal transition: ${from} -> ${to}`);
  }
}

/**
 * Does current demand meet the threshold to tip?
 *
 * Rule (ADR-0005): a deal with no constraints (both null) always tips — threshold-of-1.
 * If either constraint is set, ALL set constraints must be satisfied. This makes
 * "always-on group price" and "must reach N units" the same code path.
 */
export function meetsThreshold(threshold: DealThreshold, demand: DealDemand): boolean {
  const { minUnits, minValue } = threshold;
  if (minUnits == null && minValue == null) return true;
  if (minUnits != null && demand.totalUnits < minUnits) return false;
  if (minValue != null && demand.totalValue < minValue) return false;
  return true;
}

/** Fraction of the way to tipping, 0..1, for honest progress display ("62% to unlock"). */
export function progressToTip(threshold: DealThreshold, demand: DealDemand): number {
  const ratios: number[] = [];
  if (threshold.minUnits != null && threshold.minUnits > 0) {
    ratios.push(demand.totalUnits / threshold.minUnits);
  }
  if (threshold.minValue != null && threshold.minValue > 0) {
    ratios.push(demand.totalValue / threshold.minValue);
  }
  if (ratios.length === 0) return 1;
  // Slowest-moving constraint governs the honest progress figure.
  return Math.min(1, Math.min(...ratios));
}

export interface TipDecision {
  nextState: Extract<DealState, 'CONFIRMED' | 'FAILED'>;
  tipped: boolean;
  reason: string;
}

/**
 * The decision made at cut-off. Given a LOCKED deal's threshold and demand, decide
 * whether it CONFIRMS (capture payments, procure) or FAILS (release/refund everyone).
 */
export function decideTip(threshold: DealThreshold, demand: DealDemand): TipDecision {
  if (meetsThreshold(threshold, demand)) {
    return { nextState: 'CONFIRMED', tipped: true, reason: 'Threshold met' };
  }
  const parts: string[] = [];
  if (threshold.minUnits != null) {
    parts.push(`${demand.totalUnits}/${threshold.minUnits} units`);
  }
  if (threshold.minValue != null) {
    parts.push(`${demand.totalValue}/${threshold.minValue} value`);
  }
  return {
    nextState: 'FAILED',
    tipped: false,
    reason: `Threshold not met (${parts.join(', ')})`,
  };
}

/** Is the deal past its cut-off and therefore due to LOCK? Pure, clock injected. */
export function isPastCutoff(cutoffAt: Date, now: Date): boolean {
  return now.getTime() >= cutoffAt.getTime();
}
