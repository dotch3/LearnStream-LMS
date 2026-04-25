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

interface TrackVideoProgress {
  videoId: string;
  title: string;
  order: number;
  percentage: number;
  completed: boolean;
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

  const [isCompleted, setIsCompleted] = useState(false);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [prevVideoId, setPrevVideoId] = useState<string | null>(null);
  const [nextVideoId, setNextVideoId] = useState<string | null>(null);

  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load video details
  useEffect(() => {
    api
      .get<VideoDetail>(`/api/videos/${params.videoId}`)
      .then((res) => setVideo(res.data))
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) router.push('/login');
        else setError('Video not found.');
      })
      .finally(() => setLoading(false));
  }, [params.videoId, router]);

  // Load track progress: completion state + prev/next navigation
  useEffect(() => {
    api
      .get<{ videos: TrackVideoProgress[] }>(`/api/progress/tracks/${params.id}`)
      .then((res) => {
        const sorted = [...res.data.videos].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex((v) => v.videoId === params.videoId);
        if (idx === -1) return;
        setIsCompleted(sorted[idx].completed);
        setWatchPercentage(Math.round(sorted[idx].percentage));
        setPrevVideoId(idx > 0 ? sorted[idx - 1].videoId : null);
        setNextVideoId(idx < sorted.length - 1 ? sorted[idx + 1].videoId : null);
      })
      .catch(() => {});
  }, [params.id, params.videoId]);

  const reportProgress = useCallback(async () => {
    const player = playerRef.current;
    if (!player || !params.videoId) return;
    const watchedSeconds = Math.floor(player.getCurrentTime());
    const totalSeconds = Math.floor(player.getDuration());
    if (totalSeconds <= 0) return;
    try {
      const res = await api.post<{ percentage: number; completed: boolean }>('/api/progress', {
        videoId: params.videoId,
        watchedSeconds,
        totalSeconds,
      });
      setWatchPercentage(Math.round(res.data.percentage));
      if (res.data.completed) setIsCompleted(true);
    } catch {
      // Silent — errors must not interrupt playback
    }
  }, [params.videoId]);

  useEffect(() => {
    if (!apiReady || !video) return;

    playerRef.current = new window.YT.Player('yt-player', {
      videoId: video.youtubeId,
      playerVars: { rel: 0, modestbranding: 1 },
      events: {
        onStateChange: (e) => {
          const playing = e.data === window.YT.PlayerState.PLAYING;

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

      <div className="w-full aspect-video bg-black rounded overflow-hidden">
        <div id="yt-player" className="w-full h-full" />
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-gray-200">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${watchPercentage}%` }}
        />
      </div>

      {/* Completion badge / progress label */}
      <div className="mt-2 flex items-center gap-2">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Aula concluída
          </span>
        ) : (
          <span className="text-sm text-gray-500">{watchPercentage}% assistido</span>
        )}
      </div>

      {video.description && (
        <p className="text-gray-600 text-sm mt-4">{video.description}</p>
      )}

      {/* Prev / Next navigation */}
      <div className="mt-6 flex justify-between border-t pt-4">
        {prevVideoId ? (
          <button
            onClick={() => router.push(`/dashboard/tracks/${params.id}/videos/${prevVideoId}`)}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Aula anterior
          </button>
        ) : (
          <span />
        )}
        {nextVideoId ? (
          <button
            onClick={() => router.push(`/dashboard/tracks/${params.id}/videos/${nextVideoId}`)}
            className="text-sm text-blue-600 hover:underline"
          >
            Próxima aula →
          </button>
        ) : (
          <span className="text-sm text-gray-400">Última aula do track</span>
        )}
      </div>
    </div>
  );
}
