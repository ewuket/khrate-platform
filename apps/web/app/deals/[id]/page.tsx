'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError, getZone, isSignedIn, rwf, untilClose } from '../../../lib/api';
import TopBar from '../../../components/TopBar';

interface Line {
  id: string;
  name: string;
  description: string | null;
  isBundle: boolean;
  bundleContents: { name: string; quantity: number }[] | null;
  saleUnit: string;
  groupPrice: number;
  soloPrice: number;
  saving: number;
}
interface Fulfilment { id: string; mode: string; location: string | null; locationId: string | null; }
interface Deal {
  id: string;
  title: string;
  zone: string;
  currency: string;
  cutoffAt: string;
  minUnits: number | null;
  fulfilment: Fulfilment[];
  lines: Line[];
}

export default function DealPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [fulfilmentId, setFulfilmentId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  // Restore an in-progress selection (e.g. after bouncing through sign-in).
  useEffect(() => {
    const saved = sessionStorage.getItem(`sel_${id}`);
    if (saved) {
      const s = JSON.parse(saved);
      setQty(s.qty ?? {});
      setFulfilmentId(s.fulfilmentId ?? '');
    }
  }, [id]);

  useEffect(() => {
    api<Deal | null>(`/deals/${id}`, { auth: false })
      .then((d) => {
        if (!d) {
          setError('This deal has closed or is no longer available.');
          return;
        }
        setDeal(d);
        if (d.fulfilment.length === 1) setFulfilmentId((f) => f || d.fulfilment[0].id);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  function persist(nextQty: Record<string, number>, nextFul: string) {
    sessionStorage.setItem(`sel_${id}`, JSON.stringify({ qty: nextQty, fulfilmentId: nextFul }));
  }
  function setQ(lineId: string, n: number) {
    const next = { ...qty, [lineId]: Math.max(0, n) };
    setQty(next);
    persist(next, fulfilmentId);
  }
  function setFul(fid: string) {
    setFulfilmentId(fid);
    persist(qty, fid);
  }

  const subtotal = useMemo(
    () => (deal?.lines ?? []).reduce((sum, l) => sum + (qty[l.id] ?? 0) * l.groupPrice, 0),
    [deal, qty],
  );
  const totalUnits = Object.values(qty).reduce((a, b) => a + b, 0);
  const chosenFul = deal?.fulfilment.find((f) => f.id === fulfilmentId);

  async function reserve() {
    if (!deal || totalUnits === 0) return;
    if (!fulfilmentId) {
      setError('Please choose where to collect your groceries.');
      return;
    }
    if (!isSignedIn()) {
      // Keep the basket, send them to sign in, and come right back here.
      router.push(`/auth?next=${encodeURIComponent(`/deals/${id}`)}`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const lines = deal.lines.filter((l) => (qty[l.id] ?? 0) > 0).map((l) => ({ dealLineId: l.id, quantity: qty[l.id] }));
      const order = await api<{ id: string }>(`/deals/${id}/join`, {
        method: 'POST',
        body: {
          lines,
          fulfilmentMode: chosenFul?.mode ?? 'DROP_POINT',
          fulfilmentOptionId: fulfilmentId,
          locationId: chosenFul?.locationId ?? undefined,
        },
      });
      sessionStorage.removeItem(`sel_${id}`);
      router.push(`/checkout/${order.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/auth?next=${encodeURIComponent(`/deals/${id}`)}`);
        return;
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !deal) {
    return (
      <>
        <TopBar back />
        <div className="pad"><div className="notice" style={{ marginTop: 20 }}>{error}</div></div>
      </>
    );
  }
  if (!deal) {
    return (
      <>
        <TopBar back />
        <div className="pad"><div className="skel" style={{ height: 300, marginTop: 20 }} /></div>
      </>
    );
  }

  return (
    <>
      <TopBar back />
      <div className="pad">
        <h1 className="page" style={{ fontSize: 22 }}>{deal.title.replace(' [SAMPLE]', '')}</h1>
        <div className="deal-meta" style={{ marginTop: 6 }}>
          <span className="chip time">⏱ {untilClose(deal.cutoffAt)}</span>
          {deal.minUnits && <span className="chip private">Unlocks at {deal.minUnits} items</span>}
        </div>

        <div className="notice fresh" style={{ marginTop: 16 }}>
          You only pay if the group succeeds. If it doesn’t reach its goal by the deadline,
          you’re refunded in full.
        </div>

        <div className="section-title">Choose your items</div>
        <div className="card"><div className="card-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {deal.lines.map((l) => (
            <div className="line" key={l.id}>
              <div className="line-info">
                <div className="line-name">{l.isBundle ? '🧺 ' : ''}{l.name.replace(' [SAMPLE]', '')}</div>
                <div className="line-sub">
                  <span className="price-now">{rwf(l.groupPrice)}</span>
                  {l.saving > 0 && <span className="price-was">{rwf(l.soloPrice)}</span>}
                  {l.saving > 0 && <span style={{ color: 'var(--fresh-600)', fontWeight: 700, marginLeft: 6 }}>save {rwf(l.saving)}</span>}
                </div>
                {l.isBundle && l.bundleContents && (
                  <div className="line-sub" style={{ marginTop: 3 }}>
                    Includes: {l.bundleContents.map((c) => `${c.quantity}× ${c.name.replace(' [SAMPLE]', '')}`).join(', ')}
                  </div>
                )}
              </div>
              <div className="stepper">
                <button onClick={() => setQ(l.id, (qty[l.id] ?? 0) - 1)} aria-label="Remove one">−</button>
                <span className="q">{qty[l.id] ?? 0}</span>
                <button onClick={() => setQ(l.id, (qty[l.id] ?? 0) + 1)} aria-label="Add one">+</button>
              </div>
            </div>
          ))}
        </div></div>

        <div className="section-title">Where to collect</div>
        {deal.fulfilment.map((f) => (
          <button
            key={f.id}
            className="card"
            style={{ width: '100%', textAlign: 'left', marginBottom: 10, border: fulfilmentId === f.id ? '2px solid var(--brand-500)' : '2px solid transparent' }}
            onClick={() => setFul(f.id)}
          >
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{f.mode === 'HOME_DELIVERY' ? '🏠' : '📍'}</span>
              <div>
                <div style={{ fontWeight: 700 }}>{f.location?.replace(' [SAMPLE]', '') ?? modeLabel(f.mode)}</div>
                <div className="line-sub">{modeLabel(f.mode)}</div>
              </div>
            </div>
          </button>
        ))}

        {error && <p className="error">{error}</p>}
      </div>

      <div className="actionbar">
        <div className="total">
          <span className="muted">{totalUnits} item{totalUnits === 1 ? '' : 's'}</span>
          <span className="amt">{rwf(subtotal)}</span>
        </div>
        <button className="btn" disabled={totalUnits === 0 || busy} onClick={reserve}>
          {busy ? 'Reserving…' : totalUnits === 0 ? 'Add items to join' : 'Reserve my spot'}
        </button>
      </div>
    </>
  );
}

function modeLabel(mode: string): string {
  const map: Record<string, string> = {
    HOME_DELIVERY: 'Home delivery',
    DROP_POINT: 'Neighbourhood drop point',
    APARTMENT: 'Apartment delivery',
    OFFICE: 'Office delivery',
    CAMPUS: 'Campus pickup',
    PICKUP_LOCATION: 'KHRATE pickup point',
  };
  return map[mode] ?? mode;
}
