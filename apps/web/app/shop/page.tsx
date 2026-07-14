'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getZone, rwf, untilClose } from '../../lib/api';
import TopBar from '../../components/TopBar';
import TabBar from '../../components/TabBar';

interface DealLine {
  id: string;
  name: string;
  isBundle: boolean;
  groupPrice: number;
  soloPrice: number;
  saving: number;
}
interface Deal {
  id: string;
  title: string;
  currency: string;
  cutoffAt: string;
  progress: number;
  unlocked: boolean;
  participants: number;
  lines: DealLine[];
}

export default function Shop() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const zone = getZone();
    if (!zone) {
      router.replace('/location');
      return;
    }
    api<Deal[]>(`/zones/${zone.id}/deals`, { auth: false })
      .then(setDeals)
      .catch((e) => setError(e.message));
  }, [router]);

  return (
    <>
      <TopBar />
      <div className="pad">
        <h1 className="page">Today’s group deals</h1>
        <p className="muted">Join before the deadline to unlock the group price.</p>

        {error && <p className="error">{error}</p>}
        {!deals && (
          <div style={{ marginTop: 18 }}>
            <div className="skel" style={{ height: 190, marginBottom: 14 }} />
            <div className="skel" style={{ height: 190 }} />
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          {deals?.map((d) => (
            <DealCard key={d.id} deal={d} onOpen={() => router.push(`/deals/${d.id}`)} />
          ))}
          {deals?.length === 0 && (
            <div className="notice" style={{ marginTop: 10 }}>
              No open deals in your area right now. New deals open through the day — check back soon.
            </div>
          )}
        </div>
      </div>
      <TabBar />
    </>
  );
}

function DealCard({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  const bestSaving = Math.max(0, ...deal.lines.map((l) => l.saving));
  const pct = Math.round(deal.progress * 100);
  return (
    <div className="deal" onClick={onOpen} role="button">
      <div className="deal-head">
        <div className="deal-title">{deal.title.replace(' [SAMPLE]', '')}</div>
        <div className="deal-meta">
          <span className="chip time">⏱ {untilClose(deal.cutoffAt)}</span>
          {bestSaving > 0 && <span className="chip save">Save up to {rwf(bestSaving)}</span>}
        </div>
      </div>
      <div className="card-body" style={{ paddingTop: 12 }}>
        {deal.lines.slice(0, 3).map((l) => (
          <div className="line" key={l.id} style={{ padding: '9px 0' }}>
            <div className="line-info">
              <div className="line-name">
                {l.isBundle ? '🧺 ' : ''}
                {l.name.replace(' [SAMPLE]', '')}
              </div>
            </div>
            <div>
              <span className="price-now">{rwf(l.groupPrice)}</span>
              {l.saving > 0 && <span className="price-was">{rwf(l.soloPrice)}</span>}
            </div>
          </div>
        ))}
        {deal.lines.length > 3 && <div className="muted" style={{ marginTop: 6 }}>+{deal.lines.length - 3} more</div>}

        <div className="progress-track">
          <div className={`progress-fill ${deal.unlocked ? 'full' : ''}`} style={{ width: `${Math.max(6, pct)}%` }} />
        </div>
        <div className="progress-label">
          {deal.unlocked ? (
            <span className="unlocked">✓ Group price unlocked — join before it closes</span>
          ) : (
            <>
              {pct}% of the way there ·{' '}
              {deal.participants === 0 ? 'be the first to join' : `${deal.participants} neighbour${deal.participants === 1 ? '' : 's'} in`}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
