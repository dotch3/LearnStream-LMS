'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';
import { ActionBtn } from '@/components/admin/action-btn';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useToast } from '@/components/toast';

interface Enrollment {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  requestedAt: string;
  resolvedAt: string | null;
  userId: string;
  userName: string;
  userEmail: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface TrackInfo {
  id: string;
  name: string;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  APPROVED: { bg: 'rgba(34,197,94,0.12)',  color: 'var(--ls-success)' },
  PENDING:  { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  DENIED:   { bg: 'rgba(239,68,68,0.12)',  color: 'var(--ls-error)' },
};

const TrashIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const CheckIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const XIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

function Avatar({ name }: { name: string }) {
  const colors = ['#1e40af', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#065f46'];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: bg }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function AdminTrackEnrollmentsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const t = useTranslations('admin.enrollments');
  const tCommon = useTranslations('common');

  const STATUS_LABELS: Record<string, string> = {
    APPROVED: t('statusEnrolled'),
    PENDING:  t('statusPending'),
    DENIED:   t('statusDenied'),
  };

  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'DENIED'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [acting, setActing] = useState<string | null>(null);
  const { showToast } = useToast();

  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; enrollment: Enrollment | null; loading: boolean }>({
    open: false, enrollment: null, loading: false,
  });

  const [showAdd, setShowAdd] = useState(false);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const load = async (p: number, f: string) => {
    setLoading(true);
    try {
      const params2 = new URLSearchParams({ trackId: params.id, page: String(p), perPage: '20' });
      if (f !== 'ALL') params2.set('status', f);
      const { data } = await api.get(`/api/enrollments?${params2}`);
      setEnrollments(data.data ?? []);
      setTotalPages(data.meta?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get(`/api/tracks/${params.id}`).then((r) => setTrack({ id: r.data.id, name: r.data.name }));
    load(1, 'ALL');
  }, [params.id]);

  useEffect(() => {
    setPage(1);
    load(1, filter);
  }, [filter]);

  useEffect(() => {
    load(page, filter);
  }, [page]);

  const act = async (enrollmentId: string, action: 'approve' | 'deny') => {
    setActing(enrollmentId);
    try {
      await api.patch(`/api/enrollments/${enrollmentId}/${action}`);
      setEnrollments((prev) =>
        prev.map((e) => e.id === enrollmentId ? { ...e, status: action === 'approve' ? 'APPROVED' : 'DENIED' } : e)
      );
      showToast(
        action === 'approve' ? t('enrollApproved') : t('enrollDenied'),
        action === 'approve' ? 'success' : 'warning',
      );
    } finally {
      setActing(null);
    }
  };

  const openRemove = (e: Enrollment) => setRemoveDialog({ open: true, enrollment: e, loading: false });

  const handleRemove = async () => {
    if (!removeDialog.enrollment) return;
    setRemoveDialog((d) => ({ ...d, loading: true }));
    try {
      await api.delete(`/api/enrollments/${removeDialog.enrollment.id}`);
      setEnrollments((prev) => prev.filter((e) => e.id !== removeDialog.enrollment!.id));
      setRemoveDialog({ open: false, enrollment: null, loading: false });
      showToast(t('enrollRemoved'), 'info');
    } catch {
      setRemoveDialog((d) => ({ ...d, loading: false }));
      showToast(t('removeError'), 'error');
    }
  };

  const openAdd = async () => {
    setShowAdd(true);
    setSelectedUserId('');
    setAddError('');
    setUserSearch('');
    setUsersLoading(true);
    try {
      const enrolledIds = new Set(enrollments.map((e) => e.userId));
      const { data } = await api.get('/api/users?perPage=200');
      setAllUsers((data.data ?? []).filter((u: UserOption & { isActive: boolean }) => u.isActive && !enrolledIds.has(u.id)));
    } finally {
      setUsersLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedUserId) { setAddError(t('selectStudent')); return; }
    setAddLoading(true);
    setAddError('');
    try {
      await api.post('/api/enrollments/admin-enroll', { trackId: params.id, userId: selectedUserId });
      setShowAdd(false);
      load(page, filter);
      showToast(t('enrollSuccess'), 'success');
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAddError(Array.isArray(m) ? m.join(', ') : String(m ?? t('enrollError')));
    } finally {
      setAddLoading(false);
    }
  };

  const filtered = allUsers.filter(
    (u) => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <>
      <ConfirmDialog
        open={removeDialog.open}
        title={t('removeTitle')}
        description={t('removeDesc', { name: removeDialog.enrollment?.userName ?? '' })}
        confirmLabel={t('removeLbl')}
        variant="danger"
        loading={removeDialog.loading}
        onConfirm={handleRemove}
        onCancel={() => setRemoveDialog({ open: false, enrollment: null, loading: false })}
      />

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--ls-text-1)' }}>{t('addStudent')}</h2>

            <input
              className="w-full rounded-lg px-3 py-2 text-sm mb-3 outline-none"
              style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-bg)', color: 'var(--ls-text-1)' }}
              placeholder={t('searchPlaceholder')}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />

            {usersLoading ? (
              <div className="py-4 text-center text-sm" style={{ color: 'var(--ls-text-2)' }}>{t('loadingUsers')}</div>
            ) : filtered.length === 0 ? (
              <div className="py-4 text-center text-sm" style={{ color: 'var(--ls-text-2)' }}>{t('noUsers')}</div>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-lg mb-3" style={{ border: '1px solid var(--ls-border)' }}>
                {filtered.map((u, i) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
                    style={{
                      background: selectedUserId === u.id ? 'var(--ls-accent-muted)' : 'transparent',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--ls-border)' : 'none',
                    }}
                    onMouseEnter={(e) => { if (selectedUserId !== u.id) (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
                    onMouseLeave={(e) => { if (selectedUserId !== u.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <Avatar name={u.name} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--ls-text-1)' }}>{u.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--ls-text-2)' }}>{u.email}</p>
                    </div>
                    {selectedUserId === u.id && (
                      <svg className="ml-auto shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--ls-accent-text)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {addError && <p className="text-sm mb-3" style={{ color: 'var(--ls-error)' }}>{addError}</p>}

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--ls-border)', color: 'var(--ls-text-1)', background: 'var(--ls-surface)' }}>
                {tCommon('cancel')}
              </button>
              <button
                disabled={addLoading || !selectedUserId}
                onClick={handleAdd}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--ls-accent)' }}
              >
                {addLoading ? t('enrolling') : t('enrollStudent')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-8 max-w-5xl mx-auto">
        <button
          onClick={() => router.push('/admin/tracks')}
          className="text-sm mb-1 flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ color: 'var(--ls-accent-text)' }}
        >
          ← {t('backToCourses')}
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ls-text-1)' }}>{t('title')}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--ls-text-2)' }}>{track?.name ?? '…'}</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--ls-accent)' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            {t('addStudent')}
          </button>
        </div>

        <div className="flex gap-1 mb-5 p-1 rounded-lg w-fit" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
          {(['ALL', 'APPROVED', 'PENDING', 'DENIED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
              style={{
                background: filter === f ? 'var(--ls-sb-active)' : 'transparent',
                color: filter === f ? 'var(--ls-sb-active-t)' : 'var(--ls-text-2)',
              }}
            >
              {f === 'ALL' ? tCommon('all') : STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--ls-surface)' }} />)}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="rounded-xl py-16 text-center" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
            <p className="text-sm" style={{ color: 'var(--ls-text-2)' }}>{t('noFound')}</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-surface)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ls-border)', background: 'var(--ls-bg)' }}>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-2)' }}>{t('studentCol')}</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-2)' }}>{t('statusCol')}</th>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-2)' }}>{t('enrolledCol')}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e, i) => {
                  const styles = STATUS_STYLES[e.status];
                  const label = STATUS_LABELS[e.status];
                  return (
                    <tr
                      key={e.id}
                      style={{ borderTop: i > 0 ? '1px solid var(--ls-border)' : undefined }}
                      onMouseEnter={(el) => { (el.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
                      onMouseLeave={(el) => { (el.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={e.userName} />
                          <div className="min-w-0">
                            <p className="font-medium truncate" style={{ color: 'var(--ls-text-1)' }}>{e.userName}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--ls-text-2)' }}>{e.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: styles.bg, color: styles.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: styles.color }} />
                          {label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-text-2)' }}>
                        {new Date(e.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          {e.status === 'PENDING' && (
                            <>
                              <ActionBtn onClick={() => act(e.id, 'approve')} label={t('approve')} variant="success" disabled={acting === e.id} icon={<CheckIcon />} />
                              <ActionBtn onClick={() => act(e.id, 'deny')} label={t('deny')} variant="warning" disabled={acting === e.id} icon={<XIcon />} />
                            </>
                          )}
                          {e.status === 'DENIED' && (
                            <ActionBtn onClick={() => act(e.id, 'approve')} label={t('approve')} variant="success" disabled={acting === e.id} icon={<CheckIcon />} />
                          )}
                          {e.status === 'APPROVED' && (
                            <ActionBtn onClick={() => act(e.id, 'deny')} label={t('revoke')} variant="warning" disabled={acting === e.id} icon={<XIcon />} />
                          )}
                          <ActionBtn onClick={() => openRemove(e)} label={t('removeLbl')} variant="danger" icon={<TrashIcon />} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm" style={{ color: 'var(--ls-text-2)' }}>
            <span>{t('pageOf', { page, total: totalPages })}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: 'var(--ls-border)', background: 'var(--ls-surface)', color: 'var(--ls-text-1)' }}>← {tCommon('previous')}</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: 'var(--ls-border)', background: 'var(--ls-surface)', color: 'var(--ls-text-1)' }}>{tCommon('next')} →</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
