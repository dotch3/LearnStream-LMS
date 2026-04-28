'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';

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

export default function AdminTrackVideosPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  async function toggleActive(video: VideoItem) {
    await api.patch(`/api/videos/${video.id}`, { isActive: !video.isActive });
    setTrack((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        videos: prev.videos.map((v) =>
          v.id === video.id ? { ...v, isActive: !v.isActive } : v,
        ),
      };
    });
  }

  async function removeFromTrack(videoId: string) {
    if (!confirm('Remove this video from the track? The video will not be deleted.')) return;
    await api.delete(`/api/tracks/${params.id}/videos/${videoId}`);
    setTrack((prev) => {
      if (!prev) return prev;
      return { ...prev, videos: prev.videos.filter((v) => v.id !== videoId) };
    });
  }

  async function deleteVideo(id: string) {
    if (!confirm('Permanently delete this video from the system? This cannot be undone.')) return;
    await api.delete(`/api/videos/${id}`);
    setTrack((prev) => {
      if (!prev) return prev;
      return { ...prev, videos: prev.videos.filter((v) => v.id !== id) };
    });
  }

  async function saveOrder(videoId: string) {
    const order = Number(editOrderValue);
    if (isNaN(order)) return;
    await api.patch(`/api/tracks/${params.id}/videos/${videoId}`, { order });
    setTrack((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        videos: prev.videos
          .map((v) => (v.id === videoId ? { ...v, order } : v))
          .sort((a, b) => a.order - b.order),
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
      await api.post(`/api/tracks/${params.id}/videos`, {
        videoId: addingVideoId,
        order: Number(addOrder),
      });
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get<TrackDetail>(`/api/tracks/${params.id}`);
        if (mounted) setTrack(res.data);
      } catch {
        if (mounted) setError('Track not found.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [params.id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!track) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => router.push('/admin/tracks')}
        className="text-sm text-blue-600 hover:underline mb-1 block"
      >
        ← Back to Tracks
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Videos — {track.name}</h1>
        <div className="flex gap-2">
          <button
            onClick={openAddModal}
            className="border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50 text-sm"
          >
            + Add existing video
          </button>
          <button
            onClick={() => router.push(`/admin/tracks/${params.id}/videos/new`)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            + New video
          </button>
        </div>
      </div>

      {track.videos.length === 0 && (
        <p className="text-gray-500">No videos yet. Add one above.</p>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 pr-4 w-20">Order</th>
            <th className="py-2 pr-4">Title</th>
            <th className="py-2 pr-4">Duration</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {track.videos.map((video) => (
            <tr key={video.id} className="border-b hover:bg-gray-50">
              <td className="py-2 pr-4">
                {editingOrderId === video.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editOrderValue}
                      onChange={(e) => setEditOrderValue(e.target.value)}
                      className="w-14 border rounded px-1 py-0.5 text-xs"
                      min={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveOrder(video.id); if (e.key === 'Escape') setEditingOrderId(null); }}
                      autoFocus
                    />
                    <button onClick={() => saveOrder(video.id)} className="text-green-600 text-xs">✓</button>
                    <button onClick={() => setEditingOrderId(null)} className="text-gray-400 text-xs">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingOrderId(video.id); setEditOrderValue(String(video.order)); }}
                    className="text-gray-400 hover:text-gray-700 cursor-pointer"
                    title="Click to edit order"
                  >
                    {video.order}
                  </button>
                )}
              </td>
              <td className="py-2 pr-4 font-medium">{video.title}</td>
              <td className="py-2 pr-4">{formatDuration(video.duration)}</td>
              <td className="py-2 pr-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${video.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {video.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-2 flex gap-2 flex-wrap">
                <button
                  onClick={() => router.push(`/admin/tracks/${params.id}/videos/${video.id}`)}
                  className="text-blue-600 hover:underline text-xs"
                >
                  Edit
                </button>
                <button onClick={() => toggleActive(video)} className="text-yellow-600 hover:underline text-xs">
                  {video.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => removeFromTrack(video.id)} className="text-orange-600 hover:underline text-xs">
                  Remove
                </button>
                <button onClick={() => deleteVideo(video.id)} className="text-red-600 hover:underline text-xs">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add existing video modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Add existing video to track</h2>

            {allVideos.length === 0 ? (
              <p className="text-gray-500 text-sm mb-4">All videos are already in this track.</p>
            ) : (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Video</label>
                  <select
                    value={addingVideoId}
                    onChange={(e) => setAddingVideoId(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">— Select a video —</option>
                    {allVideos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title} {v.tracks.length > 0 ? `(in: ${v.tracks.map((t) => t.name).join(', ')})` : '(not in any track)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Order in this track</label>
                  <input
                    type="number"
                    value={addOrder}
                    onChange={(e) => setAddOrder(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    min={0}
                  />
                </div>
              </>
            )}

            {addError && <p className="text-red-600 text-sm mb-3">{addError}</p>}

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">
                Cancel
              </button>
              {allVideos.length > 0 && (
                <button
                  onClick={handleAddVideo}
                  disabled={addLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {addLoading ? 'Adding...' : 'Add to track'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
