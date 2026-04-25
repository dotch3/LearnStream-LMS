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
}

interface TracksResponse {
  data: TrackSummary[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

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
      if (status === 401) {
        router.push('/login');
      } else {
        setError('Failed to load tracks.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Training Tracks</h1>
          <p className="mt-1 text-gray-500">Browse the available courses and start learning.</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={() => load()} className="mt-3 text-sm text-red-600 underline">Try again</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-700">No tracks available yet</h2>
            <p className="mt-1 text-sm text-gray-400">Training tracks will appear here once they are published.</p>
          </div>
        )}

        {/* Track grid */}
        {!loading && !error && tracks.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => router.push(`/dashboard/tracks/${track.id}`)}
                  className="group cursor-pointer bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-300 transition"
                >
                  {track.thumbnailUrl ? (
                    <img src={track.thumbnailUrl} alt={track.name} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                      <svg className="h-10 w-10 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">{track.name}</h2>
                    {track.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{track.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-3">
                      {track.videoCount} video{track.videoCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {meta.totalPages > 1 && (
              <div className="flex gap-2 justify-center mt-8">
                {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => load(p)}
                    className={`px-3 py-1 rounded border text-sm ${
                      p === meta.page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-100 border-gray-300'
                    }`}
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
