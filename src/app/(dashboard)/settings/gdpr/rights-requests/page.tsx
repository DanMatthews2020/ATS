'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Loader2, FileText, Trash2, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/Checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts/ToastContext';
import { rightsRequestsApi, type RightsRequestDto } from '@/lib/api';
import type { BadgeVariant } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const REQUEST_TYPE_OPTIONS = [
  { value: 'SAR', label: 'Subject Access Request' },
  { value: 'ERASURE', label: 'Erasure' },
  { value: 'PORTABILITY', label: 'Data Portability' },
  { value: 'RECTIFICATION', label: 'Rectification' },
  { value: 'OBJECTION', label: 'Objection' },
];

const TYPE_LABELS: Record<string, string> = {
  SAR: 'Subject Access',
  ERASURE: 'Erasure',
  PORTABILITY: 'Portability',
  RECTIFICATION: 'Rectification',
  OBJECTION: 'Objection',
};

const STATUS_BADGE: Record<string, BadgeVariant> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  FULFILLED: 'success',
  REJECTED: 'default',
  OVERDUE: 'error',
};

type FilterTab = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'OVERDUE' | 'FULFILLED' | 'REJECTED';
const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'FULFILLED', label: 'Fulfilled' },
  { id: 'REJECTED', label: 'Rejected' },
];

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function dueDateClass(dueAt: string, status: string): string {
  if (['FULFILLED', 'REJECTED'].includes(status)) return 'text-[var(--color-text-muted)]';
  const diffMs = new Date(dueAt).getTime() - Date.now();
  const days = diffMs / 86_400_000;
  if (days < 0) return 'text-red-600';
  if (days <= 7) return 'text-amber-600';
  return 'text-[var(--color-text-muted)]';
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RightsRequestsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [requests, setRequests] = useState<RightsRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newType, setNewType] = useState('SAR');
  const [newReceivedAt, setNewReceivedAt] = useState('');
  const [newCandidateId, setNewCandidateId] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Fulfil modal
  const [fulfilTarget, setFulfilTarget] = useState<RightsRequestDto | null>(null);
  const [fulfilNotes, setFulfilNotes] = useState('');
  const [fulfilLoading, setFulfilLoading] = useState(false);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<RightsRequestDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Erasure modal
  const [erasureTarget, setErasureTarget] = useState<RightsRequestDto | null>(null);
  const [erasureChecked, setErasureChecked] = useState(false);
  const [erasureConfirmText, setErasureConfirmText] = useState('');
  const [erasureLoading, setErasureLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params: { status?: string } = {};
      if (activeFilter !== 'ALL') params.status = activeFilter;
      const res = await rightsRequestsApi.fetchAll(params);
      setRequests(res.items);
    } catch { showToast('Failed to load requests', 'error'); } finally { setLoading(false); }
  }, [activeFilter]);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== 'ADMIN' && user?.role !== 'HR') return;
    fetchRequests();
  }, [authLoading, user?.role, fetchRequests]);

  // Auth gate
  if (authLoading) {
    return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" /></div>;
  }
  if (user?.role !== 'ADMIN' && user?.role !== 'HR') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Shield size={48} className="text-[var(--color-text-muted)]" />
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Access Denied</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Only Admin and HR users can view rights requests.</p>
      </div>
    );
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newEmail || !newType || !newReceivedAt) { showToast('Fill all required fields', 'error'); return; }
    if (new Date(newReceivedAt) > new Date()) { showToast('Received date cannot be in the future', 'error'); return; }
    setCreateLoading(true);
    try {
      await rightsRequestsApi.create({
        requesterEmail: newEmail,
        requestType: newType,
        receivedAt: new Date(newReceivedAt).toISOString(),
        candidateId: newCandidateId || undefined,
        notes: newNotes || undefined,
      });
      showToast('Rights request logged', 'success');
      setCreateOpen(false);
      setNewEmail(''); setNewType('SAR'); setNewReceivedAt(''); setNewCandidateId(''); setNewNotes('');
      await fetchRequests();
    } catch { showToast('Failed to create request', 'error'); }
    finally { setCreateLoading(false); }
  };

  const handleMarkInProgress = async (id: string) => {
    try {
      await rightsRequestsApi.update(id, { status: 'IN_PROGRESS' });
      showToast('Marked as in progress', 'success');
      await fetchRequests();
    } catch { showToast('Failed to update', 'error'); }
  };

  const handleFulfilConfirm = async () => {
    if (!fulfilTarget) return;
    setFulfilLoading(true);
    try {
      await rightsRequestsApi.update(fulfilTarget.id, { status: 'FULFILLED', notes: fulfilNotes || undefined });
      showToast('Request marked as fulfilled', 'success');
      setFulfilTarget(null); setFulfilNotes('');
      await fetchRequests();
    } catch { showToast('Failed to fulfil', 'error'); }
    finally { setFulfilLoading(false); }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await rightsRequestsApi.update(rejectTarget.id, { status: 'REJECTED', rejectionReason: rejectReason || undefined });
      showToast('Request rejected', 'success');
      setRejectTarget(null); setRejectReason('');
      await fetchRequests();
    } catch { showToast('Failed to reject', 'error'); }
    finally { setRejectLoading(false); }
  };

  const handleDownloadExport = async (id: string) => {
    try {
      await rightsRequestsApi.downloadExport(id);
      showToast('Export downloaded', 'success');
    } catch { showToast('Failed to download export', 'error'); }
  };

  const handleErasureConfirm = async () => {
    if (!erasureTarget) return;
    setErasureLoading(true);
    try {
      await rightsRequestsApi.fulfilErasure(erasureTarget.id);
      showToast('Candidate data permanently deleted', 'success');
      setErasureTarget(null); setErasureChecked(false); setErasureConfirmText('');
      await fetchRequests();
    } catch { showToast('Failed to complete erasure', 'error'); }
    finally { setErasureLoading(false); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Rights Requests</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            GDPR data subject requests. All requests must be fulfilled within 30 days of receipt.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={14} className="mr-1.5" />
          Log New Request
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeFilter === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" /></div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-[var(--color-text-muted)]">
            <Clock size={32} />
            <p className="text-sm">No rights requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Requester</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Candidate</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Received</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Due Date</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--color-surface)] transition-colors border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-5 py-3 text-sm text-[var(--color-text-primary)]">{r.requesterEmail}</td>
                    <td className="px-5 py-3 text-sm text-[var(--color-text-primary)]">{TYPE_LABELS[r.requestType] ?? r.requestType}</td>
                    <td className="px-5 py-3 text-sm text-[var(--color-text-muted)]">{r.candidateName ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-[var(--color-text-muted)]">{fmtDate(r.receivedAt)}</td>
                    <td className={`px-5 py-3 text-sm font-medium ${dueDateClass(r.dueAt, r.status)}`}>{fmtDate(r.dueAt)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS_BADGE[r.status] ?? 'default'}>{r.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {r.status === 'OPEN' && (
                          <Button variant="ghost" size="sm" onClick={() => handleMarkInProgress(r.id)}>In Progress</Button>
                        )}
                        {['OPEN', 'IN_PROGRESS', 'OVERDUE'].includes(r.status) && r.requestType !== 'ERASURE' && (
                          <Button variant="ghost" size="sm" onClick={() => setFulfilTarget(r)}>
                            <Check size={12} className="mr-1" />Fulfil
                          </Button>
                        )}
                        {['SAR', 'PORTABILITY'].includes(r.requestType) && r.candidateId && (
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadExport(r.id)}>
                            <FileText size={12} className="mr-1" />Export
                          </Button>
                        )}
                        {r.requestType === 'ERASURE' && ['OPEN', 'IN_PROGRESS', 'OVERDUE'].includes(r.status) && r.candidateId && (
                          <Button variant="danger" size="sm" onClick={() => setErasureTarget(r)}>
                            <Trash2 size={12} className="mr-1" />Erase
                          </Button>
                        )}
                        {['OPEN', 'IN_PROGRESS', 'OVERDUE'].includes(r.status) && (
                          <Button variant="ghost" size="sm" onClick={() => setRejectTarget(r)}>
                            <X size={12} className="mr-1" />Reject
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Create Modal ── */}
      {createOpen && (
        <Modal isOpen onClose={() => !createLoading && setCreateOpen(false)} title="Log New Rights Request">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Requester email *</label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="requester@example.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Request type *</label>
              <Select options={REQUEST_TYPE_OPTIONS} value={newType} onChange={setNewType} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Date received *</label>
              <input
                type="date"
                value={newReceivedAt}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewReceivedAt(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Candidate ID (optional)</label>
              <Input value={newCandidateId} onChange={(e) => setNewCandidateId(e.target.value)} placeholder="Paste candidate ID" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Notes (optional)</label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={createLoading}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createLoading}>
                {createLoading && <Loader2 size={14} className="animate-spin mr-1.5" />}
                Log Request
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Fulfil Modal ── */}
      {fulfilTarget && (
        <Modal isOpen onClose={() => !fulfilLoading && setFulfilTarget(null)} title="Mark as Fulfilled">
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-primary)]">
              Mark the {TYPE_LABELS[fulfilTarget.requestType]} request from <strong>{fulfilTarget.requesterEmail}</strong> as fulfilled.
            </p>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Notes (optional)</label>
              <Input value={fulfilNotes} onChange={(e) => setFulfilNotes(e.target.value)} placeholder="Fulfilment notes..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFulfilTarget(null)} disabled={fulfilLoading}>Cancel</Button>
              <Button onClick={handleFulfilConfirm} disabled={fulfilLoading}>
                {fulfilLoading && <Loader2 size={14} className="animate-spin mr-1.5" />}
                Mark Fulfilled
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reject Modal ── */}
      {rejectTarget && (
        <Modal isOpen onClose={() => !rejectLoading && setRejectTarget(null)} title="Reject Request">
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-primary)]">
              Provide a reason for rejecting this request.
            </p>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Rejection reason</label>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejectTarget(null)} disabled={rejectLoading}>Cancel</Button>
              <Button variant="danger" onClick={handleRejectConfirm} disabled={rejectLoading}>
                {rejectLoading && <Loader2 size={14} className="animate-spin mr-1.5" />}
                Reject
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Erasure Modal ── */}
      {erasureTarget && (
        <Modal isOpen onClose={() => !erasureLoading && (setErasureTarget(null), setErasureChecked(false), setErasureConfirmText(''))} title="Permanently Delete Candidate Data">
          <div className="space-y-4">
            <p className="text-sm text-red-600 font-medium">
              This will permanently and irreversibly delete all data for {erasureTarget.candidateName ?? 'this candidate'}.
              This includes personal details, applications, interviews, notes, and all related records.
              This action cannot be undone.
            </p>
            <div>
              <Checkbox
                id="erasure-confirm-checkbox"
                label="I understand this is permanent and irreversible"
                checked={erasureChecked}
                onChange={setErasureChecked}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">
                Type &quot;DELETE&quot; to confirm
              </label>
              <Input
                value={erasureConfirmText}
                onChange={(e) => setErasureConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setErasureTarget(null); setErasureChecked(false); setErasureConfirmText(''); }} disabled={erasureLoading}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleErasureConfirm}
                disabled={erasureLoading || !erasureChecked || erasureConfirmText !== 'DELETE'}
              >
                {erasureLoading && <Loader2 size={14} className="animate-spin mr-1.5" />}
                Delete All Data
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
