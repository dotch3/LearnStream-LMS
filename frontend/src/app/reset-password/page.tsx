'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';

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
      <p className="text-red-600 text-sm">{t('invalidNoToken')}</p>
    );
  }

  return done ? (
    <div className="space-y-4">
      <div className="text-sm p-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
        {t('successFull')}
      </div>
      <button
        onClick={() => router.push('/login')}
        className="w-full py-2 rounded-lg text-sm font-semibold text-white"
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
          className="w-full border rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--ls-input-bg)', color: 'var(--ls-text)', borderColor: 'var(--ls-border)' }}
          autoFocus
        />
      </div>

      {password.length > 0 && (
        <ul className="space-y-1">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <li key={rule.key} className="flex items-center gap-2 text-xs">
                <span className={ok ? 'text-green-600' : 'text-gray-400'}>{ok ? '✓' : '○'}</span>
                <span style={{ color: ok ? 'var(--ls-text)' : 'var(--ls-text-muted)' }}>{tRules(rule.key)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || !allValid}
        className="w-full py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ls-bg)' }}>
      <div className="w-full max-w-sm rounded-2xl shadow-lg p-8" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
        <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--ls-text)' }}>{t('title')}</h1>
        <Suspense fallback={<p className="text-sm text-gray-400">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
