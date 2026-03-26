'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus, GitBranch, Users, Loader2, Trash2, Play, Pause,
  ChevronRight, Mail, Clock, CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/contexts/ToastContext';
import { sequencesApi, type SequenceDto } from '@/lib/api';

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Delete Sequence</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Delete <span className="font-medium text-[var(--color-text-primary)]">&ldquo;{name}&rdquo;</span>? All enrolled candidates will be unenrolled and this cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={onConfirm}>Delete Sequence</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ onSaved, onCancel }: { onSaved: (s: SequenceDto) => void; onCancel: () => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { showToast('Sequence name is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await sequencesApi.create({ name: name.trim() });
      onSaved(res.sequence);
      showToast('Sequence created', 'success');
    } catch {
      showToast('Failed to create sequence', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">New Sequence</h3>
        <div className="mb-5">
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Sequence Name <span className="text-red-500">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. Outbound Engineering Outreach"
            autoFocus
            className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" className="flex-1" isLoading={saving} onClick={handleCreate}>
            Create & Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Step Icon ────────────────────────────────────────────────────────────────

function StepTypePip({ type }: { type: 'EMAIL' | 'WAIT' | 'TASK' }) {
  if (type === 'EMAIL') return <Mail size={11} className="text-blue-500" />;
  if (type === 'WAIT')  return <Clock size={11} className="text-amber-500" />;
  return <CheckSquare size={11} className="text-green-500" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SequencesPage() {
  const { showToast } = useToast();
  const [sequences, setSequences] = useState<SequenceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SequenceDto | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    sequencesApi.getAll()
      .then((d) => setSequences(d.sequences))
      .catch(() => showToast('Failed to load sequences', 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(s: SequenceDto) {
    try {
      await sequencesApi.delete(s.id);
      setSequences((prev) => prev.filter((x) => x.id !== s.id));
      showToast('Sequence deleted', 'success');
    } catch {
      showToast('Failed to delete sequence', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleToggle(s: SequenceDto) {
    const next = s.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setTogglingId(s.id);
    try {
      const res = await sequencesApi.toggleStatus(s.id, next);
      setSequences((prev) => prev.map((x) => x.id === s.id ? res.sequence : x));
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setTogglingId(null);
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Email Sequences</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Automate multi-step outreach campaigns for candidates</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> New Sequence
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : sequences.length === 0 ? (
        <div className="text-center py-20">
          <GitBranch size={36} className="text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">No sequences yet</p>
          <p className="text-xs text-[var(--color-text-muted)] mb-5">Create your first outreach sequence to start automating candidate communication.</p>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={13} /> Create Sequence
          </Button>
        </div>
      ) : (
        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-muted)]">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Steps</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Enrolled</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {sequences.map((seq) => (
                <tr key={seq.id} className="group hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/settings/sequences/${seq.id}`} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <GitBranch size={15} className="text-[var(--color-primary)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors">{seq.name}</p>
                        {seq.stepCount > 0 && (
                          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                            {seq.stepCount} step{seq.stepCount !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-[var(--color-text-primary)]">{seq.stepCount}</span>
                    <span className="text-[var(--color-text-muted)] ml-1">step{seq.stepCount !== 1 ? 's' : ''}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                      <Users size={13} />
                      {seq.enrolledCount}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => handleToggle(seq)}
                      disabled={togglingId === seq.id}
                      className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border transition-colors ${
                        seq.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {togglingId === seq.id ? (
                        <Loader2 size={9} className="animate-spin" />
                      ) : seq.status === 'ACTIVE' ? (
                        <><Play size={9} className="fill-current" /> Active</>
                      ) : (
                        <><Pause size={9} className="fill-current" /> Paused</>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-[var(--color-text-muted)]">{fmtDate(seq.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setDeleteTarget(seq)}
                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                      <Link
                        href={`/settings/sequences/${seq.id}`}
                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
                      >
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <CreateModal
          onSaved={(s) => { setSequences((prev) => [s, ...prev]); setCreateOpen(false); }}
          onCancel={() => setCreateOpen(false)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
