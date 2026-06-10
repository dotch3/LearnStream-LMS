'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';
import { ActionBtn } from '@/components/admin/action-btn';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useToast } from '@/components/toast';

interface Track { id: string; name: string }
interface EnrollmentCode {
  id: string;
  code: string;
  label: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  tracks: Track[];
  createdAt: string;
}

export default function AdminCodesPage() {
  const t = useTranslations('admin.codes');
  const tCommon = useTranslations('common');
  const [codes, setCodes] = useState<EnrollmentCode[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: '',
    maxUses: '',
    expiresAt: '',
    trackIds: [] as string[],
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; loading: boolean }>({ open: false, id: null, loading: false });
  const { showToast } = useToast();

  const load = async () => {
    const [codesRes, tracksRes] = await Promise.all([
      api.get('/api/enrollment-codes?page=1&perPage=50'),
      api.get('/api/tracks?perPage=100'),
    ]);
    setCodes(codesRes.data.data ?? []);
    setTracks(tracksRes.data.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ label: '', maxUses: '', expiresAt: '', trackIds: [], isActive: true });
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = (c: EnrollmentCode) => {
    setForm({
      label: c.label,
      maxUses: c.maxUses !== null ? String(c.maxUses) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      trackIds: c.tracks.map((tr) => tr.id),
      isActive: c.isActive,
    });
    setEditId(c.id);
    setShowForm(true);
  };

  const toggleTrack = (id: string) => {
    setForm((f) => ({
      ...f,
      trackIds: f.trackIds.includes(id) ? f.trackIds.filter((tr) => tr !== id) : [...f.trackIds, id],
    }));
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        label: form.label,
        ...(form.maxUses ? { maxUses: Number(form.maxUses) } : {}),
        ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt).toISOString() } : {}),
        trackIds: form.trackIds,
        ...(editId ? { isActive: form.isActive } : {}),
      };
      if (editId) {
        await api.patch(`/api/enrollment-codes/${editId}`, payload);
      } else {
        await api.post('/api/enrollment-codes', payload);
      }
      await load();
      showToast(editId ? t('editCode') : t('createCode'), 'success');
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: EnrollmentCode) => {
    await api.patch(`/api/enrollment-codes/${c.id}`, { isActive: !c.isActive });
    await load();
  };

  const remove = async () => {
    if (!deleteDialog.id) return;
    setDeleteDialog((d) => ({ ...d, loading: true }));
    try {
      await api.delete(`/api/enrollment-codes/${deleteDialog.id}`);
      setCodes((prev) => prev.filter((c) => c.id !== deleteDialog.id));
      setDeleteDialog({ open: false, id: null, loading: false });
      showToast(tCommon('delete'), 'info');
    } finally {
      setDeleteDialog((d) => ({ ...d, loading: false, open: false }));
    }
  };

  return (
    <>
    <ConfirmDialog
      open={deleteDialog.open}
      title={t('deleteTitle')}
      description={t('deleteDesc')}
      confirmLabel={tCommon('delete')}
      variant="danger"
      loading={deleteDialog.loading}
      onConfirm={remove}
      onCancel={() => setDeleteDialog({ open: false, id: null, loading: false })}
    />
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ls-text)' }}>{t('title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ls-muted)' }}>{t('subtitle')}</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--ls-accent)' }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('newCode')}
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--ls-text)' }}>
            {editId ? t('editCode') : t('createNewCode')}
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ls-muted)' }}>{t('labelField')}</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--ls-bg)', border: '1px solid var(--ls-border)', color: 'var(--ls-text)' }}
                placeholder="e.g. Batch March 2026"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ls-muted)' }}>{t('maxUsesField')}</label>
              <input
                type="number"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--ls-bg)', border: '1px solid var(--ls-border)', color: 'var(--ls-text)' }}
                placeholder="Unlimited"
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ls-muted)' }}>{t('expiresAtField')}</label>
              <input
                type="date"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--ls-bg)', border: '1px solid var(--ls-border)', color: 'var(--ls-text)' }}
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: 'var(--ls-muted)' }}>
                {t('coursesUnlock')}
              </label>
              {tracks.length > 0 && (
                <span className="text-xs" style={{ color: 'var(--ls-muted)' }}>
                  {t('ofSelected', { count: form.trackIds.length, total: tracks.length })}
                </span>
              )}
            </div>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--ls-border)' }}>
              {tracks.length === 0 ? (
                <p className="px-4 py-3 text-xs" style={{ color: 'var(--ls-muted)' }}>{t('noCoursesAvailable')}</p>
              ) : (
                tracks.map((tr, i) => {
                  const sel = form.trackIds.includes(tr.id);
                  return (
                    <label
                      key={tr.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                      style={{
                        borderTop: i > 0 ? '1px solid var(--ls-border)' : undefined,
                        background: sel ? 'var(--ls-accent-muted)' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!sel) (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = sel ? 'var(--ls-accent-muted)' : 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggleTrack(tr.id)}
                        className="h-4 w-4 rounded cursor-pointer"
                        style={{ accentColor: 'var(--ls-accent)' }}
                      />
                      <span className="text-sm font-medium" style={{ color: sel ? 'var(--ls-accent-text)' : 'var(--ls-text-1)' }}>
                        {tr.name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {editId && (
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer w-fit">
                <div
                  className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors"
                  style={{ background: form.isActive ? 'var(--ls-accent)' : 'var(--ls-border)' }}
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5"
                    style={{ transform: form.isActive ? 'translateX(18px)' : 'translateX(2px)' }}
                  />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--ls-text-1)' }}>
                  {form.isActive ? t('activeCode') : t('inactiveCode')}
                </span>
              </label>
            </div>
          )}

          <div className="flex gap-3">
            <button
              disabled={saving || !form.label}
              onClick={submit}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--ls-accent)' }}
            >
              {saving ? tCommon('saving') : editId ? t('saveChanges') : t('createCode')}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--ls-sb-hover)', color: 'var(--ls-text)' }}
            >
              {tCommon('cancel')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--ls-card)' }} />
          ))}
        </div>
      ) : codes.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
          <p className="text-base" style={{ color: 'var(--ls-muted)' }}>{t('noCodesYet')}</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--ls-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--ls-card)', borderBottom: '1px solid var(--ls-border)' }}>
                <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>{t('codeCol')}</th>
                <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>{t('labelField')}</th>
                <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>{t('coursesCol')}</th>
                <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>{t('usesCol')}</th>
                <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>{t('expiresAtField')}</th>
                <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>{tCommon('status')}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c, idx) => (
                <tr
                  key={c.id}
                  style={{
                    background: 'var(--ls-card)',
                    borderBottom: idx < codes.length - 1 ? '1px solid var(--ls-border)' : 'none',
                  }}
                >
                  <td className="px-5 py-3">
                    <code
                      className="px-2 py-0.5 rounded text-xs font-mono"
                      style={{ background: 'var(--ls-sb-hover)', color: 'var(--ls-text)' }}
                    >
                      {c.code}
                    </code>
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--ls-text)' }}>{c.label}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tracks.length === 0 ? (
                        <span style={{ color: 'var(--ls-muted)' }}>—</span>
                      ) : c.tracks.map((tr) => (
                        <span
                          key={tr.id}
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ background: 'var(--ls-sb-hover)', color: 'var(--ls-text)' }}
                        >
                          {tr.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-muted)' }}>
                    {c.usedCount}{c.maxUses !== null ? ` / ${c.maxUses}` : ''}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-muted)' }}>
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(c)}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: c.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(156,163,175,0.15)',
                        color: c.isActive ? '#22c55e' : '#6b7280',
                      }}
                    >
                      {c.isActive ? tCommon('active') : tCommon('inactive')}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 justify-end">
                      <ActionBtn
                        onClick={() => openEdit(c)}
                        label={tCommon('edit')}
                        variant="primary"
                        icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>}
                      />
                      <ActionBtn
                        onClick={() => setDeleteDialog({ open: true, id: c.id, loading: false })}
                        label={tCommon('delete')}
                        variant="danger"
                        icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
  );
}
