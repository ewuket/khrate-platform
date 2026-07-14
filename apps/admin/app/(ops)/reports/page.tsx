'use client';

import { useEffect, useState } from 'react';
import { api, fmtRwf } from '../../../lib/api';

interface Report {
  deals: Record<string, number>;
  tipRate: number | null;
  orders: Record<string, number>;
  payments: { state: string; count: number; total: number }[];
  realisedSavingMinor: number;
}

/** The few metrics that matter — no vanity dashboards (docs/operations/10). */
export default function Reports() {
  const [r, setR] = useState<Report | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Report>('/admin/reports').then(setR).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!r) return null;

  const captured = r.payments.find((p) => p.state === 'CAPTURED');
  const refunded = r.payments.find((p) => p.state === 'REFUNDED');

  return (
    <>
      <h1>Reports</h1>
      <p className="sub">The health of the model: tip rate, honest savings delivered, money states.</p>
      <div className="grid">
        <div className="card stat">
          <div className="value">{r.tipRate == null ? '—' : `${Math.round(r.tipRate * 100)}%`}</div>
          <div className="label">Tip rate (deals that reached threshold)</div>
        </div>
        <div className="card stat">
          <div className="value">{fmtRwf(r.realisedSavingMinor)}</div>
          <div className="label">Realised customer saving (group vs solo)</div>
        </div>
        <div className="card stat">
          <div className="value">{captured ? fmtRwf(captured.total) : 'RWF 0'}</div>
          <div className="label">Verified revenue ({captured?.count ?? 0} payments)</div>
        </div>
        <div className="card stat">
          <div className="value">{refunded ? fmtRwf(refunded.total) : 'RWF 0'}</div>
          <div className="label">Refunded ({refunded?.count ?? 0})</div>
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Deals by state</h3>
        <table>
          <tbody>
            {Object.entries(r.deals).map(([s, n]) => (
              <tr key={s}>
                <td>
                  <span className={`badge ${s.toLowerCase()}`}>{s}</span>
                </td>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Orders by state</h3>
        <table>
          <tbody>
            {Object.entries(r.orders).map(([s, n]) => (
              <tr key={s}>
                <td>
                  <span className={`badge ${s.toLowerCase()}`}>{s}</span>
                </td>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
