'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Shield, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts/ToastContext';
import { retentionApi, type RetentionCandidateDto } from '@/lib/api';

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DataRetentionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [candidates, setCandidates] = useState<RetentionCandidateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [anonymiseTarget, setAnonymiseTarget] = useState<RetentionCandidateDto | null>(null);
  const [anonymiseLoading, setAnonymiseLoading] = useState(false);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await retentionApi.fetchCandidates();
      setCandidates(res.items);
    } catch {
      // leave empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== 'ADMIN' && user?.role !== 'HR') return;
    fetchCandidates();
  }, [authLoading, user?.role, fetchCandidates]);

  const handleRunReview = async () => {
    setReviewLoading(true);
    try {
      const summary = await retentionApi.runReview();
      showToast(
        `Review complete: ${summary.processed} processed, ${summary.expiringSoon} expiring soon, ${summary.expired} expired`,
        'success',
      );
      await fetchCandidates();
    } catch {
      showToast('Failed to run retention review', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAnonymise = async () => {
    if (!anonymiseTarget) return;
    setAnonymiseLoading(true);
    try {
      await retentionApi.anonymise(anonymiseTarget.id);
      showToast(`${anonymiseTarget.firstName} ${anonymiseTarget.lastName} has been anonymised`, 'success');
      setCandidates((prev) => prev.filter((c) => c.id !== anonymiseTarget.id));
      setAnonymiseTarget(null);
    } catch {
      showToast('Failed to anonymise candidate', 'error');
    } finally {
      setAnonymiseLoading(false);
    }
  };

  // Auth gate
  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'HR') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Shield size={48} className="text-[var(--color-text-muted)]" />
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Access Denied</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Only Admin and HR users can view data retention settings.</p>
      </div>
    );
  }

  const expiringSoonCount = candidates.filter((c) => c.retentionStatus === 'EXPIRING_SOON').length;
  const expiredCount = candidates.filter((c) => c.retentionStatus === 'EXPIRED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Data Retention</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Manage candidate data retention policies and anonymisation.
          </p>
        </div>
        <Button variant="secondary" onClick={handleRunReview} disabled={reviewLoading}>
          {reviewLoading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <RefreshCw size={14} className="mr-1.5" />}
          Run Retention Review
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{expiringSoonCount}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Expiring Soon</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Clock size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{expiredCount}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Overdue for Deletion</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-[var(--color-text-muted)]">
            <Clock size={32} />
            <p className="text-sm">No candidates require retention action</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Candidate</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Retention Expires</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Last Activity</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--color-surface)] transition-colors border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">{c.email ?? 'No email'}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={c.retentionStatus === 'EXPIRED' ? 'error' : 'warning'}>
                        {c.retentionStatus === 'EXPIRED' ? 'Expired' : 'Expiring Soon'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-[var(--color-text-muted)]">
                      {c.retentionLabel}
                    </td>
                    <td className="px-5 py-3 text-sm text-[var(--color-text-muted)]">
                      {fmtDate(c.lastActivityAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setAnonymiseTarget(c)}
                        >
                          Anonymise
                        </Button>
                        {!c.isAnonymised && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/candidates/${c.id}`)}
                          >
                            View Profile
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

      {/* Anonymise confirmation modal */}
      {anonymiseTarget && (
        <Modal
          isOpen={true}
          onClose={() => { if (!anonymiseLoading) setAnonymiseTarget(null); }}
          title="Anonymise Candidate Data"
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-primary)]">
              This will permanently remove <strong>{anonymiseTarget.firstName} {anonymiseTarget.lastName}</strong>&apos;s
              personal details, CV, and interview notes. Pipeline history and outcomes are retained.
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setAnonymiseTarget(null)}
                disabled={anonymiseLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleAnonymise}
                disabled={anonymiseLoading}
              >
                {anonymiseLoading && <Loader2 size={14} className="animate-spin mr-1.5" />}
                Anonymise
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
