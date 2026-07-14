import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'KHRATE — groceries, better together',
  description:
    'Buy groceries in Kigali and pay less by joining your neighbours. Fresh food, honest prices, delivered to a drop point near you.',
};

export const viewport: Viewport = {
  themeColor: '#f26a1b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // keeps controls thumb-sized; no accidental zoom on inputs
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app">{children}</div>
      </body>
    </html>
  );
}
