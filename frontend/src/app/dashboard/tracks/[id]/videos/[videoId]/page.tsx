'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Script from 'next/script';
import { api } from '@/lib/axios';
import { CommentsSection } from '@/components/comments-section';

interface VideoDetail {
  id: string;
  title: string;
  description: string | null;
  youtubeId: string;
  duration: number;
  tracks: { id: string; name: string; order: number }[];
}

interface TrackVideoProgress {
  videoId: string;
  title: string;
  order: number;
  percentage: number;
  completed: boolean;
  watchedSeconds: number;
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
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
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
  const [markingComplete, setMarkingComplete] = useState(false);
  const [markError, setMarkError] = useState('');

  const savedSecondsRef = useRef(0);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visualIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<VideoDetail | null>(null);
  const wasSeekingRef = useRef(false);

  useEffect(() => {
    api
      .get<VideoDetail>(`/api/videos/${params.videoId}`)
      .then((res) => {
        setVideo(res.data);
        videoRef.current = res.data;
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) router.push('/login');
        else setError('Video not found.');
      })
      .finally(() => setLoading(false));
  }, [params.videoId, router]);

  useEffect(() => {
    api
      .get<{ videos: TrackVideoProgress[] }>(`/api/progress/tracks/${params.id}`)
      .then((res) => {
        const sorted = [...res.data.videos].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex((v) => v.videoId === params.videoId);
        if (idx === -1) return;
        const cur = sorted[idx];
        setIsCompleted(cur.completed);
        setWatchPercentage(Math.round(cur.percentage));
        if (!cur.completed && cur.watchedSeconds > 5) {
          savedSecondsRef.current = cur.watchedSeconds;
        }
        setPrevVideoId(idx > 0 ? sorted[idx - 1].videoId : null);
        setNextVideoId(idx < sorted.length - 1 ? sorted[idx + 1].videoId : null);
      })
      .catch(() => {});
  }, [params.id, params.videoId]);

  const postProgress = useCallback(async (watchedSeconds: number, totalSeconds: number) => {
    if (!params.videoId || totalSeconds <= 0) return;
    try {
      const res = await api.post<{ percentage: number; completed: boolean }>('/api/progress', {
        videoId: params.videoId,
        watchedSeconds: Math.floor(watchedSeconds),
        totalSeconds: Math.floor(totalSeconds),
      });
      setWatchPercentage(Math.round(res.data.percentage));
      if (res.data.completed) setIsCompleted(true);
    } catch (err: unknown) {
      console.error('[progress] POST failed:', err);
    }
  }, [params.videoId]);

  const updateVisual = useCallback(() => {
    const player = playerRef.current;
    const vid = videoRef.current;
    if (!player || !vid) return;
    const watched = player.getCurrentTime();
    const total = player.getDuration() || vid.duration;
    if (total <= 0) return;
    setWatchPercentage(Math.round(Math.min(100, (watched / total) * 100)));
  }, []);

  const reportProgress = useCallback(() => {
    const player = playerRef.current;
    const vid = videoRef.current;
    if (!player || !vid) return;
    const watched = player.getCurrentTime();
    const total = player.getDuration() || vid.duration;
    postProgress(watched, total);
  }, [postProgress]);

  const handleMarkComplete = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid || !params.videoId) return;
    setMarkingComplete(true);
    setMarkError('');
    const total = Math.max(vid.duration, 1);
    try {
      const res = await api.post<{ percentage: number; completed: boolean }>('/api/progress', {
        videoId: params.videoId,
        watchedSeconds: total,
        totalSeconds: total,
      });
      setWatchPercentage(Math.round(res.data.percentage));
      if (res.data.completed) {
        setIsCompleted(true);
      } else {
        setMarkError('Server did not mark as complete — try again.');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not save progress. Check your connection.';
      setMarkError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setMarkingComplete(false);
    }
  }, [params.videoId]);

  useEffect(() => {
    if (!apiReady || !video) return;

    playerRef.current = new window.YT.Player('yt-player', {
      videoId: video.youtubeId,
      playerVars: { rel: 0, modestbranding: 1 },
      events: {
        onReady: (e) => {
          if (savedSecondsRef.current > 0) {
            e.target.seekTo(savedSecondsRef.current, true);
          }
        },
        onStateChange: (e) => {
          const { PLAYING, PAUSED, ENDED, BUFFERING } = window.YT.PlayerState;

          if (e.data === PLAYING) {
            if (wasSeekingRef.current) {
              wasSeekingRef.current = false;
              updateVisual();
            }
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(reportProgress, 30_000);
            if (visualIntervalRef.current) clearInterval(visualIntervalRef.current);
            visualIntervalRef.current = setInterval(updateVisual, 5_000);
          } else {
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            if (visualIntervalRef.current) { clearInterval(visualIntervalRef.current); visualIntervalRef.current = null; }

            if (e.data === PAUSED || e.data === ENDED) {
              wasSeekingRef.current = false;
              reportProgress();
            } else if (e.data === BUFFERING) {
              wasSeekingRef.current = true;
            }
          }
        },
      },
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (visualIntervalRef.current) clearInterval(visualIntervalRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [apiReady, video, reportProgress, updateVisual]);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="h-3 w-32 rounded animate-pulse mb-6 skeleton" />
      <div className="h-6 w-72 rounded animate-pulse mb-4 skeleton" />
      <div className="w-full aspect-video rounded-xl animate-pulse skeleton" />
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <p className="text-sm" style={{ color: 'var(--ls-error)' }}>{error}</p>
    </div>
  );
  if (!video) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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

      <h1
        className="text-lg sm:text-xl font-bold tracking-tight mb-4"
        style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}
      >
        {video.title}
      </h1>

      {/* Player */}
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
        <div id="yt-player" className="w-full h-full" />
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full rounded-full" style={{ background: 'var(--ls-surface-2)' }}>
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(watchPercentage, isCompleted ? 100 : 0)}%`,
            background: isCompleted ? 'var(--ls-success)' : 'var(--ls-accent)',
          }}
        />
      </div>

      {/* Status row */}
      <div className="mt-3 flex items-center gap-4 flex-wrap">
        {isCompleted ? (
          <span
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
            style={{ color: 'var(--ls-success)', background: 'rgba(30,166,62,0.1)' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Aula concluída
          </span>
        ) : (
          <>
            <span className="text-xs tabular-nums font-medium" style={{ color: 'var(--ls-text-2)' }}>
              {watchPercentage}% assistido
            </span>
            <button
              onClick={handleMarkComplete}
              disabled={markingComplete}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40 cursor-pointer"
              style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text-1)', background: 'var(--ls-surface)' }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {markingComplete ? 'Salvando…' : 'Marcar como concluída'}
            </button>
          </>
        )}
      </div>

      {markError && (
        <p className="mt-2 text-xs" style={{ color: 'var(--ls-error)' }}>{markError}</p>
      )}

      {video.description && (
        <div
          className="mt-5 p-4 rounded-xl text-sm leading-relaxed"
          style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', color: 'var(--ls-text-2)' }}
        >
          {video.description}
        </div>
      )}

      {/* Prev / Next */}
      <div className="mt-6 pt-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--ls-border)' }}>
        {prevVideoId ? (
          <button
            onClick={() => router.push(`/dashboard/tracks/${params.id}/videos/${prevVideoId}`)}
            className="flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2 transition-colors cursor-pointer"
            style={{ color: 'var(--ls-text-2)', border: '1px solid var(--ls-border)', background: 'var(--ls-surface)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ls-text-3)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ls-border)'; }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Anterior
          </button>
        ) : (
          <span />
        )}
        {nextVideoId ? (
          <button
            onClick={() => router.push(`/dashboard/tracks/${params.id}/videos/${nextVideoId}`)}
            className="flex items-center gap-2 text-sm font-semibold rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: 'var(--ls-accent)' }}
          >
            Próxima aula
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        ) : (
          <span
            className="text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--ls-text-3)', border: '1px solid var(--ls-border)' }}
          >
            Última aula
          </span>
        )}
      </div>

      <CommentsSection videoId={params.videoId} />
    </div>
  );
}
