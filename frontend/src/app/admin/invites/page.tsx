'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';
import { ActionBtn } from '@/components/admin/action-btn';
import { useToast } from '@/components/toast';

interface Invite {
  id: string;
  email: string;
  role: 'ADMIN' | 'VIEWER';
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  status: 'pending' | 'accepted' | 'expired';
}

type Filter = 'ALL' | 'pending' | 'accepted' | 'expired';

function CopyLinkModal({
  inviteUrl,
  email,
  onClose,
  t,
  tCommon,
}: {
  inviteUrl: string;
  email: string;
  onClose: () => void;
  t: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="w-full max-w-md rounded-lg p-6" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--ls-text)' }}>{t('inviteLink')}</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--ls-muted)' }}>
          {t('inviteLinkDesc', { email })}
        </p>
        <div
          className="rounded-md px-3 py-2.5 text-xs font-mono break-all mb-4 select-all"
          style={{ background: 'var(--ls-bg)', border: '1px solid var(--ls-border)', color: 'var(--ls-muted)' }}
        >
          {inviteUrl}
        </div>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium text-white cursor-pointer transition-all"
            style={{ background: copied ? 'var(--ls-success)' : 'var(--ls-accent)' }}
          >
            {copied ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {tCommon('copied')}
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                {tCommon('copyLink')}
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
            style={{ background: 'var(--ls-surface-2)', color: 'var(--ls-muted)' }}
          >
            {tCommon('done')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminInvitesPage() {
  const t = useTranslations('admin.invites');
  const tCommon = useTranslations('common');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [acting, setActing] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState<{ inviteUrl: string; email: string } | null>(null);
  const { showToast } = useToast();

  const STATUS_LABELS: Record<string, string> = {
    pending:  t('pending'),
    accepted: t('accepted'),
    expired:  t('expired'),
  };

  const STATUS_COLOR: Record<string, string> = {
    pending:  'var(--ls-muted)',
    accepted: 'var(--ls-success)',
    expired:  'var(--ls-muted)',
  };

  const ROLE_COLOR: Record<string, string> = {
    ADMIN:  'var(--ls-accent)',
    VIEWER: 'var(--ls-muted)',
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/invites');
      setInvites(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGetLink = async (inv: Invite) => {
    setActing(inv.id);
    try {
      const { data } = await api.post<{ inviteUrl: string }>(`/api/invites/${inv.id}/regenerate`);
      setLinkModal({ inviteUrl: data.inviteUrl, email: inv.email });
      setInvites((prev) => prev.map((i) =>
        i.id === inv.id
          ? { ...i, status: 'pending', expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() }
          : i,
      ));
    } catch {
      showToast(t('errorLoad'), 'error');
    } finally {
      setActing(null);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    setActing(id);
    try {
      await api.delete(`/api/invites/${id}`);
      setInvites((prev) => prev.filter((i) => i.id !== id));
      showToast(`${t('remove')}: ${email}`, 'info');
    } catch {
      showToast(t('errorLoad'), 'error');
    } finally {
      setActing(null);
    }
  };

  const filtered = filter === 'ALL' ? invites : invites.filter((i) => i.status === filter);

  const counts = {
    pending:  invites.filter((i) => i.status === 'pending').length,
    accepted: invites.filter((i) => i.status === 'accepted').length,
    expired:  invites.filter((i) => i.status === 'expired').length,
  };

  return (
    <>
      {linkModal && (
        <CopyLinkModal
          inviteUrl={linkModal.inviteUrl}
          email={linkModal.email}
          onClose={() => setLinkModal(null)}
          t={t}
          tCommon={tCommon}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ls-muted)' }}>{t('subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          {(['pending', 'accepted', 'expired'] as const).map((key) => (
            <div
              key={key}
              className="rounded-xl p-3 sm:p-5"
              style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
            >
              <p className="text-2xl sm:text-3xl font-bold tabular-nums leading-none mb-1" style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}>{counts[key]}</p>
              <p className="text-[10px] sm:text-xs font-medium truncate" style={{ color: 'var(--ls-text-2)' }}>{STATUS_LABELS[key]}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-5 p-1 rounded-lg overflow-x-auto tabs-scroll" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
          {(['ALL', 'pending', 'accepted', 'expired'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
              style={{
                background: filter === f ? 'var(--ls-sb-active)' : 'transparent',
                color: filter === f ? 'var(--ls-sb-active-t)' : 'var(--ls-muted)',
              }}
            >
              {f === 'ALL' ? tCommon('all') : STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg" style={{ border: '1px dashed var(--ls-border)' }}>
            <p className="text-sm" style={{ color: 'var(--ls-muted)' }}>{t('noFound')}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ls-muted)' }}>{t('sendFromUsers')}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-lg overflow-hidden" style={{ border: '1px solid var(--ls-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--ls-card)', borderBottom: '1px solid var(--ls-border)' }}>
                    <th className="px-5 py-3 text-left font-medium text-xs" style={{ color: 'var(--ls-muted)' }}>{t('emailCol')}</th>
                    <th className="px-5 py-3 text-left font-medium text-xs" style={{ color: 'var(--ls-muted)' }}>{t('roleCol')}</th>
                    <th className="px-5 py-3 text-left font-medium text-xs" style={{ color: 'var(--ls-muted)' }}>{t('sentCol')}</th>
                    <th className="px-5 py-3 text-left font-medium text-xs" style={{ color: 'var(--ls-muted)' }}>{t('expiresUsedCol')}</th>
                    <th className="px-5 py-3 text-left font-medium text-xs" style={{ color: 'var(--ls-muted)' }}>{tCommon('status')}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      style={{ background: 'var(--ls-card)', borderTop: idx > 0 ? '1px solid var(--ls-border)' : undefined }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-card)'; }}
                    >
                      <td className="px-5 py-3 text-sm font-medium" style={{ color: 'var(--ls-text)' }}>{inv.email}</td>
                      <td className="px-5 py-3 text-xs font-medium" style={{ color: ROLE_COLOR[inv.role] }}>
                        {inv.role === 'ADMIN' ? 'Admin' : 'Viewer'}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-muted)' }}>
                        {new Date(inv.createdAt).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-muted)' }}>
                        {inv.usedAt ? new Date(inv.usedAt).toLocaleDateString(undefined, { timeZone: 'UTC' }) : new Date(inv.expiresAt).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                      </td>
                      <td className="px-5 py-3 text-xs font-medium" style={{ color: STATUS_COLOR[inv.status] }}>
                        {STATUS_LABELS[inv.status]}
                      </td>
                      <td className="px-5 py-3">
                        {inv.status !== 'accepted' && (
                          <div className="flex gap-1 justify-end">
                            <ActionBtn onClick={() => handleGetLink(inv)} label={t('getLink')} variant="primary" disabled={acting === inv.id} />
                            <ActionBtn onClick={() => handleDelete(inv.id, inv.email)} label={t('remove')} variant="danger" disabled={acting === inv.id} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filtered.map((inv) => (
                <div key={inv.id} className="rounded-lg overflow-hidden" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--ls-text)' }}>{inv.email}</p>
                      <span className="shrink-0 text-xs font-medium" style={{ color: STATUS_COLOR[inv.status] }}>
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium" style={{ color: ROLE_COLOR[inv.role] }}>
                        {inv.role === 'ADMIN' ? 'Admin' : 'Viewer'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--ls-muted)' }}>
                        {inv.usedAt
                          ? new Date(inv.usedAt).toLocaleDateString(undefined, { timeZone: 'UTC' })
                          : new Date(inv.expiresAt).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                      </span>
                    </div>
                  </div>
                  {inv.status !== 'accepted' && (
                    <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--ls-border)', background: 'var(--ls-surface-2)' }}>
                      <button
                        onClick={() => handleGetLink(inv)}
                        disabled={acting === inv.id}
                        className="flex items-center justify-center gap-2 py-3 text-sm font-medium cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-40"
                        style={{ color: 'var(--ls-accent)' }}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                        {t('getLink')}
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id, inv.email)}
                        disabled={acting === inv.id}
                        className="flex items-center justify-center gap-2 py-3 text-sm font-medium cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-40"
                        style={{ color: 'var(--ls-error)', borderLeft: '1px solid var(--ls-border)' }}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        {t('remove')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
