'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';

interface TrackFormData {
  name: string;
  description: string;
  thumbnailUrl: string;
  order: string;
  visibility: 'PUBLIC' | 'LINK_ONLY' | 'DRAFT';
}

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
  const t = useTranslations('admin.tracks');

  const [form, setForm] = useState<TrackFormData>({
    name: '',
    description: '',
    thumbnailUrl: '',
    order: '1',
    visibility: 'PUBLIC',
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
        const tr = res.data;
        setForm({
          name: tr.name ?? '',
          description: tr.description ?? '',
          thumbnailUrl: tr.thumbnailUrl ?? '',
          order: String(tr.order ?? 1),
          visibility: tr.visibility ?? 'PUBLIC',
        });
      })
      .catch(() => setApiError(t('notFound')))
      .finally(() => setLoading(false));
  }, [params.id, isNew, t]);

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
    if (!form.name.trim()) e.name = t('nameRequired');
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
        visibility: form.visibility,
      };
      if (isNew) {
        await api.post('/api/tracks', payload);
      } else {
        await api.patch(`/api/tracks/${params.id}`, payload);
      }
      router.push('/admin/tracks');
    } catch {
      setApiError(t('saveError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--ls-surface)' }} />
        ))}
      </div>
    );
  }

  const hasImage = !!form.thumbnailUrl;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="page-title">{isNew ? t('newCourse') : t('editCourse')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ls-text-2)' }}>
          {isNew ? t('createNew') : t('updateDetails')}
        </p>
      </div>

      {/* Form card */}
      <div
        className="rounded-xl p-5 sm:p-6"
        style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
      >
        {apiError && (
          <div
            className="mb-5 rounded-lg px-4 py-3 text-sm"
            style={{ background: 'var(--ls-error-muted)', border: '1px solid var(--ls-error)', color: 'var(--ls-error)' }}
          >
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text-1)' }}>
              {t('nameField')} <span style={{ color: 'var(--ls-error)' }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Leadership Foundations"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                border: errors.name ? '1px solid var(--ls-error)' : '1px solid var(--ls-border)',
                background: 'var(--ls-bg)',
                color: 'var(--ls-text-1)',
              }}
            />
            {errors.name && <p className="mt-1 text-xs" style={{ color: 'var(--ls-error)' }}>{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text-1)' }}>
              {t('descriptionField')}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Brief description of this course..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none transition-colors"
              style={{
                border: '1px solid var(--ls-border)',
                background: 'var(--ls-bg)',
                color: 'var(--ls-text-1)',
              }}
            />
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text-1)' }}>
              {t('courseLogo')}
            </label>
            <p className="text-xs mb-3" style={{ color: 'var(--ls-text-3)' }}>
              Square image recommended — 400×400 px minimum. Used as the course thumbnail and printed on the completion certificate.
              Upload will be auto-cropped to a square.
            </p>

            {hasImage ? (
              <div className="flex items-start gap-4">
                <img
                  src={form.thumbnailUrl}
                  alt="Track logo preview"
                  className="h-24 w-24 sm:h-32 sm:w-32 rounded-xl object-cover shrink-0"
                  style={{ border: '1px solid var(--ls-border)' }}
                />
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors"
                    style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-surface)', color: 'var(--ls-text-1)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface)'; }}
                  >
                    Replace image
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, thumbnailUrl: '' }))}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors"
                    style={{ border: '1px solid var(--ls-error)', background: 'var(--ls-surface)', color: 'var(--ls-error)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-error-muted)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface)'; }}
                  >
                    Remove
                  </button>
                  <p className="text-xs" style={{ color: 'var(--ls-text-3)' }}>
                    {form.thumbnailUrl.startsWith('data:') ? 'Uploaded file' : 'External URL'}
                  </p>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-colors"
                style={{
                  borderColor: dragOver ? 'var(--ls-accent)' : 'var(--ls-border)',
                  background: dragOver ? 'var(--ls-accent-muted)' : 'var(--ls-bg)',
                }}
              >
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} style={{ color: 'var(--ls-text-3)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--ls-text-2)' }}>
                    <span style={{ color: 'var(--ls-accent-text)' }}>Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ls-text-3)' }}>JPEG, PNG, WebP — max 3 MB</p>
                </div>
              </div>
            )}

            {logoError && <p className="mt-2 text-xs" style={{ color: 'var(--ls-error)' }}>{logoError}</p>}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* Display order */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text-1)' }}>
              {t('displayOrder')}
            </label>
            <input
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
              min={0}
              className="w-24 rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-bg)', color: 'var(--ls-text-1)' }}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--ls-text-3)' }}>{t('displayOrderHint')}</p>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text-1)' }}>
              {t('visibilityCol')}
            </label>
            <select
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value as TrackFormData['visibility'] })}
              className="w-full sm:w-auto rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-bg)', color: 'var(--ls-text-1)' }}
            >
              <option value="PUBLIC">{t('visibilityPublic')}</option>
              <option value="LINK_ONLY">{t('visibilityLinkOnly')}</option>
              <option value="DRAFT">{t('visibilityDraft')}</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto rounded-lg px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: 'var(--ls-accent)' }}
            >
              {saving ? t('savingCourse') : isNew ? t('createCourse') : t('saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
