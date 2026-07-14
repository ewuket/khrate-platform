'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, rwf } from '../../../lib/api';
import TopBar from '../../../components/TopBar';

interface OrderDetail {
  id: string;
  title: string;
  total: number;
  createdAt: string;
  paymentVerified: boolean;
  dropPoint: string | null;
  status: { key: string; label: string; detail: string };
  items: { name: string; quantity: number }[];
}

/** The ordered stages the customer moves through — the operational reality, told simply. */
const STAGES = [
  { key: 'confirming_payment', label: 'Payment confirmed', short: 'confirming_payment' },
  { key: 'gathering_group', label: 'Group gathering' },
  { key: 'confirmed', label: 'Group confirmed' },
  { key: 'preparing', label: 'Being prepared' },
  { key: 'on_the_way', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
];
const ORDER = ['confirming_payment', 'gathering_group', 'confirmed', 'preparing', 'on_the_way', 'delivered'];

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      setOrder(await api<OrderDetail>(`/me/orders/${id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 20_000); // keep status fresh while the order moves
    return () => clearInterval(t);
  }, [id]);

  if (error) return (<><TopBar back /><div className="pad"><p className="error">{error}</p></div></>);
  if (!order) return (<><TopBar back /><div className="pad"><div className="skel" style={{ height: 320, marginTop: 20 }} /></div></>);

  const refunded = order.status.key === 'refunded';
  const currentIdx = ORDER.indexOf(order.status.key);

  function shareWhatsApp() {
    const url = typeof window !== 'undefined' ? window.location.origin + `/deals` : '';
    const text = encodeURIComponent(
      `I just joined a KHRATE group deal to get groceries cheaper 🧺🥬 Join before it closes and we all pay less: ${url}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  return (
    <>
      <TopBar back />
      <div className="pad">
        <h1 className="page" style={{ fontSize: 22 }}>{order.title.replace(' [SAMPLE]', '')}</h1>
        <p className="muted">Order placed {new Date(order.createdAt).toLocaleDateString()} · {rwf(order.total)}</p>

        <div className={`notice ${refunded ? '' : 'fresh'}`} style={{ marginTop: 16 }}>
          <strong>{order.status.label}.</strong> {order.status.detail}
        </div>

        {!refunded && (
          <>
            <div className="section-title">Progress</div>
            <div className="timeline">
              {STAGES.map((s) => {
                const idx = ORDER.indexOf(s.key);
                const cls = idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : '';
                return (
                  <div className={`step ${cls}`} key={s.key}>
                    <div className="s-label" style={{ color: idx <= currentIdx ? 'var(--n900)' : 'var(--n300)' }}>{s.label}</div>
                    {idx === currentIdx && <div className="s-detail">{order.status.detail}</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="section-title">Your items</div>
        <div className="card"><div className="card-body">
          {order.items.map((i, n) => (
            <div className="line" key={n}>
              <div className="line-info"><div className="line-name">{i.name.replace(' [SAMPLE]', '')}</div></div>
              <div style={{ fontWeight: 700 }}>×{i.quantity}</div>
            </div>
          ))}
          {order.dropPoint && (
            <div className="line" style={{ borderTop: '1px solid var(--n100)' }}>
              <div className="line-info"><div className="line-sub">Collect at</div><div className="line-name">📍 {order.dropPoint.replace(' [SAMPLE]', '')}</div></div>
            </div>
          )}
        </div></div>

        {order.status.key === 'gathering_group' && (
          <>
            <div className="notice" style={{ marginTop: 16 }}>
              The sooner the group fills, the sooner it’s confirmed. Invite a neighbour — you both win.
            </div>
            <button className="btn wa" style={{ marginTop: 12 }} onClick={shareWhatsApp}>
              Share on WhatsApp
            </button>
          </>
        )}
      </div>
    </>
  );
}
