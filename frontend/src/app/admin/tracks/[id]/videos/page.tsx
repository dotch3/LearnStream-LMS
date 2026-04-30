'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { ActionBtn } from '@/components/admin/action-btn';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';

interface VideoItem {
  id: string;
  title: string;
  order: number;
  isActive: boolean;
  duration: number;
}

interface TrackDetail {
  id: string;
  name: string;
  videos: VideoItem[];
}

interface VideoListItem {
  id: string;
  title: string;
  duration: number;
  isActive: boolean;
  tracks: { id: string; name: string; order: number }[];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const EditIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
  </svg>
);
const RemoveIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const DeleteIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const EyeOnIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const EyeOffIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

type DialogAction = 'remove' | 'delete' | null;

export default function AdminTrackVideosPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Confirm dialog
  const [dialog, setDialog] = useState<{
    action: DialogAction;
    videoId: string;
    videoTitle: string;
    loading: boolean;
  }>({ action: null, videoId: '', videoTitle: '', loading: false });

  // Add existing video modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [allVideos, setAllVideos] = useState<VideoListItem[]>([]);
  const [addingVideoId, setAddingVideoId] = useState('');
  const [addOrder, setAddOrder] = useState('0');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Inline order editing
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editOrderValue, setEditOrderValue] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get<TrackDetail>(`/api/tracks/${params.id}`);
        if (mounted) setTrack(res.data);
      } catch {
        if (mounted) setError('Course not found.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [params.id]);

  async function toggleActive(video: VideoItem) {
    await api.patch(`/api/videos/${video.id}`, { isActive: !video.isActive });
    setTrack((prev) => prev ? { ...prev, videos: prev.videos.map((v) => v.id === video.id ? { ...v, isActive: !v.isActive } : v) } : prev);
  }

  function openDialog(action: Exclude<DialogAction, null>, videoId: string, videoTitle: string) {
    setDialog({ action, videoId, videoTitle, loading: false });
  }

  const closeDialog = () => setDialog((d) => ({ ...d, action: null }));

  async function handleConfirm() {
    setDialog((d) => ({ ...d, loading: true }));
    try {
      if (dialog.action === 'remove') {
        await api.delete(`/api/tracks/${params.id}/videos/${dialog.videoId}`);
        setTrack((prev) => prev ? { ...prev, videos: prev.videos.filter((v) => v.id !== dialog.videoId) } : prev);
      } else if (dialog.action === 'delete') {
        await api.delete(`/api/videos/${dialog.videoId}`);
        setTrack((prev) => prev ? { ...prev, videos: prev.videos.filter((v) => v.id !== dialog.videoId) } : prev);
      }
      closeDialog();
    } finally {
      setDialog((d) => ({ ...d, loading: false }));
    }
  }

  async function saveOrder(videoId: string) {
    const order = Number(editOrderValue);
    if (isNaN(order)) return;
    await api.patch(`/api/tracks/${params.id}/videos/${videoId}`, { order });
    setTrack((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        videos: prev.videos.map((v) => v.id === videoId ? { ...v, order } : v).sort((a, b) => a.order - b.order),
      };
    });
    setEditingOrderId(null);
  }

  async function openAddModal() {
    setShowAddModal(true);
    setAddError('');
    setAddingVideoId('');
    setAddOrder('0');
    const res = await api.get<VideoListItem[]>('/api/videos');
    const alreadyIn = new Set(track?.videos.map((v) => v.id) ?? []);
    setAllVideos(res.data.filter((v) => !alreadyIn.has(v.id)));
  }

  async function handleAddVideo() {
    if (!addingVideoId) { setAddError('Select a video.'); return; }
    setAddLoading(true);
    setAddError('');
    try {
      await api.post(`/api/tracks/${params.id}/videos`, { videoId: addingVideoId, order: Number(addOrder) });
      const res = await api.get<TrackDetail>(`/api/tracks/${params.id}`);
      setTrack(res.data);
      setShowAddModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add video.';
      setAddError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setAddLoading(false);
    }
  }

  if (loading) return (
    <div className="p-8 max-w-4xl mx-auto space-y-3">
      {[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--ls-surface)' }} />)}
    </div>
  );
  if (error) return <div className="p-8" style={{ color: 'var(--ls-error)' }}>{error}</div>;
  if (!track) return null;

  const dialogConfig = {
    remove: {
      title: 'Remove from course?',
      description: `"${dialog.videoTitle}" will be removed from this course but not deleted from the system.`,
      confirmLabel: 'Remove',
      variant: 'warning' as const,
    },
    delete: {
      title: 'Delete video permanently?',
      description: `"${dialog.videoTitle}" will be permanently deleted from the system. This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger' as const,
    },
  };

  const cfg = dialog.action ? dialogConfig[dialog.action] : null;

  return (
    <>
      <ConfirmDialog
        open={!!dialog.action}
        title={cfg?.title ?? ''}
        description={cfg?.description ?? ''}
        confirmLabel={cfg?.confirmLabel ?? ''}
        variant={cfg?.variant ?? 'danger'}
        loading={dialog.loading}
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />

      <div className="p-8 max-w-5xl mx-auto">
        <button
          onClick={() => router.push('/admin/tracks')}
          className="text-sm mb-1 flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ color: 'var(--ls-accent-text)' }}
        >
          ← Back to Courses
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ls-text-1)' }}>Videos</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--ls-text-2)' }}>{track.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/admin/tracks/${params.id}/enrollments`)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium border transition-colors"
              style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text-2)', background: 'transparent' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              Students
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium border transition-colors"
              style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text-2)', background: 'transparent' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              Add existing
            </button>
            <button
              onClick={() => router.push(`/admin/tracks/${params.id}/videos/new`)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--ls-accent)' }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New video
            </button>
          </div>
        </div>

        {track.videos.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
            style={{ border: '2px dashed var(--ls-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--ls-text-2)' }}>No videos yet. Add one above.</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-surface)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ls-border)', background: 'var(--ls-bg)' }}>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-2)' }}>Order</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-2)' }}>Title</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-2)' }}>Duration</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-2)' }}>Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {track.videos.map((video, i) => (
                  <tr
                    key={video.id}
                    style={{
                      borderTop: i > 0 ? '1px solid var(--ls-border)' : undefined,
                      opacity: video.isActive ? 1 : 0.65,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {/* Order */}
                    <td className="px-5 py-3">
                      {editingOrderId === video.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editOrderValue}
                            onChange={(e) => setEditOrderValue(e.target.value)}
                            className="w-14 rounded px-1.5 py-0.5 text-xs"
                            style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-bg)', color: 'var(--ls-text-1)' }}
                            min={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveOrder(video.id);
                              if (e.key === 'Escape') setEditingOrderId(null);
                            }}
                            autoFocus
                          />
                          <button onClick={() => saveOrder(video.id)} className="text-xs" style={{ color: 'var(--ls-success)' }}>✓</button>
                          <button onClick={() => setEditingOrderId(null)} className="text-xs" style={{ color: 'var(--ls-text-3)' }}>✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingOrderId(video.id); setEditOrderValue(String(video.order)); }}
                          className="rounded px-2 py-0.5 text-xs font-mono font-medium transition-colors"
                          style={{ color: 'var(--ls-text-2)', background: 'var(--ls-surface-2)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ls-text-1)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ls-text-2)'; }}
                          title="Click to edit order"
                        >
                          {video.order}
                        </button>
                      )}
                    </td>

                    {/* Title */}
                    <td className="px-5 py-3">
                      <span className="font-medium" style={{ color: 'var(--ls-text-1)' }}>{video.title}</span>
                    </td>

                    {/* Duration */}
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-text-2)' }}>
                      {formatDuration(video.duration)}
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={
                          video.isActive
                            ? { background: 'rgba(34,197,94,0.12)', color: 'var(--ls-success)' }
                            : { background: 'var(--ls-surface-2)', color: 'var(--ls-text-2)' }
                        }
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: video.isActive ? 'var(--ls-success)' : 'var(--ls-text-3)' }}
                        />
                        {video.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <ActionBtn
                          onClick={() => router.push(`/admin/tracks/${params.id}/videos/${video.id}`)}
                          label="Edit"
                          variant="primary"
                          icon={<EditIcon />}
                        />
                        <ActionBtn
                          onClick={() => toggleActive(video)}
                          label={video.isActive ? 'Deactivate' : 'Activate'}
                          variant={video.isActive ? 'warning' : 'success'}
                          icon={video.isActive ? <EyeOffIcon /> : <EyeOnIcon />}
                        />
                        <ActionBtn
                          onClick={() => openDialog('remove', video.id, video.title)}
                          label="Remove"
                          variant="neutral"
                          icon={<RemoveIcon />}
                        />
                        <ActionBtn
                          onClick={() => openDialog('delete', video.id, video.title)}
                          label="Delete"
                          variant="danger"
                          icon={<DeleteIcon />}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add existing video modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
              style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
            >
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--ls-text-1)' }}>
                Add existing video to course
              </h2>

              {allVideos.length === 0 ? (
                <p className="text-sm mb-4" style={{ color: 'var(--ls-text-2)' }}>All videos are already in this course.</p>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ls-text-2)' }}>Video</label>
                    <select
                      value={addingVideoId}
                      onChange={(e) => setAddingVideoId(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-bg)', color: 'var(--ls-text-1)' }}
                    >
                      <option value="">— Select a video —</option>
                      {allVideos.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.title} {v.tracks.length > 0 ? `(in: ${v.tracks.map((t) => t.name).join(', ')})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ls-text-2)' }}>Order in this course</label>
                    <input
                      type="number"
                      value={addOrder}
                      onChange={(e) => setAddOrder(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-bg)', color: 'var(--ls-text-1)' }}
                      min={0}
                    />
                  </div>
                </>
              )}

              {addError && <p className="text-sm mb-3" style={{ color: 'var(--ls-error)' }}>{addError}</p>}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text-1)', background: 'var(--ls-surface)' }}
                >
                  Cancel
                </button>
                {allVideos.length > 0 && (
                  <button
                    onClick={handleAddVideo}
                    disabled={addLoading}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: 'var(--ls-accent)' }}
                  >
                    {addLoading ? 'Adding…' : 'Add to course'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
