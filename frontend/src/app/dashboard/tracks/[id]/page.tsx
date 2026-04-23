'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';

interface VideoSummary {
  id: string;
  title: string;
  youtubeId: string;
  thumbnailUrl: string | null;
  duration: number;
  order: number;
  isActive: boolean;
}

interface TrackDetail {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  videoCount: number;
  videos: VideoSummary[];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<TrackDetail>(`/api/tracks/${params.id}`)
      .then((res) => setTrack(res.data))
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          router.push('/auth/login');
        } else if (status === 404) {
          setError('Track not found.');
        } else {
          setError('Failed to load track.');
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!track) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => router.push('/dashboard/tracks')}
        className="text-sm text-blue-600 hover:underline mb-4 block"
      >
        ← Back to Tracks
      </button>

      <div className="flex gap-6 mb-8">
        {track.thumbnailUrl && (
          <img
            src={track.thumbnailUrl}
            alt={track.name}
            className="w-48 h-32 object-cover rounded"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{track.name}</h1>
          {track.description && (
            <p className="text-gray-600 mt-1">{track.description}</p>
          )}
          <p className="text-sm text-gray-400 mt-2">
            {track.videoCount} video{track.videoCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Videos</h2>
      {track.videos.length === 0 && (
        <p className="text-gray-500">No videos in this track yet.</p>
      )}

      <div className="space-y-3">
        {track.videos.map((video, idx) => (
          <div
            key={video.id}
            className="flex gap-4 items-center border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
            onClick={() =>
              router.push(`/dashboard/tracks/${track.id}/videos/${video.id}`)
            }
          >
            <span className="text-gray-400 text-sm w-5">{idx + 1}</span>
            {video.thumbnailUrl && (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-24 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <p className="font-medium">{video.title}</p>
            </div>
            <span className="text-sm text-gray-500">
              {formatDuration(video.duration)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
