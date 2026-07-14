'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, rwf } from '../../../lib/api';
import TopBar from '../../../components/TopBar';

interface Order {
  id: string;
  title: string;
  total: number;
  currency: string;
  paymentVerified: boolean;
  status: { key: string; label: string; detail: string };
}

/**
 * Manual Mobile Money checkout (launch model). We never pretend the payment is instant:
 * the customer pays to the KHRATE MoMo number, enters their reference, and we tell them
 * plainly that a person confirms it. Trust over theatre.
 *
 * The KHRATE MoMo number shown here is SAMPLE data — the real merchant number is a
 * founder-provided launch configuration (see Phase 3 report).
 */
const KHRATE_MOMO = '*182*8*1*123456#  ·  0788 000 000 [SAMPLE]';

export default function Checkout() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [ref, setRef] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Order>(`/me/orders/${orderId}`)
      .then(setOrder)
      .catch((e) => setError(e.message));
  }, [orderId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/me/orders/${orderId}/payment-ref`, { method: 'POST', body: { providerRef: ref } });
      router.replace(`/orders/${orderId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!order) {
    return (
      <>
        <TopBar back />
        <div className="pad"><div className="skel" style={{ height: 260, marginTop: 20 }} /></div>
      </>
    );
  }

  return (
    <>
      <TopBar back />
      <div className="pad">
        <h1 className="page">Pay with Mobile Money</h1>
        <p className="muted">Your spot in <strong>{order.title.replace(' [SAMPLE]', '')}</strong> is reserved. Complete payment to confirm it.</p>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="muted">Amount to pay</span>
              <span style={{ fontSize: 26, fontWeight: 850 }}>{rwf(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="section-title">How to pay</div>
        <ol style={{ paddingLeft: 20, lineHeight: 1.9 }}>
          <li>Open Mobile Money and send <strong>{rwf(order.total)}</strong> to KHRATE:</li>
          <li style={{ listStyle: 'none', margin: '6px 0' }}>
            <div className="notice" style={{ fontWeight: 700, textAlign: 'center', letterSpacing: '0.02em' }}>{KHRATE_MOMO}</div>
          </li>
          <li>Copy the <strong>transaction reference</strong> from the confirmation message.</li>
          <li>Paste it below so we can confirm your payment.</li>
        </ol>

        <form onSubmit={submit}>
          <label>Mobile Money transaction reference</label>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. MP240714.1234.A56789"
            autoCapitalize="characters"
          />
          {error && <p className="error">{error}</p>}
          <button className="btn" style={{ marginTop: 18 }} disabled={busy || ref.trim().length < 3}>
            {busy ? 'Submitting…' : 'I’ve paid — confirm my order'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
          A KHRATE team member checks your reference against our Mobile Money account before
          we buy your groceries. You’ll see your order move to “confirming payment”, then
          “gathering the group”. If the group doesn’t succeed, you’re refunded in full.
        </p>
      </div>
    </>
  );
}
