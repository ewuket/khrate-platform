'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, isSignedIn, rwf } from '../../lib/api';
import TopBar from '../../components/TopBar';
import TabBar from '../../components/TabBar';

interface OrderRow {
  id: string;
  title: string;
  total: number;
  createdAt: string;
  status: { key: string; label: string; detail: string };
  items: { name: string; quantity: number }[];
}

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace(`/auth?next=${encodeURIComponent('/orders')}`);
      return;
    }
    api<OrderRow[]>('/me/orders')
      .then(setOrders)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace(`/auth?next=${encodeURIComponent('/orders')}`);
        else setError(e.message);
      });
  }, [router]);

  return (
    <>
      <TopBar />
      <div className="pad">
        <h1 className="page">Your orders</h1>
        {error && <p className="error">{error}</p>}
        {!orders && <div className="skel" style={{ height: 100, marginTop: 16 }} />}
        {orders?.length === 0 && (
          <div className="notice" style={{ marginTop: 16 }}>
            No orders yet. Join a group deal and it’ll show up here.
            <div style={{ marginTop: 12 }}>
              <button className="btn sm" onClick={() => router.push('/shop')}>Browse deals</button>
            </div>
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          {orders?.map((o) => (
            <button
              key={o.id}
              className="card"
              style={{ width: '100%', textAlign: 'left', marginBottom: 12 }}
              onClick={() => router.push(`/orders/${o.id}`)}
            >
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontWeight: 750 }}>{o.title.replace(' [SAMPLE]', '')}</span>
                  <StatusPill status={o.status} />
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {o.items.map((i) => `${i.quantity}× ${i.name.replace(' [SAMPLE]', '')}`).join(', ')}
                </div>
                <div style={{ marginTop: 8, fontWeight: 700 }}>{rwf(o.total)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <TabBar />
    </>
  );
}

function StatusPill({ status }: { status: { key: string; label: string } }) {
  const tone: Record<string, string> = {
    delivered: 'save',
    confirmed: 'save',
    refunded: 'private',
    cancelled: 'private',
    on_the_way: 'time',
    preparing: 'time',
  };
  return <span className={`chip ${tone[status.key] ?? 'time'}`}>{status.label}</span>;
}
