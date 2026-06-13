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

  const STATUS_COLOR: Record<string, string> = {
    PENDING:  'var(--ls-muted)',
    APPROVED: 'var(--ls-success)',
    DENIED:   'var(--ls-error)',
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-8">
        <h1 className="page-title">{t('title')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ls-text-2)' }}>{t('subtitle')}</p>
      </div>

      <div className="flex gap-1 mb-5 p-1 rounded-lg overflow-x-auto tabs-scroll" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
        {(['PENDING', 'APPROVED', 'DENIED', 'ALL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
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
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg" style={{ border: '1px dashed var(--ls-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ls-muted)' }}>{t('noFound')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg overflow-hidden" style={{ border: '1px solid var(--ls-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--ls-card)', borderBottom: '1px solid var(--ls-border)' }}>
                  <th className="px-5 py-3 text-left font-medium text-xs" style={{ color: 'var(--ls-muted)' }}>{t('studentCol')}</th>
                  <th className="px-5 py-3 text-left font-medium text-xs" style={{ color: 'var(--ls-muted)' }}>{t('courseCol')}</th>
                  <th className="px-5 py-3 text-left font-medium text-xs" style={{ color: 'var(--ls-muted)' }}>{t('requestedCol')}</th>
                  <th className="px-5 py-3 text-left font-medium text-xs" style={{ color: 'var(--ls-muted)' }}>{tCommon('status')}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((req, idx) => (
                  <tr
                    key={req.id}
                    style={{ background: 'var(--ls-card)', borderTop: idx > 0 ? '1px solid var(--ls-border)' : undefined }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-card)'; }}
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium" style={{ color: 'var(--ls-text)' }}>{req.userName}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ls-muted)' }}>{req.userEmail}</p>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--ls-text)' }}>{req.trackName}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-muted)' }}>
                      {new Date(req.requestedAt).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                    </td>
                    <td className="px-5 py-3 text-xs font-medium" style={{ color: STATUS_COLOR[req.status] }}>
                      {STATUS_LABELS[req.status]}
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {items.map((req) => (
              <div key={req.id} className="rounded-lg overflow-hidden" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--ls-text)' }}>{req.userName}</p>
                    <span className="shrink-0 text-xs font-medium" style={{ color: STATUS_COLOR[req.status] }}>
                      {STATUS_LABELS[req.status]}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--ls-muted)' }}>{req.userEmail}</p>
                  <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--ls-text)' }}>{req.trackName}</p>
                  <p className="text-xs" style={{ color: 'var(--ls-muted)' }}>
                    {new Date(req.requestedAt).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                  </p>
                </div>
                {req.status === 'PENDING' && (
                  <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--ls-border)', background: 'var(--ls-surface-2)' }}>
                    <button
                      onClick={() => act(req.id, 'approve')}
                      disabled={acting === req.id}
                      className="flex items-center justify-center gap-2 py-3 text-sm font-medium cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-40"
                      style={{ color: 'var(--ls-success)' }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      {t('approve')}
                    </button>
                    <button
                      onClick={() => act(req.id, 'deny')}
                      disabled={acting === req.id}
                      className="flex items-center justify-center gap-2 py-3 text-sm font-medium cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-40"
                      style={{ color: 'var(--ls-error)', borderLeft: '1px solid var(--ls-border)' }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      {t('deny')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-1.5 rounded-md text-sm disabled:opacity-40 cursor-pointer transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text)', background: 'var(--ls-card)' }}
          >
            {tCommon('previous')}
          </button>
          <span className="text-sm" style={{ color: 'var(--ls-muted)' }}>{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-1.5 rounded-md text-sm disabled:opacity-40 cursor-pointer transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text)', background: 'var(--ls-card)' }}
          >
            {tCommon('next')}
          </button>
        </div>
      )}
    </div>
  );
}
