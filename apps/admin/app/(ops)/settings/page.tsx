'use client';

import { useEffect, useState } from 'react';
import { api, fmtRwf } from '../../../lib/api';

interface Policy {
  key: string;
  value: string;
  description: string | null;
}
interface PricingRule {
  id: string;
  name: string;
  priority: number;
  mode: string | null;
  groupOnly: boolean | null;
  baseFee: string;
  freeAboveValue: string | null;
  isActive: boolean;
}

/** Business rules as data: refund policy and delivery pricing, changeable without a deploy. */
export default function Settings() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      setPolicies(await api<Policy[]>('/admin/config/policies'));
      setRules(await api<PricingRule[]>('/admin/config/pricing-rules'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function setPolicy(key: string, value: string) {
    await api(`/admin/config/policies/${key}`, { method: 'POST', body: { value } });
    await load();
  }

  const refundDefault = policies.find((p) => p.key === 'refund.default')?.value ?? 'MOMO_REFUND';

  return (
    <>
      <h1>Settings</h1>
      <p className="sub">Configuration, not code: refund behaviour and delivery pricing. All changes are audited.</p>
      {error && <div className="error">{error}</div>}
      <div className="card" style={{ maxWidth: 520 }}>
        <h3>Refund policy</h3>
        <label>Default refund destination</label>
        <select value={refundDefault} onChange={(e) => setPolicy('refund.default', e.target.value)}>
          <option value="MOMO_REFUND">Instant MoMo refund (trust-first)</option>
          <option value="WALLET_CREDIT">KHRATE wallet credit</option>
        </select>
        <p className="muted" style={{ marginTop: 8 }}>
          Applies when a deal fails or a refund is approved. Customers may still choose the
          other option while customer choice is enabled.
        </p>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Delivery pricing rules</h3>
        <table>
          <thead>
            <tr>
              <th>Priority</th>
              <th>Rule</th>
              <th>Mode</th>
              <th>Scope</th>
              <th>Base fee</th>
              <th>Free above</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td>{r.priority}</td>
                <td>{r.name}</td>
                <td>{r.mode ?? 'any'}</td>
                <td>{r.groupOnly == null ? 'all orders' : r.groupOnly ? 'group only' : 'solo only'}</td>
                <td>{fmtRwf(r.baseFee)}</td>
                <td>{r.freeAboveValue ? fmtRwf(r.freeAboveValue) : '—'}</td>
                <td>
                  <span className={`badge ${r.isActive ? 'confirmed' : 'failed'}`}>
                    {r.isActive ? 'ACTIVE' : 'OFF'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 8 }}>
          First matching rule by priority wins. Rule editing UI arrives with zone operations;
          rules are managed in data today.
        </p>
      </div>
    </>
  );
}
