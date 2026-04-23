'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';

interface TrackFormData {
  name: string;
  description: string;
  thumbnailUrl: string;
  order: string;
}

export default function AdminTrackFormPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const isNew = params.id === 'new';

  const [form, setForm] = useState<TrackFormData>({
    name: '',
    description: '',
    thumbnailUrl: '',
    order: '0',
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<TrackFormData>>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (isNew) return;
    api
      .get(`/api/tracks/${params.id}`)
      .then((res) => {
        const t = res.data;
        setForm({
          name: t.name ?? '',
          description: t.description ?? '',
          thumbnailUrl: t.thumbnailUrl ?? '',
          order: String(t.order ?? 0),
        });
      })
      .catch(() => setApiError('Track not found.'))
      .finally(() => setLoading(false));
  }, [params.id, isNew]);

  function validate(): boolean {
    const e: Partial<TrackFormData> = {};
    if (!form.name.trim()) e.name = 'Name is required';
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
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        thumbnailUrl: form.thumbnailUrl.trim() || undefined,
        order: Number(form.order),
      };
      if (isNew) {
        await api.post('/api/tracks', payload);
      } else {
        await api.patch(`/api/tracks/${params.id}`, payload);
      }
      router.push('/admin/tracks');
    } catch {
      setApiError('Failed to save track. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <button
        onClick={() => router.push('/admin/tracks')}
        className="text-sm text-blue-600 hover:underline mb-4 block"
      >
        ← Back to Tracks
      </button>

      <h1 className="text-2xl font-bold mb-6">
        {isNew ? 'New Track' : 'Edit Track'}
      </h1>

      {apiError && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
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
          {errors.thumbnailUrl && (
            <p className="text-red-500 text-xs mt-1">{errors.thumbnailUrl}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Order</label>
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
            {saving ? 'Saving...' : isNew ? 'Create Track' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/tracks')}
            className="px-5 py-2 rounded border text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
