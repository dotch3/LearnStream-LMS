'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { ThemeToggle } from '@/components/theme-toggle';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

type InviteInfo = { email: string; role: string };
type PageState = 'loading' | 'invalid' | 'form' | 'done';

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/api/invites/${token}`)
      .then((res) => {
        setInviteInfo(res.data);
        setPageState('form');
      })
      .catch(() => setPageState('invalid'));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post(`/api/invites/${token}/accept`, { name: name.trim(), password });
      setPageState('done');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Failed to activate account. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{ background: 'var(--ls-bg)' }}
    >
      <div className="absolute top-4 right-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
        >
          <ThemeToggle />
        </div>
      </div>

      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-lg"
        style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
      >
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo1.png" alt="LearnStream" width={80} height={80} className="rounded-2xl mb-3" />
        </div>

        {pageState === 'loading' && (
          <p className="text-center text-sm" style={{ color: 'var(--ls-text-3)' }}>Validating invite…</p>
        )}

        {pageState === 'invalid' && (
          <div className="space-y-4 text-center">
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--ls-error)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              This invite link is invalid or has expired.
            </div>
            <p className="text-xs" style={{ color: 'var(--ls-text-3)' }}>
              Ask an admin to send a new invite.
            </p>
          </div>
        )}

        {pageState === 'form' && inviteInfo && (
          <>
            <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--ls-text-1)' }}>
              Create your account
            </h1>
            <p className="text-xs mb-6" style={{ color: 'var(--ls-text-3)' }}>
              You were invited as <span className="font-semibold">{inviteInfo.role}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ls-text-2)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={inviteInfo.email}
                  disabled
                  className="w-full rounded-lg px-3 py-2.5 text-sm opacity-60 cursor-not-allowed"
                  style={{
                    background: 'var(--ls-surface-2)',
                    border: '1px solid var(--ls-border)',
                    color: 'var(--ls-text-1)',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ls-text-2)' }}>
                  Your name
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  autoFocus
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{
                    background: 'var(--ls-surface-2)',
                    border: '1px solid var(--ls-border)',
                    color: 'var(--ls-text-1)',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ls-text-2)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2"
                    style={{
                      background: 'var(--ls-surface-2)',
                      border: '1px solid var(--ls-border)',
                      color: 'var(--ls-text-1)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center px-3"
                    style={{ color: 'var(--ls-text-3)' }}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm" style={{ color: 'var(--ls-error)' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer"
                style={{ background: 'var(--ls-accent)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent-h)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent)'; }}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          </>
        )}

        {pageState === 'done' && (
          <div className="space-y-4">
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--ls-success)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              Account created! You can now sign in.
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white cursor-pointer"
              style={{ background: 'var(--ls-accent)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent-h)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent)'; }}
            >
              Go to login
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
