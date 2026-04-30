'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ls-bg)' }}>
      <div className="w-full max-w-sm rounded-2xl shadow-lg p-8" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--ls-text)' }}>Forgot password</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ls-text-muted)' }}>
          Enter your email and we'll send you a reset link.
        </p>

        {done ? (
          <div className="text-sm p-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
            If that email is registered, a reset link has been sent. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text)' }}>Email</label>
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
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <button
          onClick={() => router.push('/login')}
          className="mt-4 w-full text-center text-sm hover:underline"
          style={{ color: 'var(--ls-accent)' }}
        >
          ← Back to login
        </button>
      </div>
    </div>
  );
}
