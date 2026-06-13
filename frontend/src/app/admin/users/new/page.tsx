'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
  { label: 'One special character', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: 'var(--ls-text)' }}>{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputBase = "border rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-blue-500/30";
const inputStyle = {
  background: 'var(--ls-input-bg)',
  color: 'var(--ls-text)',
  borderColor: 'var(--ls-border)',
};

interface CreatedUser {
  name: string;
  email: string;
  role: string;
  emailSent: boolean;
}

/* ── Success screen ─────────────────────────────────────────── */
function SuccessScreen({ user, onCreateAnother, onGoToList }: {
  user: CreatedUser;
  onCreateAnother: () => void;
  onGoToList: () => void;
}) {
  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
      {/* Checkmark icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: '#dcfce7' }}
      >
        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--ls-text)' }}>User created!</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--ls-text-muted)' }}>
        <strong style={{ color: 'var(--ls-text)' }}>{user.name}</strong> has been added as a{' '}
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={user.role === 'ADMIN' ? { background: '#fef3c7', color: '#92400e' } : { background: '#eff6ff', color: '#1e40af' }}
        >
          {user.role === 'ADMIN' ? 'Admin' : 'Viewer'}
        </span>
      </p>

      {/* Email status */}
      <div
        className="flex items-start gap-3 rounded-xl p-4 mb-6 text-left"
        style={user.emailSent
          ? { background: '#f0fdf4', border: '1px solid #bbf7d0' }
          : { background: '#fefce8', border: '1px solid #fde68a' }
        }
      >
        <div className="shrink-0 mt-0.5">
          {user.emailSent ? (
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          )}
        </div>
        <div>
          {user.emailSent ? (
            <>
              <p className="text-sm font-semibold text-green-800">Welcome email sent</p>
              <p className="text-xs text-green-700 mt-0.5">
                Login credentials were delivered to <strong>{user.email}</strong>.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-yellow-800">Email not sent</p>
              <p className="text-xs text-yellow-700 mt-0.5">
                SMTP is not configured. Share the credentials manually with <strong>{user.email}</strong>.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={onCreateAnother}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--ls-accent)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent-h)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent)'; }}
        >
          + Create another
        </button>
        <button
          onClick={onGoToList}
          className="px-5 py-2 rounded-lg border text-sm"
          style={{ borderColor: 'var(--ls-border)', color: 'var(--ls-text)', background: 'transparent' }}
        >
          Go to Users
        </button>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function CreateUserPage() {
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', name: '', role: 'VIEWER' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedUser | null>(null);

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(form.password));
  const passwordsMatch = form.confirmPassword === form.password;
  const confirmTouched = form.confirmPassword.length > 0;
  const canSubmit = allRulesPass && passwordsMatch && form.name.trim() && form.email.trim();

  const resetForm = () => {
    setForm({ email: '', password: '', confirmPassword: '', name: '', role: 'VIEWER' });
    setShowPassword(false);
    setShowConfirm(false);
    setError('');
    setCreated(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.post<CreatedUser>('/api/users', {
        email: form.email,
        password: form.password,
        name: form.name,
        role: form.role,
      });
      setCreated(res.data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) setError('Email already in use.');
      else if (status === 400) setError('Check all fields and password requirements.');
      else setError('Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--ls-text)' }}>Create User</h1>

      {created ? (
        <SuccessScreen
          user={created}
          onCreateAnother={resetForm}
          onGoToList={() => router.push('/admin/users')}
        />
      ) : (
        <div className="rounded-2xl p-6" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <Field label="Full name">
              <input
                className={inputBase}
                style={inputStyle}
                required
                minLength={2}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Smith"
              />
            </Field>

            {/* Email */}
            <Field label="Email">
              <input
                type="email"
                className={inputBase}
                style={inputStyle}
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@company.com"
              />
            </Field>

            {/* Password */}
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={inputBase}
                  style={{ ...inputStyle, paddingRight: '2.5rem' }}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3"
                  style={{ color: 'var(--ls-text-muted)' }}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {form.password.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(form.password);
                    return (
                      <li key={rule.label} className="flex items-center gap-2 text-xs">
                        <span className={ok ? 'text-green-600' : 'text-gray-400'}>{ok ? '✓' : '○'}</span>
                        <span style={{ color: ok ? 'var(--ls-text)' : 'var(--ls-text-muted)' }}>{rule.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Field>

            {/* Confirm password */}
            <Field
              label="Confirm password"
              error={confirmTouched && !passwordsMatch ? 'Passwords do not match' : undefined}
            >
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className={inputBase}
                  style={{
                    ...inputStyle,
                    paddingRight: '2.5rem',
                    borderColor: confirmTouched && !passwordsMatch ? '#ef4444' : (inputStyle.borderColor as string),
                  }}
                  required
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3"
                  style={{ color: 'var(--ls-text-muted)' }}
                  tabIndex={-1}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {confirmTouched && passwordsMatch && form.password.length > 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                  <span>✓</span> Passwords match
                </p>
              )}
            </Field>

            {/* Role */}
            <Field label="Role">
              <select
                className={inputBase}
                style={inputStyle}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="VIEWER">Viewer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                style={{ background: 'var(--ls-accent)' }}
                onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent-h)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent)'; }}
              >
                {loading ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
