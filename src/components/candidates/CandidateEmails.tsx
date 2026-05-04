'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail, RefreshCw, Send, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownLeft, Reply, Loader2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/contexts/ToastContext';
import {
  gmailApi, emailTemplatesApi,
  type GmailThreadDto, type GmailMessageDto, type EmailTemplateDto,
} from '@/lib/api';

// ── Sanitise HTML ────────────────────────────────────────────────────────────
// Simple tag-based sanitiser since DOMPurify isn't installed.
// Strips script, style, event handlers; keeps basic formatting tags.
function sanitiseHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  candidateId: string;
  candidateEmail: string;
  currentUserRole: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CandidateEmails({ candidateId, candidateEmail, currentUserRole }: Props) {
  const { showToast } = useToast();
  const [threads, setThreads] = useState<GmailThreadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyToThreadId, setReplyToThreadId] = useState<string | undefined>();
  const [replySubject, setReplySubject] = useState('');

  const canWrite = currentUserRole === 'ADMIN' || currentUserRole === 'HR';

  const loadThreads = useCallback(async () => {
    try {
      const data = await gmailApi.list(candidateId);
      setThreads(data.threads);
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await gmailApi.sync(candidateId);
      showToast(`Synced ${result.messagesFound} emails`);
      await loadThreads();
    } catch {
      showToast('Failed to sync emails', 'error');
    } finally {
      setSyncing(false);
    }
  }

  function handleReply(thread: GmailThreadDto) {
    setReplyToThreadId(thread.gmailThreadId);
    setReplySubject(`Re: ${thread.subject.replace(/^Re:\s*/i, '')}`);
    setComposeOpen(true);
  }

  function handleComposeSent() {
    setComposeOpen(false);
    setReplyToThreadId(undefined);
    setReplySubject('');
    loadThreads();
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card padding="lg">
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      </Card>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (threads.length === 0 && !composeOpen) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center py-12 gap-3 text-[var(--color-text-muted)]">
          <Mail size={28} />
          <p className="text-sm">No emails yet.</p>
          {canWrite && (
            <div className="flex gap-2 mt-2">
              <Button variant="secondary" size="sm" onClick={handleSync} isLoading={syncing}>
                <RefreshCw size={13} /> Sync
              </Button>
              <Button variant="primary" size="sm" onClick={() => setComposeOpen(true)}>
                <Send size={13} /> Compose
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-[var(--color-text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Emails</h3>
          <span className="text-xs text-[var(--color-text-muted)]">({threads.length})</span>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleSync} isLoading={syncing}>
              <RefreshCw size={13} /> Sync
            </Button>
            <Button variant="primary" size="sm" onClick={() => { setReplyToThreadId(undefined); setReplySubject(''); setComposeOpen(true); }}>
              <Send size={13} /> Compose
            </Button>
          </div>
        )}
      </div>

      {/* Thread list */}
      {threads.map((thread) => (
        <ThreadRow
          key={thread.id}
          thread={thread}
          expanded={expandedThread === thread.id}
          onToggle={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)}
          onReply={canWrite ? () => handleReply(thread) : undefined}
        />
      ))}

      {/* Compose modal */}
      {composeOpen && (
        <ComposeModal
          candidateId={candidateId}
          candidateEmail={candidateEmail}
          replyToThreadId={replyToThreadId}
          initialSubject={replySubject}
          onClose={() => { setComposeOpen(false); setReplyToThreadId(undefined); setReplySubject(''); }}
          onSent={handleComposeSent}
        />
      )}
    </div>
  );
}

// ── Thread Row ───────────────────────────────────────────────────────────────

function ThreadRow({ thread, expanded, onToggle, onReply }: {
  thread: GmailThreadDto;
  expanded: boolean;
  onToggle: () => void;
  onReply?: () => void;
}) {
  const lastMsg = thread.messages[0];
  const isOutbound = lastMsg?.direction === 'OUTBOUND';

  return (
    <Card className={thread.hasUnread ? 'border-l-2 border-l-blue-500' : ''}>
      <div className="p-4">
        {/* Thread header */}
        <button
          className="w-full flex items-start gap-3 text-left"
          onClick={onToggle}
        >
          <div className="mt-0.5 shrink-0">
            {isOutbound ? (
              <ArrowUpRight size={14} className="text-blue-500" />
            ) : (
              <ArrowDownLeft size={14} className="text-emerald-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm truncate ${thread.hasUnread ? 'font-semibold' : 'font-medium'} text-[var(--color-text-primary)]`}>
                {thread.subject || '(no subject)'}
              </p>
              {thread.messageCount > 1 && (
                <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-surface)] text-[10px] font-medium text-[var(--color-text-muted)]">
                  {thread.messageCount}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{thread.snippet}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {formatDate(thread.lastMessageAt)}
            </span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        {/* Expanded messages */}
        {expanded && (
          <div className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
            {thread.messages.map((msg) => (
              <MessageRow key={msg.id} message={msg} />
            ))}
            {onReply && (
              <Button variant="secondary" size="sm" onClick={onReply}>
                <Reply size={13} /> Reply
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Message Row ──────────────────────────────────────────────────────────────

function MessageRow({ message }: { message: GmailMessageDto }) {
  const isOut = message.direction === 'OUTBOUND';

  return (
    <div className={`rounded-lg p-3 ${isOut ? 'bg-blue-50/50' : 'bg-[var(--color-surface)]'}`}>
      <div className="flex items-center gap-2 mb-1">
        {isOut ? (
          <ArrowUpRight size={12} className="text-blue-500 shrink-0" />
        ) : (
          <ArrowDownLeft size={12} className="text-emerald-500 shrink-0" />
        )}
        <span className="text-xs font-medium text-[var(--color-text-primary)] truncate">
          {message.from}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">
          {formatDate(message.receivedAt)}
        </span>
      </div>
      <div className="text-xs text-[var(--color-text-muted)] mb-1">
        To: {message.to}
      </div>
      {message.bodyHtml ? (
        <div
          className="text-sm text-[var(--color-text-primary)] prose prose-sm max-w-none [&_a]:text-blue-600 [&_img]:max-w-full"
          dangerouslySetInnerHTML={{ __html: sanitiseHtml(message.bodyHtml) }}
        />
      ) : (
        <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">
          {message.bodyText ?? message.snippet}
        </p>
      )}
    </div>
  );
}

// ── Compose Modal ────────────────────────────────────────────────────────────

function ComposeModal({ candidateId, candidateEmail, replyToThreadId, initialSubject, onClose, onSent }: {
  candidateId: string;
  candidateEmail: string;
  replyToThreadId?: string;
  initialSubject?: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const { showToast } = useToast();
  const [subject, setSubject] = useState(initialSubject ?? '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplateDto[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    emailTemplatesApi.getAll()
      .then(({ templates: t }) => setTemplates(t))
      .catch(() => {});
  }, []);

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);
    const t = templates.find((tpl) => tpl.id === templateId);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      showToast('Subject and body are required', 'error');
      return;
    }
    setSending(true);
    try {
      // Strip HTML tags for plain text version
      const bodyText = body.replace(/<[^>]+>/g, '');
      await gmailApi.send(candidateId, {
        subject,
        bodyHtml: body.includes('<') ? body : `<p>${body.replace(/\n/g, '<br/>')}</p>`,
        bodyText,
        replyToThreadId,
        templateId: selectedTemplate || undefined,
      });
      showToast('Email sent');
      onSent();
    } catch {
      showToast('Failed to send email', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-0" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            {replyToThreadId ? 'Reply' : 'New Email'}
          </h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {/* To */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">To</label>
            <input
              type="text"
              value={candidateEmail}
              readOnly
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
            />
          </div>

          {/* Template selector */}
          {templates.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-primary)]"
              >
                <option value="">None</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email…"
              rows={8}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSend} isLoading={sending}>
            <Send size={13} /> Send
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
