'use client';

import { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import { rejectionReasonsApi, ApiError, type RejectionReasonDto } from '@/lib/api';

export default function RejectionReasonsPage() {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'HR'].includes(user?.role ?? '');
  const { showToast } = useToast();

  // ── List state ──────────────────────────────────────────────────────────────
  const [reasons, setReasons] = useState<RejectionReasonDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Add form state ──────────────────────────────────────────────────────────
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [labelError, setLabelError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // ── Inline edit state ───────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLabelError, setEditLabelError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ── Delete modal state ──────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<RejectionReasonDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch reasons ───────────────────────────────────────────────────────────
  const fetchReasons = async () => {
    try {
      const data = await rejectionReasonsApi.fetchAll();
      setReasons(data);
    } catch {
      showToast('Failed to load rejection reasons', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReasons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Add handler ─────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    if (trimmed.length < 2) {
      setLabelError('Label must be at least 2 characters');
      return;
    }
    setLabelError('');
    setIsAdding(true);
    try {
      await rejectionReasonsApi.create({
        label: trimmed,
        description: newDescription.trim() || undefined,
      });
      setNewLabel('');
      setNewDescription('');
      showToast('Rejection reason added', 'success');
      await fetchReasons();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setLabelError('A rejection reason with this label already exists');
      } else {
        showToast('Failed to add rejection reason', 'error');
      }
    } finally {
      setIsAdding(false);
    }
  };

  // ── Edit handlers ───────────────────────────────────────────────────────────
  const startEdit = (reason: RejectionReasonDto) => {
    setEditingId(reason.id);
    setEditLabel(reason.label);
    setEditDescription(reason.description ?? '');
    setEditLabelError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabelError('');
  };

  const handleSave = async () => {
    if (!editingId) return;
    const trimmed = editLabel.trim();
    if (!trimmed) {
      setEditLabelError('Label is required');
      return;
    }
    if (trimmed.length < 2) {
      setEditLabelError('Label must be at least 2 characters');
      return;
    }
    setEditLabelError('');
    setIsSaving(true);
    try {
      await rejectionReasonsApi.update(editingId, {
        label: trimmed,
        description: editDescription.trim() || undefined,
      });
      setEditingId(null);
      showToast('Rejection reason updated', 'success');
      await fetchReasons();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setEditLabelError('A rejection reason with this label already exists');
      } else {
        showToast('Failed to update rejection reason', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete handler ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await rejectionReasonsApi.remove(deleteTarget.id);
      setReasons((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      showToast('Rejection reason removed', 'success');
      setDeleteTarget(null);
    } catch {
      showToast('Failed to remove rejection reason', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const activeCount = reasons.filter((r) => r.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Rejection Reasons</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Manage the reasons shown when rejecting a candidate. These appear as options in the reject dropdown on candidate profiles.
        </p>
      </div>

      {!canManage && (
        <p className="text-sm text-gray-500">Contact your administrator to add or edit rejection reasons.</p>
      )}

      {/* Add form */}
      {canManage && (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 space-y-3">
          <Input
            label="Reason label"
            placeholder="e.g. Failed interview"
            maxLength={100}
            value={newLabel}
            onChange={(e) => { setNewLabel(e.target.value); setLabelError(''); }}
            error={labelError}
          />
          <Input
            label="Description (optional)"
            hint="Shown as a hint when selecting this reason"
            multiline
            rows={2}
            maxLength={300}
            value={newDescription}
            onChange={(e) => setNewDescription((e.target as unknown as HTMLTextAreaElement).value)}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleAdd}
            isLoading={isAdding}
            disabled={newLabel.trim() === ''}
          >
            Add Reason
          </Button>
        </div>
      )}

      {/* List */}
      <div>
        {isLoading ? (
          <>
            <div className="animate-pulse h-12 bg-gray-100 rounded mb-2" />
            <div className="animate-pulse h-12 bg-gray-100 rounded mb-2" />
            <div className="animate-pulse h-12 bg-gray-100 rounded mb-2" />
            <div className="animate-pulse h-12 bg-gray-100 rounded mb-2" />
          </>
        ) : reasons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
            <XCircle size={40} strokeWidth={1.5} className="mb-3 opacity-40" />
            <p className="text-sm">No rejection reasons configured. Add one above.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-white overflow-hidden">
            {reasons.map((reason) => (
              <div
                key={reason.id}
                className="border-b border-[var(--color-border)] last:border-b-0 px-4 py-3 transition-colors hover:bg-gray-50/50"
              >
                {editingId === reason.id ? (
                  /* ── Inline edit form ──────────────────────────────────────── */
                  <div className="space-y-3">
                    <Input
                      label="Reason label"
                      maxLength={100}
                      value={editLabel}
                      onChange={(e) => { setEditLabel(e.target.value); setEditLabelError(''); }}
                      error={editLabelError}
                    />
                    <Input
                      label="Description (optional)"
                      hint="Shown as a hint when selecting this reason"
                      multiline
                      rows={2}
                      maxLength={300}
                      value={editDescription}
                      onChange={(e) => setEditDescription((e.target as unknown as HTMLTextAreaElement).value)}
                    />
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isSaving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* ── Display row ──────────────────────────────────────────── */
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-text-primary)]">{reason.label}</span>
                        {reason.isDefault && <Badge variant="default">Default</Badge>}
                      </div>
                      {reason.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{reason.description}</p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-2 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(reason)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteTarget(reason)}
                          disabled={reason.isActive && activeCount <= 3}
                          title={reason.isActive && activeCount <= 3 ? 'At least 3 active reasons required' : undefined}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Remove rejection reason"
        description={
          deleteTarget?.isDefault
            ? 'This will disable the reason. Historical rejections using it are unaffected.'
            : 'This reason will be removed from the dropdown. Historical rejections are unaffected.'
        }
        confirmLabel="Remove"
      />
    </div>
  );
}
