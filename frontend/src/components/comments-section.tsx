'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const colors = ['#1e40af', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#065f46'];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={`shrink-0 flex items-center justify-center rounded-full font-semibold text-white`}
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
      // silently ignore
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
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all border"
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
              {comment.isDeleted ? 'Deleted user' : comment.author?.name}
            </span>
            <span className="text-xs" style={{ color: 'var(--ls-text-3)' }}>{timeAgo(comment.createdAt)}</span>
            {comment.isDeleted && (
              <span className="text-xs italic" style={{ color: 'var(--ls-text-3)' }}>[deleted]</span>
            )}
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
              />
              <div className="flex gap-2">
                <button type="submit" disabled={editLoading || !editBody.trim()} className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50" style={{ background: 'var(--ls-accent)' }}>
                  {editLoading ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => { setEditOpen(false); setEditBody(comment.body); }} className="rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: 'var(--ls-border)', color: 'var(--ls-text-2)' }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-1 text-sm leading-relaxed" style={{ color: comment.isDeleted ? 'var(--ls-text-3)' : 'var(--ls-text-1)', fontStyle: comment.isDeleted ? 'italic' : 'normal' }}>
              {comment.isDeleted ? '[deleted]' : comment.body}
            </p>
          )}

          {/* Reactions */}
          {!comment.isDeleted && (
            <ReactionBar commentId={comment.id} reactions={comment.reactions} onUpdate={onReactionUpdate} />
          )}

          {/* Action buttons */}
          {!comment.isDeleted && !editOpen && (
            <div className="mt-2 flex items-center gap-3">
              {!isReply && (
                <button
                  onClick={() => { setReplyOpen((v) => !v); setDeleteConfirm(false); }}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--ls-text-3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ls-accent)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ls-text-3)'; }}
                >
                  Reply
                </button>
              )}
              {comment.canEdit && (
                <button
                  onClick={() => { setEditOpen(true); setEditBody(comment.body); setDeleteConfirm(false); }}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--ls-text-3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ls-text-2)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ls-text-3)'; }}
                >
                  Edit
                </button>
              )}
              {comment.canDelete && (
                <button
                  onClick={handleDelete}
                  className="text-xs font-medium transition-colors"
                  style={{ color: deleteConfirm ? '#ef4444' : 'var(--ls-text-3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = deleteConfirm ? '#ef4444' : 'var(--ls-text-3)'; }}
                >
                  {deleteConfirm ? 'Confirm delete' : 'Delete'}
                </button>
              )}
              {deleteConfirm && (
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="text-xs"
                  style={{ color: 'var(--ls-text-3)' }}
                >
                  Cancel
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
                placeholder="Write a reply…"
                rows={2}
                className="flex-1 rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none"
                style={{ background: 'var(--ls-surface-2)', borderColor: 'var(--ls-border)', color: 'var(--ls-text-1)' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply(e as unknown as React.FormEvent);
                }}
              />
              <div className="flex flex-col gap-1.5">
                <button type="submit" disabled={replyLoading || !replyBody.trim()} className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50" style={{ background: 'var(--ls-accent)' }}>
                  {replyLoading ? '…' : 'Post'}
                </button>
                <button type="button" onClick={() => { setReplyOpen(false); setReplyBody(''); }} className="rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: 'var(--ls-border)', color: 'var(--ls-text-2)' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Replies */}
      {!isReply && comment.replies.length > 0 && (
        <div className="mt-1 space-y-1 pl-1" style={{ borderLeft: '2px solid var(--ls-border)', marginLeft: '16px', paddingLeft: '16px' }}>
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
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBody, setNewBody] = useState('');
  const [posting, setPosting] = useState(false);

  const totalCount = comments.reduce((acc, c) => acc + 1 + c.replies.length, 0);

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
      prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c,
      ),
    );
  }, []);

  return (
    <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--ls-border)' }}>
      {/* Header */}
      <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--ls-text-1)' }}>
        Discussion
        {totalCount > 0 && (
          <span className="ml-2 text-sm font-normal" style={{ color: 'var(--ls-text-3)' }}>
            {totalCount} {totalCount === 1 ? 'comment' : 'comments'}
          </span>
        )}
      </h2>

      {/* New comment form */}
      <form onSubmit={handlePost} className="mb-6 flex gap-3 items-start">
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="Ask a question or share your thoughts…"
          rows={2}
          className="flex-1 rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 transition-all"
          style={{
            background: 'var(--ls-surface)',
            borderColor: 'var(--ls-border)',
            color: 'var(--ls-text-1)',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost(e as unknown as React.FormEvent);
          }}
        />
        <button
          type="submit"
          disabled={posting || !newBody.trim()}
          className="shrink-0 rounded-xl px-4 py-3 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
          style={{ background: 'var(--ls-accent)' }}
        >
          {posting ? '…' : 'Post'}
        </button>
      </form>

      {/* Loading */}
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

      {/* Empty */}
      {!loading && comments.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--ls-text-3)' }}>
          No comments yet. Be the first to start the discussion!
        </p>
      )}

      {/* Comment list */}
      {!loading && comments.length > 0 && (
        <div className="space-y-5">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                videoId={videoId}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onReactionUpdate={handleReactionUpdate}
                onReplyPosted={handleReplyPosted}
              />
              {comment !== comments[comments.length - 1] && (
                <div className="mt-5" style={{ borderBottom: '1px solid var(--ls-border)' }} />
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs" style={{ color: 'var(--ls-text-3)' }}>
        Tip: Press {typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac') ? '⌘' : 'Ctrl'}+Enter to post quickly.
      </p>
    </div>
  );
}
