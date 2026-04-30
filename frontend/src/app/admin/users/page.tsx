'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { ActionBtn } from '@/components/admin/action-btn';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useToast } from '@/components/toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
}

interface Meta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/* ── Avatar ────────────────────────────────────────────────── */
function Avatar({ name }: { name: string }) {
  const colors = ['#1e40af', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#065f46'];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
      style={{ background: bg }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [globalError, setGlobalError] = useState('');
  const { showToast } = useToast();

  // Invite modal state
  const [invite, setInvite] = useState({
    open: false,
    email: '',
    role: 'VIEWER' as 'ADMIN' | 'VIEWER',
    loading: false,
    error: '',
    // After creation:
    inviteUrl: '',
    copied: false,
  });

  const handleInvite = async () => {
    if (!invite.email.trim()) return;
    setInvite((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await api.post<{ message: string; inviteUrl: string }>('/api/users/invite', {
        email: invite.email.trim(),
        role: invite.role,
      });
      setInvite((s) => ({ ...s, loading: false, inviteUrl: data.inviteUrl, copied: false }));
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to send invite';
      setInvite((s) => ({ ...s, loading: false, error: typeof msg === 'string' ? msg : 'Failed to send invite' }));
    }
  };

  const closeInviteModal = () =>
    setInvite({ open: false, email: '', role: 'VIEWER', loading: false, error: '', inviteUrl: '', copied: false });

  // Dialog state
  const [dialog, setDialog] = useState<{
    open: boolean;
    user: User | null;
    action: 'deactivate' | 'reactivate';
    loading: boolean;
  }>({ open: false, user: null, action: 'deactivate', loading: false });

  const loadUsers = async (p: number) => {
    try {
      const res = await api.get(`/api/users?page=${p}&perPage=20`);
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch {
      setGlobalError('Failed to load users.');
    }
  };

  useEffect(() => {
    loadUsers(page);
  }, [page]);

  const openDialog = (user: User, action: 'deactivate' | 'reactivate') => {
    setGlobalError('');
    setDialog({ open: true, user, action, loading: false });
  };

  const closeDialog = () => setDialog((d) => ({ ...d, open: false }));

  const handleConfirm = async () => {
    if (!dialog.user) return;
    setDialog((d) => ({ ...d, loading: true }));
    try {
      if (dialog.action === 'deactivate') {
        await api.patch(`/api/users/${dialog.user.id}/deactivate`);
      } else {
        await api.patch(`/api/users/${dialog.user.id}/reactivate`);
      }
      closeDialog();
      loadUsers(page);
      showToast(dialog.action === 'deactivate' ? 'User deactivated' : 'User reactivated', dialog.action === 'deactivate' ? 'warning' : 'success');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Action failed.';
      const errMsg = typeof msg === 'string' ? msg : 'Action failed.';
      setGlobalError(errMsg);
      showToast(errMsg, 'error');
      closeDialog();
    }
  };

  return (
    <>
      <ConfirmDialog
        open={dialog.open}
        title={dialog.action === 'deactivate' ? 'Deactivate user?' : 'Reactivate user?'}
        description={
          dialog.action === 'deactivate'
            ? `${dialog.user?.name} will not be able to log in until reactivated.`
            : `${dialog.user?.name} will be able to log in again.`
        }
        confirmLabel={dialog.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        variant={dialog.action === 'deactivate' ? 'danger' : 'success'}
        loading={dialog.loading}
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />

      {/* Invite Modal */}
      {invite.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>

            {!invite.inviteUrl ? (
              /* Step 1 — form */
              <>
                <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--ls-text-1)' }}>Invite User</h2>
                <p className="text-sm mb-5" style={{ color: 'var(--ls-text-2)' }}>
                  The user will receive a link to set their name and password.
                </p>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ls-text-2)' }}>Email address</label>
                    <input
                      type="email"
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: 'var(--ls-bg)', border: '1px solid var(--ls-border)', color: 'var(--ls-text-1)' }}
                      placeholder="user@example.com"
                      value={invite.email}
                      onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ls-text-2)' }}>Role</label>
                    <div className="flex gap-2">
                      {(['VIEWER', 'ADMIN'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setInvite((s) => ({ ...s, role: r }))}
                          className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all"
                          style={{
                            background: invite.role === r ? 'var(--ls-accent-muted)' : 'var(--ls-surface-2)',
                            color: invite.role === r ? 'var(--ls-accent)' : 'var(--ls-text-2)',
                            border: `1px solid ${invite.role === r ? 'var(--ls-accent)' : 'transparent'}`,
                          }}
                        >
                          {r === 'VIEWER' ? 'Viewer' : 'Admin'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {invite.error && <p className="text-xs" style={{ color: 'var(--ls-error)' }}>{invite.error}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      disabled={invite.loading || !invite.email.trim()}
                      onClick={handleInvite}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
                      style={{ background: 'var(--ls-accent)' }}
                    >
                      {invite.loading ? 'Creating…' : 'Create Invite'}
                    </button>
                    <button
                      onClick={closeInviteModal}
                      className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                      style={{ background: 'var(--ls-surface-2)', color: 'var(--ls-text-2)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Step 2 — copy link */
              <>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#22c55e' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--ls-text-1)' }}>Invite created</h2>
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--ls-text-2)' }}>
                  Share this link with <strong>{invite.email}</strong>. It expires in 72 hours.
                </p>
                <div
                  className="rounded-lg px-3 py-2.5 text-xs font-mono break-all mb-3 select-all"
                  style={{ background: 'var(--ls-bg)', border: '1px solid var(--ls-border)', color: 'var(--ls-text-2)' }}
                >
                  {invite.inviteUrl}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(invite.inviteUrl);
                      setInvite((s) => ({ ...s, copied: true }));
                      setTimeout(() => setInvite((s) => ({ ...s, copied: false })), 2000);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
                    style={{ background: invite.copied ? '#16a34a' : 'var(--ls-accent)' }}
                  >
                    {invite.copied ? (
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
                    onClick={closeInviteModal}
                    className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                    style={{ background: 'var(--ls-surface-2)', color: 'var(--ls-text-2)' }}
                  >
                    Done
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ls-text)' }}>Users</h1>
            {meta && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--ls-text-muted)' }}>
                {meta.total} {meta.total === 1 ? 'user' : 'users'} total
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setInvite((s) => ({ ...s, open: true, email: '', error: '' }))}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
              style={{ background: 'var(--ls-surface-2)', color: 'var(--ls-text-1)', border: '1px solid var(--ls-border)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-border)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)'; }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              Invite
            </button>
            <button
              onClick={() => router.push('/admin/users/new')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
              style={{ background: 'var(--ls-accent)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent-h)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent)'; }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create User
            </button>
          </div>
        </div>

        {globalError && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
            {globalError}
          </div>
        )}

        {/* Table card */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-surface)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ls-border)', background: 'var(--ls-bg)' }}>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-muted)' }}>User</th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-muted)' }}>Email</th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-muted)' }}>Role</th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-muted)' }}>Status</th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--ls-text-muted)' }}>Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm" style={{ color: 'var(--ls-text-muted)' }}>
                    No users found.
                  </td>
                </tr>
              )}
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  style={{
                    borderTop: i > 0 ? '1px solid var(--ls-border)' : undefined,
                    opacity: u.isActive ? 1 : 0.6,
                  }}
                >
                  {/* Name + avatar */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      <span className="font-medium" style={{ color: 'var(--ls-text)' }}>{u.name}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-5 py-3" style={{ color: 'var(--ls-text-muted)' }}>{u.email}</td>

                  {/* Role badge */}
                  <td className="px-5 py-3">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={
                        u.role === 'ADMIN'
                          ? { background: '#fef3c7', color: '#92400e' }
                          : { background: '#eff6ff', color: '#1e40af' }
                      }
                    >
                      {u.role === 'ADMIN' ? 'Admin' : 'Viewer'}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={
                        u.isActive
                          ? { background: '#dcfce7', color: '#15803d' }
                          : { background: '#f3f4f6', color: '#6b7280' }
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: u.isActive ? '#16a34a' : '#9ca3af' }}
                      />
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--ls-text-muted)' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <ActionBtn
                        onClick={() => router.push(`/admin/users/${u.id}`)}
                        label="Edit"
                        variant="primary"
                        icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>}
                      />
                      {u.isActive ? (
                        <ActionBtn
                          onClick={() => openDialog(u, 'deactivate')}
                          label="Deactivate"
                          variant="danger"
                          icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
                        />
                      ) : (
                        <ActionBtn
                          onClick={() => openDialog(u, 'reactivate')}
                          label="Reactivate"
                          variant="success"
                          icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm" style={{ color: 'var(--ls-text-muted)' }}>
            <span>Page {meta.page} of {meta.totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 transition-colors"
                style={{ borderColor: 'var(--ls-border)', background: 'var(--ls-surface)', color: 'var(--ls-text)' }}
              >
                ← Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 transition-colors"
                style={{ borderColor: 'var(--ls-border)', background: 'var(--ls-surface)', color: 'var(--ls-text)' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
