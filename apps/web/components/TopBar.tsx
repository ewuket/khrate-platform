'use client';

import { useRouter } from 'next/navigation';
import { getZone } from '../lib/api';
import { useEffect, useState } from 'react';

/** Wordmark + current location. Tapping the location returns to the picker. */
export default function TopBar({ back }: { back?: boolean }) {
  const router = useRouter();
  const [zoneName, setZoneName] = useState<string | null>(null);
  useEffect(() => setZoneName(getZone()?.name ?? null), []);

  return (
    <header className="topbar">
      {back ? (
        <button className="btn ghost" onClick={() => router.back()} aria-label="Back">
          ← Back
        </button>
      ) : (
        <div className="wordmark" onClick={() => router.push('/shop')}>
          KHRATE<span className="dot">.</span>
        </div>
      )}
      {zoneName && (
        <button className="loc-pill" onClick={() => router.push('/location')}>
          📍 {zoneName.replace(' [SAMPLE]', '')}
        </button>
      )}
    </header>
  );
}
