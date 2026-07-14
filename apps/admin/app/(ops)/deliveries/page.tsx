'use client';

import { useEffect, useState } from 'react';
import { api, getStaff } from '../../../lib/api';

interface Delivery {
  orderId: string;
  state: string;
  scheduledFor: string | null;
  order: {
    fulfilmentMode: string;
    location: { name: string } | null;
    address: { line1: string; landmark: string | null } | null;
    customer: { name: string | null; phone: string };
  };
}

/** Delivery board: coordinators see all runs; drivers see only their own. */
export default function Deliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [error, setError] = useState('');
  const role = getStaff()?.role;

  async function load() {
    try {
      setDeliveries(await api<Delivery[]>('/admin/deliveries'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function setState(orderId: string, state: string) {
    try {
      await api(`/admin/deliveries/${orderId}/state/${state}`, { method: 'POST' });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const NEXT: Record<string, string[]> = {
    SCHEDULED: ['PACKED'],
    PACKED: ['OUT_FOR_DELIVERY'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'COLLECTED', 'FAILED'],
  };

  return (
    <>
      <h1>Deliveries</h1>
      <p className="sub">
        {role === 'DRIVER'
          ? 'Your assigned runs. Confirm collection when the customer receives their order.'
          : 'One vehicle, one location, one run — density is the saving.'}
      </p>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Destination</th>
              <th>Customer</th>
              <th>Mode</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.orderId}>
                <td>{d.order.location?.name ?? d.order.address?.line1 ?? '—'}</td>
                <td>
                  {d.order.customer.name ?? '—'}
                  <br />
                  <span className="muted">{d.order.customer.phone}</span>
                </td>
                <td>{d.order.fulfilmentMode}</td>
                <td>
                  <span className={`badge ${d.state.toLowerCase()}`}>{d.state}</span>
                </td>
                <td>
                  {(NEXT[d.state] ?? []).map((s) => (
                    <button key={s} className="btn sm secondary" style={{ marginRight: 6 }} onClick={() => setState(d.orderId, s)}>
                      {s.replaceAll('_', ' ')}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No deliveries scheduled.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
