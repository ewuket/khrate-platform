'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, setSession } from '../../lib/api';
import TopBar from '../../components/TopBar';

/**
 * Phone + OTP sign-in. Two calm steps. In development the backend returns the code so the
 * whole flow is testable without an SMS provider — we surface it as a dev hint, clearly
 * labelled, never in production.
 */
function AuthInner() {
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/shop';
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('+250');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ sent: boolean; devCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: { phone },
        auth: false,
      });
      setDevCode(res.devCode ?? null);
      setStep('code');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ token: string }>('/auth/otp/verify', {
        method: 'POST',
        body: { phone, code },
        auth: false,
      });
      setSession(res.token);
      router.replace(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar back />
      <div className="pad">
        {step === 'phone' ? (
          <form onSubmit={requestOtp}>
            <h1 className="page">Enter your phone</h1>
            <p className="muted">We’ll text you a 6-digit code to confirm it’s you. No password to remember.</p>
            <label>Mobile number</label>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+250 7xx xxx xxx"
              autoFocus
            />
            {error && <p className="error">{error}</p>}
            <button className="btn" style={{ marginTop: 20 }} disabled={busy}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <h1 className="page">Enter the code</h1>
            <p className="muted">Sent to {phone}. <button type="button" className="btn ghost" onClick={() => setStep('phone')}>Change</button></p>
            <label>6-digit code</label>
            <input
              className="otp-input"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              autoFocus
            />
            {devCode && (
              <div className="notice" style={{ marginTop: 12 }}>
                Development mode — your code is <strong>{devCode}</strong>. (In production this
                arrives by SMS/WhatsApp and is never shown here.)
              </div>
            )}
            {error && <p className="error">{error}</p>}
            <button className="btn" style={{ marginTop: 20 }} disabled={busy || code.length !== 6}>
              {busy ? 'Checking…' : 'Confirm'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthInner />
    </Suspense>
  );
}
