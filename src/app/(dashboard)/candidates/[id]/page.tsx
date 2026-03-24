'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, MapPin, Linkedin, Calendar,
  Briefcase, Award, FileText, Loader2, Star, Clock,
  MessageSquare, Activity, ChevronRight, X, Check,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { candidatesApi, applicationsApi, type CandidateDetailDto } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type { BadgeVariant } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  new:       { label: 'New',          variant: 'info' },
  screening: { label: 'Screening',    variant: 'default' },
  interview: { label: 'Interview',    variant: 'warning' },
  offer:     { label: 'Offer',        variant: 'success' },
  hired:     { label: 'Hired',        variant: 'success' },
  rejected:  { label: 'Rejected',     variant: 'error' },
};

const STAGE_ORDER = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'];

const OFFER_STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  draft:    { label: 'Draft',    variant: 'default' },
  sent:     { label: 'Sent',     variant: 'info' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
  expired:  { label: 'Expired',  variant: 'error' },
};

const INTERVIEW_STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  scheduled:  { label: 'Scheduled',  variant: 'info' },
  completed:  { label: 'Completed',  variant: 'success' },
  cancelled:  { label: 'Cancelled',  variant: 'error' },
  no_show:    { label: 'No Show',    variant: 'error' },
};

type Tab = 'overview' | 'applications' | 'interviews' | 'notes' | 'activity';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',      label: 'Overview' },
  { id: 'applications',  label: 'Applications' },
  { id: 'interviews',    label: 'Interviews' },
  { id: 'notes',         label: 'Notes' },
  { id: 'activity',      label: 'Activity' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function formatSalary(salary: string, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(salary));
}

// ─── Move Stage Modal ─────────────────────────────────────────────────────────

interface MoveStageModalProps {
  appId: string;
  currentStatus: string;
  jobTitle: string;
  onClose: () => void;
  onMoved: (appId: string, newStatus: string) => void;
}

function MoveStageModal({ appId, currentStatus, jobTitle, onClose, onMoved }: MoveStageModalProps) {
  const { showToast } = useToast();
  const [selected, setSelected] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (selected === currentStatus) { onClose(); return; }
    setSaving(true);
    try {
      await applicationsApi.updateStage(appId, selected);
      onMoved(appId, selected);
      showToast('Stage updated successfully', 'success');
      onClose();
    } catch {
      showToast('Failed to update stage', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Move Stage</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">{jobTitle}</p>
        <div className="space-y-2 mb-6">
          {STAGE_ORDER.map((stage) => {
            const cfg = STATUS_CONFIG[stage];
            const isCurrent = stage === currentStatus;
            const isSelected = stage === selected;
            return (
              <button
                key={stage}
                onClick={() => setSelected(stage)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-text-primary)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-[var(--color-text-secondary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isSelected ? (
                    <div className="w-4 h-4 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--color-border)]" />
                  )}
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
                {isCurrent && (
                  <span className="text-xs text-[var(--color-text-muted)]">current</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ candidate }: { candidate: CandidateDetailDto }) {
  const latestApp = candidate.applications[0];
  return (
    <div className="space-y-5">
      {/* Contact info */}
      <Card padding="lg">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
              <Mail size={14} className="text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Email</p>
              <a href={`mailto:${candidate.email}`} className="text-sm text-blue-600 hover:underline">{candidate.email}</a>
            </div>
          </div>
          {candidate.phone && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                <Phone size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Phone</p>
                <p className="text-sm text-[var(--color-text-primary)]">{candidate.phone}</p>
              </div>
            </div>
          )}
          {candidate.location && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                <MapPin size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Location</p>
                <p className="text-sm text-[var(--color-text-primary)]">{candidate.location}</p>
              </div>
            </div>
          )}
          {candidate.linkedInUrl && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                <Linkedin size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">LinkedIn</p>
                <a href={candidate.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  View Profile <ChevronRight size={11} />
                </a>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Skills */}
      {candidate.skills.length > 0 && (
        <Card padding="lg">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {candidate.skills.map((skill) => (
              <span key={skill} className="px-3 py-1.5 text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)]">
                {skill}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Source & meta */}
      <Card padding="lg">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Source</p>
            <p className="text-[var(--color-text-primary)] capitalize">{candidate.source}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Added</p>
            <p className="text-[var(--color-text-primary)]">{formatDate(candidate.createdAt)}</p>
          </div>
          {latestApp && (
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Latest Role</p>
              <p className="text-[var(--color-text-primary)]">{latestApp.jobTitle}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Applications</p>
            <p className="text-[var(--color-text-primary)]">{candidate.applications.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Applications ────────────────────────────────────────────────────────

interface ApplicationsTabProps {
  candidate: CandidateDetailDto;
  onMoveStage: (appId: string, jobTitle: string, currentStatus: string) => void;
}

function ApplicationsTab({ candidate, onMoveStage }: ApplicationsTabProps) {
  if (candidate.applications.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No applications yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {candidate.applications.map((app) => {
        const statusCfg = STATUS_CONFIG[app.status] ?? { label: app.status, variant: 'default' as BadgeVariant };
        return (
          <Card key={app.id} padding="lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <Briefcase size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{app.jobTitle}</h3>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] ml-[22px]">
                  {app.jobDepartment} · {app.jobLocation}
                </p>
                {app.stage && (
                  <p className="text-xs text-[var(--color-text-muted)] ml-[22px] mt-0.5">Stage: {app.stage}</p>
                )}
                <div className="flex items-center gap-4 mt-3 ml-[22px] text-xs text-[var(--color-text-muted)]">
                  <span>Applied {formatDate(app.appliedAt)}</span>
                  <span>Updated {formatDate(app.lastUpdated)}</span>
                  {app.interviews.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {app.interviews.length} interview{app.interviews.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onMoveStage(app.id, app.jobTitle, app.status)}
                className="flex-shrink-0 text-xs text-[var(--color-primary)] hover:underline font-medium"
              >
                Move stage
              </button>
            </div>

            {/* Offer inline */}
            {app.offer && (() => {
              const offerCfg = OFFER_STATUS_CONFIG[app.offer!.status] ?? { label: app.offer!.status, variant: 'default' as BadgeVariant };
              return (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">Offer: {formatSalary(app.offer!.salary, app.offer!.currency)}</span>
                  <Badge variant={offerCfg.variant}>{offerCfg.label}</Badge>
                </div>
              );
            })()}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Tab: Interviews ──────────────────────────────────────────────────────────

function InterviewsTab({ candidate }: { candidate: CandidateDetailDto }) {
  const allInterviews = candidate.applications.flatMap((app) =>
    app.interviews.map((iv) => ({ ...iv, jobTitle: app.jobTitle }))
  ).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  if (allInterviews.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No interviews scheduled yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {allInterviews.map((iv) => {
        const statusCfg = INTERVIEW_STATUS_CONFIG[iv.status] ?? { label: iv.status, variant: 'default' as BadgeVariant };
        return (
          <Card key={iv.id} padding="lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)] capitalize">{iv.type} Interview</span>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mb-2">{iv.jobTitle}</p>
                <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                  <span className="flex items-center gap-1"><Calendar size={11} /> {formatDateTime(iv.scheduledAt)}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {iv.duration} min</span>
                  {iv.rating != null && (
                    <span className="flex items-center gap-1"><Star size={11} /> {iv.rating}/5</span>
                  )}
                </div>
                {iv.feedback && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Feedback</p>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{iv.feedback}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Tab: Notes ───────────────────────────────────────────────────────────────

function NotesTab({ candidate, onNotesUpdated }: {
  candidate: CandidateDetailDto;
  onNotesUpdated: (appId: string, notes: string) => void;
}) {
  const { showToast } = useToast();
  const hasApps = candidate.applications.length > 0;
  const [selectedAppId, setSelectedAppId] = useState(candidate.applications[0]?.id ?? '');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedApp = candidate.applications.find((a) => a.id === selectedAppId);

  async function handleSave() {
    if (!noteText.trim() || !selectedAppId) return;
    setSaving(true);
    try {
      const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
      const newNote = selectedApp?.notes
        ? `${selectedApp.notes}\n\n[${timestamp}]\n${noteText.trim()}`
        : `[${timestamp}]\n${noteText.trim()}`;
      await applicationsApi.updateNotes(selectedAppId, newNote);
      onNotesUpdated(selectedAppId, newNote);
      setNoteText('');
      showToast('Note saved', 'success');
    } catch {
      showToast('Failed to save note', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!hasApps) {
    return (
      <Card padding="lg">
        <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No applications to add notes to.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Existing notes */}
      {candidate.applications.some((a) => a.notes) && (
        <div className="space-y-3">
          {candidate.applications.filter((a) => a.notes).map((app) => (
            <Card key={app.id} padding="lg">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={13} className="text-[var(--color-text-muted)]" />
                <span className="text-xs font-semibold text-[var(--color-text-muted)]">{app.jobTitle}</span>
              </div>
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{app.notes}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Add note form */}
      <Card padding="lg">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">Add Note</h3>

        {candidate.applications.length > 1 && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Application</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            >
              {candidate.applications.map((app) => (
                <option key={app.id} value={app.id}>{app.jobTitle}</option>
              ))}
            </select>
          </div>
        )}

        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add an internal note..."
          rows={4}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 resize-none mb-3"
        />
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!noteText.trim() || saving}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Save Note
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Activity ────────────────────────────────────────────────────────────

function ActivityTab({ candidate }: { candidate: CandidateDetailDto }) {
  type ActivityItem = { date: string; label: string; detail?: string; icon: React.ElementType };

  const items: ActivityItem[] = [
    {
      date: candidate.createdAt,
      label: 'Candidate added',
      detail: `Source: ${candidate.source}`,
      icon: Award,
    },
    ...candidate.applications.map((app) => ({
      date: app.appliedAt,
      label: `Applied for ${app.jobTitle}`,
      detail: `${app.jobDepartment} · ${app.jobLocation}`,
      icon: Briefcase,
    })),
    ...candidate.applications.flatMap((app) =>
      app.interviews.map((iv) => ({
        date: iv.scheduledAt,
        label: `${iv.type.charAt(0).toUpperCase() + iv.type.slice(1)} interview scheduled`,
        detail: app.jobTitle,
        icon: Calendar,
      }))
    ),
    ...candidate.applications
      .filter((app) => app.offer?.sentAt)
      .map((app) => ({
        date: app.offer!.sentAt!,
        label: `Offer sent for ${app.jobTitle}`,
        detail: formatSalary(app.offer!.salary, app.offer!.currency),
        icon: FileText,
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card padding="lg">
      {items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No activity recorded yet.</p>
      ) : (
        <div className="space-y-0">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                    <Icon size={13} className="text-[var(--color-text-muted)]" />
                  </div>
                  {idx < items.length - 1 && (
                    <div className="w-px flex-1 bg-[var(--color-border)] my-1" style={{ minHeight: 24 }} />
                  )}
                </div>
                <div className="pb-5 flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.label}</p>
                  {item.detail && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{item.detail}</p>}
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatDateTime(item.date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();

  const [candidate, setCandidate] = useState<CandidateDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Move stage modal
  const [stageModal, setStageModal] = useState<{ appId: string; jobTitle: string; currentStatus: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await candidatesApi.getCandidate(id);
        setCandidate(data.candidate);
      } catch {
        setError('Candidate not found.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  function handleStageUpdated(appId: string, newStatus: string) {
    setCandidate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        applications: prev.applications.map((app) =>
          app.id === appId ? { ...app, status: newStatus } : app
        ),
      };
    });
  }

  function handleNotesUpdated(appId: string, notes: string) {
    setCandidate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        applications: prev.applications.map((app) =>
          app.id === appId ? { ...app, notes } : app
        ),
      };
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to Candidates
        </button>
        <p className="text-sm text-red-600">{error || 'Candidate not found.'}</p>
      </div>
    );
  }

  const fullName = `${candidate.firstName} ${candidate.lastName}`;
  const latestApp = candidate.applications[0];
  const latestStatus = latestApp ? (STATUS_CONFIG[latestApp.status] ?? null) : null;

  return (
    <div className="p-8 max-w-4xl">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back to Candidates
      </button>

      {/* Header */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-start gap-5">
          <Avatar name={fullName} size="lg" />

          <div className="flex-1 min-w-0">
            {/* Name + badge */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{fullName}</h1>
                {latestApp && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{latestApp.jobTitle}</p>
                )}
                {latestStatus && (
                  <Badge variant={latestStatus.variant} className="mt-2">{latestStatus.label}</Badge>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => showToast('Schedule Interview — coming soon', 'info')}
                >
                  <Calendar size={13} /> Schedule Interview
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => showToast('Send Offer — coming soon', 'info')}
                >
                  <FileText size={13} /> Send Offer
                </Button>
                {latestApp && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setStageModal({ appId: latestApp.id, jobTitle: latestApp.jobTitle, currentStatus: latestApp.status })}
                  >
                    <Activity size={13} /> Move Stage
                  </Button>
                )}
              </div>
            </div>

            {/* Contact row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-[var(--color-text-muted)]">
              <a href={`mailto:${candidate.email}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                <Mail size={13} /> {candidate.email}
              </a>
              {candidate.phone && (
                <span className="flex items-center gap-1.5"><Phone size={13} />{candidate.phone}</span>
              )}
              {candidate.location && (
                <span className="flex items-center gap-1.5"><MapPin size={13} />{candidate.location}</span>
              )}
              {candidate.linkedInUrl && (
                <a href={candidate.linkedInUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline">
                  <Linkedin size={13} /> LinkedIn
                </a>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> Added {formatDate(candidate.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-[var(--color-border)]">
        {TABS.map((tab) => (
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
            {tab.id === 'applications' && candidate.applications.length > 0 && (
              <span className="ml-1.5 text-xs bg-[var(--color-surface)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded-full">
                {candidate.applications.length}
              </span>
            )}
            {tab.id === 'interviews' && (() => {
              const total = candidate.applications.reduce((sum, a) => sum + a.interviews.length, 0);
              return total > 0 ? (
                <span className="ml-1.5 text-xs bg-[var(--color-surface)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded-full">
                  {total}
                </span>
              ) : null;
            })()}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab candidate={candidate} />}
      {activeTab === 'applications' && (
        <ApplicationsTab
          candidate={candidate}
          onMoveStage={(appId, jobTitle, currentStatus) =>
            setStageModal({ appId, jobTitle, currentStatus })
          }
        />
      )}
      {activeTab === 'interviews' && <InterviewsTab candidate={candidate} />}
      {activeTab === 'notes' && (
        <NotesTab candidate={candidate} onNotesUpdated={handleNotesUpdated} />
      )}
      {activeTab === 'activity' && <ActivityTab candidate={candidate} />}

      {/* Move Stage Modal */}
      {stageModal && (
        <MoveStageModal
          appId={stageModal.appId}
          currentStatus={stageModal.currentStatus}
          jobTitle={stageModal.jobTitle}
          onClose={() => setStageModal(null)}
          onMoved={handleStageUpdated}
        />
      )}
    </div>
  );
}
