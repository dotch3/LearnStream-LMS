'use client';

import { useEffect, useState } from 'react';
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

  async function load(page = 1) {
    try {
      const res = await api.get<TracksResponse>('/api/tracks', {
        params: { page, perPage: 20 },
      });
      setTracks(res.data.data);
      setMeta({ page: res.data.meta.page, totalPages: res.data.meta.totalPages });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        router.push('/auth/login');
      } else {
        setError('Failed to load tracks.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Training Tracks</h1>

      {tracks.length === 0 && (
        <p className="text-gray-500">No tracks available yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tracks.map((track) => (
          <div
            key={track.id}
            onClick={() => router.push(`/dashboard/tracks/${track.id}`)}
            className="cursor-pointer border rounded-lg overflow-hidden shadow hover:shadow-md transition"
          >
            {track.thumbnailUrl && (
              <img
                src={track.thumbnailUrl}
                alt={track.name}
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-4">
              <h2 className="font-semibold text-lg">{track.name}</h2>
              {track.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {track.description}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
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
                p === meta.page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
