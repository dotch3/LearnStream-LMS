'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const t = useTranslations('auth.resetPassword');
  const tRules = useTranslations('auth.passwordRules');

  const PASSWORD_RULES = [
    { key: 'minChars',  test: (p: string) => p.length >= 8 },
    { key: 'uppercase', test: (p: string) => /[A-Z]/.test(p) },
    { key: 'lowercase', test: (p: string) => /[a-z]/.test(p) },
    { key: 'number',    test: (p: string) => /\d/.test(p) },
    { key: 'special',   test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
  ] as const;

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const allValid = PASSWORD_RULES.every((r) => r.test(password));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allValid) return;
    if (!token) { setError(t('invalidNoToken')); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : t('invalidLink'));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm" style={{ color: 'var(--ls-error)' }}>{t('invalidNoToken')}</p>
    );
  }

  return done ? (
    <div className="space-y-4">
      <div
        className="text-sm p-4 rounded-lg"
        style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--ls-success)', border: '1px solid rgba(34,197,94,0.2)' }}
      >
        {t('successFull')}
      </div>
      <button
        onClick={() => router.push('/login')}
        className="w-full py-2 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
        style={{ background: 'var(--ls-accent)' }}
      >
        {t('goToLogin')}
      </button>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text)' }}>{t('newPassword')}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm focus:outline-none"
          style={{ background: 'var(--ls-surface-2)', color: 'var(--ls-text)', border: '1px solid var(--ls-border)' }}
          autoFocus
        />
      </div>

      {password.length > 0 && (
        <ul className="space-y-1">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <li key={rule.key} className="flex items-center gap-2 text-xs">
                <span style={{ color: ok ? 'var(--ls-success)' : 'var(--ls-muted)' }}>
                  {ok ? <CheckIcon /> : <CircleIcon />}
                </span>
                <span style={{ color: ok ? 'var(--ls-text)' : 'var(--ls-muted)' }}>{tRules(rule.key)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-sm" style={{ color: 'var(--ls-error)' }}>{error}</p>}

      <button
        type="submit"
        disabled={loading || !allValid}
        className="w-full py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90 cursor-pointer"
        style={{ background: 'var(--ls-accent)' }}
      >
        {loading ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword');
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--ls-bg)' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
      >
        <h1
          className="text-2xl font-bold mb-6"
          style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}
        >
          {t('title')}
        </h1>
        <Suspense fallback={<p className="text-sm" style={{ color: 'var(--ls-text-2)' }}>Carregando...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
