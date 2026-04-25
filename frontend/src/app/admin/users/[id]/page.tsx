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

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$';
  const all = upper + lower + digits + special;
  const rand = (set: string) => set[Math.floor(Math.random() * set.length)];
  // Guarantee at least one of each category
  const required = [rand(upper), rand(lower), rand(digits), rand(special)];
  const rest = Array.from({ length: 8 }, () => rand(all));
  return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
}

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<UserForm>({ name: '', email: '', role: 'VIEWER', isActive: true });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset password section
  const [tempPassword, setTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [copied, setCopied] = useState(false);

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
    const text = `LearnStream — Acesso\nLogin: ${loginUrl}\nEmail: ${form.email}\nSenha temporária: ${tempPassword}\n\nAlterare sua senha após o primeiro acesso.`;
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
      setResetSuccess('Senha redefinida com sucesso.');
    } catch {
      setResetError('Falha ao redefinir senha.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Edit User</h1>

      {error && <p className="mb-4 text-red-600">{error}</p>}
      {success && <p className="mb-4 text-green-600">{success}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input
            className="border rounded px-3 py-2"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            className="border rounded px-3 py-2"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Role</span>
          <select
            className="border rounded px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="VIEWER">Viewer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          <span className="text-sm font-medium">Active</span>
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/users')}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </form>

      {/* ── Reset Password ─────────────────────────────────────────── */}
      <div className="mt-8 border-t pt-6">
        <h2 className="text-base font-semibold mb-1">Redefinir senha</h2>
        <p className="text-sm text-gray-500 mb-4">
          Gere uma senha temporária e compartilhe com o utilizador.
        </p>

        <button
          type="button"
          onClick={handleGeneratePassword}
          className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
        >
          Gerar senha temporária
        </button>

        {tempPassword && (
          <div className="mt-4 space-y-3">
            {/* Password field with eye + copy */}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Senha gerada</span>
              <div className="relative flex">
                <input
                  readOnly
                  type={showTempPassword ? 'text' : 'password'}
                  value={tempPassword}
                  className="flex-1 border rounded-l px-3 py-2 text-sm bg-gray-50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowTempPassword((v) => !v)}
                  className="border-y border-r rounded-r px-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  <EyeIcon open={showTempPassword} />
                </button>
              </div>
            </div>

            {/* Shareable text copy */}
            <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">
              {`LearnStream — Acesso\nLogin: ${typeof window !== 'undefined' ? window.location.origin : ''}/login\nEmail: ${form.email}\nSenha temporária: ${showTempPassword ? tempPassword : '••••••••••••'}\n\nAltere sua senha após o primeiro acesso.`}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyShareText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
              >
                <CopyIcon checked={copied} />
                {copied ? 'Copiado!' : 'Copiar texto'}
              </button>

              <button
                type="button"
                onClick={handleApplyReset}
                disabled={resetLoading}
                className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {resetLoading ? 'Aplicando...' : 'Aplicar reset'}
              </button>
            </div>

            {resetSuccess && <p className="text-sm text-green-600">{resetSuccess}</p>}
            {resetError && <p className="text-sm text-red-600">{resetError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
