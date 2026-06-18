'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('admin.videos');
  const tCommon = useTranslations('common');

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
        const trackEntry = (v.tracks as { id: string; name: string; order: number }[])
          ?.find((tr: { id: string }) => tr.id === params.id);
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
      .catch(() => setApiError(t('notFound')))
      .finally(() => setLoading(false));
  }, [params.videoId, params.id, isNew, t]);

  function validate(): boolean {
    const e: Partial<VideoFormData> = {};
    if (!form.title.trim()) e.title = t('titleRequired');
    if (!form.youtubeUrl.trim()) e.youtubeUrl = t('youtubeUrlRequired');
    if (!form.duration || isNaN(Number(form.duration)) || Number(form.duration) < 1)
      e.duration = t('durationRequired');
    if (form.thumbnailUrl && !form.thumbnailUrl.startsWith('http'))
      e.thumbnailUrl = t('thumbnailUrlInvalid');
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
        await api.patch(`/api/videos/${params.videoId}`, {
          title: form.title.trim(),
          youtubeUrl: form.youtubeUrl.trim(),
          description: form.description.trim() || undefined,
          thumbnailUrl: form.thumbnailUrl.trim() || undefined,
          duration: Number(form.duration),
        });
        await api.patch(`/api/tracks/${params.id}/videos/${params.videoId}`, {
          order: Number(form.order),
        });
        router.push(`/admin/tracks/${params.id}/videos`);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t('saveError');
      setApiError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8">{tCommon('loading')}</div>;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--ls-text-1)' }}>
        {isNew ? t('addVideo') : t('editVideo')}
      </h1>

      {apiError && (
        <div className="mb-4 p-3 rounded text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--ls-error)' }}>
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text-2)' }}>{t('name')} *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-bg)', color: 'var(--ls-text-1)' }}
          />
          {errors.title && <p className="text-xs mt-1" style={{ color: 'var(--ls-error)' }}>{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text-2)' }}>{t('youtubeUrl')} *</label>
          <input
            type="text"
            value={form.youtubeUrl}
            onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-bg)', color: 'var(--ls-text-1)' }}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          {errors.youtubeUrl && <p className="text-xs mt-1" style={{ color: 'var(--ls-error)' }}>{errors.youtubeUrl}</p>}
          {extractedYoutubeId && !isNew && (
            <p className="text-xs mt-1" style={{ color: 'var(--ls-text-2)' }}>
              YouTube ID: <span className="font-mono">{extractedYoutubeId}</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text-2)' }}>{t('description')}</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
            style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-bg)', color: 'var(--ls-text-1)' }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text-2)' }}>{t('thumbnailUrl')}</label>
          <input
            type="text"
            value={form.thumbnailUrl}
            onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-bg)', color: 'var(--ls-text-1)' }}
            placeholder="https://..."
          />
          {errors.thumbnailUrl && <p className="text-xs mt-1" style={{ color: 'var(--ls-error)' }}>{errors.thumbnailUrl}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text-2)' }}>{t('duration')} *</label>
          <input
            type="number"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-bg)', color: 'var(--ls-text-1)' }}
            min={1}
            placeholder="300"
          />
          {errors.duration && <p className="text-xs mt-1" style={{ color: 'var(--ls-error)' }}>{errors.duration}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ls-text-2)' }}>{t('orderInCourse')}</label>
          <input
            type="number"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-bg)', color: 'var(--ls-text-1)' }}
            min={0}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--ls-accent)' }}
          >
            {saving ? t('savingVideo') : isNew ? t('addVideo') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
