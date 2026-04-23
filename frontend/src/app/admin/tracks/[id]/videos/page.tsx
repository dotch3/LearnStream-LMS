'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';

interface VideoItem {
  id: string;
  title: string;
  order: number;
  isActive: boolean;
  duration: number;
}

interface TrackDetail {
  id: string;
  name: string;
  videos: VideoItem[];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AdminTrackVideosPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await api.get<TrackDetail>(`/api/tracks/${params.id}`);
      setTrack(res.data);
    } catch {
      setError('Track not found.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(video: VideoItem) {
    await api.patch(`/api/videos/${video.id}`, { isActive: !video.isActive });
    setTrack((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        videos: prev.videos.map((v) =>
          v.id === video.id ? { ...v, isActive: !v.isActive } : v,
        ),
      };
    });
  }

  async function deleteVideo(id: string) {
    if (!confirm('Delete this video?')) return;
    await api.delete(`/api/videos/${id}`);
    setTrack((prev) => {
      if (!prev) return prev;
      return { ...prev, videos: prev.videos.filter((v) => v.id !== id) };
    });
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!track) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => router.push('/admin/tracks')}
        className="text-sm text-blue-600 hover:underline mb-1 block"
      >
        ← Back to Tracks
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Videos — {track.name}</h1>
        <button
          onClick={() =>
            router.push(`/admin/tracks/${params.id}/videos/new`)
          }
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          + Add Video
        </button>
      </div>

      {track.videos.length === 0 && (
        <p className="text-gray-500">No videos yet. Add one above.</p>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 pr-4">Order</th>
            <th className="py-2 pr-4">Title</th>
            <th className="py-2 pr-4">Duration</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {track.videos.map((video) => (
            <tr key={video.id} className="border-b hover:bg-gray-50">
              <td className="py-2 pr-4 text-gray-400">{video.order}</td>
              <td className="py-2 pr-4 font-medium">{video.title}</td>
              <td className="py-2 pr-4">{formatDuration(video.duration)}</td>
              <td className="py-2 pr-4">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    video.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {video.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-2 flex gap-2">
                <button
                  onClick={() =>
                    router.push(
                      `/admin/tracks/${params.id}/videos/${video.id}`,
                    )
                  }
                  className="text-blue-600 hover:underline text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(video)}
                  className="text-yellow-600 hover:underline text-xs"
                >
                  {video.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => deleteVideo(video.id)}
                  className="text-red-600 hover:underline text-xs"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
