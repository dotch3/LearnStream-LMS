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
    order: '1',
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
          order: String(t.order ?? 1),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/tracks')}
            className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Tracks
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isNew ? 'New Track' : 'Edit Track'}
          </h1>
          <p className="mt-1 text-gray-500">
            {isNew ? 'Create a new course track.' : 'Update track details.'}
          </p>
        </div>

        <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6">
          {apiError && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Leadership Foundations"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Brief description of this track..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
              <input
                type="url"
                value={form.thumbnailUrl}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.thumbnailUrl && <p className="mt-1 text-xs text-red-600">{errors.thumbnailUrl}</p>}
              {form.thumbnailUrl && form.thumbnailUrl.startsWith('http') && (
                <img
                  src={form.thumbnailUrl}
                  alt="preview"
                  className="mt-2 h-24 w-40 rounded-lg object-cover border border-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: e.target.value })}
                min={0}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-400">Lower numbers appear first.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {saving ? 'Saving...' : isNew ? 'Create Track' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/tracks')}
                className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
