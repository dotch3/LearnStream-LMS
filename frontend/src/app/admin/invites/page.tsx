'use client';

import { useEffect, useState } from 'react';
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

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: 'Pending',  bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  accepted: { label: 'Accepted', bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
  expired:  { label: 'Expired',  bg: 'rgba(107,114,128,0.15)', color: '#6b7280' },
};

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  ADMIN:  { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  VIEWER: { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
};

type Filter = 'ALL' | 'pending' | 'accepted' | 'expired';

function CopyLinkModal({
  inviteUrl,
  email,
  onClose,
}: {
  inviteUrl: string;
  email: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--ls-text-1)' }}>Invite Link</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--ls-text-2)' }}>
          Share with <strong>{email}</strong>. A new 72-hour link was generated.
        </p>
        <div
          className="rounded-lg px-3 py-2.5 text-xs font-mono break-all mb-4 select-all"
          style={{ background: 'var(--ls-bg)', border: '1px solid var(--ls-border)', color: 'var(--ls-text-2)' }}
        >
          {inviteUrl}
        </div>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer transition-colors"
            style={{ background: copied ? '#16a34a' : 'var(--ls-accent)' }}
          >
            {copied ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy Link
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: 'var(--ls-surface-2)', color: 'var(--ls-text-2)' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [acting, setActing] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState<{ inviteUrl: string; email: string } | null>(null);
  const { showToast } = useToast();

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
      // Update expiry in local state (status stays pending, expiry extended)
      setInvites((prev) => prev.map((i) =>
        i.id === inv.id
          ? { ...i, status: 'pending', expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() }
          : i,
      ));
    } catch {
      showToast('Failed to regenerate link', 'error');
    } finally {
      setActing(null);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    setActing(id);
    try {
      await api.delete(`/api/invites/${id}`);
      setInvites((prev) => prev.filter((i) => i.id !== id));
      showToast(`Invite for ${email} removed`, 'info');
    } catch {
      showToast('Failed to remove invite', 'error');
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
        />
      )}

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ls-text)' }}>Invites</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ls-muted)' }}>
            Track sent invitations — pending, accepted, and expired
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { count: counts.pending, ...STATUS_STYLES.pending },
            { count: counts.accepted, ...STATUS_STYLES.accepted },
            { count: counts.expired, ...STATUS_STYLES.expired },
          ].map(({ label, count, bg, color }) => (
            <div
              key={label}
              className="rounded-xl px-5 py-4"
              style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}
            >
              <p className="text-2xl font-bold" style={{ color }}>{count}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ls-muted)' }}>{label}</p>
              <div className="mt-2 h-1 rounded-full w-full" style={{ background: bg }} />
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg w-fit" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
          {(['ALL', 'pending', 'accepted', 'expired'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer"
              style={{
                background: filter === f ? 'var(--ls-sb-active)' : 'transparent',
                color: filter === f ? 'var(--ls-sb-active-t)' : 'var(--ls-muted)',
              }}
            >
              {f === 'ALL' ? 'All' : STATUS_STYLES[f].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--ls-card)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl py-16 text-center" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
            <p className="text-base" style={{ color: 'var(--ls-muted)' }}>No invites found</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ls-muted)' }}>Send invites from the Users page</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--ls-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--ls-card)', borderBottom: '1px solid var(--ls-border)' }}>
                  <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>Email</th>
                  <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>Role</th>
                  <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>Sent</th>
                  <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>Expires / Used</th>
                  <th className="px-5 py-3 text-left font-semibold" style={{ color: 'var(--ls-muted)' }}>Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => {
                  const s = STATUS_STYLES[inv.status];
                  const r = ROLE_STYLES[inv.role];
                  return (
                    <tr
                      key={inv.id}
                      style={{
                        background: 'var(--ls-card)',
                        borderBottom: idx < filtered.length - 1 ? '1px solid var(--ls-border)' : 'none',
                      }}
                    >
                      <td className="px-5 py-3 font-medium" style={{ color: 'var(--ls-text)' }}>
                        {inv.email}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ background: r.bg, color: r.color }}
                        >
                          {inv.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-muted)' }}>
                        {new Date(inv.createdAt).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-muted)' }}>
                        {inv.usedAt
                          ? new Date(inv.usedAt).toLocaleDateString(undefined, { timeZone: 'UTC' })
                          : new Date(inv.expiresAt).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ background: s.bg, color: s.color }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {inv.status !== 'accepted' && (
                          <div className="flex gap-1 justify-end">
                            <ActionBtn
                              onClick={() => handleGetLink(inv)}
                              label="Get Link"
                              variant="primary"
                              disabled={acting === inv.id}
                            />
                            <ActionBtn
                              onClick={() => handleDelete(inv.id, inv.email)}
                              label="Remove"
                              variant="danger"
                              disabled={acting === inv.id}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
