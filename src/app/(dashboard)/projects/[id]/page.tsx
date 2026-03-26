'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Plus, Search, Loader2, Trash2,
  X, MessageSquare, Activity, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import {
  projectsApi, candidatesApi,
  type ProjectDto, type ProjectCandidateDto, type ProjectNoteDto,
  type CandidateListDto,
} from '@/lib/api';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'candidates' | 'notes' | 'activity';

// ─── Add Candidate Modal ──────────────────────────────────────────────────────

function AddCandidateModal({ projectId, existing, onAdded, onClose }: {
  projectId: string;
  existing: string[];
  onAdded: (c: ProjectCandidateDto) => void;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<CandidateListDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding]     = useState<string | null>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const d = await candidatesApi.getCandidates(1, 20, query);
        setResults(d.items.filter((c) => !existing.includes(c.id)));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, existing]);

  async function handleAdd(c: CandidateListDto) {
    setAdding(c.id);
    try {
      const res = await projectsApi.addCandidate(projectId, c.id);
      onAdded(res.projectCandidate);
      showToast(`${c.name} added to project`, 'success');
    } catch {
      showToast('Failed to add candidate', 'error');
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Add Candidate</h3>
          <button onClick={onClose} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface)]">
            <X size={14} />
          </button>
        </div>
        <div className="p-5">
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              autoFocus
              className="w-full h-9 pl-8 pr-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <div className="space-y-1 min-h-[120px]">
            {searching ? (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[var(--color-text-muted)]" /></div>
            ) : results.length === 0 && query.length >= 2 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No candidates found.</p>
            ) : query.length < 2 ? (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-8">Type at least 2 characters to search</p>
            ) : null}
            {results.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface)] transition-colors">
                <Avatar name={c.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{c.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{c.email}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={adding === c.id}
                  onClick={() => handleAdd(c)}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { showToast } = useToast();

  const [project, setProject]       = useState<ProjectDto | null>(null);
  const [candidates, setCandidates] = useState<ProjectCandidateDto[]>([]);
  const [notes, setNotes]           = useState<ProjectNoteDto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [activeTab, setActiveTab]   = useState<Tab>('candidates');

  const [search, setSearch]         = useState('');
  const [addOpen, setAddOpen]       = useState(false);
  const [noteText, setNoteText]     = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [projRes, candRes, notesRes] = await Promise.all([
        projectsApi.getById(id),
        projectsApi.getCandidates(id),
        projectsApi.getNotes(id),
      ]);
      setProject(projRes.project);
      setCandidates(candRes.candidates);
      setNotes(notesRes.notes);
    } catch {
      setError('Project not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleRemove(candidateId: string) {
    setRemovingId(candidateId);
    try {
      await projectsApi.removeCandidate(id, candidateId);
      setCandidates((prev) => prev.filter((c) => c.candidateId !== candidateId));
      showToast('Candidate removed from project', 'success');
    } catch {
      showToast('Failed to remove candidate', 'error');
    } finally {
      setRemovingId(null);
      setDeleteConfirm(null);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const res = await projectsApi.createNote(id, noteText.trim());
      setNotes((prev) => [res.note, ...prev]);
      setNoteText('');
      showToast('Note added', 'success');
    } catch {
      showToast('Failed to add note', 'error');
    } finally {
      setSavingNote(false);
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const filteredCandidates = candidates.filter((c) =>
    c.candidateName.toLowerCase().includes(search.toLowerCase()) ||
    c.candidateEmail.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-[var(--color-text-muted)]" />
    </div>
  );

  if (error || !project) return (
    <div className="p-8">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-6">
        <ArrowLeft size={14} /> Back to Projects
      </button>
      <p className="text-sm text-red-600">{error || 'Project not found.'}</p>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6">
        <ArrowLeft size={14} /> Back to Projects
      </button>

      {/* Header */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-[var(--color-text-muted)] mt-1">{project.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <Users size={12} /> {project.candidateCount} candidate{project.candidateCount !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">Created {fmtDate(project.createdAt)}</span>
              {project.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={13} /> Add Candidate
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-[var(--color-border)]">
        {([
          { id: 'candidates', label: `Candidates (${project.candidateCount})` },
          { id: 'notes',      label: `Notes (${notes.length})` },
          { id: 'activity',   label: 'Activity' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Candidates Tab */}
      {activeTab === 'candidates' && (
        <div>
          <div className="relative mb-4 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidates…"
              className="w-full h-9 pl-8 pr-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          {filteredCandidates.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-10">
                <Users size={28} className="text-[var(--color-text-muted)] mx-auto mb-3" />
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">No candidates yet</p>
                <p className="text-xs text-[var(--color-text-muted)] mb-4">Add candidates to start building this talent pool.</p>
                <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
                  <Plus size={13} /> Add Candidate
                </Button>
              </div>
            </Card>
          ) : (
            <Card padding="lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left text-xs font-semibold text-[var(--color-text-muted)] pb-3 pr-4">Candidate</th>
                      <th className="text-left text-xs font-semibold text-[var(--color-text-muted)] pb-3 pr-4">Skills</th>
                      <th className="text-left text-xs font-semibold text-[var(--color-text-muted)] pb-3 pr-4">Added By</th>
                      <th className="text-left text-xs font-semibold text-[var(--color-text-muted)] pb-3 pr-4">Date Added</th>
                      <th className="pb-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {filteredCandidates.map((c) => (
                      <tr key={c.id} className="group">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={c.candidateName} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-[var(--color-text-primary)]">{c.candidateName}</p>
                              <p className="text-xs text-[var(--color-text-muted)]">{c.candidateEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {c.candidateSkills.slice(0, 3).map((s) => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[var(--color-text-muted)]">
                                {s}
                              </span>
                            ))}
                            {c.candidateSkills.length > 3 && (
                              <span className="text-[10px] text-[var(--color-text-muted)]">+{c.candidateSkills.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-[var(--color-text-muted)]">{c.addedByName}</td>
                        <td className="py-3 pr-4 text-xs text-[var(--color-text-muted)]">{fmtDate(c.addedAt)}</td>
                        <td className="py-3">
                          {deleteConfirm === c.candidateId ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRemove(c.candidateId)}
                                disabled={removingId === c.candidateId}
                                className="text-xs text-red-600 font-medium hover:underline"
                              >
                                {removingId === c.candidateId ? 'Removing…' : 'Confirm'}
                              </button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs text-[var(--color-text-muted)] hover:underline">Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(c.candidateId)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <Card padding="lg">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a project-level note visible to your team…"
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 mb-3"
            />
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={handleAddNote} disabled={!noteText.trim() || savingNote}>
                {savingNote ? <Loader2 size={13} className="animate-spin" /> : null}
                Add Note
              </Button>
            </div>
          </Card>
          {notes.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-6">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <Card key={note.id} padding="lg">
                <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-3">{fmtDate(note.createdAt)}</p>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <Card padding="lg">
          {candidates.length === 0 && notes.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No activity yet.</p>
          ) : (
            <div className="space-y-0">
              {[
                ...candidates.map((c) => ({
                  date: c.addedAt,
                  label: `${c.candidateName} added to project`,
                  icon: Users,
                  detail: `by ${c.addedByName}`,
                })),
                ...notes.map((n) => ({
                  date: n.createdAt,
                  label: 'Note added',
                  icon: MessageSquare,
                  detail: n.content.slice(0, 60) + (n.content.length > 60 ? '…' : ''),
                })),
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item, idx, arr) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                          <Icon size={13} className="text-[var(--color-text-muted)]" />
                        </div>
                        {idx < arr.length - 1 && <div className="w-px flex-1 bg-[var(--color-border)] my-1" style={{ minHeight: 24 }} />}
                      </div>
                      <div className="pb-5 flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.label}</p>
                        {item.detail && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{item.detail}</p>}
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">{fmtDate(item.date)}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      )}

      {addOpen && (
        <AddCandidateModal
          projectId={id}
          existing={candidates.map((c) => c.candidateId)}
          onAdded={(c) => {
            setCandidates((prev) => [c, ...prev]);
            setProject((p) => p ? { ...p, candidateCount: p.candidateCount + 1 } : p);
          }}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
