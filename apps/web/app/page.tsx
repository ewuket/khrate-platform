'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getZone } from '../lib/api';

/**
 * Landing — the 5-second pitch. A first-time Kigali shopper must grasp the whole idea:
 * buy groceries, pay less by joining neighbours, get them at a drop point nearby. No
 * jargon, no fake numbers. If they've already chosen a location, skip straight to the shop.
 */
export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    if (getZone()) router.replace('/shop');
  }, [router]);

  return (
    <div className="pad" style={{ paddingBottom: 40 }}>
      <div style={{ padding: '18px 0 8px' }}>
        <div className="wordmark" style={{ fontSize: 28 }}>
          KHRATE<span className="dot">.</span>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <h1 style={{ fontSize: 34, fontWeight: 850, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
          Groceries,<br />
          <span style={{ color: 'var(--brand-600)' }}>better together.</span>
        </h1>
        <p className="muted" style={{ fontSize: 17, marginTop: 12 }}>
          Shop fresh food for your home in Kigali — and pay less when your neighbours
          buy along with you. We deliver to a drop point near you.
        </p>
      </div>

      <div style={{ marginTop: 26 }}>
        <button className="btn" onClick={() => router.push('/location')}>
          Get started
        </button>
        <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => router.push('/shop')}>
          Browse without choosing a location
        </button>
      </div>

      <div className="section-title">How KHRATE works</div>
      <Step n={1} title="Join a group deal" text="Pick fresh groceries or a ready bundle from today’s open deals." />
      <Step n={2} title="Neighbours join too" text="When enough people join before the deadline, the lower group price unlocks for everyone." />
      <Step n={3} title="We buy fresh & deliver" text="We buy exactly what’s ordered, pack it, and bring it to your drop point." />

      <div className="trust">
        <div className="t">
          <div className="h">🔒 Your spot is safe</div>
          If a group doesn’t reach its goal, you’re refunded in full. No risk to join.
        </div>
        <div className="t">
          <div className="h">📱 Pay with Mobile Money</div>
          Simple MTN/Airtel MoMo. We confirm every payment before we buy.
        </div>
        <div className="t">
          <div className="h">🥬 Honest prices</div>
          We show the real everyday price beside the group price. No fake discounts.
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
      <div
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'var(--brand-500)',
          color: '#fff',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {n}
      </div>
      <div>
        <div style={{ fontWeight: 750, fontSize: 16 }}>{title}</div>
        <div className="muted">{text}</div>
      </div>
    </div>
  );
}
