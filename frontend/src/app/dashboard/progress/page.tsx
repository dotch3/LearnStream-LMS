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
}

interface TrackProgress {
  trackId: string;
  totalActive: number;
  completedCount: number;
  overallPercentage: number;
  trackComplete: boolean;
}

interface TrackWithProgress extends TrackSummary {
  progress: TrackProgress | null;
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
    >
      <p
        className="text-3xl font-bold tabular-nums leading-none mb-1"
        style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}
      >
        {value}
      </p>
      <p className="text-xs font-medium" style={{ color: 'var(--ls-text-2)' }}>{label}</p>
    </div>
  );
}

function TrackProgressCard({
  track,
  onClick,
  tProgress,
}: {
  track: TrackWithProgress;
  onClick: () => void;
  tProgress: ReturnType<typeof useTranslations>;
}) {
  const p = track.progress;
  const pct = p?.overallPercentage ?? 0;
  const completedCount = p?.completedCount ?? 0;
  const total = p?.totalActive ?? track.videoCount ?? 0;
  const isComplete = p?.trackComplete ?? false;

  const barColor = isComplete ? 'var(--ls-success)' : pct > 0 ? 'var(--ls-accent)' : 'var(--ls-border)';

  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-4 rounded-xl p-4 transition-all duration-150"
      style={{
        background: 'var(--ls-surface)',
        border: '1px solid var(--ls-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--ls-text-3)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--ls-border)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
      }}
    >
      {/* Thumbnail */}
      <div
        className="shrink-0 h-14 w-14 rounded-xl overflow-hidden flex items-center justify-center"
        style={{ background: 'var(--ls-surface-2)' }}
      >
        {track.thumbnailUrl ? (
          <img src={track.thumbnailUrl} alt={track.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ls-text-3)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3
            className="text-sm font-semibold truncate transition-colors duration-150 group-hover:text-purple-600"
            style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}
          >
            {track.name}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {isComplete && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                style={{ background: 'rgba(30,166,62,0.1)', color: 'var(--ls-success)' }}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {tProgress('completed')}
              </span>
            )}
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: isComplete ? 'var(--ls-success)' : pct > 0 ? 'var(--ls-accent)' : 'var(--ls-text-3)' }}
            >
              {pct}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full rounded-full h-2" style={{ background: 'var(--ls-surface-2)' }}>
          <div
            className="h-2 rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>

        <p className="mt-1.5 text-xs" style={{ color: 'var(--ls-text-3)' }}>
          {tProgress('videoProgress', { completed: completedCount, total })}
        </p>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const router = useRouter();
  const t = useTranslations('dashboard.progress');
  const tCommon = useTranslations('common');
  const [tracks, setTracks] = useState<TrackWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const tracksRes = await api.get<{ data: TrackSummary[] }>('/api/tracks', {
        params: { page: 1, perPage: 100 },
      });
      const trackList = tracksRes.data.data;

      const withProgress = await Promise.all(
        trackList.map(async (track) => {
          try {
            const prog = await api.get<TrackProgress>(`/api/progress/tracks/${track.id}`);
            return { ...track, progress: prog.data };
          } catch {
            return { ...track, progress: null };
          }
        }),
      );

      setTracks(withProgress);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) router.push('/login');
      else setError(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => { load(); }, [load]);

  const started = tracks.filter((tr) => tr.progress && tr.progress.completedCount > 0);
  const completed = tracks.filter((tr) => tr.progress?.trackComplete);
  const inProgress = started.filter((tr) => !tr.progress?.trackComplete);
  const notStarted = tracks.filter((tr) => !tr.progress || tr.progress.completedCount === 0);

  const totalPct = tracks.length > 0
    ? Math.round(tracks.reduce((acc, tr) => acc + (tr.progress?.overallPercentage ?? 0), 0) / tracks.length)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title mb-1">{t('title')}</h1>
        <p className="text-sm" style={{ color: 'var(--ls-text-2)' }}>{t('subtitle')}</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
                <div className="h-8 w-12 rounded skeleton mb-2" />
                <div className="h-3 rounded skeleton w-3/4" />
              </div>
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse flex gap-4 items-center" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
              <div className="h-14 w-14 rounded-xl skeleton shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 rounded skeleton w-1/2" />
                <div className="h-2 rounded-full skeleton w-full" />
                <div className="h-3 rounded skeleton w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl p-6 text-center" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--ls-error)' }}>{error}</p>
          <button onClick={load} className="text-xs underline cursor-pointer" style={{ color: 'var(--ls-text-2)' }}>
            {tCommon('tryAgain')}
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}>
            {t('noProgress')}
          </h3>
          <p className="text-sm mb-5" style={{ color: 'var(--ls-text-2)' }}>{t('noProgressSubtitle')}</p>
          <button
            onClick={() => router.push('/dashboard/tracks')}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: 'var(--ls-accent)' }}
          >
            {tCommon('browseCourses')}
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && tracks.length > 0 && (
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
            <StatCard value={tracks.length} label={t('totalCourses')} />
            <StatCard value={inProgress.length} label={t('inProgress')} />
            <StatCard value={completed.length} label={t('completed')} />
            <StatCard value={totalPct} label="Progresso geral" />
          </div>

          {/* In Progress */}
          {inProgress.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ls-warning)' }} />
                <h2 className="section-label">
                  {t('inProgress')} · {inProgress.length}
                </h2>
              </div>
              <div className="space-y-3">
                {inProgress.map((track) => (
                  <TrackProgressCard
                    key={track.id}
                    track={track}
                    onClick={() => router.push(`/dashboard/tracks/${track.id}`)}
                    tProgress={t}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ls-success)' }} />
                <h2 className="section-label">
                  {t('completed')} · {completed.length}
                </h2>
              </div>
              <div className="space-y-3">
                {completed.map((track) => (
                  <TrackProgressCard
                    key={track.id}
                    track={track}
                    onClick={() => router.push(`/dashboard/tracks/${track.id}`)}
                    tProgress={t}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Not started */}
          {notStarted.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ls-text-3)' }} />
                <h2 className="section-label">
                  {t('notStarted')} · {notStarted.length}
                </h2>
              </div>
              <div className="space-y-3">
                {notStarted.map((track) => (
                  <TrackProgressCard
                    key={track.id}
                    track={track}
                    onClick={() => router.push(`/dashboard/tracks/${track.id}`)}
                    tProgress={t}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
