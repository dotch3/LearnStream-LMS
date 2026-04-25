'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
}

interface Meta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const loadUsers = async (p: number) => {
    try {
      const res = await api.get(`/api/users?page=${p}&perPage=20`);
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch {
      setError('Failed to load users.');
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/api/users?page=${page}&perPage=20`);
        if (mounted) {
          setUsers(res.data.data);
          setMeta(res.data.meta);
        }
      } catch {
        if (mounted) setError('Failed to load users.');
      }
    })();
    return () => { mounted = true; };
  }, [page]);

  const handleDeactivate = async (id: string) => {
    try {
      await api.patch(`/api/users/${id}/deactivate`);
      loadUsers(page);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error';
      setError(msg);
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await api.patch(`/api/users/${id}/reactivate`);
      loadUsers(page);
    } catch {
      setError('Error reactivating user.');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <Link href="/admin/users/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Create User
        </Link>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3 border">Name</th>
            <th className="p-3 border">Email</th>
            <th className="p-3 border">Role</th>
            <th className="p-3 border">Status</th>
            <th className="p-3 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-3 border">{u.name}</td>
              <td className="p-3 border">{u.email}</td>
              <td className="p-3 border">{u.role}</td>
              <td className="p-3 border">
                <span className={u.isActive ? 'text-green-600' : 'text-gray-400'}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="p-3 border flex gap-2">
                <Link href={`/admin/users/${u.id}`} className="text-blue-600 hover:underline">Edit</Link>
                {u.isActive ? (
                  <button onClick={() => handleDeactivate(u.id)} className="text-red-600 hover:underline">
                    Deactivate
                  </button>
                ) : (
                  <button onClick={() => handleReactivate(u.id)} className="text-green-600 hover:underline">
                    Reactivate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {meta && (
        <div className="mt-4 flex gap-2 items-center text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">
            Previous
          </button>
          <span>Page {meta.page} / {meta.totalPages} ({meta.total} users)</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
