'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';

export default function ForgotPasswordPage() {
  const router = useRouter();
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ls-bg)' }}>
      <div className="w-full max-w-sm rounded-2xl shadow-lg p-8" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--ls-text)' }}>{t('title')}</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ls-text-muted)' }}>
          {t('subtitle')}
        </p>

        {done ? (
          <div className="text-sm p-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
            {t('success')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text)' }}>{tAuth('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--ls-input-bg)', color: 'var(--ls-text)', borderColor: 'var(--ls-border)' }}
                placeholder="you@example.com"
                autoFocus
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--ls-accent)' }}
            >
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>
        )}

        <button
          onClick={() => router.push('/login')}
          className="mt-4 w-full text-center text-sm hover:underline"
          style={{ color: 'var(--ls-accent)' }}
        >
          ← {t('backToLogin')}
        </button>
      </div>
    </div>
  );
}
