'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, ChevronLeft, ChevronRight, Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { auditLogsApi, type AuditLogEntryDto } from '@/lib/api';
import { getActionLabel } from '@/lib/auditLabels';

const RESOURCE_TYPE_OPTIONS = [
  { value: '', label: 'All resources' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'application', label: 'Application' },
  { value: 'interview', label: 'Interview' },
  { value: 'user', label: 'User' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'candidate.viewed', label: 'Candidate Viewed' },
  { value: 'candidate.created', label: 'Candidate Created' },
  { value: 'candidate.updated', label: 'Candidate Updated' },
  { value: 'candidate.soft_deleted', label: 'Soft Deleted' },
  { value: 'candidate.hard_deleted', label: 'Hard Deleted' },
  { value: 'candidate.restored', label: 'Restored' },
  { value: 'candidate.privacy_notice_sent', label: 'Privacy Notice Sent' },
  { value: 'candidate.privacy_updated', label: 'Privacy Updated' },
  { value: 'cv.uploaded', label: 'CV Uploaded' },
  { value: 'feedback.created', label: 'Feedback Created' },
  { value: 'user.login', label: 'User Login' },
  { value: 'user.logout', label: 'User Logout' },
];

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function roleBadgeVariant(role: string | null): 'default' | 'info' | 'warning' | 'success' {
  if (!role) return 'default';
  if (role === 'ADMIN') return 'warning';
  if (role === 'HR') return 'info';
  return 'default';
}

export default function AuditLogPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  const limit = 25;

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await auditLogsApi.getAll({
        page: p,
        limit,
        action: actionFilter || undefined,
        resourceType: resourceTypeFilter || undefined,
      });
      setEntries(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setPage(res.page);
    } catch {
      // leave empty
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resourceTypeFilter]);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== 'ADMIN' && user?.role !== 'HR') return;
    fetchLogs(1);
  }, [authLoading, user?.role, fetchLogs]);

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
        <p className="text-sm text-[var(--color-text-muted)]">Only Admin and HR users can view the audit log.</p>
      </div>
    );
  }

  const filteredEntries = searchEmail
    ? entries.filter((e) => e.actorEmail?.toLowerCase().includes(searchEmail.toLowerCase()))
    : entries;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Audit Log</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Full history of actions taken across the system. {total > 0 && `${total} entries total.`}
        </p>
      </div>

      {/* Filters */}
      <Card padding="md">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Action</label>
            <Select
              options={ACTION_OPTIONS}
              value={actionFilter}
              onChange={(v) => { setActionFilter(v); }}
            />
          </div>
          <div className="w-48">
            <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Resource type</label>
            <Select
              options={RESOURCE_TYPE_OPTIONS}
              value={resourceTypeFilter}
              onChange={(v) => { setResourceTypeFilter(v); }}
            />
          </div>
          <div className="w-56">
            <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Actor email</label>
            <Input
              placeholder="Filter by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={() => fetchLogs(1)}>
            <Filter size={14} className="mr-1.5" />
            Apply
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-[var(--color-text-muted)]">
            <Shield size={32} />
            <p className="text-sm">No audit entries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Timestamp</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Action</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Resource</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Actor</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[var(--color-surface)] transition-colors border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-5 py-3 text-sm text-[var(--color-text-primary)] whitespace-nowrap">{fmtDateTime(entry.createdAt)}</td>
                    <td className="px-5 py-3 text-sm text-[var(--color-text-primary)]">{getActionLabel(entry.action)}</td>
                    <td className="px-5 py-3 text-sm text-[var(--color-text-muted)]">
                      <span className="font-mono text-xs">{entry.resourceType}/{entry.resourceId.slice(0, 8)}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[var(--color-text-primary)]">{entry.actorEmail ?? '—'}</td>
                    <td className="px-5 py-3">
                      {entry.actorRole ? (
                        <Badge variant={roleBadgeVariant(entry.actorRole)}>{entry.actorRole}</Badge>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--color-text-muted)] font-mono">{entry.ipAddress ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)]">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>
                <ChevronLeft size={14} />
              </Button>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
