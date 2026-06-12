'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';
import { ActionBtn } from '@/components/admin/action-btn';
import { useToast } from '@/components/toast';

interface EnrollmentRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  requestedAt: string;
  userId: string;
  userName: string;
  userEmail: string;
  trackId: string;
  trackName: string;
}

export default function AdminRequestsPage() {
  const t = useTranslations('admin.requests');
  const tCommon = useTranslations('common');
  const [items, setItems] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'DENIED'>('PENDING');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [acting, setActing] = useState<string | null>(null);
  const { showToast } = useToast();

  const STATUS_LABELS: Record<string, string> = {
    PENDING:  t('pending'),
    APPROVED: t('approved'),
    DENIED:   t('denied'),
  };

  const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
    PENDING:  { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
    APPROVED: { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
    DENIED:   { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  };

  const load = async (p: number, f: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), perPage: '20' });
      if (f !== 'ALL') params.set('status', f);
      const { data } = await api.get(`/api/enrollments?${params}`);
      setItems(data.data ?? []);
      setTotalPages(data.meta?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load(1, filter);
  }, [filter]);

  useEffect(() => {
    load(page, filter);
  }, [page]);

  const act = async (id: string, action: 'approve' | 'deny') => {
    setActing(id);
    try {
      await api.patch(`/api/enrollments/${id}/${action}`);
      setItems((prev) =>
        prev.map((e) => e.id === id ? { ...e, status: action === 'approve' ? 'APPROVED' : 'DENIED' } : e)
      );
      showToast(
        action === 'approve' ? t('approve') : t('deny'),
        action === 'approve' ? 'success' : 'warning',
      );
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ls-text)' }}>{t('title')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ls-muted)' }}>{t('subtitle')}</p>
      </div>

      <div className="flex gap-1 mb-5 p-1 rounded-lg w-fit" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
        {(['PENDING', 'APPROVED', 'DENIED', 'ALL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: filter === f ? 'var(--ls-sb-active)' : 'transparent',
              color: filter === f ? 'var(--ls-sb-active-t)' : 'var(--ls-muted)',
            }}
          >
            {f === 'ALL' ? tCommon('all') : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--ls-card)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
          <p className="text-base" style={{ color: 'var(--ls-muted)' }}>{t('noFound')}</p>
        </div>
      ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '1px solid var(--ls-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--ls-card)', borderBottom: '1px solid var(--ls-border)' }}>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>{t('studentCol')}</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>{t('courseCol')}</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>{t('requestedCol')}</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>{tCommon('status')}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((req, idx) => {
                    const s = STATUS_STYLES[req.status];
                    return (
                      <tr key={req.id} style={{ background: 'var(--ls-card)', borderBottom: idx < items.length - 1 ? '1px solid var(--ls-border)' : 'none' }}>
                        <td className="px-5 py-3">
                          <p className="font-medium" style={{ color: 'var(--ls-text)' }}>{req.userName}</p>
                          <p className="text-xs" style={{ color: 'var(--ls-muted)' }}>{req.userEmail}</p>
                        </td>
                        <td className="px-5 py-3" style={{ color: 'var(--ls-text)' }}>{req.trackName}</td>
                        <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-muted)' }}>
                          {new Date(req.requestedAt).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
                            {STATUS_LABELS[req.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {req.status === 'PENDING' && (
                            <div className="flex gap-1 justify-end">
                              <ActionBtn onClick={() => act(req.id, 'approve')} label={t('approve')} variant="success" disabled={acting === req.id} />
                              <ActionBtn onClick={() => act(req.id, 'deny')} label={t('deny')} variant="danger" disabled={acting === req.id} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {items.map((req) => {
                const s = STATUS_STYLES[req.status];
                return (
                  <div key={req.id} className="rounded-xl p-4" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm" style={{ color: 'var(--ls-text)' }}>{req.userName}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ls-muted)' }}>{req.userEmail}</p>
                      </div>
                      <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
                        {STATUS_LABELS[req.status]}
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--ls-text)' }}>{req.trackName}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ls-muted)' }}>
                          {new Date(req.requestedAt).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                        </p>
                      </div>
                      {req.status === 'PENDING' && (
                        <div className="flex gap-1 shrink-0">
                          <ActionBtn onClick={() => act(req.id, 'approve')} label={t('approve')} variant="success" disabled={acting === req.id} />
                          <ActionBtn onClick={() => act(req.id, 'deny')} label={t('deny')} variant="danger" disabled={acting === req.id} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
