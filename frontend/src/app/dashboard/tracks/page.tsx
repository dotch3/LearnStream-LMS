'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';

interface TrackSummary {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoCount: number;
  order: number;
  enrollmentStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED';
}

interface TracksResponse {
  data: TrackSummary[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label?: string }> = {
  APPROVED: { color: '#1EA63E', bg: 'rgba(30,166,62,0.1)' },
  PENDING:  { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  DENIED:   { color: '#D32F2F', bg: 'rgba(211,47,47,0.1)' },
};

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
      <div className="aspect-video skeleton" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 rounded w-4/5" />
        <div className="skeleton h-3 rounded w-full" />
        <div className="skeleton h-3 rounded w-2/3" />
        <div className="skeleton h-3 rounded w-1/3 mt-1" />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  const labels: Record<string, string> = { APPROVED: 'Matriculado', PENDING: 'Pendente', DENIED: 'Negado' };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
      {labels[status]}
    </span>
  );
}

function TrackCard({ track, onClick }: { track: TrackSummary; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl overflow-hidden card-hover"
      style={{
        background: 'var(--ls-surface)',
        border: '1px solid var(--ls-border)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video catalog-thumb" style={{ background: 'var(--ls-surface-2)' }}>
        {track.thumbnailUrl ? (
          <img
            src={track.thumbnailUrl}
            alt={track.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} style={{ color: 'var(--ls-text-3)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
        )}
        {/* Video count badge */}
        <div
          className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold"
          style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', backdropFilter: 'blur(4px)' }}
        >
          <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
          {track.videoCount}
        </div>
        {/* Enrollment status overlay */}
        {track.enrollmentStatus !== 'NONE' && (
          <div className="absolute top-2 left-2">
            <StatusBadge status={track.enrollmentStatus} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h2
          className="text-[13.5px] font-semibold leading-snug line-clamp-2 mb-2 transition-colors duration-150 group-hover:text-purple-600"
          style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}
        >
          {track.name}
        </h2>
        <p className="text-xs tabular-nums" style={{ color: 'var(--ls-text-3)' }}>
          {track.videoCount} aula{track.videoCount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

export default function DashboardTracksPage() {
  const t = useTranslations('dashboard.tracks');
  const tc = useTranslations('common');
  const router = useRouter();
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get<TracksResponse>('/api/tracks', {
        params: { page, perPage: 20 },
      });
      setTracks(res.data.data);
      setMeta({ page: res.data.meta.page, totalPages: res.data.meta.totalPages, total: res.data.meta.total });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) router.push('/login');
      else setError(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="page-title mb-1">{t('title')}</h1>
        <p className="text-sm" style={{ color: 'var(--ls-text-2)' }}>
          {!loading && meta.total > 0
            ? `${meta.total} trilha${meta.total !== 1 ? 's' : ''} disponíve${meta.total !== 1 ? 'is' : 'l'}`
            : t('subtitle')}
        </p>
      </div>

      {/* Loading grid */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl p-6 text-center" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--ls-error)' }}>{error}</p>
          <button
            onClick={() => load()}
            className="rounded-lg px-4 py-2 text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: 'var(--ls-surface-2)', color: 'var(--ls-text-2)', border: '1px solid var(--ls-border)' }}
          >
            {tc('tryAgain')}
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && tracks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--ls-accent-muted)' }}
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ls-accent)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}>
            {t('empty')}
          </h3>
          <p className="text-sm" style={{ color: 'var(--ls-text-2)' }}>{t('emptySubtitle')}</p>
        </div>
      )}

      {/* Course grid */}
      {!loading && !error && tracks.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onClick={() => router.push(`/dashboard/tracks/${track.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center gap-1.5 justify-center mt-10">
              <button
                onClick={() => load(meta.page - 1)}
                disabled={meta.page <= 1}
                className="h-9 px-3 flex items-center gap-1 rounded-lg text-sm font-medium disabled:opacity-40 cursor-pointer transition-colors"
                style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text-2)', background: 'var(--ls-surface)' }}
              >
                ←
              </button>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => load(p)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                  style={{
                    background: p === meta.page ? 'var(--ls-accent)' : 'var(--ls-surface)',
                    color: p === meta.page ? '#fff' : 'var(--ls-text-2)',
                    border: p === meta.page ? 'none' : '1px solid var(--ls-border)',
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => load(meta.page + 1)}
                disabled={meta.page >= meta.totalPages}
                className="h-9 px-3 flex items-center gap-1 rounded-lg text-sm font-medium disabled:opacity-40 cursor-pointer transition-colors"
                style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text-2)', background: 'var(--ls-surface)' }}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
