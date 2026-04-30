'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';

interface UserForm {
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

/* ── Confirm dialog ────────────────────────────────────────── */
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ open, title, description, confirmLabel, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
      >
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--ls-text)' }}>{title}</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--ls-text-muted)' }}>{description}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border"
            style={{ color: 'var(--ls-text)', borderColor: 'var(--ls-border)', background: 'var(--ls-surface)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg text-white font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Applying…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────── */
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

function CopyIcon({ checked }: { checked: boolean }) {
  return checked ? (
    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
  );
}

/* ── Helpers ───────────────────────────────────────────────── */
function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$';
  const all = upper + lower + digits + special;
  const rand = (set: string) => set[Math.floor(Math.random() * set.length)];
  const required = [rand(upper), rand(lower), rand(digits), rand(special)];
  const rest = Array.from({ length: 8 }, () => rand(all));
  return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: 'var(--ls-text)' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  background: 'var(--ls-input-bg)',
  color: 'var(--ls-text)',
  borderColor: 'var(--ls-border)',
};

/* ── Page ──────────────────────────────────────────────────── */
export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<UserForm>({ name: '', email: '', role: 'VIEWER', isActive: true });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [tempPassword, setTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    api
      .get<{ name: string; email: string; role: string; isActive: boolean }>(`/api/users/${id}`)
      .then((res) => {
        const u = res.data;
        setForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive });
      })
      .catch(() => setError('Failed to load user.'));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.patch(`/api/users/${id}`, form);
      setSuccess('User updated successfully.');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) setError('Email already in use by another user.');
      else setError('Failed to update user.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePassword = () => {
    setTempPassword(generateTempPassword());
    setShowTempPassword(true);
    setResetSuccess('');
    setResetError('');
    setCopied(false);
  };

  const handleCopyShareText = useCallback(() => {
    const loginUrl = `${window.location.origin}/login`;
    const text = `LearnStream — Login credentials\nURL: ${loginUrl}\nEmail: ${form.email}\nTemporary password: ${tempPassword}\n\nPlease change your password after your first login.`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [form.email, tempPassword]);

  const handleApplyReset = async () => {
    if (!tempPassword) return;
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');
    try {
      await api.patch(`/api/users/${id}/password`, { password: tempPassword });
      setResetSuccess('Password reset successfully.');
      setConfirmOpen(false);
    } catch {
      setResetError('Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title="Apply password reset?"
        description={`This will immediately change ${form.name}'s password to the generated one. They won't be able to log in with their old password.`}
        confirmLabel="Apply reset"
        loading={resetLoading}
        onConfirm={handleApplyReset}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="p-8 max-w-lg mx-auto">
        <button
          onClick={() => router.push('/admin/users')}
          className="text-sm mb-5 block hover:underline"
          style={{ color: 'var(--ls-accent)' }}
        >
          ← Back to Users
        </button>

        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--ls-text)' }}>Edit User</h1>

        {/* ── User details card ── */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">{error}</div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm text-green-700 bg-green-50 border border-green-200">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Full name">
              <input
                className="border rounded-lg px-3 py-2 text-sm w-full"
                style={inputStyle}
                required
                minLength={2}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                className="border rounded-lg px-3 py-2 text-sm w-full"
                style={inputStyle}
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>

            <Field label="Role">
              <select
                className="border rounded-lg px-3 py-2 text-sm w-full"
                style={inputStyle}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="VIEWER">Viewer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium" style={{ color: 'var(--ls-text)' }}>Account active</span>
            </label>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                style={{ background: 'var(--ls-accent)' }}
                onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent-h)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent)'; }}
              >
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/users')}
                className="px-5 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--ls-border)', color: 'var(--ls-text)', background: 'transparent' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* ── Reset password card ── */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--ls-text)' }}>Reset password</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--ls-text-muted)' }}>
            Generate a temporary password and share it with the user.
          </p>

          <button
            type="button"
            onClick={handleGeneratePassword}
            className="px-4 py-2 border rounded-lg text-sm transition-colors"
            style={{ borderColor: 'var(--ls-border)', color: 'var(--ls-text)', background: 'var(--ls-bg)' }}
          >
            Generate temporary password
          </button>

          {tempPassword && (
            <div className="mt-5 space-y-4">
              {/* Password field */}
              <Field label="Generated password">
                <div className="flex">
                  <input
                    readOnly
                    type={showTempPassword ? 'text' : 'password'}
                    value={tempPassword}
                    className="flex-1 border rounded-l-lg px-3 py-2 text-sm font-mono"
                    style={{ ...inputStyle, background: 'var(--ls-bg)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTempPassword((v) => !v)}
                    className="border-y border-r rounded-r-lg px-3"
                    style={{ borderColor: 'var(--ls-border)', color: 'var(--ls-text-muted)', background: 'var(--ls-bg)' }}
                    tabIndex={-1}
                  >
                    <EyeIcon open={showTempPassword} />
                  </button>
                </div>
              </Field>

              {/* Shareable text */}
              <div
                className="rounded-lg p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed"
                style={{ background: 'var(--ls-bg)', color: 'var(--ls-text-muted)', border: '1px solid var(--ls-border)' }}
              >
                {`LearnStream — Login credentials\nURL: ${typeof window !== 'undefined' ? window.location.origin : ''}/login\nEmail: ${form.email}\nTemporary password: ${showTempPassword ? tempPassword : '••••••••••••'}\n\nPlease change your password after your first login.`}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyShareText}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm transition-colors"
                  style={{ borderColor: 'var(--ls-border)', color: 'var(--ls-text)', background: 'var(--ls-bg)' }}
                >
                  <CopyIcon checked={copied} />
                  {copied ? 'Copied!' : 'Copy text'}
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-sm text-white font-medium bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Apply reset
                </button>
              </div>

              {resetSuccess && (
                <div className="px-4 py-3 rounded-lg text-sm text-green-700 bg-green-50 border border-green-200">{resetSuccess}</div>
              )}
              {resetError && (
                <div className="px-4 py-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">{resetError}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
