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
  isActive: boolean;
  videoCount: number;
  videos: VideoSummary[];
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

export default function TrackDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [trackComplete, setTrackComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Certificate form state
  const [certOpen, setCertOpen] = useState(false);
  const [certName, setCertName] = useState('');
  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState('');
  const [certSuccess, setCertSuccess] = useState(false);

  const certFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      api.get<TrackDetail>(`/api/tracks/${params.id}`),
      api.get<{ videos: VideoProgress[]; trackComplete: boolean }>(`/api/progress/tracks/${params.id}`),
    ])
      .then(([trackRes, progressRes]) => {
        setTrack(trackRes.data);
        const ids = new Set(
          progressRes.data.videos.filter((v) => v.completed).map((v) => v.videoId),
        );
        setCompletedIds(ids);
        setTrackComplete(progressRes.data.trackComplete);
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) router.push('/login');
        else setError('Failed to load track.');
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

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

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!track) return null;

  const activeVideos = track.videos.filter((v) => v.isActive);

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
            {activeVideos.length > 0 && (
              <span className="ml-2 text-gray-500">
                · {completedIds.size}/{activeVideos.length} completed
              </span>
            )}
          </p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Videos</h2>
      {activeVideos.length === 0 && (
        <p className="text-gray-500">No videos in this track yet.</p>
      )}

      <div className="space-y-3">
        {activeVideos.map((video, idx) => {
          const done = completedIds.has(video.id);
          return (
            <div
              key={video.id}
              className="flex gap-4 items-center border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => router.push(`/dashboard/tracks/${track.id}/videos/${video.id}`)}
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
                <p className={`font-medium ${done ? 'text-gray-500' : ''}`}>{video.title}</p>
              </div>
              <span className="text-sm text-gray-500">{formatDuration(video.duration)}</span>
              {done && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <CheckIcon className="h-3.5 w-3.5 text-green-600" />
                </span>
              )}
            </div>
          );
        })}

        {/* ── Earn Certificate ────────────────────────────────────────── */}
        {activeVideos.length > 0 && (
          <div className="mt-6 border-t pt-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Certificate of Completion</p>
                {trackComplete ? (
                  <p className="text-sm text-green-600">You&apos;ve completed all lessons — you&apos;re eligible!</p>
                ) : (
                  <p className="text-sm text-gray-400">
                    Complete all {activeVideos.length} lessons to unlock your certificate.
                    ({completedIds.size}/{activeVideos.length} done)
                  </p>
                )}
              </div>
              <div className="relative group">
                <button
                  onClick={trackComplete ? handleOpenCert : undefined}
                  disabled={!trackComplete}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    trackComplete
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'cursor-not-allowed bg-gray-100 text-gray-400'
                  }`}
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

            {/* Certificate form */}
            {certOpen && (
              <div ref={certFormRef} className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Generate your certificate</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Enter the name to print on the certificate. Pre-filled from your profile — edit if needed.
                </p>
                <form onSubmit={handleGenerateCert} className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Name on certificate</span>
                    <input
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      required
                      minLength={2}
                      value={certName}
                      onChange={(e) => setCertName(e.target.value)}
                    />
                  </label>

                  {certError && <p className="text-sm text-red-600">{certError}</p>}

                  {certSuccess && (
                    <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                      <CheckIcon className="h-4 w-4" />
                      <span>Certificate downloaded!</span>
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard/certificates')}
                        className="ml-1 text-indigo-600 hover:underline font-normal"
                      >
                        View in Certificates →
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={certLoading}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {certLoading ? 'Generating...' : certSuccess ? 'Download again' : 'Download PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCertOpen(false); setCertSuccess(false); }}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
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
    </div>
  );
}
