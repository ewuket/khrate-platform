'use client';

/**
 * KHRATE web API client. Keeps the customer's session and chosen location in
 * localStorage (survives weak-connection reloads). Small and dependency-free — every
 * kilobyte matters on the devices KHRATE serves.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('khrate_token');
}
export function setSession(token: string): void {
  localStorage.setItem('khrate_token', token);
}
export function signOut(): void {
  localStorage.removeItem('khrate_token');
  window.location.href = '/';
}
export function isSignedIn(): boolean {
  return !!getToken();
}

export interface Zone { id: string; name: string; currency: string; dropPoints: { id: string; name: string; mode: string }[]; }

export function getZone(): Zone | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('khrate_zone');
  return raw ? JSON.parse(raw) : null;
}
export function setZone(z: Zone): void {
  localStorage.setItem('khrate_zone', JSON.stringify(z));
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.auth !== false && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new ApiError(msg || 'Something went wrong', res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** RWF has no minor unit — show whole numbers with thousands separators. */
export function rwf(minor: number | string): string {
  return `RWF ${Number(minor).toLocaleString('en-US')}`;
}

/** Human countdown to a deadline, e.g. "closes in 3h 20m". */
export function untilClose(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'closing now';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `closes in ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `closes in ${h}h ${m}m`;
  return `closes in ${m}m`;
}
