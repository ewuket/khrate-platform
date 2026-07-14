'use client';

import { useEffect, useState } from 'react';
import { api, fmtRwf } from '../../../lib/api';

interface PendingPayment {
  orderId: string;
  amount: string;
  providerRef: string | null;
  createdAt: string;
  order: {
    customer: { name: string | null; phone: string };
    deal: { title: string } | null;
  };
}

/**
 * The verification queue. At the manual-MoMo launch stage a human reviewer checks each
 * reference against the MoMo statement — payment is never auto-trusted (fraud lesson).
 */
export default function PaymentReview() {
  const [pending, setPending] = useState<PendingPayment[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  async function load() {
    try {
      setPending(await api<PendingPayment[]>('/admin/payments/pending'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function verify(orderId: string) {
    setBusyId(orderId);
    try {
      await api(`/admin/payments/${orderId}/verify`, { method: 'POST' });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <>
      <h1>Payment review</h1>
      <p className="sub">
        Manual Mobile Money verifications. Check each reference against the KHRATE MoMo
        statement before verifying — orders cannot be packed until payment is verified.
      </p>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Deal</th>
              <th>Amount</th>
              <th>MoMo reference</th>
              <th>Received</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pending.map((p) => (
              <tr key={p.orderId}>
                <td>
                  {p.order.customer.name ?? '—'}
                  <br />
                  <span className="muted">{p.order.customer.phone}</span>
                </td>
                <td>{p.order.deal?.title ?? 'Solo order'}</td>
                <td>
                  <strong>{fmtRwf(p.amount)}</strong>
                </td>
                <td>{p.providerRef ?? <span className="error">no reference</span>}</td>
                <td>{new Date(p.createdAt).toLocaleString()}</td>
                <td>
                  <button className="btn sm" disabled={busyId === p.orderId} onClick={() => verify(p.orderId)}>
                    {busyId === p.orderId ? '…' : 'Verify'}
                  </button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Queue clear — no payments awaiting verification.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
