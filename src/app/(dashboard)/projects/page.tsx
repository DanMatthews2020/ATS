'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus, Search, FolderOpen, Users, Loader2, X,
  Trash2, Globe, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/contexts/ToastContext';
import { projectsApi, type ProjectDto } from '@/lib/api';

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES = ['talent-pool', 'longlist', 'event', 'campaign', 'custom'] as const;
type ProjectCategory = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  'talent-pool': 'Talent Pool',
  longlist:      'Longlist',
  event:         'Event',
  campaign:      'Campaign',
  custom:        'Custom',
};

const CATEGORY_COLORS: Record<ProjectCategory, string> = {
  'talent-pool': 'bg-blue-50 text-blue-700 border-blue-200',
  longlist:      'bg-purple-50 text-purple-700 border-purple-200',
  event:         'bg-amber-50 text-amber-700 border-amber-200',
  campaign:      'bg-green-50 text-green-700 border-green-200',
  custom:        'bg-neutral-50 text-neutral-600 border-neutral-200',
};

// ─── Create/Edit Project Modal ────────────────────────────────────────────────

interface ProjectFormData {
  name: string;
  description: string;
  category: ProjectCategory;
  visibility: 'PRIVATE' | 'TEAM';
  tags: string;
}

function ProjectModal({ initial, onSaved, onCancel }: {
  initial?: ProjectDto;
  onSaved: (p: ProjectDto) => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<ProjectFormData>({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    category:    (initial?.category   ?? 'talent-pool') as ProjectCategory,
    visibility:  initial?.visibility  ?? 'TEAM',
    tags:        initial?.tags.join(', ') ?? '',
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function handleSave() {
    if (!form.name.trim()) { showToast('Project name is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim() || undefined,
        category:    form.category,
        visibility:  form.visibility,
        tags:        form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      const res = isEdit
        ? await projectsApi.update(initial!.id, payload)
        : await projectsApi.create(payload);
      onSaved(res.project);
      showToast(isEdit ? 'Project updated' : 'Project created', 'success');
    } catch {
      showToast('Failed to save project', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            {isEdit ? 'Edit Project' : 'New Project'}
          </h3>
          <button onClick={onCancel} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface)]">
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Project Name <span className="text-red-500">*</span></label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Senior Engineers Longlist"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Description <span className="opacity-60 font-normal">(optional)</span></label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="Brief description of this project…"
              className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as ProjectCategory }))}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Visibility</label>
              <select
                value={form.visibility}
                onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value as 'PRIVATE' | 'TEAM' }))}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              >
                <option value="TEAM">Team</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Tags <span className="opacity-60 font-normal">(comma-separated)</span></label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="e.g. Berlin, Senior, Engineering"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" isLoading={saving} onClick={handleSave}>
            {isEdit ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Delete Project</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Delete <span className="font-medium text-[var(--color-text-primary)]">"{name}"</span>? All candidates and notes in this project will also be removed. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={onConfirm}>Delete Project</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectDto | null>(null);

  useEffect(() => {
    projectsApi.getAll()
      .then((d) => setProjects(d.projects))
      .catch(() => showToast('Failed to load projects', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(p: ProjectDto) {
    try {
      await projectsApi.delete(p.id);
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
      showToast('Project deleted', 'success');
    } catch {
      showToast('Failed to delete project', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Projects</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Organise candidates into talent pools and shortlists</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> New Project
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="w-full h-9 pl-9 pr-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen size={36} className="text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
            {search ? 'No projects match your search' : 'No projects yet'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mb-5">
            {!search && 'Create your first talent pool or candidate shortlist.'}
          </p>
          {!search && (
            <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
              <Plus size={13} /> Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const cat = project.category as ProjectCategory;
            return (
              <Card key={project.id} padding="lg" className="group hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                    <FolderOpen size={18} className="text-[var(--color-primary)]" />
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); setDeleteTarget(project); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <Link href={`/projects/${project.id}`} className="block">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1 hover:text-[var(--color-primary)] transition-colors line-clamp-2">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-[var(--color-text-muted)] mb-3 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.custom}`}>
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                      {project.visibility === 'TEAM' ? <Globe size={10} /> : <Lock size={10} />}
                      {project.visibility === 'TEAM' ? 'Team' : 'Private'}
                    </span>
                  </div>
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)]">
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="text-[10px] text-[var(--color-text-muted)]">+{project.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-3 border-t border-[var(--color-border)]">
                    <span className="flex items-center gap-1"><Users size={11} /> {project.candidateCount} candidate{project.candidateCount !== 1 ? 's' : ''}</span>
                    <span>{fmtDate(project.createdAt)}</span>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <ProjectModal
          onSaved={(p) => { setProjects((prev) => [p, ...prev]); setModalOpen(false); }}
          onCancel={() => setModalOpen(false)}
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
