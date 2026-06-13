'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { api } from '@/lib/axios';

/* ── Types ─────────────────────────────────────────────────── */
interface ReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

interface CommentDto {
  id: string;
  body: string;
  isDeleted: boolean;
  createdAt: string;
  author: { id: string; name: string } | null;
  reactions: ReactionSummary[];
  replies: CommentDto[];
  canEdit: boolean;
  canDelete: boolean;
}

const EMOJIS = ['👍', '😊', '💡', '❤️'];

/* ── Helpers ───────────────────────────────────────────────── */
function useTimeAgo() {
  const t = useTranslations('comments');
  const locale = useLocale();

  return (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return t('timeJustNow');
    if (m < 60) return t('timeMinutes', { m });
    const h = Math.floor(m / 60);
    if (h < 24) return t('timeHours', { h });
    const d = Math.floor(h / 24);
    if (d < 30) return t('timeDays', { d });
    return new Date(iso).toLocaleDateString(locale === 'pt' ? 'pt-BR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
}

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const colors = ['#1e40af', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#065f46'];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full font-semibold text-white select-none"
      style={{ width: size * 4, height: size * 4, background: bg, fontSize: size * 1.5 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/* ── Reaction bar ──────────────────────────────────────────── */
function ReactionBar({
  commentId,
  reactions,
  onUpdate,
}: {
  commentId: string;
  reactions: ReactionSummary[];
  onUpdate: (id: string, reactions: ReactionSummary[]) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(emoji: string) {
    if (pending) return;
    setPending(emoji);
    try {
      const res = await api.post<ReactionSummary[]>(`/api/comments/${commentId}/reactions`, { emoji });
      onUpdate(commentId, res.data);
    } catch {
      // silent
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => toggle(r.emoji)}
          disabled={pending === r.emoji}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all border cursor-pointer active:scale-95 disabled:opacity-50"
          style={{
            background: r.reactedByMe ? 'var(--ls-accent-muted)' : 'transparent',
            borderColor: r.reactedByMe ? 'var(--ls-accent)' : 'var(--ls-border)',
            color: r.reactedByMe ? 'var(--ls-accent-text)' : 'var(--ls-text-3)',
            fontWeight: r.reactedByMe ? 600 : 400,
          }}
        >
          <span>{r.emoji}</span>
          {r.count > 0 && <span>{r.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Single comment ────────────────────────────────────────── */
function CommentItem({
  comment,
  videoId,
  isReply = false,
  onDelete,
  onEdit,
  onReactionUpdate,
  onReplyPosted,
}: {
  comment: CommentDto;
  videoId: string;
  isReply?: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, body: string) => void;
  onReactionUpdate: (id: string, reactions: ReactionSummary[]) => void;
  onReplyPosted: (parentId: string, reply: CommentDto) => void;
}) {
  const t = useTranslations('comments');
  const timeAgo = useTimeAgo();

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const replyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (replyOpen) replyRef.current?.focus();
  }, [replyOpen]);

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setReplyLoading(true);
    try {
      const res = await api.post<CommentDto>(`/api/videos/${videoId}/comments`, {
        body: replyBody.trim(),
        parentId: comment.id,
      });
      onReplyPosted(comment.id, res.data);
      setReplyBody('');
      setReplyOpen(false);
    } catch {
      // ignore
    } finally {
      setReplyLoading(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editBody.trim()) return;
    setEditLoading(true);
    try {
      await api.patch(`/api/comments/${comment.id}`, { body: editBody.trim() });
      onEdit(comment.id, editBody.trim());
      setEditOpen(false);
    } catch {
      // ignore
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    try {
      await api.delete(`/api/comments/${comment.id}`);
      onDelete(comment.id);
    } catch {
      setDeleteConfirm(false);
    }
  }

  return (
    <div className={isReply ? 'ml-10 mt-3' : ''}>
      <div className="flex gap-3">
        {comment.author ? (
          <Avatar name={comment.author.name} size={isReply ? 7 : 8} />
        ) : (
          <div
            className="shrink-0 rounded-full flex items-center justify-center text-xs"
            style={{ width: isReply ? 28 : 32, height: isReply ? 28 : 32, background: 'var(--ls-border)', color: 'var(--ls-text-3)' }}
          >?</div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: 'var(--ls-text-1)' }}>
              {comment.isDeleted ? t('deletedUser') : comment.author?.name}
            </span>
            <span className="text-xs" style={{ color: 'var(--ls-text-3)' }}>{timeAgo(comment.createdAt)}</span>
          </div>

          {/* Body or edit form */}
          {editOpen ? (
            <form onSubmit={submitEdit} className="mt-2 space-y-2">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none"
                style={{ background: 'var(--ls-surface-2)', borderColor: 'var(--ls-border)', color: 'var(--ls-text-1)' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ls-accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ls-border)'; }}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={editLoading || !editBody.trim()}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-95 transition-opacity"
                  style={{ background: 'var(--ls-accent)' }}
                >
                  {editLoading ? t('saving') : t('save')}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditOpen(false); setEditBody(comment.body); }}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ borderColor: 'var(--ls-border)', color: 'var(--ls-text-2)', background: 'transparent' }}
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          ) : (
            <p
              className="mt-1 text-sm leading-relaxed"
              style={{ color: comment.isDeleted ? 'var(--ls-text-3)' : 'var(--ls-text-1)', fontStyle: comment.isDeleted ? 'italic' : 'normal' }}
            >
              {comment.isDeleted ? t('deletedBody') : comment.body}
            </p>
          )}

          {/* Reactions */}
          {!comment.isDeleted && (
            <ReactionBar commentId={comment.id} reactions={comment.reactions} onUpdate={onReactionUpdate} />
          )}

          {/* Action buttons */}
          {!comment.isDeleted && !editOpen && (
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              {!isReply && (
                <button
                  onClick={() => { setReplyOpen((v) => !v); setDeleteConfirm(false); }}
                  className="text-xs font-medium transition-colors cursor-pointer"
                  style={{ color: 'var(--ls-text-3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ls-accent)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ls-text-3)'; }}
                >
                  {t('reply')}
                </button>
              )}
              {comment.canEdit && (
                <button
                  onClick={() => { setEditOpen(true); setEditBody(comment.body); setDeleteConfirm(false); }}
                  className="text-xs font-medium transition-colors cursor-pointer"
                  style={{ color: 'var(--ls-text-3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ls-text-2)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ls-text-3)'; }}
                >
                  {t('edit')}
                </button>
              )}
              {comment.canDelete && (
                <button
                  onClick={handleDelete}
                  className="text-xs font-medium transition-colors cursor-pointer"
                  style={{ color: deleteConfirm ? '#ef4444' : 'var(--ls-text-3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = deleteConfirm ? '#ef4444' : 'var(--ls-text-3)'; }}
                >
                  {deleteConfirm ? t('confirmDelete') : t('delete')}
                </button>
              )}
              {deleteConfirm && (
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--ls-text-3)' }}
                >
                  {t('cancel')}
                </button>
              )}
            </div>
          )}

          {/* Reply form */}
          {replyOpen && (
            <form onSubmit={submitReply} className="mt-3 flex gap-2 items-start">
              <textarea
                ref={replyRef}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={t('replyPlaceholder')}
                rows={2}
                className="flex-1 rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none transition-colors"
                style={{ background: 'var(--ls-surface-2)', borderColor: 'var(--ls-border)', color: 'var(--ls-text-1)' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ls-accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ls-border)'; }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply(e as unknown as React.FormEvent);
                }}
              />
              <div className="flex flex-col gap-1.5">
                <button
                  type="submit"
                  disabled={replyLoading || !replyBody.trim()}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-95 transition-opacity"
                  style={{ background: 'var(--ls-accent)' }}
                >
                  {replyLoading ? t('posting') : t('post')}
                </button>
                <button
                  type="button"
                  onClick={() => { setReplyOpen(false); setReplyBody(''); }}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ borderColor: 'var(--ls-border)', color: 'var(--ls-text-2)', background: 'transparent' }}
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Replies */}
      {!isReply && comment.replies.length > 0 && (
        <div
          className="mt-1 space-y-1 pl-4"
          style={{ borderLeft: '2px solid var(--ls-border)', marginLeft: '16px' }}
        >
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              videoId={videoId}
              isReply
              onDelete={onDelete}
              onEdit={onEdit}
              onReactionUpdate={onReactionUpdate}
              onReplyPosted={onReplyPosted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main section ──────────────────────────────────────────── */
export function CommentsSection({ videoId }: { videoId: string }) {
  const t = useTranslations('comments');
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBody, setNewBody] = useState('');
  const [posting, setPosting] = useState(false);

  const totalCount = comments.reduce((acc, c) => acc + 1 + c.replies.length, 0);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac');

  useEffect(() => {
    api
      .get<CommentDto[]>(`/api/videos/${videoId}/comments`)
      .then((res) => setComments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [videoId]);

  const handlePost = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBody.trim()) return;
    setPosting(true);
    try {
      const res = await api.post<CommentDto>(`/api/videos/${videoId}/comments`, { body: newBody.trim() });
      setComments((prev) => [res.data, ...prev]);
      setNewBody('');
    } catch {
      // ignore
    } finally {
      setPosting(false);
    }
  }, [videoId, newBody]);

  const handleDelete = useCallback((id: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === id) return { ...c, isDeleted: true, body: '', author: null, canEdit: false, canDelete: false };
        return { ...c, replies: c.replies.map((r) => r.id === id ? { ...r, isDeleted: true, body: '', author: null, canEdit: false, canDelete: false } : r) };
      }),
    );
  }, []);

  const handleEdit = useCallback((id: string, body: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === id) return { ...c, body };
        return { ...c, replies: c.replies.map((r) => r.id === id ? { ...r, body } : r) };
      }),
    );
  }, []);

  const handleReactionUpdate = useCallback((id: string, reactions: ReactionSummary[]) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === id) return { ...c, reactions };
        return { ...c, replies: c.replies.map((r) => r.id === id ? { ...r, reactions } : r) };
      }),
    );
  }, []);

  const handleReplyPosted = useCallback((parentId: string, reply: CommentDto) => {
    setComments((prev) =>
      prev.map((c) => c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c)
    );
  }, []);

  return (
    <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--ls-border)' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--ls-accent)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
        <h2 className="text-base font-semibold" style={{ color: 'var(--ls-text-1)' }}>
          {t('discussion')}
        </h2>
        {totalCount > 0 && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'var(--ls-surface-2)', color: 'var(--ls-text-3)' }}
          >
            {t('commentCount', { count: totalCount })}
          </span>
        )}
      </div>

      {/* New comment form */}
      <form onSubmit={handlePost} className="mb-6">
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder={t('placeholder')}
          rows={3}
          className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none transition-colors"
          style={{
            background: 'var(--ls-surface)',
            borderColor: 'var(--ls-border)',
            color: 'var(--ls-text-1)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ls-accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ls-border)'; }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost(e as unknown as React.FormEvent);
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs" style={{ color: 'var(--ls-text-3)' }}>
            {t('tip', { key: isMac ? '⌘' : 'Ctrl' })}
          </p>
          <button
            type="submit"
            disabled={posting || !newBody.trim()}
            className="shrink-0 rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-90 cursor-pointer active:scale-95"
            style={{ background: 'var(--ls-accent)' }}
          >
            {posting ? t('posting') : t('post')}
          </button>
        </div>
      </form>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full shrink-0" style={{ background: 'var(--ls-border)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded w-24" style={{ background: 'var(--ls-border)' }} />
                <div className="h-3 rounded w-3/4" style={{ background: 'var(--ls-border)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && comments.length === 0 && (
        <div className="py-10 text-center">
          <svg className="h-6 w-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ls-text-3)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--ls-text-3)' }}>{t('empty')}</p>
        </div>
      )}

      {/* Comment list */}
      {!loading && comments.length > 0 && (
        <div className="space-y-5">
          {comments.map((comment, idx) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                videoId={videoId}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onReactionUpdate={handleReactionUpdate}
                onReplyPosted={handleReplyPosted}
              />
              {idx < comments.length - 1 && (
                <div className="mt-5" style={{ borderBottom: '1px solid var(--ls-border)' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
