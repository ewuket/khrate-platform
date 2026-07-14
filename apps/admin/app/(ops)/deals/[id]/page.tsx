'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';

interface Procurement {
  dealId: string;
  state: string;
  items: { productId: string; name: string; saleUnit: string; quantity: number }[];
}

/** Deal detail: the procurement buy list (aggregated pre-sold demand). */
export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const [proc, setProc] = useState<Procurement | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Procurement>(`/admin/deals/${id}/procurement`).then(setProc).catch((e) => setError(e.message));
  }, [id]);

  return (
    <>
      <h1>Procurement list</h1>
      <p className="sub">
        Aggregated, pre-sold quantities for this deal — the buy list for the wholesaler run.
        Nothing speculative: only confirmed, paid demand.
      </p>
      {error && <div className="error">{error}</div>}
      {proc && (
        <div className="card">
          <p>
            Deal state: <span className={`badge ${proc.state.toLowerCase()}`}>{proc.state}</span>
          </p>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit</th>
                <th>Quantity to buy</th>
              </tr>
            </thead>
            <tbody>
              {proc.items.map((i) => (
                <tr key={i.productId}>
                  <td>{i.name}</td>
                  <td>{i.saleUnit}</td>
                  <td>
                    <strong>{i.quantity}</strong>
                  </td>
                </tr>
              ))}
              {proc.items.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    No confirmed demand yet — the list fills when the deal tips.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <a href="/deals" className="btn secondary">
        ← Back to board
      </a>
    </>
  );
}
