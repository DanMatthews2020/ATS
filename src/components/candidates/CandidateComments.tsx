'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { relativeTime } from '@/lib/relativeTime';
import {
  commentsApi,
  teamApi,
  type CommentDto,
  type CandidateCommentDto,
} from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  candidateId: string;
  applicationId?: string;
  currentUserRole: string;
  currentUserId: string;
}

interface MentionableUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

function isLiveComment(c: CommentDto): c is CandidateCommentDto {
  return c.body !== null && !c.deletedAt;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  HR: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-emerald-100 text-emerald-700',
  INTERVIEWER: 'bg-amber-100 text-amber-700',
};

/** Render body with @mentions highlighted */
function RenderBody({ body }: { body: string }) {
  const parts = body.split(/(@\[[^\]]+\]\([^)]+\))/g);
  return (
    <span>
      {parts.map((part, i) => {
        const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
        if (match) {
          return (
            <span
              key={i}
              className="inline-flex items-center font-medium text-[var(--color-primary)] bg-blue-50 px-1 rounded"
            >
              @{match[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function CandidateComments({
  candidateId,
  applicationId,
  currentUserRole,
  currentUserId,
}: Props) {
  const { showToast } = useToast();
  const canComment = currentUserRole !== 'INTERVIEWER';
  const canDelete = (authorId: string) =>
    authorId === currentUserId || ['ADMIN', 'HR'].includes(currentUserRole);

  // State
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Input
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // @mention dropdown
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionMembers, setMentionMembers] = useState<MentionableUser[]>([]);
  const [mentionIdx, setMentionIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cached team members for @mention (fetched once)
  const allMembersRef = useRef<MentionableUser[] | null>(null);

  // ── Fetch comments ─────────────────────────────────────────────────────

  const fetchComments = useCallback(
    async (p: number, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const data = await commentsApi.list(candidateId, { applicationId, page: p, pageSize: 20 });
        setComments((prev) => (append ? [...prev, ...data.comments] : data.comments));
        setTotal(data.total);
        setPage(p);
      } catch {
        setError('Failed to load comments');
      } finally {
        setLoading(false);
      }
    },
    [candidateId, applicationId],
  );

  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);

  // ── Fetch and cache team members for @mention ──────────────────────────

  const loadMembers = useCallback(async (): Promise<MentionableUser[]> => {
    if (allMembersRef.current) return allMembersRef.current;
    try {
      const data = await teamApi.getAll();
      const members = data.members.map((m) => ({
        id: m.id,
        firstName: m.name.split(' ')[0] ?? '',
        lastName: m.name.split(' ').slice(1).join(' ') ?? '',
        role: m.role,
      }));
      allMembersRef.current = members;
      return members;
    } catch {
      return [];
    }
  }, []);

  // Filter cached members when mentionQuery changes
  useEffect(() => {
    if (mentionQuery === null) {
      setMentionMembers([]);
      return;
    }
    let cancelled = false;
    loadMembers().then((members) => {
      if (cancelled) return;
      const q = mentionQuery.toLowerCase();
      const filtered = members
        .filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q))
        .slice(0, 8);
      setMentionMembers(filtered);
      setMentionIdx(0);
    });
    return () => { cancelled = true; };
  }, [mentionQuery, loadMembers]);

  // ── Input handlers ─────────────────────────────────────────────────────

  function handleInputChange(value: string) {
    setBody(value);

    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
    } else {
      setMentionQuery(null);
    }
  }

  function insertMention(member: MentionableUser) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = body.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const name = `${member.firstName} ${member.lastName}`.trim();
    const mention = `@[${name}](${member.id}) `;
    const newBody = body.slice(0, atIndex) + mention + body.slice(cursorPos);
    setBody(newBody);
    setMentionQuery(null);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = atIndex + mention.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (mentionQuery !== null && mentionMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIdx((i) => Math.min(i + 1, mentionMembers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionMembers[mentionIdx]);
      } else if (e.key === 'Escape') {
        setMentionQuery(null);
      }
      return;
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await commentsApi.create(candidateId, { body: body.trim(), applicationId });
      setBody('');
      showToast('Comment added');
      fetchComments(1);
    } catch {
      showToast('Failed to add comment', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async function handleDelete(commentId: string) {
    if (!confirm('Delete this comment? This action cannot be undone.')) return;
    try {
      await commentsApi.delete(candidateId, commentId);
      showToast('Comment deleted');
      fetchComments(1);
    } catch {
      showToast('Failed to delete comment', 'error');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Comment input */}
      {canComment && (
        <div className="relative">
          <div className="border border-[var(--color-border)] rounded-xl bg-white focus-within:ring-2 focus-within:ring-[var(--color-primary)]/30 transition-shadow">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment... Use @ to mention team members"
              rows={3}
              className="w-full px-4 pt-3 pb-2 text-sm bg-transparent resize-none focus:outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
            />
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Ctrl+Enter to send
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!body.trim() || submitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Send
              </button>
            </div>
          </div>

          {/* @mention dropdown */}
          {mentionQuery !== null && mentionMembers.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
              {mentionMembers.map((member, i) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => insertMention(member)}
                  className={[
                    'w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                    i === mentionIdx
                      ? 'bg-[var(--color-surface)] text-[var(--color-primary)]'
                      : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]',
                  ].join(' ')}
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[10px] font-medium text-[var(--color-text-secondary)]">
                    {member.firstName?.[0]}{member.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium">
                      {member.firstName} {member.lastName}
                    </span>
                    <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">
                      {member.role}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && comments.length === 0 && (
        <div className="flex items-center justify-center py-8 text-[var(--color-text-muted)]">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && comments.length === 0 && !error && (
        <div className="text-center py-8">
          <MessageSquare size={32} className="mx-auto text-[var(--color-text-muted)] mb-2 opacity-40" />
          <p className="text-sm text-[var(--color-text-muted)]">No comments yet</p>
        </div>
      )}

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => {
            if (!isLiveComment(comment)) {
              return (
                <div
                  key={comment.id}
                  className="px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]"
                >
                  <p className="text-sm italic text-[var(--color-text-muted)]">
                    Comment deleted
                  </p>
                </div>
              );
            }

            const roleBadge = ROLE_COLORS[comment.author.role] ?? 'bg-gray-100 text-gray-600';

            return (
              <div
                key={comment.id}
                className="px-4 py-3 rounded-xl bg-white border border-[var(--color-border)] group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {comment.author.firstName} {comment.author.lastName}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleBadge}`}>
                      {comment.author.role}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {relativeTime(comment.createdAt)}
                    </span>
                  </div>
                  {canDelete(comment.authorId) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-[var(--color-text-muted)] hover:text-red-600 transition-all"
                      title="Delete comment"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  <RenderBody body={comment.body} />
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {comments.length < total && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => fetchComments(page + 1, true)}
            disabled={loading}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Load more (${total - comments.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}
