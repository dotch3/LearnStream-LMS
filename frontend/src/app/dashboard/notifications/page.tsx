'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async (p: number) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/notifications?page=${p}&perPage=20`);
      setItems(data.data ?? []);
      setTotalPages(data.meta?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  };

  const markAll = async () => {
    await api.patch('/api/notifications/read-all');
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markOne = async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const unread = items.some((n) => !n.read);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ls-text)' }}>Notifications</h1>
        {unread && (
          <button
            onClick={markAll}
            className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--ls-sb-hover)', color: 'var(--ls-accent)' }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--ls-card)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
          <p className="text-base" style={{ color: 'var(--ls-muted)' }}>No notifications yet</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--ls-border)' }}>
          {items.map((n, idx) => (
            <div
              key={n.id}
              className="px-5 py-4 flex gap-3 items-start cursor-pointer transition-colors"
              style={{
                background: n.read ? 'var(--ls-card)' : 'var(--ls-sb-hover)',
                borderBottom: idx < items.length - 1 ? '1px solid var(--ls-border)' : 'none',
              }}
              onClick={() => { if (!n.read) markOne(n.id); }}
            >
              <div className="mt-1.5 shrink-0">
                {n.read ? (
                  <span className="h-2 w-2 block rounded-full" style={{ background: 'var(--ls-border)' }} />
                ) : (
                  <span className="h-2 w-2 block rounded-full" style={{ background: 'var(--ls-accent)' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--ls-text)' }}>{n.title}</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--ls-muted)' }}>{n.body}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--ls-muted)', opacity: 0.7 }}>
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-1.5 rounded-lg text-sm disabled:opacity-40"
            style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text)' }}
          >
            Previous
          </button>
          <span className="text-sm" style={{ color: 'var(--ls-muted)' }}>{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-1.5 rounded-lg text-sm disabled:opacity-40"
            style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text)' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
