'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';
import { useAuth } from '@/contexts/auth.context';

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
  videoCount: number;
  videos: VideoSummary[];
  enrollmentStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED';
}

interface VideoProgress {
  videoId: string;
  completed: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function EnrollmentGate({
  trackId,
  status,
  onStatusChange,
}: {
  trackId: string;
  status: 'NONE' | 'PENDING' | 'DENIED';
  onStatusChange: (s: 'PENDING') => void;
}) {
  const t = useTranslations('dashboard.trackDetail');
  const [code, setCode] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [redeemGranted, setRedeemGranted] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!redeemSuccess || !redeemGranted) return;
    const timer = setTimeout(() => window.location.reload(), 1500);
    return () => clearTimeout(timer);
  }, [redeemSuccess, redeemGranted]);

  const request = async () => {
    setRequesting(true);
    setErr('');
    try {
      await api.post('/api/enrollments/request', { trackId });
      onStatusChange('PENDING');
      setMsg(t('requestSent'));
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErr(Array.isArray(m) ? m.join(', ') : String(m ?? t('failedRequest')));
    } finally {
      setRequesting(false);
    }
  };

  const redeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    setErr('');
    try {
      const { data } = await api.post<{ enrolledTrackIds: string[] }>('/api/enrollments/redeem', { code: code.trim() });
      const granted = data.enrolledTrackIds.includes(trackId);
      setRedeemSuccess(true);
      setRedeemGranted(granted);
      setMsg('');
      setCode('');
    } catch (e: unknown) {
      let errMsg = t('invalidCode');
      try {
        const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
        if (raw) errMsg = Array.isArray(raw) ? raw.join(', ') : String(raw);
      } catch {}
      setErr(errMsg);
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="rounded-xl p-5 sm:p-6" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
      {redeemSuccess ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          {redeemGranted ? (
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(30,166,62,0.1)' }}>
              <CheckIcon className="h-6 w-6" style={{ color: 'var(--ls-success)' }} />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--ls-surface-2)' }}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--ls-text-3)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ls-text-1)' }}>
              {redeemGranted ? t('enrolledSuccess') : t('codeApplied')}
            </p>
            <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--ls-text-2)' }}>
              {redeemGranted ? t('nowHasAccess') : t('codeNotIncluded')}
            </p>
          </div>
          {redeemGranted && (
            <button
              onClick={() => window.location.reload()}
              className="mt-1 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer active:scale-95"
              style={{ background: 'var(--ls-accent)' }}
            >
              {t('viewCourse')}
            </button>
          )}
        </div>
      ) : (
        <>
          {status === 'DENIED' && (
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2.5 mb-4 text-sm"
              style={{ background: 'rgba(211,47,47,0.07)', color: 'var(--ls-error)' }}
            >
              <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {t('denied')}
            </div>
          )}

          {status === 'PENDING' || msg ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--ls-surface-2)' }}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--ls-text-3)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ls-text-1)' }}>{t('accessPending')}</p>
                <p className="text-sm mt-0.5 max-w-xs" style={{ color: 'var(--ls-text-2)' }}>
                  {msg || t('accessPendingDesc')}
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ls-text-1)' }}>{t('enrollRequired')}</p>
              <p className="text-sm mb-5" style={{ color: 'var(--ls-text-2)' }}>{t('enrollRequiredDesc')}</p>

              <div className="flex flex-col gap-3">
                <button
                  disabled={requesting}
                  onClick={request}
                  className="w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90 cursor-pointer active:scale-[0.98]"
                  style={{ background: 'var(--ls-accent)' }}
                >
                  {requesting ? t('requesting') : t('requestAccess')}
                </button>

                <div className="flex items-center gap-2">
                  <hr className="flex-1" style={{ borderColor: 'var(--ls-border)' }} />
                  <span className="text-xs shrink-0 font-medium" style={{ color: 'var(--ls-text-3)' }}>{t('orUseCode')}</span>
                  <hr className="flex-1" style={{ borderColor: 'var(--ls-border)' }} />
                </div>

                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{
                      background: 'var(--ls-bg)',
                      border: '1px solid var(--ls-border)',
                      color: 'var(--ls-text-1)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ls-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ls-border)'; }}
                    placeholder={t('enterCode')}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') redeem(); }}
                  />
                  <button
                    disabled={redeeming || !code.trim()}
                    onClick={redeem}
                    className="px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-90 cursor-pointer"
                    style={{ background: 'var(--ls-accent)', minWidth: 80 }}
                  >
                    {redeeming ? '…' : t('redeem')}
                  </button>
                </div>
              </div>

              {err && (
                <p className="mt-3 text-sm" style={{ color: 'var(--ls-error)' }}>{err}</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function TrackDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const t = useTranslations('dashboard.trackDetail');

  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [trackComplete, setTrackComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [certOpen, setCertOpen] = useState(false);
  const [certName, setCertName] = useState('');
  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState('');
  const [certSuccess, setCertSuccess] = useState(false);
  const certFormRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    const loadTrack = async () => {
      try {
        const trackRes = await api.get<TrackDetail>(`/api/tracks/${params.id}`);
        setTrack(trackRes.data);

        const isEnrolled = isAdmin || trackRes.data.enrollmentStatus === 'APPROVED';
        if (isEnrolled) {
          const progressRes = await api.get<{ videos: VideoProgress[]; trackComplete: boolean }>(
            `/api/progress/tracks/${params.id}`,
          );
          const ids = new Set(
            progressRes.data.videos.filter((v) => v.completed).map((v) => v.videoId),
          );
          setCompletedIds(ids);
          setTrackComplete(progressRes.data.trackComplete);
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) router.push('/login');
        else if (status === 403 || status === 404) {
          setError('');
        } else {
          setError(t('failedLoad'));
        }
      } finally {
        setLoading(false);
      }
    };
    loadTrack();
  }, [params.id, router, isAdmin, t]);

  const handleOpenCert = () => {
    setCertName(user?.name ?? '');
    setCertError('');
    setCertSuccess(false);
    setCertOpen(true);
    setTimeout(() => certFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const handleGenerateCert = async (e: React.FormEvent) => {
    e.preventDefault();
    setCertLoading(true);
    setCertError('');
    try {
      const res = await api.post(
        `/api/certificates/tracks/${params.id}`,
        { recipientName: certName.trim() || user?.name },
        { responseType: 'blob' },
      );
      const blob = new Blob([res.data as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificado-${track?.name ?? params.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setCertSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('certError');
      setCertError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setCertLoading(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="rounded-xl overflow-hidden mb-4 skeleton" style={{ height: 140 }} />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse skeleton" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <p className="text-sm" style={{ color: 'var(--ls-error)' }}>{error}</p>
    </div>
  );
  if (!track) return null;

  const needsEnrollment = !isAdmin && track.enrollmentStatus !== 'APPROVED';
  const activeVideos = track.videos.filter((v) => v.isActive);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

      {/* Track header card */}
      <div
        className="rounded-xl overflow-hidden mb-5"
        style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Thumbnail */}
          <div className="w-full sm:w-52 shrink-0">
            {track.thumbnailUrl ? (
              <img src={track.thumbnailUrl} alt={track.name} className="w-full aspect-video sm:h-full object-cover" />
            ) : (
              <div className="w-full aspect-video sm:h-full flex items-center justify-center" style={{ background: 'var(--ls-surface-2)' }}>
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} style={{ color: 'var(--ls-text-3)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 p-4 sm:p-6 flex flex-col justify-center">
            <h1
              className="text-lg sm:text-2xl font-bold tracking-tight mb-2"
              style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}
            >
              {track.name}
            </h1>
            {track.description && (
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--ls-text-2)' }}>
                {track.description}
              </p>
            )}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--ls-accent-muted)', color: 'var(--ls-accent)' }}
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                </svg>
                {track.videoCount} aula{track.videoCount !== 1 ? 's' : ''}
              </span>
              {completedIds.size > 0 && (
                <span className="text-xs" style={{ color: 'var(--ls-text-3)' }}>
                  {completedIds.size}/{activeVideos.length} concluídas
                </span>
              )}
              {trackComplete && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ color: 'var(--ls-success)', background: 'rgba(30,166,62,0.1)' }}
                >
                  <CheckIcon className="h-3 w-3" />
                  Concluído
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {needsEnrollment ? (
        <EnrollmentGate
          trackId={track.id}
          status={track.enrollmentStatus as 'NONE' | 'PENDING' | 'DENIED'}
          onStatusChange={(s) => setTrack((prev) => prev ? { ...prev, enrollmentStatus: s } : prev)}
        />
      ) : (
        <>
          {/* Video list */}
          <div
            className="rounded-xl overflow-hidden mb-5"
            style={{ border: '1px solid var(--ls-border)' }}
          >
            {/* Header */}
            <div
              className="px-4 sm:px-5 py-3.5 flex items-center justify-between"
              style={{
                background: 'var(--ls-surface)',
                borderBottom: activeVideos.length > 0 ? '1px solid var(--ls-border)' : 'none',
              }}
            >
              <h2 className="text-sm font-bold" style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}>
                {t('courseContent')}
              </h2>
              {activeVideos.length > 0 && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--ls-surface-2)', color: 'var(--ls-text-2)' }}
                >
                  {activeVideos.length} aula{activeVideos.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {activeVideos.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-14 text-center"
                style={{ background: 'var(--ls-surface)' }}
              >
                <svg className="h-7 w-7 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ls-text-3)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                </svg>
                <p className="text-sm font-medium" style={{ color: 'var(--ls-text-1)' }}>{t('noVideos')}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--ls-text-2)' }}>{t('noVideosDesc')}</p>
              </div>
            ) : (
              <div style={{ background: 'var(--ls-surface)' }}>
                {activeVideos.map((video, idx) => {
                  const done = completedIds.has(video.id);
                  return (
                    <div
                      key={video.id}
                      onClick={() => router.push(`/dashboard/tracks/${track.id}/videos/${video.id}`)}
                      className="flex items-center gap-3 px-4 sm:px-5 cursor-pointer transition-colors duration-150 active:opacity-70"
                      style={{
                        paddingTop: 14,
                        paddingBottom: 14,
                        borderBottom: idx < activeVideos.length - 1 ? '1px solid var(--ls-border)' : 'none',
                        minHeight: 60,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface)'; }}
                    >
                      {/* Number / check */}
                      <div className="shrink-0 w-7 h-7 flex items-center justify-center">
                        {done ? (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--ls-success)' }}
                          >
                            <CheckIcon className="h-3.5 w-3.5 text-white" />
                          </div>
                        ) : (
                          <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ls-text-3)' }}>
                            {idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Thumbnail — hidden on very small screens */}
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="hidden xs:block w-16 sm:w-20 aspect-video object-cover rounded-lg shrink-0"
                          loading="lazy"
                        />
                      )}

                      {/* Title */}
                      <p
                        className="flex-1 text-sm font-medium min-w-0 line-clamp-2 sm:truncate"
                        style={{ color: done ? 'var(--ls-text-2)' : 'var(--ls-text-1)' }}
                      >
                        {video.title}
                      </p>

                      {/* Duration + play chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs tabular-nums font-mono" style={{ color: 'var(--ls-text-3)' }}>
                          {formatDuration(video.duration)}
                        </span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--ls-accent)' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Certificate section */}
          {activeVideos.length > 0 && (
            <div
              className="rounded-xl p-4 sm:p-5"
              style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: trackComplete ? 'rgba(30,166,62,0.1)' : 'var(--ls-surface-2)' }}
                >
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
                    style={{ color: trackComplete ? 'var(--ls-success)' : 'var(--ls-accent)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ls-text-1)' }}>
                    {t('certTitle')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: trackComplete ? 'var(--ls-success)' : 'var(--ls-text-3)' }}>
                    {trackComplete
                      ? t('certEligible')
                      : t('certProgress', { done: completedIds.size, total: activeVideos.length })}
                  </p>
                </div>

                <button
                  onClick={trackComplete ? handleOpenCert : undefined}
                  disabled={!trackComplete}
                  className="shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90 active:scale-95"
                  style={
                    trackComplete
                      ? { background: 'var(--ls-accent)', color: '#fff' }
                      : { background: 'var(--ls-surface-2)', color: 'var(--ls-text-3)', border: '1px solid var(--ls-border)' }
                  }
                >
                  {t('earnCert')}
                </button>
              </div>

              {certOpen && (
                <div
                  ref={certFormRef}
                  className="mt-4 rounded-lg p-4"
                  style={{ background: 'var(--ls-bg)', border: '1px solid var(--ls-border)' }}
                >
                  <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--ls-text-1)' }}>
                    {t('generateCert')}
                  </p>
                  <p className="text-xs mb-4" style={{ color: 'var(--ls-text-2)' }}>
                    {t('nameOnCertDesc')}
                  </p>
                  <form onSubmit={handleGenerateCert} className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ls-text-1)' }}>
                        {t('nameOnCert')}
                      </label>
                      <input
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-surface)', color: 'var(--ls-text-1)' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ls-accent)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ls-border)'; }}
                        required
                        minLength={2}
                        value={certName}
                        onChange={(e) => setCertName(e.target.value)}
                      />
                    </div>

                    {certError && <p className="text-xs" style={{ color: 'var(--ls-error)' }}>{certError}</p>}

                    {certSuccess && (
                      <div className="flex items-center gap-1.5 text-xs font-medium flex-wrap" style={{ color: 'var(--ls-success)' }}>
                        <CheckIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>{t('certDownloaded')}</span>
                        <button
                          type="button"
                          onClick={() => router.push('/dashboard/certificates')}
                          className="underline underline-offset-2 font-semibold cursor-pointer"
                          style={{ color: 'var(--ls-accent)' }}
                        >
                          {t('viewCertificates')}
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={certLoading}
                        className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90 cursor-pointer"
                        style={{ background: 'var(--ls-accent)' }}
                      >
                        {certLoading ? t('generating') : certSuccess ? t('downloadAgain') : t('downloadPdf')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCertOpen(false); setCertSuccess(false); }}
                        className="rounded-lg px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                        style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text-2)', background: 'transparent' }}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
