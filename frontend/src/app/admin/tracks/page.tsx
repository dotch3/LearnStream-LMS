'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { ActionBtn } from '@/components/admin/action-btn';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';

interface TrackSummary {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'LINK_ONLY' | 'DRAFT';
  videoCount: number;
  order: number;
}

interface TracksResponse {
  data: TrackSummary[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

const VISIBILITY_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  PUBLIC:    { label: 'Public',     bg: 'rgba(34,197,94,0.12)',  color: 'var(--ls-success)' },
  LINK_ONLY: { label: 'Link Only',  bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  DRAFT:     { label: 'Draft',      bg: 'var(--ls-surface-2)',   color: 'var(--ls-text-2)' },
};

const EditIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
  </svg>
);
const VideosIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
);
const StudentsIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
const TrashIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export default function AdminTracksPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; track: TrackSummary | null; loading: boolean }>({
    open: false, track: null, loading: false,
  });

  useEffect(() => {
    let mounted = true;
    api
      .get<TracksResponse>('/api/tracks', { params: { page: 1, perPage: 100 } })
      .then((res) => { if (mounted) setTracks(res.data.data); })
      .catch(() => { if (mounted) setError('Failed to load courses.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const openDelete = (track: TrackSummary) => setDialog({ open: true, track, loading: false });

  const handleDelete = async () => {
    if (!dialog.track) return;
    setDialog((d) => ({ ...d, loading: true }));
    try {
      await api.delete(`/api/tracks/${dialog.track.id}`);
      setTracks((prev) => prev.filter((t) => t.id !== dialog.track!.id));
      setDialog({ open: false, track: null, loading: false });
    } finally {
      setDialog((d) => ({ ...d, loading: false, open: false }));
    }
  };

  return (
    <>
      <ConfirmDialog
        open={dialog.open}
        title="Delete course?"
        description={`"${dialog.track?.name}" and all its video associations will be deleted. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={dialog.loading}
        onConfirm={handleDelete}
        onCancel={() => setDialog({ open: false, track: null, loading: false })}
      />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--ls-text-1)' }}>Courses</h1>
            <p className="mt-1" style={{ color: 'var(--ls-text-2)' }}>Manage courses, videos and student enrollments.</p>
          </div>
          <button
            onClick={() => router.push('/admin/tracks/new')}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--ls-accent)' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Course
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
                <div className="h-4 rounded w-1/3 mb-2" style={{ background: 'var(--ls-surface-2)' }} />
                <div className="h-3 rounded w-1/2" style={{ background: 'var(--ls-surface-2)' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p style={{ color: 'var(--ls-error)' }}>{error}</p>
          </div>
        )}

        {!loading && !error && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl py-20 text-center" style={{ border: '2px dashed var(--ls-border)' }}>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--ls-surface)' }}>
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ls-text-2)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--ls-text-1)' }}>No courses yet</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--ls-text-2)' }}>Create your first course to start adding videos.</p>
            <button
              onClick={() => router.push('/admin/tracks/new')}
              className="mt-5 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--ls-accent)' }}
            >
              Create first course
            </button>
          </div>
        )}

        {!loading && !error && tracks.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-surface)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ls-border)', background: 'var(--ls-bg)' }}>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-2)' }}>Course</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-2)' }}>Visibility</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-2)' }}>Videos</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {tracks.map((track, i) => {
                  const badge = VISIBILITY_BADGE[track.visibility] ?? VISIBILITY_BADGE.DRAFT;
                  return (
                    <tr
                      key={track.id}
                      style={{ borderTop: i > 0 ? '1px solid var(--ls-border)' : undefined }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                            style={{ background: 'var(--ls-surface-2)', color: 'var(--ls-text-2)' }}
                          >
                            {track.order || '#'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate" style={{ color: 'var(--ls-text-1)' }}>{track.name}</p>
                            {track.description && (
                              <p className="text-xs truncate" style={{ color: 'var(--ls-text-2)' }}>{track.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: badge.bg, color: badge.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.color }} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-text-2)' }}>
                        {track.videoCount} video{track.videoCount !== 1 ? 's' : ''}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <ActionBtn
                            onClick={() => router.push(`/admin/tracks/${track.id}/videos`)}
                            label="Videos"
                            variant="primary"
                            icon={<VideosIcon />}
                          />
                          <ActionBtn
                            onClick={() => router.push(`/admin/tracks/${track.id}/enrollments`)}
                            label="Students"
                            variant="success"
                            icon={<StudentsIcon />}
                          />
                          <ActionBtn
                            onClick={() => router.push(`/admin/tracks/${track.id}`)}
                            label="Edit"
                            variant="warning"
                            icon={<EditIcon />}
                          />
                          <ActionBtn
                            onClick={() => openDelete(track)}
                            label="Delete"
                            variant="danger"
                            icon={<TrashIcon />}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
