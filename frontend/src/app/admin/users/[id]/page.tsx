'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';

interface UserForm {
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<UserForm>({ name: '', email: '', role: 'VIEWER', isActive: true });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<{ name: string; email: string; role: string; isActive: boolean }>(`/api/users/${id}`).then((res) => {
      const u = res.data;
      setForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive });
    }).catch(() => setError('Failed to load user.'));
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

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Edit User</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}
      {success && <p className="mb-4 text-green-600">{success}</p>}
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
          <span className="text-sm font-medium">Role</span>
          <select className="border rounded px-3 py-2" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="VIEWER">Viewer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          <span className="text-sm font-medium">Active</span>
        </label>
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => router.push('/admin/users')}
            className="px-4 py-2 border rounded hover:bg-gray-50">
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
