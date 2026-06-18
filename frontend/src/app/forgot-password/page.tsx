'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword');
  const tAuth = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError(t('emailRequired')); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setDone(true);
    } catch {
      setError(t('somethingWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--ls-bg)' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
      >
        <div className="mb-7">
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}
          >
            {t('title')}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ls-text-2)' }}>
            {t('subtitle')}
          </p>
        </div>

        {done ? (
          <div
            className="rounded-xl p-4 text-sm font-medium"
            style={{ background: 'rgba(30,166,62,0.08)', color: 'var(--ls-success)', border: '1px solid rgba(30,166,62,0.2)' }}
          >
            {t('success')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ls-text-1)' }}>
                {tAuth('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
                style={{
                  background: 'var(--ls-surface-2)',
                  color: 'var(--ls-text-1)',
                  border: '1px solid var(--ls-border)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ls-accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ls-border)'; }}
                placeholder="you@example.com"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--ls-error)', background: 'rgba(211,47,47,0.07)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: 'var(--ls-accent)' }}
            >
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
