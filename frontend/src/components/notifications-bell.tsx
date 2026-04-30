'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/axios';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export function NotificationsBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = async () => {
    try {
      const { data } = await api.get('/api/notifications/unread-count');
      setCount(data.count);
    } catch {
      // silent
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/notifications?page=1&perPage=8');
      setItems(data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setCount((c) => Math.max(0, c - 1));
  };

  const markAll = async () => {
    await api.patch('/api/notifications/read-all');
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setCount(0);
  };

  useEffect(() => {
    fetchCount();
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchItems();
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center rounded-lg p-2 transition-colors"
        style={{ color: 'var(--ls-sb-muted)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-sb-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        title="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: 'var(--ls-accent)' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 mt-1 w-80 rounded-xl shadow-xl z-50 overflow-hidden"
          style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--ls-border)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--ls-text-1)' }}>Notifications</span>
            <div className="flex items-center gap-3">
              {count > 0 && (
                <button
                  onClick={markAll}
                  className="text-xs cursor-pointer"
                  style={{ color: 'var(--ls-accent)' }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center rounded-md p-0.5 cursor-pointer transition-colors"
                style={{ color: 'var(--ls-text-2)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                title="Close"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading && (
              <div className="py-6 text-center text-sm" style={{ color: 'var(--ls-text-2)' }}>Loading…</div>
            )}
            {!loading && items.length === 0 && (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--ls-text-2)' }}>No notifications</div>
            )}
            {!loading && items.map((n) => (
              <button
                key={n.id}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  background: n.read ? 'transparent' : 'var(--ls-sb-hover)',
                  borderBottom: '1px solid var(--ls-border)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-sb-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'var(--ls-sb-hover)'; }}
                onClick={() => markRead(n.id)}
              >
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--ls-accent)' }} />
                  )}
                  <div className={!n.read ? '' : 'pl-4'}>
                    <p className="text-sm font-medium" style={{ color: 'var(--ls-text-1)' }}>{n.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ls-text-2)' }}>{n.body}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--ls-border)' }}>
            <Link
              href="/dashboard/notifications"
              className="block text-center text-xs font-medium"
              style={{ color: 'var(--ls-accent)' }}
              onClick={() => setOpen(false)}
            >
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
