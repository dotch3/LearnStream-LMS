'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Script from 'next/script';
import { useTranslations } from 'next-intl';
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
  playVideo(): void;
  pauseVideo(): void;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function VideoPlayerPage() {
  const router = useRouter();
  const params = useParams<{ id: string; videoId: string }>();
  const t = useTranslations('dashboard.video');

  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apiReady, setApiReady] = useState(false);

  const [isCompleted, setIsCompleted] = useState(false);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [prevVideoId, setPrevVideoId] = useState<string | null>(null);
  const [nextVideoId, setNextVideoId] = useState<string | null>(null);
  const [prevVideoTitle, setPrevVideoTitle] = useState('');
  const [nextVideoTitle, setNextVideoTitle] = useState('');

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showEnded, setShowEnded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const savedSecondsRef = useRef(0);
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visualIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<VideoDetail | null>(null);
  const wasSeekingRef = useRef(false);
  const isPlayingRef = useRef(false);
  const durationRef = useRef(0);

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
        else setError(t('notFound'));
      })
      .finally(() => setLoading(false));
  }, [params.videoId, router, t]);

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
        if (idx > 0) {
          setPrevVideoId(sorted[idx - 1].videoId);
          setPrevVideoTitle(sorted[idx - 1].title);
        }
        if (idx < sorted.length - 1) {
          setNextVideoId(sorted[idx + 1].videoId);
          setNextVideoTitle(sorted[idx + 1].title);
        }
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
    } catch {
      // silent
    }
  }, [params.videoId]);

  const updateVisual = useCallback(() => {
    const player = playerRef.current;
    const vid = videoRef.current;
    if (!player || !vid) return;
    const watched = player.getCurrentTime();
    const total = player.getDuration() || vid.duration;
    if (total <= 0) return;
    setCurrentTime(watched);
    if (durationRef.current !== total) {
      durationRef.current = total;
      setDuration(total);
    }
    setWatchPercentage(Math.round(Math.min(100, (watched / total) * 100)));
  }, []);

  const reportProgress = useCallback(() => {
    const player = playerRef.current;
    const vid = videoRef.current;
    if (!player || !vid) return;
    postProgress(player.getCurrentTime(), player.getDuration() || vid.duration);
  }, [postProgress]);

  useEffect(() => {
    if (!apiReady || !video) return;

    playerRef.current = new window.YT.Player('yt-player', {
      videoId: video.youtubeId,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        controls: 0,
        disablekb: 1,
        playsinline: 1,
        iv_load_policy: 3,
      },
      events: {
        onReady: (e) => {
          if (savedSecondsRef.current > 0) e.target.seekTo(savedSecondsRef.current, true);
          const dur = e.target.getDuration();
          if (dur > 0) { durationRef.current = dur; setDuration(dur); }
        },
        onStateChange: (e) => {
          const { PLAYING, PAUSED, ENDED, BUFFERING } = window.YT.PlayerState;
          if (e.data === PLAYING) {
            isPlayingRef.current = true;
            setIsPlaying(true);
            setShowEnded(false);
            const dur = playerRef.current?.getDuration() ?? 0;
            if (dur > 0 && durationRef.current !== dur) { durationRef.current = dur; setDuration(dur); }
            if (wasSeekingRef.current) { wasSeekingRef.current = false; updateVisual(); }
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(reportProgress, 30_000);
            if (visualIntervalRef.current) clearInterval(visualIntervalRef.current);
            visualIntervalRef.current = setInterval(updateVisual, 1_000);
          } else {
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            if (visualIntervalRef.current) { clearInterval(visualIntervalRef.current); visualIntervalRef.current = null; }
            if (e.data === PAUSED) {
              isPlayingRef.current = false; setIsPlaying(false); wasSeekingRef.current = false;
              reportProgress(); updateVisual();
            } else if (e.data === ENDED) {
              isPlayingRef.current = false; setIsPlaying(false); wasSeekingRef.current = false;
              setShowEnded(true); reportProgress(); updateVisual();
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

  function togglePlay() {
    if (showEnded) return;
    const player = playerRef.current;
    if (!player) return;
    if (isPlayingRef.current) player.pauseVideo(); else player.playVideo();
  }

  function handleReplay() {
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(0, true);
    player.playVideo();
    setShowEnded(false);
    setCurrentTime(0);
  }

  function cycleSpeed() {
    const idx = SPEEDS.indexOf(playbackRate);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    playerRef.current?.setPlaybackRate(next);
    setPlaybackRate(next);
  }

  async function handleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else {
      await el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const progressPercent = duration > 0
    ? Math.min(100, (currentTime / duration) * 100)
    : Math.max(watchPercentage, isCompleted ? 100 : 0);

  const trackName = video?.tracks.find((t) => t.id === params.id)?.name ?? '';

  const goTo = (vid: string) => router.push(`/dashboard/tracks/${params.id}/videos/${vid}`);
  const goToTrack = () => router.push(`/dashboard/tracks/${params.id}`);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="h-3 w-40 rounded animate-pulse mb-5 skeleton" />
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <Script
        src="https://www.youtube.com/iframe_api"
        strategy="afterInteractive"
        onReady={() => {
          if (window.YT?.Player) setApiReady(true);
          else window.onYouTubeIframeAPIReady = () => setApiReady(true);
        }}
      />

      {/* ── Breadcrumb ─────────────────────────────────────────── */}
      <button
        onClick={goToTrack}
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-3 cursor-pointer transition-colors group"
        style={{ color: 'var(--ls-text-3)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ls-accent)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ls-text-3)'; }}
      >
        <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        <span className="truncate max-w-[200px] sm:max-w-none">
          {trackName || t('backToCourse')}
        </span>
      </button>

      {/* ── Title + completion badge ───────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h1
          className="text-base sm:text-lg font-semibold leading-snug"
          style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}
        >
          {video.title}
        </h1>
        {isCompleted && (
          <span
            className="flex items-center gap-1 shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ color: 'var(--ls-success)', background: 'rgba(30,166,62,0.1)', border: '1px solid rgba(30,166,62,0.18)' }}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {t('completed')}
          </span>
        )}
      </div>

      {/* ── Video player ──────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative w-full bg-black rounded-xl overflow-hidden shadow-lg"
        style={{ aspectRatio: '16/9' }}
      >
        {/* YouTube iframe */}
        <div id="yt-player" className="absolute inset-0 w-full h-full" />

        {/* Click overlay (z-10) */}
        <div
          className="absolute inset-0 select-none cursor-pointer"
          style={{ zIndex: 10 }}
          onClick={togglePlay}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); } }}
          tabIndex={0}
          role="button"
          aria-label={isPlaying ? t('pause') : t('play')}
        />

        {/* Center play icon when paused (z-15, pointer-events: none) */}
        {!isPlaying && !showEnded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 15 }}>
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 56, height: 56, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            >
              <svg className="h-6 w-6 text-white" style={{ marginLeft: 3 }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Ended overlay (z-30) */}
        {showEnded && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-5"
            style={{ zIndex: 30, background: 'rgba(0,0,0,0.78)' }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.7)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-white/80 text-sm font-medium tracking-wide">{t('lessonEnded')}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReplay}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                {t('repeatLesson')}
              </button>
              {nextVideoId && (
                <button
                  onClick={() => goTo(nextVideoId)}
                  className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 active:scale-95"
                  style={{ background: 'var(--ls-accent)' }}
                >
                  {t('nextLesson')}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Controls bar — overlaid at bottom (z-20) ── */}
        {!showEnded && (
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ zIndex: 20, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.82))' }}
          >
            {/* Progress bar */}
            <div className="px-3 pt-4 pb-1">
              <div className="relative h-[3px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%`, background: isCompleted ? '#4ade80' : 'white' }}
                />
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-0.5 px-1.5 pb-2">
              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="flex items-center justify-center rounded-lg cursor-pointer transition-opacity hover:opacity-80 active:scale-95"
                style={{ width: 44, height: 44 }}
                aria-label={isPlaying ? t('pause') : t('play')}
              >
                {isPlaying ? (
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-white" style={{ marginLeft: 2 }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Time */}
              <span className="text-[11px] font-mono tabular-nums ml-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {formatSeconds(currentTime)}
                <span style={{ color: 'rgba(255,255,255,0.35)' }}> / </span>
                {duration > 0 ? formatSeconds(duration) : '--:--'}
              </span>

              <div className="flex-1" />

              {/* Speed */}
              <button
                onClick={cycleSpeed}
                className="flex items-center justify-center rounded-md text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80 active:scale-95"
                style={{ minWidth: 44, height: 44, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em' }}
                aria-label={t('speedLabel', { rate: playbackRate })}
              >
                {playbackRate === 1 ? '1×' : `${playbackRate}×`}
              </button>

              {/* Fullscreen */}
              <button
                onClick={handleFullscreen}
                className="flex items-center justify-center rounded-lg cursor-pointer transition-opacity hover:opacity-80 active:scale-95"
                style={{ width: 44, height: 44 }}
                aria-label={isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
              >
                {isFullscreen ? (
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Prev / Next — logo abaixo do vídeo ─────────────────── */}
      <div className="mt-3 flex items-stretch gap-2">
        {prevVideoId ? (
          <button
            onClick={() => goTo(prevVideoId)}
            className="flex-1 sm:flex-none flex items-center gap-2 rounded-xl px-3 sm:px-4 py-3 text-sm font-medium transition-colors cursor-pointer min-h-[52px] active:scale-[0.98]"
            style={{ color: 'var(--ls-text-2)', border: '1px solid var(--ls-border)', background: 'var(--ls-surface)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ls-text-3)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ls-border)'; }}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <div className="text-left min-w-0">
              <div className="text-xs mb-0.5" style={{ color: 'var(--ls-text-3)' }}>{t('prevLesson')}</div>
              <div className="text-xs font-semibold truncate max-w-[140px] sm:max-w-[200px]" style={{ color: 'var(--ls-text-1)' }}>
                {prevVideoTitle}
              </div>
            </div>
          </button>
        ) : <div className="flex-1 sm:flex-none" />}

        {nextVideoId ? (
          <button
            onClick={() => goTo(nextVideoId)}
            className="flex-1 sm:flex-none flex items-center gap-2 rounded-xl px-3 sm:px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer min-h-[52px] active:scale-[0.98]"
            style={{ background: 'var(--ls-accent)' }}
          >
            <div className="text-left min-w-0 flex-1">
              <div className="text-xs mb-0.5 opacity-75">{t('nextLesson')}</div>
              <div className="text-xs font-bold truncate max-w-[140px] sm:max-w-[200px]">
                {nextVideoTitle}
              </div>
            </div>
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        ) : (
          <span
            className="flex items-center text-xs font-medium px-3 py-2 rounded-xl"
            style={{ color: 'var(--ls-text-3)', border: '1px solid var(--ls-border)' }}
          >
            {t('lastLesson')}
          </span>
        )}
      </div>

      {/* ── Description ───────────────────────────────────────── */}
      {video.description && (
        <div
          className="mt-4 p-4 rounded-xl text-sm leading-relaxed"
          style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', color: 'var(--ls-text-2)' }}
        >
          {video.description}
        </div>
      )}

      {/* ── Comments ──────────────────────────────────────────── */}
      <CommentsSection videoId={params.videoId} />
    </div>
  );
}
