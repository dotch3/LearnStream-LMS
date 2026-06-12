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

  // Saved position for resume-from-where-left-off
  const savedSecondsRef = useRef(0);

  // Refs to avoid stale closures in callbacks
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);       // 30s API sync
  const visualIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null); // 5s visual update
  const videoRef = useRef<VideoDetail | null>(null);
  const wasSeekingRef = useRef(false); // true while buffering after a seek

  // Load video details
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

  // Load track progress: completion + saved position + prev/next
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
        // Save position for resume (don't resume if already completed)
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
      // Log but don't interrupt playback
      console.error('[progress] POST failed:', err);
    }
  }, [params.videoId]);

  // Update the visual % immediately from player state — no API call
  const updateVisual = useCallback(() => {
    const player = playerRef.current;
    const vid = videoRef.current;
    if (!player || !vid) return;
    const watched = player.getCurrentTime();
    const total = player.getDuration() || vid.duration;
    if (total <= 0) return;
    setWatchPercentage(Math.round(Math.min(100, (watched / total) * 100)));
  }, []);

  // Send progress to API + update visual
  const reportProgress = useCallback(() => {
    const player = playerRef.current;
    const vid = videoRef.current;
    if (!player || !vid) return;
    const watched = player.getCurrentTime();
    const total = player.getDuration() || vid.duration;
    postProgress(watched, total);
  }, [postProgress]);

  // Mark complete: use stored DB duration as fallback so it works even without the YT player
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

  // Set up YouTube player
  useEffect(() => {
    if (!apiReady || !video) return;

    playerRef.current = new window.YT.Player('yt-player', {
      videoId: video.youtubeId,
      playerVars: { rel: 0, modestbranding: 1 },
      events: {
        onReady: (e) => {
          // Resume from saved position (skip if already completed)
          if (savedSecondsRef.current > 0) {
            e.target.seekTo(savedSecondsRef.current, true);
          }
        },
        onStateChange: (e) => {
          const { PLAYING, PAUSED, ENDED, BUFFERING } = window.YT.PlayerState;

          if (e.data === PLAYING) {
            // If we just finished buffering after a seek, getCurrentTime() now
            // reflects the new position — update visual immediately before intervals kick in
            if (wasSeekingRef.current) {
              wasSeekingRef.current = false;
              updateVisual();
            }
            // API sync every 30s
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(reportProgress, 30_000);
            // Visual update every 5s while playing
            if (visualIntervalRef.current) clearInterval(visualIntervalRef.current);
            visualIntervalRef.current = setInterval(updateVisual, 5_000);
          } else {
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            if (visualIntervalRef.current) { clearInterval(visualIntervalRef.current); visualIntervalRef.current = null; }

            if (e.data === PAUSED || e.data === ENDED) {
              wasSeekingRef.current = false;
              reportProgress();
            } else if (e.data === BUFFERING) {
              // getCurrentTime() still holds the old position here — don't update visual yet
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

  if (loading) return <div className="p-4 sm:p-8">Loading...</div>;
  if (error) return <div className="p-4 sm:p-8" style={{ color: '#ef4444' }}>{error}</div>;
  if (!video) return null;

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
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
        className="text-sm mb-4 block transition-opacity hover:opacity-70"
        style={{ color: 'var(--ls-accent)' }}
      >
        ← Back to Track
      </button>

      <h1 className="text-xl font-bold mb-4">{video.title}</h1>

      <div className="w-full aspect-video bg-black rounded overflow-hidden">
        <div id="yt-player" className="w-full h-full" />
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full rounded-full" style={{ background: 'var(--ls-border)' }}>
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(watchPercentage, isCompleted ? 100 : 0)}%`,
            background: isCompleted ? '#22c55e' : 'var(--ls-accent)',
          }}
        />
      </div>

      {/* Status row */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {isCompleted ? (
          /* ── Completed state ── */
          <span className="inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Lesson complete
          </span>
        ) : (
          /* ── Not completed state ── */
          <>
            <span className="text-sm" style={{ color: 'var(--ls-muted)' }}>{watchPercentage}% watched</span>
            <button
              onClick={handleMarkComplete}
              disabled={markingComplete}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50 transition-all"
              style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-card)', color: 'var(--ls-text)' }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {markingComplete ? 'Saving...' : 'Mark as complete'}
            </button>
          </>
        )}
      </div>

      {/* Error feedback for mark-complete */}
      {markError && (
        <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>{markError}</p>
      )}

      {video.description && (
        <p className="text-sm mt-4" style={{ color: 'var(--ls-muted)' }}>{video.description}</p>
      )}

      {/* Prev / Next navigation */}
      <div className="mt-6 flex justify-between pt-4" style={{ borderTop: '1px solid var(--ls-border)' }}>
        {prevVideoId ? (
          <button
            onClick={() => router.push(`/dashboard/tracks/${params.id}/videos/${prevVideoId}`)}
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--ls-accent)' }}
          >
            ← Previous lesson
          </button>
        ) : (
          <span />
        )}
        {nextVideoId ? (
          <button
            onClick={() => router.push(`/dashboard/tracks/${params.id}/videos/${nextVideoId}`)}
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--ls-accent)' }}
          >
            Next lesson →
          </button>
        ) : (
          <span className="text-sm" style={{ color: 'var(--ls-muted)' }}>Last lesson in course</span>
        )}
      </div>

      <CommentsSection videoId={params.videoId} />
    </div>
  );
}
