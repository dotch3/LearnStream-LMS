'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  const [code, setCode] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [redeemGranted, setRedeemGranted] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!redeemSuccess || !redeemGranted) return;
    const t = setTimeout(() => window.location.reload(), 1500);
    return () => clearTimeout(t);
  }, [redeemSuccess, redeemGranted]);

  const request = async () => {
    setRequesting(true);
    setErr('');
    try {
      await api.post('/api/enrollments/request', { trackId });
      onStatusChange('PENDING');
      setMsg('Request sent! You will be notified when approved.');
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErr(Array.isArray(m) ? m.join(', ') : String(m ?? 'Failed to send request'));
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
      let msg = 'Invalid or expired code';
      try {
        const err = e as any;
        const data = err?.response?.data?.message;
        if (data) msg = Array.isArray(data) ? data.join(', ') : String(data);
      } catch {}
      setErr(msg);
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="rounded-lg p-6" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
      {redeemSuccess ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          {redeemGranted ? (
            <CheckIcon className="h-6 w-6 mb-1" style={{ color: 'var(--ls-success)' }} />
          ) : (
            <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--ls-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          )}
          <p className="text-sm font-semibold" style={{ color: 'var(--ls-text)' }}>
            {redeemGranted ? 'Enrolled successfully' : 'Code applied'}
          </p>
          <p className="text-sm max-w-sm" style={{ color: 'var(--ls-muted)' }}>
            {redeemGranted
              ? 'You now have access to this course. Page will refresh automatically.'
              : 'Code redeemed, but this course was not included.'}
          </p>
          {redeemGranted && (
            <button
              onClick={() => window.location.reload()}
              className="mt-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: 'var(--ls-accent)' }}
            >
              View Course
            </button>
          )}
        </div>
      ) : (
        <>
          {status === 'DENIED' && (
            <p className="text-sm mb-4" style={{ color: 'var(--ls-error)' }}>
              Your previous request was denied. You can submit a new one.
            </p>
          )}

          {status === 'PENDING' || msg ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--ls-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold" style={{ color: 'var(--ls-text)' }}>Access Pending</p>
              <p className="text-sm" style={{ color: 'var(--ls-muted)' }}>
                {msg || 'Your enrollment request is awaiting admin approval.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ls-text)' }}>Enrollment Required</p>
              <p className="text-sm mb-5" style={{ color: 'var(--ls-muted)' }}>
                Request access from an admin or use an enrollment code.
              </p>

              <div className="flex flex-col gap-3 max-w-xs">
                <button
                  disabled={requesting}
                  onClick={request}
                  className="rounded-md py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ background: 'var(--ls-accent)' }}
                >
                  {requesting ? 'Sending request…' : 'Request Access'}
                </button>

                <div className="flex items-center gap-2">
                  <hr className="flex-1" style={{ borderColor: 'var(--ls-border)' }} />
                  <span className="text-xs shrink-0" style={{ color: 'var(--ls-muted)' }}>or use a code</span>
                  <hr className="flex-1" style={{ borderColor: 'var(--ls-border)' }} />
                </div>

                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-md px-3 py-2 text-sm outline-none focus:ring-1"
                    style={{
                      background: 'var(--ls-bg)',
                      border: '1px solid var(--ls-border)',
                      color: 'var(--ls-text)',
                    }}
                    placeholder="Enter code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') redeem(); }}
                  />
                  <button
                    disabled={redeeming || !code.trim()}
                    onClick={redeem}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-40 transition-opacity hover:opacity-90 cursor-pointer"
                    style={{ background: 'var(--ls-accent)' }}
                  >
                    {redeeming ? '…' : 'Redeem'}
                  </button>
                </div>
              </div>

              {err && <p className="mt-3 text-sm" style={{ color: 'var(--ls-error)' }}>{err}</p>}
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

  const [redeemSuccess, setRedeemSuccess] = useState(false);

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
          setError('Failed to load course.');
        }
      } finally {
        setLoading(false);
      }
    };
    loadTrack();
  }, [params.id, router, isAdmin]);

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
      a.download = `certificate-${track?.name ?? params.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setCertSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not generate certificate. Please try again.';
      setCertError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setCertLoading(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="h-3 w-32 rounded animate-pulse mb-6 skeleton" />
      <div className="rounded-xl overflow-hidden mb-6 skeleton" style={{ height: '140px' }} />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-xl animate-pulse skeleton" />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <p className="text-sm" style={{ color: 'var(--ls-error)' }}>{error}</p>
    </div>
  );
  if (!track) return null;

  const needsEnrollment = !isAdmin && track.enrollmentStatus !== 'APPROVED';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Track header */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
        <div className="flex flex-col sm:flex-row gap-0">
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
          <div className="flex-1 min-w-0 p-5 sm:p-6 flex flex-col justify-center">
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight mb-2"
              style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}
            >
              {track.name}
            </h1>
            {track.description && (
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--ls-text-2)' }}>
                {track.description}
              </p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: 'var(--ls-accent-muted)', color: 'var(--ls-accent)' }}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                {track.videoCount} aula{track.videoCount !== 1 ? 's' : ''}
              </span>
              {completedIds.size > 0 && (
                <span className="text-xs" style={{ color: 'var(--ls-text-3)' }}>
                  {completedIds.size}/{track.videos.filter(v => v.isActive).length} concluídas
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
          onStatusChange={(s) => setTrack((t) => t ? { ...t, enrollmentStatus: s } : t)}
        />
      ) : (
        <>
          {(() => {
            const activeVideos = track.videos.filter((v) => v.isActive);
            return (
              <>
                {/* Video list */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--ls-border)' }}>
                  <div
                    className="px-5 py-3.5 flex items-center justify-between"
                    style={{ background: 'var(--ls-surface)', borderBottom: activeVideos.length > 0 ? '1px solid var(--ls-border)' : 'none' }}
                  >
                    <h2 className="text-sm font-bold" style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}>
                      Conteúdo do curso
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

                  {activeVideos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-14 text-center" style={{ background: 'var(--ls-card)' }}>
                      <svg className="h-6 w-6 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ls-muted)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                      </svg>
                      <p className="text-sm font-medium" style={{ color: 'var(--ls-text)' }}>No videos yet</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--ls-muted)' }}>Videos will appear here once added by an admin.</p>
                    </div>
                  )}

                <div style={{ background: 'var(--ls-surface)' }}>
                  {activeVideos.map((video, idx) => {
                    const done = completedIds.has(video.id);
                    return (
                      <div
                        key={video.id}
                        onClick={() => router.push(`/dashboard/tracks/${track.id}/videos/${video.id}`)}
                        className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors duration-150 group"
                        style={{ borderBottom: idx < activeVideos.length - 1 ? '1px solid var(--ls-border)' : 'none' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface)'; }}
                      >
                        {/* Status indicator */}
                        <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                          {done ? (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: 'var(--ls-success)' }}
                            >
                              <CheckIcon className="h-3 w-3 text-white" />
                            </div>
                          ) : (
                            <span
                              className="text-xs font-medium tabular-nums"
                              style={{ color: 'var(--ls-text-3)' }}
                            >
                              {idx + 1}
                            </span>
                          )}
                        </div>

                        {/* Thumbnail */}
                        {video.thumbnailUrl && (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-20 aspect-video object-cover rounded-lg shrink-0"
                            loading="lazy"
                          />
                        )}

                        {/* Title */}
                        <p
                          className="flex-1 text-sm font-medium min-w-0 truncate"
                          style={{ color: done ? 'var(--ls-text-2)' : 'var(--ls-text-1)' }}
                        >
                          {video.title}
                        </p>

                        {/* Duration */}
                        <span className="text-xs shrink-0 tabular-nums font-mono" style={{ color: 'var(--ls-text-3)' }}>
                          {formatDuration(video.duration)}
                        </span>

                        {/* Play icon on hover */}
                        <svg
                          className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          style={{ color: 'var(--ls-accent)' }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                      </div>
                    );
                  })}
                </div>
                </div>

                {/* Certificate section */}
                {activeVideos.length > 0 && (
                  <div
                    className="mt-6 pt-5 flex flex-col sm:flex-row sm:items-start gap-4"
                    style={{ borderTop: '1px solid var(--ls-border)' }}
                  >
                    <svg
                      className="h-5 w-5 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      style={{ color: 'var(--ls-accent)' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--ls-text)' }}>
                        Certificate of Completion
                      </p>
                      {trackComplete ? (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ls-success)' }}>
                          All lessons completed — you&apos;re eligible.
                        </p>
                      ) : (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ls-muted)' }}>
                          {completedIds.size}/{activeVideos.length} lessons done — complete all to unlock.
                        </p>
                      )}

                      {certOpen && (
                        <div
                          ref={certFormRef}
                          className="mt-4 rounded-lg p-4"
                          style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}
                        >
                          <p className="text-sm font-medium mb-1" style={{ color: 'var(--ls-text)' }}>
                            Generate your certificate
                          </p>
                          <p className="text-xs mb-3" style={{ color: 'var(--ls-muted)' }}>
                            Enter the name to print on the certificate.
                          </p>
                          <form onSubmit={handleGenerateCert} className="flex flex-col gap-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-xs font-medium" style={{ color: 'var(--ls-text)' }}>
                                Name on certificate
                              </span>
                              <input
                                className="rounded-md px-3 py-2 text-sm outline-none"
                                style={{
                                  border: '1px solid var(--ls-border)',
                                  background: 'var(--ls-bg)',
                                  color: 'var(--ls-text)',
                                }}
                                required
                                minLength={2}
                                value={certName}
                                onChange={(e) => setCertName(e.target.value)}
                              />
                            </label>
                            {certError && (
                              <p className="text-xs" style={{ color: 'var(--ls-error)' }}>{certError}</p>
                            )}
                            {certSuccess && (
                              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--ls-success)' }}>
                                <CheckIcon className="h-3.5 w-3.5" />
                                <span>Certificate downloaded!</span>
                                <button
                                  type="button"
                                  onClick={() => router.push('/dashboard/certificates')}
                                  className="ml-1 underline underline-offset-2 font-normal cursor-pointer"
                                  style={{ color: 'var(--ls-accent)' }}
                                >
                                  View in Certificates →
                                </button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={certLoading}
                                className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90 cursor-pointer"
                                style={{ background: 'var(--ls-accent)' }}
                              >
                                {certLoading ? 'Generating…' : certSuccess ? 'Download again' : 'Download PDF'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setCertOpen(false); setCertSuccess(false); }}
                                className="rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer"
                                style={{
                                  border: '1px solid var(--ls-border)',
                                  background: 'transparent',
                                  color: 'var(--ls-text)',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>

                    <div className="relative group shrink-0">
                      <button
                        onClick={trackComplete ? handleOpenCert : undefined}
                        disabled={!trackComplete}
                        className="rounded-md px-4 py-2 text-sm font-medium transition-opacity cursor-pointer disabled:cursor-not-allowed"
                        style={
                          trackComplete
                            ? { background: 'var(--ls-accent)', color: '#fff' }
                            : { background: 'var(--ls-surface-2)', color: 'var(--ls-muted)' }
                        }
                      >
                        Earn Certificate
                      </button>
                      {!trackComplete && (
                        <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden w-52 rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-sm group-hover:block">
                          Complete all {activeVideos.length} lessons to earn your certificate.
                          <div className="absolute right-4 top-full h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-gray-900" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
