'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileCheck, Plus, X, Send, CheckCircle2, XCircle, Clock,
  FileText, DollarSign, Calendar, Building2, Pen, ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { offersApi, type OfferDto, type OfferStatus, type OfferStatsDto } from '@/lib/api';
import type { BadgeVariant } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | OfferStatus;

const STATUS_CONFIG: Record<OfferStatus, { label: string; variant: BadgeVariant; icon: React.ReactNode; color: string }> = {
  draft:    { label: 'Draft',    variant: 'default', icon: <Pen size={11} />,          color: 'text-neutral-600 bg-neutral-100' },
  sent:     { label: 'Sent',     variant: 'info',    icon: <Send size={11} />,          color: 'text-blue-700   bg-blue-50'     },
  accepted: { label: 'Accepted', variant: 'success', icon: <CheckCircle2 size={11} />, color: 'text-emerald-700 bg-emerald-50' },
  rejected: { label: 'Rejected', variant: 'error',   icon: <XCircle size={11} />,      color: 'text-red-700    bg-red-50'      },
  expired:  { label: 'Expired',  variant: 'warning', icon: <Clock size={11} />,        color: 'text-amber-700  bg-amber-50'    },
};

const FILTER_TABS: { id: FilterStatus; label: string }[] = [
  { id: 'all',      label: 'All Offers' },
  { id: 'draft',    label: 'Draft' },
  { id: 'sent',     label: 'Sent' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'expired',  label: 'Expired' },
];

const CURRENCIES = ['GBP', 'USD', 'EUR', 'AUD', 'CAD'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({ open, title, description, confirmLabel, danger, onConfirm, onCancel, loading }: {
  open: boolean; title: string; description: string; confirmLabel: string;
  danger?: boolean; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" isLoading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Offer detail modal ───────────────────────────────────────────────────────

function OfferDetailModal({ offer, onClose, onStatusChange, onSend }: {
  offer: OfferDto;
  onClose: () => void;
  onStatusChange: (id: string, status: OfferStatus) => void;
  onSend: (id: string) => void;
}) {
  const { showToast } = useToast();
  const [confirmSend, setConfirmSend]           = useState(false);
  const [confirmSign, setConfirmSign]           = useState(false);
  const [confirmWithdraw, setConfirmWithdraw]   = useState(false);
  const [acting, setActing]                     = useState(false);

  async function handleSend() {
    setActing(true);
    try {
      await offersApi.send(offer.id);
      onSend(offer.id);
      showToast('Offer sent successfully');
      setConfirmSend(false);
      onClose();
    } catch { showToast('Failed to send offer', 'error'); }
    finally { setActing(false); }
  }

  async function handleWithdraw() {
    setActing(true);
    try {
      await offersApi.updateStatus(offer.id, 'rejected');
      onStatusChange(offer.id, 'rejected');
      showToast('Offer withdrawn');
      setConfirmWithdraw(false);
      onClose();
    } catch { showToast('Failed to withdraw offer', 'error'); }
    finally { setActing(false); }
  }

  async function handleDocuSign() {
    // Simulated integration
    setActing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setActing(false);
    showToast('DocuSign envelope sent for e-signature', 'info');
    setConfirmSign(false);
  }

  async function handleTriggerOnboarding() {
    showToast('Onboarding flow initiated for ' + offer.candidateName, 'success');
  }

  const cfg = STATUS_CONFIG[offer.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-[var(--color-border)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span>
            </div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{offer.candidateName}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">{offer.jobTitle} · {offer.department}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-surface)] rounded-lg">
            <X size={15} className="text-[var(--color-text-muted)]" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Compensation */}
          <div className="bg-[var(--color-primary)] rounded-2xl p-5 text-white">
            <p className="text-xs font-medium opacity-70 mb-1">Total Compensation</p>
            <p className="text-3xl font-bold">{fmtCurrency(offer.salary, offer.currency)}</p>
            <p className="text-xs opacity-70 mt-0.5">per year</p>
            {offer.equity && (
              <p className="text-xs mt-2 opacity-80">Equity: {offer.equity}</p>
            )}
          </div>

          {/* Key dates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--color-surface)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5">Start Date</p>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{fmtDate(offer.startDate)}</p>
            </div>
            <div className="bg-[var(--color-surface)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5">Expiry</p>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{fmtDate(offer.expiryDate)}</p>
            </div>
            <div className="bg-[var(--color-surface)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5">Created</p>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{timeAgo(offer.createdAt)}</p>
            </div>
          </div>

          {/* Benefits */}
          {offer.benefits && (
            <div className="bg-[var(--color-surface)] rounded-xl p-4">
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Benefits Package</p>
              <p className="text-sm text-[var(--color-text-primary)]">{offer.benefits}</p>
            </div>
          )}

          {/* Notes */}
          {offer.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-medium text-amber-700 mb-1">Internal Notes</p>
              <p className="text-sm text-amber-800">{offer.notes}</p>
            </div>
          )}

          {/* Signature */}
          {offer.signatureUrl && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-emerald-700">Document signed</p>
                <p className="text-xs text-emerald-600">e-signature received via DocuSign</p>
              </div>
              <a href={offer.signatureUrl} target="_blank" rel="noreferrer"
                className="text-xs text-emerald-700 hover:underline flex items-center gap-0.5">
                View <ExternalLink size={10} />
              </a>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Timeline</p>
            <div className="space-y-2">
              {[
                { label: 'Created',   time: offer.createdAt, show: true },
                { label: 'Sent',      time: offer.sentAt ?? '', show: !!offer.sentAt },
                { label: 'Responded', time: offer.respondedAt ?? '', show: !!offer.respondedAt },
              ].filter((t) => t.show).map((t) => (
                <div key={t.label} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                  <p className="text-xs text-[var(--color-text-muted)]"><span className="font-medium text-[var(--color-text-primary)]">{t.label}</span> · {fmtDate(t.time)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-wrap gap-2">
          {offer.status === 'draft' && (
            <>
              <Button variant="primary" size="md" onClick={() => setConfirmSend(true)}>
                <Send size={14} /> Send Offer
              </Button>
              <Button variant="secondary" size="md" onClick={() => setConfirmSign(true)}>
                <FileText size={14} /> Send for e-Signature
              </Button>
            </>
          )}
          {offer.status === 'sent' && (
            <>
              <Button variant="secondary" size="md" onClick={() => setConfirmSign(true)}>
                <FileText size={14} /> Send for e-Signature
              </Button>
              <Button variant="danger" size="md" onClick={() => setConfirmWithdraw(true)}>
                <XCircle size={14} /> Withdraw
              </Button>
            </>
          )}
          {offer.status === 'accepted' && !offer.signatureUrl && (
            <Button variant="secondary" size="md" onClick={() => setConfirmSign(true)}>
              <FileText size={14} /> Request e-Signature
            </Button>
          )}
          {offer.status === 'accepted' && (
            <Button variant="primary" size="md" onClick={handleTriggerOnboarding}>
              <CheckCircle2 size={14} /> Trigger Onboarding
            </Button>
          )}
        </div>

        <ConfirmModal open={confirmSend} title="Send offer" description={`Send the ${fmtCurrency(offer.salary, offer.currency)} offer to ${offer.candidateName}? They will be notified by email.`}
          confirmLabel="Send Offer" onConfirm={handleSend} onCancel={() => setConfirmSend(false)} loading={acting} />
        <ConfirmModal open={confirmSign} title="Send for e-signature" description={`Send the offer letter to ${offer.candidateName} via DocuSign for electronic signature.`}
          confirmLabel="Send via DocuSign" onConfirm={handleDocuSign} onCancel={() => setConfirmSign(false)} loading={acting} />
        <ConfirmModal open={confirmWithdraw} title="Withdraw offer" description={`This will withdraw the offer made to ${offer.candidateName}. This action cannot be undone.`}
          confirmLabel="Withdraw" danger onConfirm={handleWithdraw} onCancel={() => setConfirmWithdraw(false)} loading={acting} />
      </div>
    </div>
  );
}

// ─── Create offer modal ───────────────────────────────────────────────────────

function CreateOfferModal({ onClose, onCreated }: { onClose: () => void; onCreated: (o: OfferDto) => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    candidateName: '', candidateId: 'c-new',
    jobTitle: '', jobId: 'j-new', department: '',
    salary: '', currency: 'GBP',
    startDate: '', expiryDate: '',
    equity: '', benefits: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.candidateName.trim()) e.candidateName = 'Candidate name is required';
    if (!form.salary || isNaN(Number(form.salary))) e.salary = 'Valid salary is required';
    if (!form.startDate)   e.startDate   = 'Start date is required';
    if (!form.expiryDate)  e.expiryDate  = 'Expiry date is required';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      const { offer } = await offersApi.create({
        candidateId:   form.candidateId,
        candidateName: form.candidateName,
        jobId:         form.jobId,
        jobTitle:      form.jobTitle,
        department:    form.department,
        salary:        Number(form.salary),
        currency:      form.currency,
        startDate:     form.startDate,
        expiryDate:    form.expiryDate,
        equity:        form.equity || undefined,
        benefits:      form.benefits,
        notes:         form.notes || undefined,
      });
      onCreated(offer);
      showToast('Offer created as draft');
      onClose();
    } catch { showToast('Failed to create offer', 'error'); }
    finally { setSaving(false); }
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Create Offer</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-surface)] rounded-lg">
            <X size={15} className="text-[var(--color-text-muted)]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Candidate name</label>
              <Input value={form.candidateName} onChange={f('candidateName')} placeholder="e.g. Emily Carter" />
              {errors.candidateName && <p className="text-xs text-red-500 mt-1">{errors.candidateName}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Job title</label>
              <Input value={form.jobTitle} onChange={f('jobTitle')} placeholder="e.g. Senior Engineer" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Department</label>
            <Input value={form.department} onChange={f('department')} placeholder="e.g. Engineering" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Annual salary</label>
              <Input value={form.salary} onChange={f('salary')} type="number" placeholder="85000" />
              {errors.salary && <p className="text-xs text-red-500 mt-1">{errors.salary}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Currency</label>
              <select value={form.currency} onChange={f('currency')}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Start date</label>
              <input type="date" value={form.startDate} onChange={f('startDate')}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Expiry date</label>
              <input type="date" value={form.expiryDate} onChange={f('expiryDate')}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
              {errors.expiryDate && <p className="text-xs text-red-500 mt-1">{errors.expiryDate}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Equity <span className="font-normal opacity-60">(optional)</span></label>
            <Input value={form.equity} onChange={f('equity')} placeholder="e.g. 0.05% over 4 years" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Benefits summary</label>
            <textarea value={form.benefits} onChange={f('benefits')} rows={2} placeholder="Private health, 25 days annual leave..."
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Internal notes <span className="font-normal opacity-60">(optional)</span></label>
            <textarea value={form.notes} onChange={f('notes')} rows={2} placeholder="Internal context about this offer..."
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" isLoading={saving} onClick={handleSubmit}>
            <FileCheck size={14} /> Create Offer
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OffersPage() {
  const { showToast } = useToast();
  const [offers, setOffers]             = useState<OfferDto[]>([]);
  const [stats, setStats]               = useState<OfferStatsDto | null>(null);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<FilterStatus>('all');
  const [detailOffer, setDetailOffer]   = useState<OfferDto | null>(null);
  const [createOpen, setCreateOpen]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { offers: o, stats: s } = await offersApi.getAll();
      setOffers(o);
      setStats(s);
    } catch { showToast('Failed to load offers', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? offers : offers.filter((o) => o.status === filter);

  function handleStatusChange(id: string, status: OfferStatus) {
    setOffers((p) => p.map((o) => o.id === id ? { ...o, status } : o));
    if (stats) {
      setStats({ ...stats, [status]: (stats[status] ?? 0) + 1, sent: Math.max(0, stats.sent - 1) });
    }
    if (detailOffer?.id === id) setDetailOffer((o) => o ? { ...o, status } : null);
  }

  function handleSent(id: string) {
    setOffers((p) => p.map((o) => o.id === id ? { ...o, status: 'sent', sentAt: new Date().toISOString() } : o));
    if (detailOffer?.id === id) setDetailOffer((o) => o ? { ...o, status: 'sent', sentAt: new Date().toISOString() } : null);
  }

  function handleCreated(o: OfferDto) {
    setOffers((p) => [o, ...p]);
    if (stats) setStats({ ...stats, total: stats.total + 1, draft: stats.draft + 1 });
  }

  return (
    <div className="p-8 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
            <FileCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">Offers</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Track and manage all candidate offers</p>
          </div>
        </div>
        <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> Create Offer
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Offers',      value: stats?.total ?? '—',          color: 'bg-neutral-100  text-neutral-600',  icon: <FileText size={14} /> },
          { label: 'Pending Response',  value: stats?.sent ?? '—',           color: 'bg-blue-50    text-blue-600',       icon: <Send size={14} /> },
          { label: 'Accepted',          value: stats?.accepted ?? '—',       color: 'bg-emerald-50 text-emerald-600',    icon: <CheckCircle2 size={14} /> },
          { label: 'Acceptance Rate',   value: stats ? `${stats.acceptanceRate}%` : '—', color: 'bg-purple-50 text-purple-600', icon: <DollarSign size={14} /> },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-5">
            <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
        {FILTER_TABS.map((tab) => (
          <button key={tab.id} onClick={() => setFilter(tab.id)}
            className={[
              'px-4 py-2.5 text-sm font-medium transition-colors duration-100 border-b-2 -mb-px outline-none rounded-t',
              filter === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}>
            {tab.label}
            {tab.id !== 'all' && stats && (
              <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                {stats[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Offers table */}
      {loading ? (
        <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--color-border)] last:border-b-0 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-neutral-100 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 bg-neutral-100 rounded" />
                <div className="h-2.5 w-28 bg-neutral-100 rounded" />
              </div>
              <div className="h-6 w-16 bg-neutral-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-12 text-center">
          <FileCheck size={32} className="text-[var(--color-text-muted)] mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-[var(--color-text-muted)]">No offers {filter !== 'all' ? `with status "${filter}"` : 'found'}</p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Candidate', 'Role', 'Salary', 'Start Date', 'Expires', 'Status', 'Created'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">{h}</th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map((offer) => {
                const cfg = STATUS_CONFIG[offer.status];
                return (
                  <tr key={offer.id} className="hover:bg-[var(--color-surface)] transition-colors cursor-pointer" onClick={() => setDetailOffer(offer)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={offer.candidateName} size="sm" />
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{offer.candidateName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-[var(--color-text-primary)]">{offer.jobTitle}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{offer.department}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{fmtCurrency(offer.salary, offer.currency)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-[var(--color-text-muted)]">{fmtDate(offer.startDate)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-[var(--color-text-muted)]">{fmtDate(offer.expiryDate)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-[var(--color-text-muted)]">{timeAgo(offer.createdAt)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <ChevronDown size={14} className="text-[var(--color-text-muted)] rotate-[-90deg]" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detailOffer && (
        <OfferDetailModal
          offer={detailOffer}
          onClose={() => setDetailOffer(null)}
          onStatusChange={handleStatusChange}
          onSend={handleSent}
        />
      )}
      {createOpen && <CreateOfferModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}
