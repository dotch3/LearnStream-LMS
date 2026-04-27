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

export default function ProgressPage() {
  const router = useRouter();
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
      else setError('Failed to load progress.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const started = tracks.filter((t) => t.progress && t.progress.completedCount > 0);
  const completed = tracks.filter((t) => t.progress?.trackComplete);
  const notStarted = tracks.filter((t) => !t.progress || t.progress.completedCount === 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Progress</h1>
          <p className="mt-1 text-gray-500">Track your learning journey across all courses.</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white border border-gray-200 p-5 animate-pulse">
                <div className="flex gap-4 items-center">
                  <div className="h-14 w-14 rounded-lg bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-2 bg-gray-100 rounded-full w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={load} className="mt-3 text-sm text-red-600 underline">Try again</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-700">No courses available yet</h2>
            <p className="mt-1 text-sm text-gray-400">Start watching a track to see your progress here.</p>
            <button
              onClick={() => router.push('/dashboard/tracks')}
              className="mt-5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Browse Tracks
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && tracks.length > 0 && (
          <div className="space-y-8">

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Tracks', value: tracks.length },
                { label: 'In Progress', value: started.length - completed.length },
                { label: 'Completed', value: completed.length },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white border border-gray-200 shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{s.value}</p>
                  <p className="mt-1 text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* In progress */}
            {started.filter((t) => !t.progress?.trackComplete).length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">In Progress</h2>
                <div className="space-y-3">
                  {started.filter((t) => !t.progress?.trackComplete).map((track) => (
                    <TrackProgressCard key={track.id} track={track} onClick={() => router.push(`/dashboard/tracks/${track.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Completed</h2>
                <div className="space-y-3">
                  {completed.map((track) => (
                    <TrackProgressCard key={track.id} track={track} onClick={() => router.push(`/dashboard/tracks/${track.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Not started */}
            {notStarted.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Not Started</h2>
                <div className="space-y-3">
                  {notStarted.map((track) => (
                    <TrackProgressCard key={track.id} track={track} onClick={() => router.push(`/dashboard/tracks/${track.id}`)} />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

function TrackProgressCard({
  track,
  onClick,
}: {
  track: TrackWithProgress;
  onClick: () => void;
}) {
  const p = track.progress;
  const pct = p?.overallPercentage ?? 0;
  const completed = p?.completedCount ?? 0;
  const total = p?.totalActive ?? track.videoCount ?? 0;

  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-4 rounded-xl bg-white border border-gray-200 shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition"
    >
      {/* Thumbnail */}
      <div className="shrink-0 h-14 w-14 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center">
        {track.thumbnailUrl ? (
          <img src={track.thumbnailUrl} alt={track.name} className="h-full w-full object-cover" />
        ) : (
          <svg className="h-6 w-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition">{track.name}</h3>
          <span className="shrink-0 text-sm font-medium text-indigo-600">{pct}%</span>
        </div>
        <div className="w-full rounded-full bg-gray-100 h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {completed} of {total} video{total !== 1 ? 's' : ''} watched
          {p?.trackComplete && <span className="ml-2 text-green-600 font-medium">· Completed</span>}
        </p>
      </div>
    </div>
  );
}
