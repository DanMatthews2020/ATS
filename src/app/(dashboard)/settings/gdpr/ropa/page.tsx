'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Loader2, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/Checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts/ToastContext';
import { ropaApi, type RopaEntryDto } from '@/lib/api';
import type { BadgeVariant } from '@/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function reviewBadge(lastReviewedAt: string | null): { variant: BadgeVariant; label: string } {
  if (!lastReviewedAt) return { variant: 'error', label: 'Not reviewed' };
  const monthsAgo = (Date.now() - new Date(lastReviewedAt).getTime()) / (30 * 24 * 60 * 60 * 1000);
  if (monthsAgo > 12) return { variant: 'warning', label: 'Review overdue' };
  return { variant: 'success', label: fmtDate(lastReviewedAt) };
}

// ─── Empty form state ──────────────────────────────────────────────────────

const EMPTY_FORM = {
  processingActivity: '',
  purpose: '',
  legalBasis: '',
  dataCategories: '',
  dataSubjects: '',
  recipients: '',
  retentionPeriod: '',
  securityMeasures: '',
  transfersOutsideEEA: false,
  transferMechanism: '',
};

// ─── Page ──────────────────────────────────────────────────────────────────

export default function RopaPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [entries, setEntries] = useState<RopaEntryDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ropaApi.fetchEntries();
      setEntries(res.entries);
    } catch { showToast('Failed to load entries', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== 'ADMIN' && user?.role !== 'HR') return;
    fetchEntries();
  }, [authLoading, user?.role, fetchEntries]);

  // Auth gate
  if (authLoading) {
    return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" /></div>;
  }
  if (user?.role !== 'ADMIN' && user?.role !== 'HR') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Shield size={48} className="text-[var(--color-text-muted)]" />
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Access Denied</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Only Admin and HR users can view the processing register.</p>
      </div>
    );
  }

  // ─── Form helpers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (entry: RopaEntryDto) => {
    setEditingId(entry.id);
    setForm({
      processingActivity: entry.processingActivity,
      purpose: entry.purpose,
      legalBasis: entry.legalBasis,
      dataCategories: entry.dataCategories.join(', '),
      dataSubjects: entry.dataSubjects,
      recipients: entry.recipients,
      retentionPeriod: entry.retentionPeriod,
      securityMeasures: entry.securityMeasures,
      transfersOutsideEEA: entry.transfersOutsideEEA,
      transferMechanism: entry.transferMechanism ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.processingActivity.trim()) e.processingActivity = 'Required';
    if (!form.purpose.trim()) e.purpose = 'Required';
    if (!form.legalBasis.trim()) e.legalBasis = 'Required';
    if (!form.dataCategories.trim()) e.dataCategories = 'Required';
    if (!form.dataSubjects.trim()) e.dataSubjects = 'Required';
    if (!form.recipients.trim()) e.recipients = 'Required';
    if (!form.retentionPeriod.trim()) e.retentionPeriod = 'Required';
    if (!form.securityMeasures.trim()) e.securityMeasures = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      processingActivity: form.processingActivity.trim(),
      purpose: form.purpose.trim(),
      legalBasis: form.legalBasis.trim(),
      dataCategories: form.dataCategories.split(',').map(s => s.trim()).filter(Boolean),
      dataSubjects: form.dataSubjects.trim(),
      recipients: form.recipients.trim(),
      retentionPeriod: form.retentionPeriod.trim(),
      securityMeasures: form.securityMeasures.trim(),
      transfersOutsideEEA: form.transfersOutsideEEA,
      transferMechanism: form.transferMechanism.trim() || undefined,
    };
    try {
      if (editingId) {
        await ropaApi.updateEntry(editingId, payload);
        showToast('Entry updated', 'success');
      } else {
        await ropaApi.createEntry(payload as Parameters<typeof ropaApi.createEntry>[0]);
        showToast('Entry created', 'success');
      }
      setModalOpen(false);
      await fetchEntries();
    } catch { showToast('Failed to save entry', 'error'); }
    finally { setSaving(false); }
  };

  const handleMarkReviewed = async (id: string) => {
    try {
      await ropaApi.markReviewed(id);
      showToast('Marked as reviewed', 'success');
      await fetchEntries();
    } catch { showToast('Failed to mark as reviewed', 'error'); }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ropa-register-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── Field renderer ────────────────────────────────────────────────────────

  const field = (key: keyof typeof form, label: string, opts?: { multiline?: boolean; disabled?: boolean; hint?: string }) => (
    <div>
      <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">{label}</label>
      {opts?.hint && <p className="text-xs text-[var(--color-text-muted)] mb-1">{opts.hint}</p>}
      {opts?.multiline ? (
        <textarea
          value={form[key] as string}
          onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
          rows={3}
          disabled={opts?.disabled}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none disabled:opacity-50"
        />
      ) : (
        <Input
          value={form[key] as string}
          onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
          disabled={opts?.disabled}
        />
      )}
      {errors[key] && <p className="text-xs text-red-600 mt-1">{errors[key]}</p>}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Records of Processing Activities</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Article 30 GDPR compliance register</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleDownloadJson} disabled={entries.length === 0}>
            <Download size={14} className="mr-1.5" />
            Download JSON
          </Button>
          {user?.role === 'ADMIN' && (
            <Button onClick={openCreate}>
              <Plus size={14} className="mr-1.5" />
              Add Processing Activity
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" /></div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-[var(--color-text-muted)]">
            <Shield size={32} />
            <p className="text-sm">No processing activities registered</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Processing Activity</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Legal Basis</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Data Categories</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Retention</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Last Reviewed</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const rb = reviewBadge(entry.lastReviewedAt);
                  return (
                    <tr key={entry.id} className="hover:bg-[var(--color-surface)] transition-colors border-b border-[var(--color-border)] last:border-b-0">
                      <td className="px-5 py-3 text-sm text-[var(--color-text-primary)] font-medium max-w-[200px] truncate">{entry.processingActivity}</td>
                      <td className="px-5 py-3 text-sm text-[var(--color-text-muted)] max-w-[180px] truncate">{entry.legalBasis}</td>
                      <td className="px-5 py-3 text-sm text-[var(--color-text-muted)]">
                        <div className="flex flex-wrap gap-1">
                          {entry.dataCategories.slice(0, 3).map((c) => (
                            <span key={c} className="inline-block px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-xs">{c}</span>
                          ))}
                          {entry.dataCategories.length > 3 && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]">+{entry.dataCategories.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-[var(--color-text-muted)] max-w-[180px] truncate">{entry.retentionPeriod}</td>
                      <td className="px-5 py-3">
                        <Badge variant={rb.variant}>{rb.label}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          {user?.role === 'ADMIN' && (
                            <Button variant="ghost" size="sm" onClick={() => openEdit(entry)}>Edit</Button>
                          )}
                          <Button variant="secondary" size="sm" onClick={() => handleMarkReviewed(entry.id)}>
                            <Check size={12} className="mr-1" />Reviewed
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <Modal isOpen onClose={() => !saving && setModalOpen(false)} title={editingId ? 'Edit Processing Activity' : 'Add Processing Activity'}>
          <div className="space-y-4">
            {field('processingActivity', 'Processing activity name *')}
            {field('purpose', 'Purpose *')}
            {field('legalBasis', 'Legal basis *')}
            {field('dataCategories', 'Data categories *', { hint: 'Comma-separated: Name, Email, CV content, Interview notes' })}
            {field('dataSubjects', 'Data subjects *')}
            {field('recipients', 'Recipients *')}
            {field('retentionPeriod', 'Retention period *')}
            {field('securityMeasures', 'Security measures *', { multiline: true })}
            <Checkbox
              id="eea-transfer"
              label="Data transferred outside EEA?"
              checked={form.transfersOutsideEEA}
              onChange={(checked) => setForm(prev => ({ ...prev, transfersOutsideEEA: checked }))}
            />
            {field('transferMechanism', 'Transfer mechanism', { disabled: !form.transfersOutsideEEA })}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin mr-1.5" />}
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
