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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
    <div
      className="rounded-2xl p-8 text-center"
      style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}
    >
      {redeemSuccess ? (
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: redeemGranted ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)' }}
          >
            {redeemGranted ? (
              <svg className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--ls-text)' }}>
            {redeemGranted ? 'Enrolled Successfully!' : 'Code applied'}
          </p>
          <p className="text-sm text-center" style={{ color: 'var(--ls-muted)' }}>
            {redeemGranted
              ? 'You now have access to this course. The page will refresh automatically.'
              : 'Code redeemed. Access granted to other courses, but not this one.'}
          </p>
          {redeemGranted && (
            <button
              onClick={() => window.location.reload()}
              className="mt-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: 'var(--ls-accent)' }}
            >
              View Course
            </button>
          )}
        </div>
      ) : (
        <>
          {status === 'DENIED' && (
            <div
              className="mb-4 rounded-lg px-4 py-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              Your previous request was denied. You can submit a new request.
            </div>
          )}

          {status === 'PENDING' || msg ? (
            <div className="flex flex-col items-center gap-3">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: 'rgba(245,158,11,0.15)' }}
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-base font-semibold" style={{ color: 'var(--ls-text)' }}>Access Pending</p>
              <p className="text-sm" style={{ color: 'var(--ls-muted)' }}>
                {msg || 'Your enrollment request is awaiting admin approval. You will receive a notification when it\'s reviewed.'}
              </p>
            </div>
          ) : (
            <>
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: 'var(--ls-sb-hover)' }}
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--ls-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <p className="text-base font-semibold mb-1" style={{ color: 'var(--ls-text)' }}>Enrollment Required</p>
              <p className="text-sm mb-6" style={{ color: 'var(--ls-muted)' }}>
                Request access from an admin or use an enrollment code.
              </p>

              <div className="flex flex-col items-center gap-4 max-w-xs mx-auto">
                <button
                  disabled={requesting}
                  onClick={request}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ background: 'var(--ls-accent)' }}
                >
                  {requesting ? 'Sending request…' : 'Request Access'}
                </button>

                <div className="flex items-center gap-3 w-full">
                  <hr className="flex-1" style={{ borderColor: 'var(--ls-border)' }} />
                  <span className="text-xs" style={{ color: 'var(--ls-muted)' }}>or use a code</span>
                  <hr className="flex-1" style={{ borderColor: 'var(--ls-border)' }} />
                </div>

                <div className="flex w-full gap-2">
                  <input
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: 'var(--ls-bg)', border: '1px solid var(--ls-border)', color: 'var(--ls-text)' }}
                    placeholder="Enter code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') redeem(); }}
                  />
                  <button
                    disabled={redeeming || !code.trim()}
                    onClick={redeem}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                    style={{ background: 'var(--ls-accent)' }}
                  >
                    {redeeming ? '…' : 'Redeem'}
                  </button>
                </div>
              </div>

              {err && <p className="mt-3 text-sm" style={{ color: '#ef4444' }}>{err}</p>}
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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="h-6 w-32 rounded animate-pulse mb-6" style={{ background: 'var(--ls-card)' }} />
      <div className="h-8 w-64 rounded animate-pulse mb-4" style={{ background: 'var(--ls-card)' }} />
      <div className="space-y-3">
        {[1,2,3].map((i) => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--ls-card)' }} />)}
      </div>
    </div>
  );

  if (error) return <div className="p-8" style={{ color: '#ef4444' }}>{error}</div>;
  if (!track) return null;

  const needsEnrollment = !isAdmin && track.enrollmentStatus !== 'APPROVED';

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => router.push('/dashboard/tracks')}
        className="text-sm mb-4 flex items-center gap-1 transition-opacity hover:opacity-70"
        style={{ color: 'var(--ls-accent)' }}
      >
        ← Back to Courses
      </button>

      <div className="flex gap-6 mb-8">
        {track.thumbnailUrl && (
          <img src={track.thumbnailUrl} alt={track.name} className="w-48 h-32 object-cover rounded-xl" />
        )}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ls-text)' }}>{track.name}</h1>
          {track.description && (
            <p className="mt-1" style={{ color: 'var(--ls-muted)' }}>{track.description}</p>
          )}
          <p className="text-sm mt-2" style={{ color: 'var(--ls-muted)' }}>
            {track.videoCount} video{track.videoCount !== 1 ? 's' : ''}
          </p>
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
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ls-text)' }}>Videos</h2>
                {activeVideos.length === 0 && (
                  <p style={{ color: 'var(--ls-muted)' }}>No videos in this course yet.</p>
                )}

                <div className="space-y-3">
                  {activeVideos.map((video, idx) => {
                    const done = completedIds.has(video.id);
                    return (
                      <div
                        key={video.id}
                        className="flex gap-4 items-center border rounded-lg p-3 cursor-pointer transition-colors"
                        style={{ borderColor: 'var(--ls-border)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-sb-hover)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        onClick={() => router.push(`/dashboard/tracks/${track.id}/videos/${video.id}`)}
                      >
                        <span className="text-sm w-5" style={{ color: 'var(--ls-muted)' }}>{idx + 1}</span>
                        {video.thumbnailUrl && (
                          <img src={video.thumbnailUrl} alt={video.title} className="w-24 h-16 object-cover rounded" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: done ? 'var(--ls-muted)' : 'var(--ls-text)' }}>{video.title}</p>
                        </div>
                        <span className="text-sm" style={{ color: 'var(--ls-muted)' }}>{formatDuration(video.duration)}</span>
                        {done && (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                            <CheckIcon className="h-3.5 w-3.5 text-green-600" />
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {activeVideos.length > 0 && (
                    <div className="mt-6" style={{ borderTop: '1px solid var(--ls-border)', paddingTop: '1.25rem' }}>
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(99,102,241,0.1)' }}>
                          <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold" style={{ color: 'var(--ls-text)' }}>Certificate of Completion</p>
                          {trackComplete ? (
                            <p className="text-sm" style={{ color: '#22c55e' }}>You&apos;ve completed all lessons — you&apos;re eligible!</p>
                          ) : (
                            <p className="text-sm" style={{ color: 'var(--ls-muted)' }}>
                              Complete all {activeVideos.length} lessons to unlock your certificate.
                              ({completedIds.size}/{activeVideos.length} done)
                            </p>
                          )}
                        </div>
                        <div className="relative group">
                          <button
                            onClick={trackComplete ? handleOpenCert : undefined}
                            disabled={!trackComplete}
                            className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity"
                            style={
                              trackComplete
                                ? { background: 'var(--ls-accent)', color: '#fff' }
                                : { background: 'var(--ls-sb-hover)', color: 'var(--ls-muted)', cursor: 'not-allowed' }
                            }
                          >
                            Earn Certificate
                          </button>
                          {!trackComplete && (
                            <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden w-56 rounded-md bg-gray-800 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                              Complete all {activeVideos.length} lessons to earn your certificate.
                              <div className="absolute right-4 top-full h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-gray-800" />
                            </div>
                          )}
                        </div>
                      </div>

                      {certOpen && (
                        <div ref={certFormRef} className="mt-4 rounded-xl p-5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                          <h3 className="font-semibold mb-1" style={{ color: 'var(--ls-text)' }}>Generate your certificate</h3>
                          <p className="text-sm mb-4" style={{ color: 'var(--ls-muted)' }}>
                            Enter the name to print on the certificate.
                          </p>
                          <form onSubmit={handleGenerateCert} className="flex flex-col gap-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-sm font-medium" style={{ color: 'var(--ls-text)' }}>Name on certificate</span>
                              <input
                                className="rounded-lg px-3 py-2 text-sm outline-none"
                                style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-card)', color: 'var(--ls-text)' }}
                                required
                                minLength={2}
                                value={certName}
                                onChange={(e) => setCertName(e.target.value)}
                              />
                            </label>
                            {certError && <p className="text-sm" style={{ color: '#ef4444' }}>{certError}</p>}
                            {certSuccess && (
                              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#22c55e' }}>
                                <CheckIcon className="h-4 w-4" />
                                <span>Certificate downloaded!</span>
                                <button type="button" onClick={() => router.push('/dashboard/certificates')} className="ml-1 underline font-normal" style={{ color: 'var(--ls-accent)' }}>
                                  View in Certificates →
                                </button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={certLoading}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                style={{ background: 'var(--ls-accent)' }}
                              >
                                {certLoading ? 'Generating...' : certSuccess ? 'Download again' : 'Download PDF'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setCertOpen(false); setCertSuccess(false); }}
                                className="rounded-lg px-4 py-2 text-sm font-medium"
                                style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-card)', color: 'var(--ls-text)' }}
                              >
                                Close
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
