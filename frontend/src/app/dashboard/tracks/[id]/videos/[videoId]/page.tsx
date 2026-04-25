'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Script from 'next/script';
import { api } from '@/lib/axios';

interface VideoDetail {
  id: string;
  title: string;
  description: string | null;
  youtubeId: string;
  duration: number;
  order: number;
  trackId: string;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

export default function VideoPlayerPage() {
  const router = useRouter();
  const params = useParams<{ id: string; videoId: string }>();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apiReady, setApiReady] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const isPlayingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reportProgress = useCallback(async () => {
    const player = playerRef.current;
    if (!player || !params.videoId) return;
    const watchedSeconds = Math.floor(player.getCurrentTime());
    const totalSeconds = Math.floor(player.getDuration());
    if (totalSeconds <= 0) return;
    try {
      await api.post('/api/progress', {
        videoId: params.videoId,
        watchedSeconds,
        totalSeconds,
      });
    } catch {
      // Silent — errors must not interrupt playback
    }
  }, [params.videoId]);

  useEffect(() => {
    api
      .get<VideoDetail>(`/api/videos/${params.videoId}`)
      .then((res) => setVideo(res.data))
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) router.push('/auth/login');
        else setError('Video not found.');
      })
      .finally(() => setLoading(false));
  }, [params.videoId, router]);

  useEffect(() => {
    if (!apiReady || !video) return;

    playerRef.current = new window.YT.Player('yt-player', {
      videoId: video.youtubeId,
      playerVars: { rel: 0, modestbranding: 1 },
      events: {
        onStateChange: (e) => {
          const playing = e.data === window.YT.PlayerState.PLAYING;
          isPlayingRef.current = playing;

          if (playing) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(reportProgress, 30_000);
          } else {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            if (
              e.data === window.YT.PlayerState.ENDED ||
              e.data === window.YT.PlayerState.PAUSED
            ) {
              reportProgress();
            }
          }
        },
      },
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [apiReady, video, reportProgress]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!video) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Script
        src="https://www.youtube.com/iframe_api"
        strategy="afterInteractive"
        onReady={() => {
          if (window.YT?.Player) {
            setApiReady(true);
          } else {
            window.onYouTubeIframeAPIReady = () => setApiReady(true);
          }
        }}
      />

      <button
        onClick={() => router.push(`/dashboard/tracks/${params.id}`)}
        className="text-sm text-blue-600 hover:underline mb-4 block"
      >
        ← Back to Track
      </button>

      <h1 className="text-xl font-bold mb-4">{video.title}</h1>

      <div className="w-full aspect-video bg-black rounded overflow-hidden mb-4">
        <div id="yt-player" className="w-full h-full" />
      </div>

      {video.description && (
        <p className="text-gray-600 text-sm mt-2">{video.description}</p>
      )}
    </div>
  );
}
