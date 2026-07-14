'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

interface Product {
  id: string;
  name: string;
}

/** Create a group deal: the coordinator's seeding tool. */
export default function NewDeal() {
  const [products, setProducts] = useState<Product[]>([]);
  const [title, setTitle] = useState('');
  const [cutoffAt, setCutoffAt] = useState('');
  const [minUnits, setMinUnits] = useState('');
  const [productId, setProductId] = useState('');
  const [groupPrice, setGroupPrice] = useState('');
  const [soloPrice, setSoloPrice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Product[]>('/products').then(setProducts).catch((e) => setError(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/admin/deals', {
        method: 'POST',
        body: {
          title,
          zoneId: 'zone-kigali', // launch zone; multi-zone selector arrives with zone ops
          cutoffAt: new Date(cutoffAt).toISOString(),
          minUnits: minUnits ? Number(minUnits) : undefined,
          lines: [{ productId, groupPrice: Number(groupPrice), soloPrice: Number(soloPrice) }],
          fulfilment: [{ mode: 'DROP_POINT', locationId: 'loc-kimironko' }],
        },
      });
      window.location.href = '/deals';
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>New group deal</h1>
      <p className="sub">Group price must not exceed the honest solo price — the API enforces it.</p>
      <form className="card" style={{ maxWidth: 520 }} onSubmit={submit}>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Kimironko Staples — closes 20:00" />
        <label>Cut-off</label>
        <input type="datetime-local" value={cutoffAt} onChange={(e) => setCutoffAt(e.target.value)} required />
        <label>Minimum units to tip (blank = always tips)</label>
        <input type="number" min={1} value={minUnits} onChange={(e) => setMinUnits(e.target.value)} />
        <label>Product</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
          <option value="">Select…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label>Group price (RWF)</label>
        <input type="number" min={0} value={groupPrice} onChange={(e) => setGroupPrice(e.target.value)} required />
        <label>Solo price (RWF)</label>
        <input type="number" min={0} value={soloPrice} onChange={(e) => setSoloPrice(e.target.value)} required />
        {error && <div className="error">{error}</div>}
        <div style={{ marginTop: 16 }}>
          <button className="btn" disabled={busy}>
            {busy ? 'Creating…' : 'Create deal'}
          </button>{' '}
          <a href="/deals" className="btn secondary">
            Cancel
          </a>
        </div>
      </form>
    </>
  );
}
