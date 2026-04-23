'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';

export default function CreateUserPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'VIEWER' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/users', form);
      router.push('/admin/users');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      if (status === 409) setError('Email already in use.');
      else if (status === 400) setError('Validation error. Check all fields.');
      else setError('Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Create User</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input className="border rounded px-3 py-2" required minLength={2} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input type="email" className="border rounded px-3 py-2" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Password (min 6 chars)</span>
          <input type="password" className="border rounded px-3 py-2" required minLength={6} value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Role</span>
          <select className="border rounded px-3 py-2" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="VIEWER">Viewer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create User'}
          </button>
          <button type="button" onClick={() => router.push('/admin/users')}
            className="px-4 py-2 border rounded hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
