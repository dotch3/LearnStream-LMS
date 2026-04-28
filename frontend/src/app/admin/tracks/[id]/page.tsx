'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';

interface TrackFormData {
  name: string;
  description: string;
  thumbnailUrl: string;
  order: string;
}

// Resize + center-crop an image File to a square JPEG data URL (400×400).
function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select an image file (JPEG, PNG, WebP).'));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      reject(new Error('Image must be smaller than 3 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load image.'));
      img.onload = () => {
        const size = 400;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
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
  const [logoError, setLogoError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleImageFile(file: File) {
    setLogoError('');
    try {
      const dataUrl = await processImageFile(file);
      setForm((prev) => ({ ...prev, thumbnailUrl: dataUrl }));
    } catch (err: unknown) {
      setLogoError((err as Error).message ?? 'Could not process image.');
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  }

  function validate(): boolean {
    const e: Partial<TrackFormData> = {};
    if (!form.name.trim()) e.name = 'Name is required';
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
        thumbnailUrl: form.thumbnailUrl || undefined,
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

  const hasImage = !!form.thumbnailUrl;

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

            {/* ── Logo / Thumbnail ──────────────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Track Logo
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Square image recommended — 400×400 px minimum. Used as the track thumbnail and printed on the completion certificate.
                Upload will be auto-cropped to a square.
              </p>

              {hasImage ? (
                /* Preview */
                <div className="flex items-start gap-4">
                  <img
                    src={form.thumbnailUrl}
                    alt="Track logo preview"
                    className="h-32 w-32 rounded-xl object-cover border border-gray-200 shadow-sm"
                  />
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      Replace image
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, thumbnailUrl: '' }))}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      Remove
                    </button>
                    <p className="text-xs text-gray-400">
                      {form.thumbnailUrl.startsWith('data:') ? 'Uploaded file' : 'External URL'}
                    </p>
                  </div>
                </div>
              ) : (
                /* Drop zone */
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">
                      <span className="text-indigo-600">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG, WebP — max 3 MB</p>
                  </div>
                </div>
              )}

              {logoError && <p className="mt-2 text-xs text-red-600">{logoError}</p>}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileInput}
              />
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
