'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';

interface VideoFormData {
  title: string;
  youtubeUrl: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
  order: string;
}

export default function AdminVideoFormPage() {
  const router = useRouter();
  const params = useParams<{ id: string; videoId: string }>();
  const isNew = params.videoId === 'new';

  const [form, setForm] = useState<VideoFormData>({
    title: '',
    youtubeUrl: '',
    description: '',
    thumbnailUrl: '',
    duration: '',
    order: '0',
  });
  const [extractedYoutubeId, setExtractedYoutubeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<VideoFormData>>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (isNew) return;
    api
      .get(`/api/videos/${params.videoId}`)
      .then((res) => {
        const v = res.data;
        // order comes from the junction for this track context
        const trackEntry = (v.tracks as { id: string; name: string; order: number }[])
          ?.find((t: { id: string }) => t.id === params.id);
        setForm({
          title: v.title ?? '',
          youtubeUrl: v.youtubeUrl ?? '',
          description: v.description ?? '',
          thumbnailUrl: v.thumbnailUrl ?? '',
          duration: String(v.duration ?? ''),
          order: String(trackEntry?.order ?? 0),
        });
        setExtractedYoutubeId(v.youtubeId ?? null);
      })
      .catch(() => setApiError('Video not found.'))
      .finally(() => setLoading(false));
  }, [params.videoId, params.id, isNew]);

  function validate(): boolean {
    const e: Partial<VideoFormData> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.youtubeUrl.trim()) e.youtubeUrl = 'YouTube URL is required';
    if (!form.duration || isNaN(Number(form.duration)) || Number(form.duration) < 1)
      e.duration = 'Duration must be a positive number (seconds)';
    if (form.thumbnailUrl && !form.thumbnailUrl.startsWith('http'))
      e.thumbnailUrl = 'Must be a valid URL';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError('');
    try {
      if (isNew) {
        const res = await api.post('/api/videos', {
          title: form.title.trim(),
          youtubeUrl: form.youtubeUrl.trim(),
          description: form.description.trim() || undefined,
          thumbnailUrl: form.thumbnailUrl.trim() || undefined,
          duration: Number(form.duration),
          trackId: params.id,
          order: Number(form.order),
        });
        setExtractedYoutubeId(res.data.youtubeId);
        router.push(`/admin/tracks/${params.id}/videos`);
      } else {
        // Update video fields
        await api.patch(`/api/videos/${params.videoId}`, {
          title: form.title.trim(),
          youtubeUrl: form.youtubeUrl.trim(),
          description: form.description.trim() || undefined,
          thumbnailUrl: form.thumbnailUrl.trim() || undefined,
          duration: Number(form.duration),
        });
        // Update order in junction for this track context
        await api.patch(`/api/tracks/${params.id}/videos/${params.videoId}`, {
          order: Number(form.order),
        });
        router.push(`/admin/tracks/${params.id}/videos`);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save video.';
      setApiError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <button
        onClick={() => router.push(`/admin/tracks/${params.id}/videos`)}
        className="text-sm text-blue-600 hover:underline mb-4 block"
      >
        ← Back to Videos
      </button>

      <h1 className="text-2xl font-bold mb-6">
        {isNew ? 'Add Video' : 'Edit Video'}
      </h1>

      {apiError && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">YouTube URL *</label>
          <input
            type="text"
            value={form.youtubeUrl}
            onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="https://www.youtube.com/watch?v=..."
          />
          {errors.youtubeUrl && <p className="text-red-500 text-xs mt-1">{errors.youtubeUrl}</p>}
          {extractedYoutubeId && !isNew && (
            <p className="text-gray-400 text-xs mt-1">
              YouTube ID: <span className="font-mono">{extractedYoutubeId}</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Thumbnail URL</label>
          <input
            type="text"
            value={form.thumbnailUrl}
            onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="https://..."
          />
          {errors.thumbnailUrl && <p className="text-red-500 text-xs mt-1">{errors.thumbnailUrl}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Duration (seconds) *</label>
          <input
            type="number"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
            min={1}
            placeholder="300"
          />
          {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Order in this track
          </label>
          <input
            type="number"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
            min={0}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : isNew ? 'Add Video' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/admin/tracks/${params.id}/videos`)}
            className="px-5 py-2 rounded border text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
