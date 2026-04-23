'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';

interface TrackSummary {
  id: string;
  name: string;
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

  async function load() {
    try {
      const res = await api.get<TracksResponse>('/api/tracks', {
        params: { page: 1, perPage: 100 },
      });
      setTracks(res.data.data);
    } catch {
      setError('Failed to load tracks.');
    } finally {
      setLoading(false);
    }
  }

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

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Manage Tracks</h1>
        <button
          onClick={() => router.push('/admin/tracks/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          + New Track
        </button>
      </div>

      {tracks.length === 0 && <p className="text-gray-500">No tracks yet.</p>}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 pr-4">Order</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Videos</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track) => (
            <tr key={track.id} className="border-b hover:bg-gray-50">
              <td className="py-2 pr-4 text-gray-400">{track.order}</td>
              <td className="py-2 pr-4 font-medium">{track.name}</td>
              <td className="py-2 pr-4">{track.videoCount}</td>
              <td className="py-2 pr-4">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    track.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {track.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-2 flex gap-2">
                <button
                  onClick={() => router.push(`/admin/tracks/${track.id}`)}
                  className="text-blue-600 hover:underline text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(track)}
                  className="text-yellow-600 hover:underline text-xs"
                >
                  {track.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => deleteTrack(track.id)}
                  className="text-red-600 hover:underline text-xs"
                >
                  Delete
                </button>
                <button
                  onClick={() =>
                    router.push(`/admin/tracks/${track.id}/videos`)
                  }
                  className="text-gray-600 hover:underline text-xs"
                >
                  Videos
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
