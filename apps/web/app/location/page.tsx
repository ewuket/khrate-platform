'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getZone, setZone, Zone } from '../../lib/api';

/**
 * Location picker. In group buying, location is everything — it decides which deals and
 * drop points a customer sees, and it's what makes dense, cheap delivery possible. We ask
 * for it up front, once, and remember it.
 */
export default function LocationPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string>(getZone()?.id ?? '');

  useEffect(() => {
    api<Zone[]>('/zones', { auth: false })
      .then(setZones)
      .catch((e) => setError(e.message));
  }, []);

  function choose(z: Zone) {
    setZone(z);
    router.push('/shop');
  }

  return (
    <div className="pad">
      <div style={{ padding: '18px 0 4px' }}>
        <button className="btn ghost" onClick={() => router.push('/')}>← Back</button>
      </div>
      <h1 className="page">Where should we deliver?</h1>
      <p className="muted">Choose your area. You’ll see the group deals and drop points near you.</p>

      {error && <p className="error">{error}</p>}
      {!zones && (
        <div style={{ marginTop: 20 }}>
          <div className="skel" style={{ height: 74, marginBottom: 12 }} />
          <div className="skel" style={{ height: 74 }} />
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {zones?.map((z) => (
          <button
            key={z.id}
            className="card"
            style={{
              width: '100%',
              textAlign: 'left',
              marginBottom: 12,
              border: selected === z.id ? '2px solid var(--brand-500)' : '2px solid transparent',
            }}
            onClick={() => choose(z)}
          >
            <div className="card-body">
              <div style={{ fontWeight: 750, fontSize: 17 }}>📍 {z.name.replace(' [SAMPLE]', '')}</div>
              <div className="muted" style={{ marginTop: 4 }}>
                {z.dropPoints.length} drop point{z.dropPoints.length === 1 ? '' : 's'} ·{' '}
                {z.dropPoints.map((d) => d.name.replace(' [SAMPLE]', '')).join(', ') || 'Home delivery'}
              </div>
            </div>
          </button>
        ))}
        {zones?.length === 0 && (
          <div className="notice">
            KHRATE isn’t in your area yet — we’re expanding across Kigali. Check back soon.
          </div>
        )}
      </div>
    </div>
  );
}
