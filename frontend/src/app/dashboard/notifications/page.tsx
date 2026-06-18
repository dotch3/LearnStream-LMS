'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';

interface NotifData {
  trackId?: string;
  trackName?: string;
  requesterName?: string;
  requesterId?: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: NotifData | null;
}

function getNotificationLink(type: string, data?: NotifData | null): string | null {
  switch (type) {
    case 'NEW_ENROLLMENT_REQUEST':
      return data?.trackId ? `/admin/tracks/${data.trackId}/enrollments` : '/admin/requests';
    case 'ENROLLMENT_APPROVED':
      return data?.trackId ? `/dashboard/tracks/${data.trackId}` : '/dashboard/tracks';
    case 'ENROLLMENT_DENIED':
      return '/dashboard/tracks';
    default:
      return null;
  }
}

type T = ReturnType<typeof useTranslations>;

function getNotifText(t: T, type: string, data?: NotifData | null, fallbackTitle?: string, fallbackBody?: string) {
  const trackName = data?.trackName ?? '?';
  const requesterName = data?.requesterName ?? '?';
  switch (type) {
    case 'NEW_ENROLLMENT_REQUEST':
      return { title: t('newEnrollTitle'), body: t('newEnrollBody', { requesterName, trackName }) };
    case 'ENROLLMENT_APPROVED':
      return { title: t('approvedTitle'), body: t('approvedBody', { trackName }) };
    case 'ENROLLMENT_DENIED':
      return { title: t('deniedTitle'), body: t('deniedBody', { trackName }) };
    default:
      return { title: fallbackTitle ?? type, body: fallbackBody ?? '' };
  }
}

export default function NotificationsPage() {
  const t = useTranslations('dashboard.notifications');
  const tCommon = useTranslations('common');
  const router = useRouter();
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

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await api.patch(`/api/notifications/${n.id}/read`);
      setItems((prev) => prev.map((item) => item.id === n.id ? { ...item, read: true } : item));
    }
    const link = getNotificationLink(n.type, n.data);
    if (link) router.push(link);
  };

  useEffect(() => { load(page); }, [page]);

  const unread = items.some((n) => !n.read);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">{t('title')}</h1>
        {unread && (
          <button
            onClick={markAll}
            className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--ls-sb-hover)', color: 'var(--ls-accent)' }}
          >
            {t('markAllRead')}
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
          <p className="text-base" style={{ color: 'var(--ls-muted)' }}>{t('empty')}</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--ls-border)' }}>
          {items.map((n, idx) => {
            const link = getNotificationLink(n.type, n.data);
            const { title, body } = getNotifText(t, n.type, n.data, n.title, n.body);
            return (
              <div
                key={n.id}
                className="px-5 py-4 flex gap-3 items-start transition-colors"
                style={{
                  background: n.read ? 'var(--ls-card)' : 'var(--ls-sb-hover)',
                  borderBottom: idx < items.length - 1 ? '1px solid var(--ls-border)' : 'none',
                  cursor: link ? 'pointer' : 'default',
                }}
                onClick={() => handleClick(n)}
                onMouseEnter={(e) => { if (link) (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
                onMouseLeave={(e) => { if (link) (e.currentTarget as HTMLElement).style.background = n.read ? 'var(--ls-card)' : 'var(--ls-sb-hover)'; }}
              >
                <div className="mt-1.5 shrink-0">
                  <span className="h-2 w-2 block rounded-full" style={{ background: n.read ? 'var(--ls-border)' : 'var(--ls-accent)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--ls-text)' }}>{title}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--ls-muted)' }}>{body}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs" style={{ color: 'var(--ls-muted)', opacity: 0.7 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                    {link && (
                      <span className="text-xs font-medium" style={{ color: 'var(--ls-accent)' }}>
                        → {t('viewLink')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
            {tCommon('previous')}
          </button>
          <span className="text-sm" style={{ color: 'var(--ls-muted)' }}>{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-1.5 rounded-lg text-sm disabled:opacity-40"
            style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text)' }}
          >
            {tCommon('next')}
          </button>
        </div>
      )}
    </div>
  );
}
