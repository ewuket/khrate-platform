'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

interface Product {
  id: string;
  name: string;
  category: string;
  saleUnit: string;
  isFresh: boolean;
  isActive: boolean;
}

export default function Catalogue() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [saleUnit, setSaleUnit] = useState('EACH');

  async function load() {
    try {
      setProducts(await api<Product[]>('/admin/catalogue/products'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/catalogue/products', { method: 'POST', body: { name, category, saleUnit } });
      setName('');
      setCategory('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function toggle(p: Product) {
    await api(`/admin/catalogue/products/${p.id}`, { method: 'PATCH', body: { isActive: !p.isActive } });
    await load();
  }

  return (
    <>
      <h1>Catalogue</h1>
      <p className="sub">Products and sale units. Fresh items carry weight/substitution handling.</p>
      {error && <div className="error">{error}</div>}
      <form className="card" onSubmit={create} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 2 }}>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div style={{ flex: 1 }}>
          <label>Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} required />
        </div>
        <div>
          <label>Sale unit</label>
          <select value={saleUnit} onChange={(e) => setSaleUnit(e.target.value)}>
            {['EACH', 'KG', 'BUNCH', 'PACK'].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
        <button className="btn">Add</button>
      </form>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{p.saleUnit}</td>
                <td>
                  <span className={`badge ${p.isActive ? 'confirmed' : 'failed'}`}>
                    {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td>
                  <button className="btn sm secondary" onClick={() => toggle(p)}>
                    {p.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
