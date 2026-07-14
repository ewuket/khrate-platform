'use client';

import { useEffect, useState } from 'react';
import { api, fmtRwf } from '../../../lib/api';

interface BoardDeal {
  id: string;
  title: string;
  zone: string;
  state: string;
  cutoffAt: string;
  orders: number;
  demand: { totalUnits: number; totalValue: number };
  threshold: { minUnits: number | null; minValue: number | null };
  fraction: number;
  wouldTip: boolean;
}

export default function DealBoard() {
  const [deals, setDeals] = useState<BoardDeal[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      setDeals(await api<BoardDeal[]>('/admin/deals/board'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000); // the board is live: refresh every 30s
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <h1>Deal board</h1>
      <p className="sub">
        Live group deals: progress to tip, cut-off countdowns, outcomes.{' '}
        <a href="/deals/new" className="btn sm" style={{ marginLeft: 8 }}>
          + New deal
        </a>
      </p>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Deal</th>
              <th>State</th>
              <th>Cut-off</th>
              <th>Orders</th>
              <th>Demand</th>
              <th style={{ width: 180 }}>Progress to tip</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id}>
                <td>
                  <strong>{d.title}</strong>
                  <br />
                  <span className="muted">{d.zone}</span>
                </td>
                <td>
                  <span className={`badge ${d.state.toLowerCase()}`}>{d.state}</span>
                </td>
                <td>{new Date(d.cutoffAt).toLocaleString()}</td>
                <td>{d.orders}</td>
                <td>
                  {d.demand.totalUnits} units
                  <br />
                  <span className="muted">{fmtRwf(d.demand.totalValue)}</span>
                </td>
                <td>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${d.wouldTip ? 'full' : ''}`}
                      style={{ width: `${Math.round(d.fraction * 100)}%` }}
                    />
                  </div>
                  <span className="muted">
                    {Math.round(d.fraction * 100)}%{d.wouldTip ? ' — would tip' : ''}
                  </span>
                </td>
                <td>
                  <a className="btn sm secondary" href={`/deals/${d.id}`}>
                    Open
                  </a>
                </td>
              </tr>
            ))}
            {deals.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No live deals. Create one to start the day.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
