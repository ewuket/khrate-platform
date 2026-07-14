'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getZone, isSignedIn, signOut } from '../../lib/api';
import TopBar from '../../components/TopBar';
import TabBar from '../../components/TabBar';

export default function Account() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [zoneName, setZoneName] = useState<string | null>(null);

  useEffect(() => {
    setSignedIn(isSignedIn());
    setZoneName(getZone()?.name ?? null);
  }, []);

  return (
    <>
      <TopBar />
      <div className="pad">
        <h1 className="page">Account</h1>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <div className="muted">Delivery area</div>
            <div style={{ fontWeight: 750, fontSize: 17, marginTop: 2 }}>
              📍 {zoneName ? zoneName.replace(' [SAMPLE]', '') : 'Not chosen yet'}
            </div>
            <button className="btn secondary sm" style={{ marginTop: 12 }} onClick={() => router.push('/location')}>
              Change area
            </button>
          </div>
        </div>

        <div className="section-title">Help</div>
        <div className="card"><div className="card-body">
          <p className="muted">
            Questions about an order? Reach KHRATE support on WhatsApp and we’ll sort it out —
            missing items, refunds, or delivery timing.
          </p>
          <a className="btn wa sm" style={{ marginTop: 12 }} href="https://wa.me/250788000000" target="_blank" rel="noreferrer">
            Chat with support
          </a>
        </div></div>

        <div style={{ marginTop: 24 }}>
          {signedIn ? (
            <button className="btn secondary" onClick={signOut}>Sign out</button>
          ) : (
            <button className="btn" onClick={() => router.push('/auth?next=/account')}>Sign in</button>
          )}
        </div>
      </div>
      <TabBar />
    </>
  );
}
