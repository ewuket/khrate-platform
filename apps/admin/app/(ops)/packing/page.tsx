'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

interface BoardDeal {
  id: string;
  title: string;
  state: string;
}
interface PackOrder {
  id: string;
  state: string;
  customer: { name: string | null; phone: string };
  payment: { state: string } | null;
  items: {
    id: string;
    quantity: number;
    fulfilledQuantity: number | null;
    substitutionNote: string | null;
    dealLine: { product: { name: string } | null; bundle: { name: string } | null };
  }[];
}

/** Packing queue: pick lists per order, record actual weights/substitutions, mark READY. */
export default function Packing() {
  const [deals, setDeals] = useState<BoardDeal[]>([]);
  const [dealId, setDealId] = useState('');
  const [orders, setOrders] = useState<PackOrder[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Packers see confirmed deals via the board endpoint (read allowed for coordinator;
    // ops staff use the packing endpoint per deal). Simplest: list from packing itself.
    api<BoardDeal[]>('/admin/deals/board')
      .then((d) => setDeals(d.filter((x) => ['CONFIRMED', 'PROCURING'].includes(x.state))))
      .catch(() => setDeals([]));
  }, []);

  async function load(id: string) {
    setDealId(id);
    if (!id) return setOrders([]);
    try {
      setOrders(await api<PackOrder[]>(`/admin/orders/packing?dealId=${id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function setState(orderId: string, state: 'PREPARING' | 'READY') {
    try {
      await api(`/admin/orders/${orderId}/state/${state}`, { method: 'POST' });
      await load(dealId);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function recordQty(itemId: string, qty: string) {
    if (qty === '') return;
    try {
      await api(`/admin/orders/items/${itemId}/fulfilment`, {
        method: 'PATCH',
        body: { fulfilledQuantity: Number(qty) },
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <h1>Packing queue</h1>
      <p className="sub">
        Pick, weigh, substitute, quality-check. Record what was actually packed — customers
        see the honest reality, never a silent swap.
      </p>
      <div className="card" style={{ maxWidth: 480 }}>
        <label>Confirmed deal</label>
        <select value={dealId} onChange={(e) => load(e.target.value)}>
          <option value="">Select a deal…</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="error">{error}</div>}
      {orders.map((o) => (
        <div className="card" key={o.id}>
          <p>
            <strong>{o.customer.name ?? o.customer.phone}</strong>{' '}
            <span className={`badge ${o.state.toLowerCase()}`}>{o.state}</span>{' '}
            {o.payment?.state !== 'CAPTURED' && <span className="badge pending">PAYMENT UNVERIFIED</span>}
          </p>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Ordered</th>
                <th>Packed qty</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id}>
                  <td>{i.dealLine.product?.name ?? i.dealLine.bundle?.name}</td>
                  <td>{i.quantity}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      style={{ width: 90 }}
                      defaultValue={i.fulfilledQuantity ?? ''}
                      onBlur={(e) => recordQty(i.id, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10 }}>
            {o.state === 'CONFIRMED' && (
              <button className="btn sm" onClick={() => setState(o.id, 'PREPARING')}>
                Start packing
              </button>
            )}
            {o.state === 'PREPARING' && (
              <button className="btn sm" onClick={() => setState(o.id, 'READY')}>
                Mark ready
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
