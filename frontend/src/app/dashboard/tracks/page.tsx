'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  APPROVED: { label: 'Enrolled',  bg: 'rgba(34,197,94,0.15)',  color: '#22c55e' },
  PENDING:  { label: 'Pending',   bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  DENIED:   { label: 'Denied',    bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
};

export default function DashboardTracksPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    try {
      const res = await api.get<TracksResponse>('/api/tracks', {
        params: { page, perPage: 20 },
      });
      setTracks(res.data.data);
      setMeta({ page: res.data.meta.page, totalPages: res.data.meta.totalPages });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) router.push('/login');
      else setError('Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--ls-bg)' }}>
      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ls-text)' }}>Courses</h1>
          <p className="mt-1" style={{ color: 'var(--ls-muted)' }}>Browse available courses and request access to enroll.</p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
                <div className="h-40" style={{ background: 'var(--ls-sb-hover)' }} />
                <div className="p-4 space-y-2">
                  <div className="h-4 rounded w-3/4" style={{ background: 'var(--ls-sb-hover)' }} />
                  <div className="h-3 rounded w-full" style={{ background: 'var(--ls-sb-hover)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p style={{ color: '#ef4444' }}>{error}</p>
            <button onClick={() => load()} className="mt-2 text-sm underline" style={{ color: '#ef4444' }}>Try again</button>
          </div>
        )}

        {!loading && !error && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl py-20 text-center" style={{ border: '2px dashed var(--ls-border)', background: 'var(--ls-card)' }}>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--ls-sb-hover)' }}>
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ls-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--ls-text)' }}>No courses available yet</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--ls-muted)' }}>Courses will appear here once they are published.</p>
          </div>
        )}

        {!loading && !error && tracks.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tracks.map((track) => {
                const badge = STATUS_BADGE[track.enrollmentStatus];
                return (
                  <div
                    key={track.id}
                    onClick={() => router.push(`/dashboard/tracks/${track.id}`)}
                    className="group cursor-pointer rounded-xl overflow-hidden transition-shadow hover:shadow-lg"
                    style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}
                  >
                    {track.thumbnailUrl ? (
                      <img src={track.thumbnailUrl} alt={track.name} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center" style={{ background: 'var(--ls-sb-hover)' }}>
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ls-muted)' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-semibold group-hover:opacity-80 transition" style={{ color: 'var(--ls-text)' }}>{track.name}</h2>
                        {badge && (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                        )}
                      </div>
                      {track.description && (
                        <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--ls-muted)' }}>{track.description}</p>
                      )}
                      <p className="text-xs mt-3" style={{ color: 'var(--ls-muted)' }}>
                        {track.videoCount} video{track.videoCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {meta.totalPages > 1 && (
              <div className="flex gap-2 justify-center mt-8">
                {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => load(p)}
                    className="px-3 py-1 rounded text-sm"
                    style={{
                      background: p === meta.page ? 'var(--ls-accent)' : 'transparent',
                      color: p === meta.page ? '#fff' : 'var(--ls-text)',
                      border: '1px solid var(--ls-border)',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
