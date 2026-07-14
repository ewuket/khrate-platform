'use client';

/**
 * Tiny API client for the KHRATE admin. Staff JWT lives in localStorage; every request
 * carries it. 401 -> back to login.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('khrate_staff_token');
}

export function getStaff(): { name: string; email: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('khrate_staff');
  return raw ? JSON.parse(raw) : null;
}

export function logout(): void {
  localStorage.removeItem('khrate_staff_token');
  localStorage.removeItem('khrate_staff');
  window.location.href = '/login';
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (res.status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
    logout();
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
  }
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<void> {
  const res = await api<{ token: string; staff: unknown }>('/staff/login', {
    method: 'POST',
    body: { email, password },
  });
  localStorage.setItem('khrate_staff_token', res.token);
  localStorage.setItem('khrate_staff', JSON.stringify(res.staff));
}

export function fmtRwf(minor: number | string): string {
  return `RWF ${Number(minor).toLocaleString('en-US')}`;
}
