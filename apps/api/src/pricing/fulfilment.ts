/**
 * Fulfilment modes — how groceries reach a customer. Pluggable and extensible
 * (founder clarification #1 / ADR-0009). Neighbourhood drop is the launch efficiency
 * play, not the only model. Mirrors the Prisma `FulfilmentMode` enum.
 */
export type FulfilmentMode =
  | 'HOME_DELIVERY'
  | 'DROP_POINT'
  | 'APARTMENT'
  | 'OFFICE'
  | 'CAMPUS'
  | 'PICKUP_LOCATION';

export const FULFILMENT_MODES: FulfilmentMode[] = [
  'HOME_DELIVERY',
  'DROP_POINT',
  'APARTMENT',
  'OFFICE',
  'CAMPUS',
  'PICKUP_LOCATION',
];

/** Does this mode deliver to a customer Address (vs. a served Location)? */
export function targetsAddress(mode: FulfilmentMode): boolean {
  return mode === 'HOME_DELIVERY';
}

/** Modes that aggregate many orders into one drop — the source of the density saving. */
export function isDense(mode: FulfilmentMode): boolean {
  return mode === 'DROP_POINT' || mode === 'APARTMENT' || mode === 'OFFICE' || mode === 'CAMPUS';
}
