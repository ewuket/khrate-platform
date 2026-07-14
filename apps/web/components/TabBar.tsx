'use client';

import { usePathname, useRouter } from 'next/navigation';

/** Thumb-reachable bottom navigation — the primary way around the app on mobile. */
const TABS = [
  { href: '/shop', label: 'Shop', ic: '🛒' },
  { href: '/orders', label: 'Orders', ic: '📦' },
  { href: '/account', label: 'Account', ic: '👤' },
];

export default function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav className="tabbar">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + '/');
        return (
          <button key={t.href} className={`tab ${active ? 'active' : ''}`} onClick={() => router.push(t.href)}>
            <span className="ic">{t.ic}</span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
