'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';

interface TrackSummary {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  videoCount: number;
  order: number;
}

interface TracksResponse {
  data: TrackSummary[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

export default function AdminTracksPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    api
      .get<TracksResponse>('/api/tracks', { params: { page: 1, perPage: 100 } })
      .then((res) => { if (mounted) setTracks(res.data.data); })
      .catch(() => { if (mounted) setError('Failed to load tracks.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  async function toggleActive(track: TrackSummary) {
    await api.patch(`/api/tracks/${track.id}`, { isActive: !track.isActive });
    setTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, isActive: !t.isActive } : t)),
    );
  }

  async function deleteTrack(id: string) {
    if (!confirm('Delete this track and all its videos?')) return;
    await api.delete(`/api/tracks/${id}`);
    setTracks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tracks</h1>
            <p className="mt-1 text-gray-500">Manage courses and their videos.</p>
          </div>
          <button
            onClick={() => router.push('/admin/tracks/new')}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Track
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white border border-gray-200 p-4 animate-pulse">
                <div className="flex justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                  <div className="h-6 w-20 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-700">No tracks yet</h2>
            <p className="mt-1 text-sm text-gray-400">Create your first track to start adding videos.</p>
            <button
              onClick={() => router.push('/admin/tracks/new')}
              className="mt-5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create first track
            </button>
          </div>
        )}

        {/* Track list */}
        {!loading && !error && tracks.length > 0 && (
          <div className="space-y-3">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-4 rounded-xl bg-white border border-gray-200 shadow-sm p-4 hover:border-indigo-200 transition"
              >
                {/* Order badge */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-500">
                  {track.order || '#'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{track.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      track.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {track.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {track.description && (
                    <p className="text-sm text-gray-400 truncate mt-0.5">{track.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {track.videoCount} video{track.videoCount !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => router.push(`/admin/tracks/${track.id}/videos`)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    Videos
                  </button>
                  <button
                    onClick={() => router.push(`/admin/tracks/${track.id}`)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(track)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      track.isActive
                        ? 'border-yellow-200 text-yellow-700 hover:bg-yellow-50'
                        : 'border-green-200 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {track.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => deleteTrack(track.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
