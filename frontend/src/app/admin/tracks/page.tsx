'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('admin.tracks');
  const tCommon = useTranslations('common');
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; track: TrackSummary | null; loading: boolean }>({
    open: false, track: null, loading: false,
  });

  const VISIBILITY_LABEL: Record<string, string> = {
    PUBLIC:    t('visibility.PUBLIC'),
    LINK_ONLY: t('visibility.LINK_ONLY'),
    DRAFT:     t('visibility.DRAFT'),
  };

  useEffect(() => {
    let mounted = true;
    api
      .get<TracksResponse>('/api/tracks', { params: { page: 1, perPage: 100 } })
      .then((res) => { if (mounted) setTracks(res.data.data); })
      .catch(() => { if (mounted) setError(t('errorLoad')); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [t]);

  const openDelete = (track: TrackSummary) => setDialog({ open: true, track, loading: false });

  const handleDelete = async () => {
    if (!dialog.track) return;
    setDialog((d) => ({ ...d, loading: true }));
    try {
      await api.delete(`/api/tracks/${dialog.track.id}`);
      setTracks((prev) => prev.filter((tr) => tr.id !== dialog.track!.id));
      setDialog({ open: false, track: null, loading: false });
    } finally {
      setDialog((d) => ({ ...d, loading: false, open: false }));
    }
  };

  return (
    <>
      <ConfirmDialog
        open={dialog.open}
        title={t('deleteTitle')}
        description={t('deleteDesc', { name: dialog.track?.name ?? '' })}
        confirmLabel={tCommon('delete')}
        variant="danger"
        loading={dialog.loading}
        onConfirm={handleDelete}
        onCancel={() => setDialog({ open: false, track: null, loading: false })}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="page-title">{t('title')}</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--ls-text-2)' }}>{t('subtitle')}</p>
          </div>
          <button
            onClick={() => router.push('/admin/tracks/new')}
            className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: 'var(--ls-accent)' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('new')}
          </button>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg p-4 animate-pulse" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
                <div className="h-4 rounded w-1/3 mb-2" style={{ background: 'var(--ls-surface-2)' }} />
                <div className="h-3 rounded w-1/2" style={{ background: 'var(--ls-surface-2)' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg p-5" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
            <p className="text-sm" style={{ color: 'var(--ls-error)' }}>{error}</p>
          </div>
        )}

        {!loading && !error && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center" style={{ border: '1px dashed var(--ls-border)', borderRadius: '8px' }}>
            <svg className="h-7 w-7 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ls-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="text-sm font-medium" style={{ color: 'var(--ls-text)' }}>{t('empty')}</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ls-muted)' }}>{t('emptySubtitle')}</p>
            <button
              onClick={() => router.push('/admin/tracks/new')}
              className="mt-5 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: 'var(--ls-accent)' }}
            >
              {t('createFirst')}
            </button>
          </div>
        )}

        {!loading && !error && tracks.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-lg overflow-hidden" style={{ border: '1px solid var(--ls-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--ls-card)', borderBottom: '1px solid var(--ls-border)' }}>
                    <th className="text-left px-5 py-3 font-medium text-xs" style={{ color: 'var(--ls-muted)' }}>{t('courseCol')}</th>
                    <th className="text-left px-5 py-3 font-medium text-xs" style={{ color: 'var(--ls-muted)' }}>{t('visibilityCol')}</th>
                    <th className="text-left px-5 py-3 font-medium text-xs" style={{ color: 'var(--ls-muted)' }}>{t('videosCol')}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((track, i) => (
                    <tr
                      key={track.id}
                      style={{ background: 'var(--ls-card)', borderTop: i > 0 ? '1px solid var(--ls-border)' : undefined }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-card)'; }}
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ls-text)' }}>{track.name}</p>
                        {track.description && (
                          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--ls-muted)' }}>{track.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-muted)' }}>
                        {VISIBILITY_LABEL[track.visibility] ?? track.visibility}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-muted)' }}>
                        {track.videoCount}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <ActionBtn onClick={() => router.push(`/admin/tracks/${track.id}/videos`)} label={t('videosBtn')} variant="primary" icon={<VideosIcon />} />
                          <ActionBtn onClick={() => router.push(`/admin/tracks/${track.id}/enrollments`)} label={t('studentsBtn')} variant="success" icon={<StudentsIcon />} />
                          <ActionBtn onClick={() => router.push(`/admin/tracks/${track.id}`)} label={tCommon('edit')} variant="warning" icon={<EditIcon />} />
                          <ActionBtn onClick={() => openDelete(track)} label={tCommon('delete')} variant="danger" icon={<TrashIcon />} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {tracks.map((track) => (
                <div key={track.id} className="rounded-lg overflow-hidden" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ls-text)' }}>{track.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ls-muted)' }}>
                      {VISIBILITY_LABEL[track.visibility]} · {track.videoCount} {t('videosCol').toLowerCase()}
                    </p>
                  </div>
                  <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--ls-border)', background: 'var(--ls-surface-2)' }}>
                    <button onClick={() => router.push(`/admin/tracks/${track.id}/videos`)} className="flex items-center justify-center gap-2 py-3 text-sm font-medium cursor-pointer transition-opacity hover:opacity-70 active:opacity-50" style={{ color: 'var(--ls-accent)' }}>
                      <VideosIcon />
                      {t('videosBtn')}
                    </button>
                    <button onClick={() => router.push(`/admin/tracks/${track.id}/enrollments`)} className="flex items-center justify-center gap-2 py-3 text-sm font-medium cursor-pointer transition-opacity hover:opacity-70 active:opacity-50" style={{ color: 'var(--ls-success)', borderLeft: '1px solid var(--ls-border)' }}>
                      <StudentsIcon />
                      {t('studentsBtn')}
                    </button>
                    <button onClick={() => router.push(`/admin/tracks/${track.id}`)} className="flex items-center justify-center gap-2 py-3 text-sm font-medium cursor-pointer transition-opacity hover:opacity-70 active:opacity-50" style={{ color: 'var(--ls-warning)', borderTop: '1px solid var(--ls-border)' }}>
                      <EditIcon />
                      {tCommon('edit')}
                    </button>
                    <button onClick={() => openDelete(track)} className="flex items-center justify-center gap-2 py-3 text-sm font-medium cursor-pointer transition-opacity hover:opacity-70 active:opacity-50" style={{ color: 'var(--ls-error)', borderLeft: '1px solid var(--ls-border)', borderTop: '1px solid var(--ls-border)' }}>
                      <TrashIcon />
                      {tCommon('delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
