'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStaff, getToken, logout } from '../../lib/api';

/**
 * Ops shell: sidebar nav filtered by the signed-in staff member's role (least
 * privilege — the nav mirrors what the API will actually allow).
 */

const NAV: { href: string; label: string; roles: string[] }[] = [
  { href: '/deals', label: 'Deal board', roles: ['ADMIN', 'GROUP_COORDINATOR'] },
  { href: '/payments', label: 'Payment review', roles: ['ADMIN', 'PAYMENT_REVIEWER'] },
  { href: '/packing', label: 'Packing', roles: ['ADMIN', 'ORDER_OPS'] },
  { href: '/deliveries', label: 'Deliveries', roles: ['ADMIN', 'DELIVERY_COORDINATOR', 'DRIVER'] },
  { href: '/catalogue', label: 'Catalogue', roles: ['ADMIN', 'CATALOGUE_MANAGER'] },
  { href: '/reports', label: 'Reports', roles: ['ADMIN', 'FINANCE'] },
  { href: '/settings', label: 'Settings', roles: ['ADMIN'] },
];

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [staff, setStaff] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = '/login';
      return;
    }
    setStaff(getStaff());
  }, []);

  if (!staff) return null;

  const visible = NAV.filter((n) => n.roles.includes(staff.role));

  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="logo">KHRATE</div>
        {visible.map((n) => (
          <a key={n.href} href={n.href} className={pathname.startsWith(n.href) ? 'active' : ''}>
            {n.label}
          </a>
        ))}
        <div className="whoami">
          {staff.name}
          <br />
          {staff.role}
          <br />
          <a onClick={logout} style={{ cursor: 'pointer', padding: 0, color: 'var(--brand-500)' }}>
            Sign out
          </a>
        </div>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
