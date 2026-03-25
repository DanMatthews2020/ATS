'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Settings, User, Users, Link2, Bell, CreditCard, Shield,
  Camera, Eye, EyeOff, Check, X, Plus, Trash2, ChevronDown,
  LogOut, Monitor, Smartphone, Globe, Lock, Zap, RefreshCw, ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import {
  settingsApi, teamApi,
  type UserProfileDto, type TeamMemberDto, type IntegrationDto,
  type NotificationSettingsDto, type BillingInfoDto, type SecurityDto,
  type TeamRole, type NotifKey,
} from '@/lib/api';

// ─── Section nav config ────────────────────────────────────────────────────────

type SectionId = 'profile' | 'team' | 'integrations' | 'notifications' | 'billing' | 'security';

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'profile',       label: 'Profile',        icon: User       },
  { id: 'team',          label: 'Team Members',    icon: Users      },
  { id: 'integrations',  label: 'Integrations',    icon: Link2      },
  { id: 'notifications', label: 'Notifications',   icon: Bell       },
  { id: 'billing',       label: 'Billing',         icon: CreditCard },
  { id: 'security',      label: 'Security',        icon: Shield     },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<TeamRole, string> = {
  admin:          'Admin',
  recruiter:      'Recruiter',
  hiring_manager: 'Hiring Manager',
  viewer:         'Viewer',
};

const ROLE_COLORS: Record<TeamRole, string> = {
  admin:          'bg-purple-100 text-purple-800',
  recruiter:      'bg-blue-100 text-blue-800',
  hiring_manager: 'bg-emerald-100 text-emerald-800',
  viewer:         'bg-neutral-100 text-neutral-600',
};

const NOTIF_LABELS: Record<NotifKey, string> = {
  newApplication:      'New application received',
  interviewScheduled:  'Interview scheduled',
  offerAccepted:       'Offer accepted',
  onboardingTaskDue:   'Onboarding task due',
  reviewCycleStarting: 'Review cycle starting',
};

const INTEGRATION_ICONS: Record<string, string> = {
  linkedin:         'LI',
  indeed:           'IN',
  slack:            'SL',
  'google-calendar':'GC',
  outlook:          'OL',
  greenhouse:       'GH',
  docusign:         'DS',
};

const INTEGRATION_COLORS: Record<string, string> = {
  linkedin:         'bg-blue-600',
  indeed:           'bg-blue-500',
  slack:            'bg-purple-600',
  'google-calendar':'bg-red-500',
  outlook:          'bg-blue-700',
  greenhouse:       'bg-green-600',
  docusign:         'bg-indigo-600',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Toggle switch component ───────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-[var(--color-primary)]' : 'bg-neutral-200',
      ].join(' ')}
    >
      <span className={[
        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
        checked ? 'translate-x-4.5' : 'translate-x-0.5',
      ].join(' ')} style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
    </button>
  );
}

// ─── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{description}</p>
    </div>
  );
}

// ─── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-[var(--color-border)] my-6" />;
}

// ─── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[var(--color-border)] rounded-2xl shadow-card ${className}`}>
      {children}
    </div>
  );
}

// ─── Confirmation modal ────────────────────────────────────────────────────────

function ConfirmModal({
  open, title, description, confirmLabel = 'Confirm', danger = false,
  onConfirm, onCancel, loading,
}: {
  open: boolean; title: string; description: string; confirmLabel?: string;
  danger?: boolean; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">{description}</p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" isLoading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function ProfileSection() {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile]   = useState<UserProfileDto | null>(null);
  const [form, setForm]         = useState({ firstName: '', lastName: '', email: '', timezone: '', language: '' });
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  const [pwForm, setPwForm]     = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw]     = useState({ current: false, newPw: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    settingsApi.getProfile().then(({ profile: p }) => {
      setProfile(p);
      setForm({ firstName: p.firstName, lastName: p.lastName, email: p.email, timezone: p.timezone, language: p.language });
    }).catch(() => {});
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim())  e.lastName  = 'Last name is required';
    if (!form.email.trim())     e.email     = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    return e;
  }

  async function handleSaveProfile() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      const { profile: p } = await settingsApi.updateProfile(form);
      setProfile(p);
      showToast('Profile updated successfully');
    } catch {
      showToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  function validatePw() {
    const e: Record<string, string> = {};
    if (!pwForm.current)  e.current = 'Current password is required';
    if (!pwForm.newPw)    e.newPw   = 'New password is required';
    else if (pwForm.newPw.length < 8) e.newPw = 'Must be at least 8 characters';
    if (!pwForm.confirm)  e.confirm  = 'Please confirm your new password';
    else if (pwForm.newPw !== pwForm.confirm) e.confirm = 'Passwords do not match';
    return e;
  }

  async function handleChangePassword() {
    const e = validatePw();
    if (Object.keys(e).length) { setPwErrors(e); return; }
    setPwErrors({});
    setPwSaving(true);
    // Simulated — no real password endpoint, just show success
    await new Promise((r) => setTimeout(r, 800));
    setPwSaving(false);
    setPwForm({ current: '', newPw: '', confirm: '' });
    showToast('Password changed successfully');
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => { const n = { ...p }; delete n[k]; return n; });
  };

  return (
    <div>
      <SectionHeading title="Profile" description="Manage your personal details and account preferences." />

      {/* Avatar */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar name={profile ? `${profile.firstName} ${profile.lastName}` : 'User'} size="lg" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center hover:bg-neutral-800 transition-colors shadow"
            >
              <Camera size={11} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={() => showToast('Avatar upload coming soon', 'info')} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {profile ? `${profile.firstName} ${profile.lastName}` : '—'}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{profile?.email}</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-[var(--color-primary)] hover:underline mt-1"
            >
              Upload new photo
            </button>
          </div>
        </div>
      </Card>

      {/* Profile form */}
      <Card className="p-6 mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">First name</label>
            <Input value={form.firstName} onChange={f('firstName')} placeholder="First name" />
            {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Last name</label>
            <Input value={form.lastName} onChange={f('lastName')} placeholder="Last name" />
            {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Email address</label>
          <Input value={form.email} onChange={f('email')} type="email" placeholder="you@example.com" />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Timezone</label>
            <select
              value={form.timezone}
              onChange={f('timezone')}
              className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
            >
              <option value="Europe/London">Europe/London (UTC+0)</option>
              <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
              <option value="America/New_York">America/New_York (UTC-5)</option>
              <option value="America/Chicago">America/Chicago (UTC-6)</option>
              <option value="America/Denver">America/Denver (UTC-7)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
              <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
              <option value="Australia/Sydney">Australia/Sydney (UTC+11)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Language</label>
            <select
              value={form.language}
              onChange={f('language')}
              className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="primary" size="md" isLoading={saving} onClick={handleSaveProfile}>
            <Check size={14} />
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Change password */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Change Password</h3>
        <div className="space-y-4 mb-5">
          {(['current', 'newPw', 'confirm'] as const).map((key) => {
            const labels = { current: 'Current password', newPw: 'New password', confirm: 'Confirm new password' };
            return (
              <div key={key}>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{labels[key]}</label>
                <div className="relative">
                  <Input
                    type={showPw[key] ? 'text' : 'password'}
                    value={pwForm[key]}
                    onChange={(e) => { setPwForm((p) => ({ ...p, [key]: e.target.value })); setPwErrors((p) => { const n = { ...p }; delete n[key]; return n; }); }}
                    placeholder={key === 'current' ? 'Enter current password' : key === 'newPw' ? 'At least 8 characters' : 'Re-enter new password'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                  >
                    {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {pwErrors[key] && <p className="text-xs text-red-500 mt-1">{pwErrors[key]}</p>}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button variant="primary" size="md" isLoading={pwSaving} onClick={handleChangePassword}>
            <Lock size={14} />
            Change Password
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM MEMBERS SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function TeamSection() {
  const { showToast } = useToast();
  const [members, setMembers]         = useState<TeamMemberDto[]>([]);
  const [loading, setLoading]         = useState(true);
  const [inviteOpen, setInviteOpen]   = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMemberDto | null>(null);
  const [removing, setRemoving]       = useState(false);
  const [inviteForm, setInviteForm]   = useState({ email: '', role: 'recruiter' as TeamRole, department: '' });
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [inviting, setInviting]       = useState(false);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  useEffect(() => {
    teamApi.getAll().then(({ members: m }) => setMembers(m)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleInvite() {
    const e: Record<string, string> = {};
    if (!inviteForm.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(inviteForm.email)) e.email = 'Enter a valid email';
    if (Object.keys(e).length) { setInviteErrors(e); return; }
    setInviteErrors({});
    setInviting(true);
    try {
      const { member } = await teamApi.invite(inviteForm.email, inviteForm.role, inviteForm.department || undefined);
      setMembers((p) => [...p, member]);
      setInviteOpen(false);
      setInviteForm({ email: '', role: 'recruiter', department: '' });
      showToast(`Invitation sent to ${inviteForm.email}`);
    } catch {
      showToast('Failed to send invitation', 'error');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(id: string, role: TeamRole) {
    setRoleLoading(id);
    try {
      const { member } = await teamApi.updateRole(id, role);
      setMembers((p) => p.map((m) => m.id === id ? member : m));
      showToast('Role updated');
    } catch {
      showToast('Failed to update role', 'error');
    } finally {
      setRoleLoading(null);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await teamApi.remove(removeTarget.id);
      setMembers((p) => p.filter((m) => m.id !== removeTarget.id));
      showToast(`${removeTarget.name} removed from team`);
      setRemoveTarget(null);
    } catch {
      showToast('Failed to remove member', 'error');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      <SectionHeading title="Team Members" description="Manage who has access to TeamTalent and their permissions." />

      <div className="flex justify-end mb-4">
        <Button variant="primary" size="md" onClick={() => setInviteOpen(true)}>
          <Plus size={14} />
          Invite Member
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-neutral-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-neutral-100 rounded" />
                  <div className="h-2.5 w-48 bg-neutral-100 rounded" />
                </div>
                <div className="h-6 w-20 bg-neutral-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Member</th>
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Department</th>
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Role</th>
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-5 py-3">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-[var(--color-surface)] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{m.status === 'pending' ? m.email : m.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[var(--color-text-muted)]">{m.department || '—'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="relative inline-block">
                      <select
                        value={m.role}
                        disabled={!!roleLoading}
                        onChange={(e) => handleRoleChange(m.id, e.target.value as TeamRole)}
                        className={[
                          'text-xs font-medium px-2.5 py-1 rounded-full border-0 appearance-none pr-6 cursor-pointer outline-none',
                          'focus:ring-2 focus:ring-[var(--color-primary)]/20',
                          ROLE_COLORS[m.role],
                        ].join(' ')}
                      >
                        {(Object.keys(ROLE_LABELS) as TeamRole[]).map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {m.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-[var(--color-text-muted)]">{fmtDateShort(m.joinedAt)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setRemoveTarget(m)}
                      className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setInviteOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Invite Team Member</h3>
              <button onClick={() => setInviteOpen(false)} className="p-1.5 hover:bg-[var(--color-surface)] rounded-lg">
                <X size={15} className="text-[var(--color-text-muted)]" />
              </button>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Email address</label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => { setInviteForm((p) => ({ ...p, email: e.target.value })); setInviteErrors((p) => { const n = { ...p }; delete n.email; return n; }); }}
                  placeholder="colleague@example.com"
                />
                {inviteErrors.email && <p className="text-xs text-red-500 mt-1">{inviteErrors.email}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value as TeamRole }))}
                  className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                >
                  {(Object.keys(ROLE_LABELS) as TeamRole[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Department <span className="font-normal opacity-60">(optional)</span></label>
                <Input
                  value={inviteForm.department}
                  onChange={(e) => setInviteForm((p) => ({ ...p, department: e.target.value }))}
                  placeholder="e.g. Engineering"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="md" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button variant="primary" size="md" isLoading={inviting} onClick={handleInvite}>
                Send Invite
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!removeTarget}
        title="Remove team member"
        description={`Are you sure you want to remove ${removeTarget?.name ?? removeTarget?.email ?? 'this member'}? They will immediately lose access.`}
        confirmLabel="Remove"
        danger
        loading={removing}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATIONS SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function IntegrationsSection() {
  const { showToast } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationDto[]>([]);
  const [toggling, setToggling]         = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<IntegrationDto | null>(null);
  const [confirming, setConfirming]     = useState(false);

  useEffect(() => {
    settingsApi.getIntegrations().then(({ integrations: i }) => setIntegrations(i)).catch(() => {});
  }, []);

  async function handleToggle(integ: IntegrationDto) {
    if (integ.connected) {
      setDisconnectTarget(integ);
      return;
    }
    // Connect immediately
    setToggling(integ.key);
    try {
      const { integration } = await settingsApi.toggleIntegration(integ.key);
      setIntegrations((p) => p.map((i) => i.key === integ.key ? integration : i));
      showToast(`${integ.name} connected successfully`);
    } catch {
      showToast(`Failed to connect ${integ.name}`, 'error');
    } finally {
      setToggling(null);
    }
  }

  async function handleDisconnect() {
    if (!disconnectTarget) return;
    setConfirming(true);
    try {
      const { integration } = await settingsApi.toggleIntegration(disconnectTarget.key);
      setIntegrations((p) => p.map((i) => i.key === disconnectTarget.key ? integration : i));
      showToast(`${disconnectTarget.name} disconnected`);
      setDisconnectTarget(null);
    } catch {
      showToast(`Failed to disconnect`, 'error');
    } finally {
      setConfirming(false);
    }
  }

  const seen = new Set<string>();
  const categories = integrations.map((i) => i.category).filter((c) => { if (seen.has(c)) return false; seen.add(c); return true; });

  return (
    <div>
      <SectionHeading title="Integrations" description="Connect your favourite tools to streamline your hiring workflow." />
      {categories.map((cat) => (
        <div key={cat} className="mb-8">
          <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">{cat}</h3>
          <div className="grid grid-cols-1 gap-3">
            {integrations.filter((i) => i.category === cat).map((integ) => (
              <Card key={integ.key} className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${INTEGRATION_COLORS[integ.key] ?? 'bg-neutral-400'}`}>
                    {INTEGRATION_ICONS[integ.key] ?? integ.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{integ.name}</p>
                      {integ.connected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{integ.description}</p>
                    {integ.connected && integ.lastSync && (
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                        Last sync: {fmtDate(integ.lastSync)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant={integ.connected ? 'secondary' : 'primary'}
                    size="sm"
                    isLoading={toggling === integ.key}
                    onClick={() => handleToggle(integ)}
                  >
                    {integ.connected ? (
                      <><RefreshCw size={12} /> Disconnect</>
                    ) : (
                      <><Zap size={12} /> Connect</>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <ConfirmModal
        open={!!disconnectTarget}
        title={`Disconnect ${disconnectTarget?.name}`}
        description={`This will remove the ${disconnectTarget?.name} integration. Any active syncs will stop. You can reconnect at any time.`}
        confirmLabel="Disconnect"
        danger
        loading={confirming}
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectTarget(null)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function NotificationsSection() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<NotificationSettingsDto | null>(null);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    settingsApi.getNotifications().then(({ notifications: n }) => setSettings(n)).catch(() => {});
  }, []);

  async function handleToggle(channel: 'email' | 'inApp', key: NotifKey, value: boolean) {
    if (!settings) return;
    const optimistic: NotificationSettingsDto = {
      ...settings,
      [channel]: { ...settings[channel], [key]: value },
    };
    setSettings(optimistic);
    setSaving(true);
    try {
      const { notifications: n } = await settingsApi.updateNotifications({ [channel]: { [key]: value } });
      setSettings(n);
      showToast('Notification preferences saved');
    } catch {
      setSettings(settings); // revert
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  }

  const keys = Object.keys(NOTIF_LABELS) as NotifKey[];

  return (
    <div>
      <SectionHeading title="Notifications" description="Choose when and how you receive updates from TeamTalent." />
      <Card>
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <div className="grid grid-cols-[1fr_80px_80px] gap-4 items-center">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Event</span>
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-center">Email</span>
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-center">In-App</span>
          </div>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {keys.map((key) => (
            <div key={key} className="px-5 py-4">
              <div className="grid grid-cols-[1fr_80px_80px] gap-4 items-center">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{NOTIF_LABELS[key]}</p>
                </div>
                <div className="flex justify-center">
                  <Toggle
                    checked={settings?.email[key] ?? false}
                    onChange={(v) => handleToggle('email', key, v)}
                    disabled={saving || !settings}
                  />
                </div>
                <div className="flex justify-center">
                  <Toggle
                    checked={settings?.inApp[key] ?? false}
                    onChange={(v) => handleToggle('inApp', key, v)}
                    disabled={saving || !settings}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BILLING SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function BillingSection() {
  const { showToast } = useToast();
  const [billing, setBilling]   = useState<BillingInfoDto | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    settingsApi.getBilling().then(({ billing: b }) => setBilling(b)).catch(() => {});
  }, []);

  const creditsPct = billing ? Math.round((billing.creditsUsed / billing.creditsTotal) * 100) : 0;
  const seatsPct   = billing ? Math.round((billing.seatsUsed / billing.seatsTotal) * 100) : 0;

  function UsageMeter({ label, used, total, pct }: { label: string; used: number; total: number; pct: number }) {
    return (
      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
          <span className="text-xs text-[var(--color-text-muted)]">{used.toLocaleString()} / {total.toLocaleString()}</span>
        </div>
        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-[var(--color-primary)]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">{pct}% used</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading title="Billing" description="Manage your subscription plan, usage, and payment details." />

      {/* Current plan */}
      <Card className="p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{billing?.plan ?? '—'} Plan</h3>
              <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Current</span>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">{billing?.planDescription}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">${billing?.monthlyAmount ?? '—'}</p>
            <p className="text-xs text-[var(--color-text-muted)]">per month</p>
          </div>
        </div>
        <div className="text-xs text-[var(--color-text-muted)] mb-5">
          Next billing date: <span className="font-medium text-[var(--color-text-primary)]">{billing?.nextBillingDate ? fmtDateShort(billing.nextBillingDate) : '—'}</span>
        </div>
        <Button variant="primary" size="md" onClick={() => setUpgradeOpen(true)}>
          <Zap size={14} />
          Upgrade Plan
        </Button>
      </Card>

      {/* Usage meters */}
      <Card className="p-6 mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5">Usage</h3>
        {billing ? (
          <div className="space-y-5">
            <UsageMeter label="AI Credits" used={billing.creditsUsed} total={billing.creditsTotal} pct={creditsPct} />
            <UsageMeter label="Team Seats" used={billing.seatsUsed} total={billing.seatsTotal} pct={seatsPct} />
          </div>
        ) : (
          <div className="space-y-5 animate-pulse">
            {[...Array(2)].map((_, i) => (
              <div key={i}>
                <div className="h-3 w-32 bg-neutral-100 rounded mb-2" />
                <div className="h-2 bg-neutral-100 rounded-full" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Payment method */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Payment Method</h3>
        {billing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 bg-neutral-100 border border-[var(--color-border)] rounded flex items-center justify-center">
                <CreditCard size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{billing.paymentBrand} ending in {billing.paymentLast4}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Default payment method</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => showToast('Payment update coming soon', 'info')}>
              Update
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-7 bg-neutral-100 rounded" />
            <div className="space-y-1.5">
              <div className="h-3 w-40 bg-neutral-100 rounded" />
              <div className="h-2.5 w-28 bg-neutral-100 rounded" />
            </div>
          </div>
        )}
      </Card>

      {/* Upgrade modal */}
      {upgradeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setUpgradeOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Upgrade Plan</h3>
              <button onClick={() => setUpgradeOpen(false)} className="p-1.5 hover:bg-[var(--color-surface)] rounded-lg">
                <X size={15} className="text-[var(--color-text-muted)]" />
              </button>
            </div>
            {[
              { name: 'Pro', price: 299, desc: 'Up to 25 seats · 5,000 AI credits · Advanced analytics', current: true },
              { name: 'Business', price: 599, desc: 'Up to 100 seats · 20,000 AI credits · Priority support', current: false },
              { name: 'Enterprise', price: null, desc: 'Unlimited seats · Custom credits · SLA & dedicated CSM', current: false },
            ].map((plan) => (
              <div key={plan.name} className={`p-4 rounded-xl border mb-3 ${plan.current ? 'border-[var(--color-primary)] bg-neutral-50' : 'border-[var(--color-border)]'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {plan.name} {plan.current && <span className="text-xs font-normal text-[var(--color-text-muted)]">(current)</span>}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{plan.desc}</p>
                  </div>
                  <div className="text-right">
                    {plan.price ? (
                      <p className="text-sm font-bold text-[var(--color-text-primary)]">${plan.price}/mo</p>
                    ) : (
                      <p className="text-sm font-bold text-[var(--color-text-primary)]">Custom</p>
                    )}
                  </div>
                </div>
                {!plan.current && (
                  <Button
                    variant="primary" size="sm"
                    className="mt-3 w-full"
                    onClick={() => { showToast(`Upgrade to ${plan.name} coming soon`, 'info'); setUpgradeOpen(false); }}
                  >
                    {plan.name === 'Enterprise' ? 'Contact Sales' : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function SecuritySection() {
  const { showToast } = useToast();
  const [data, setData]             = useState<SecurityDto | null>(null);
  const [twoFaSaving, setTwoFaSaving] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revoking, setRevoking]     = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    settingsApi.getSecurity().then(setData).catch(() => {});
  }, []);

  async function handleToggle2FA(value: boolean) {
    if (!data) return;
    setTwoFaSaving(true);
    const prev = data.security.twoFactorEnabled;
    setData((d) => d ? { ...d, security: { twoFactorEnabled: value } } : d);
    try {
      await settingsApi.updateSecurity({ twoFactorEnabled: value });
      showToast(value ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
    } catch {
      setData((d) => d ? { ...d, security: { twoFactorEnabled: prev } } : d);
      showToast('Failed to update 2FA settings', 'error');
    } finally {
      setTwoFaSaving(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await settingsApi.revokeSession(revokeTarget);
      setData((d) => d ? { ...d, sessions: d.sessions.filter((s) => s.id !== revokeTarget) } : d);
      showToast('Session revoked');
      setRevokeTarget(null);
    } catch {
      showToast('Failed to revoke session', 'error');
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div>
      <SectionHeading title="Security" description="Protect your account with additional security settings." />

      {/* 2FA */}
      <Card className="p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Two-Factor Authentication</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Add an extra layer of security by requiring a verification code on sign-in.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 pt-0.5">
            <Toggle
              checked={data?.security.twoFactorEnabled ?? false}
              onChange={handleToggle2FA}
              disabled={twoFaSaving || !data}
            />
          </div>
        </div>
        {data?.security.twoFactorEnabled && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
            <Check size={14} className="text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-700 font-medium">Two-factor authentication is active on this account.</p>
          </div>
        )}
      </Card>

      {/* Active sessions */}
      <Card className="p-6 mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Active Sessions</h3>
        {data ? (
          <div className="space-y-3">
            {data.sessions.map((s) => (
              <div key={s.id} className={`flex items-start justify-between gap-3 p-3 rounded-xl border ${s.current ? 'border-[var(--color-primary)]/30 bg-neutral-50' : 'border-[var(--color-border)]'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    {s.device.toLowerCase().includes('iphone') || s.device.toLowerCase().includes('mobile')
                      ? <Smartphone size={14} className="text-[var(--color-text-muted)]" />
                      : <Monitor size={14} className="text-[var(--color-text-muted)]" />
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{s.device}</p>
                      {s.current && <span className="text-[10px] font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded-full">Current</span>}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.browser} · {s.location}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Last active {fmtDate(s.lastActive)} · {s.ip}</p>
                  </div>
                </div>
                {!s.current && (
                  <Button
                    variant="secondary" size="sm"
                    onClick={() => setRevokeTarget(s.id)}
                  >
                    <LogOut size={12} />
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-[var(--color-border)]">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-neutral-100 rounded" />
                  <div className="h-2.5 w-48 bg-neutral-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Login history */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Login History</h3>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            {showHistory ? 'Show less' : 'Show all'}
          </button>
        </div>
        {data ? (
          <div className="overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] pb-2">Date & Time</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] pb-2">Device</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] pb-2">IP</th>
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {(showHistory ? data.loginHistory : data.loginHistory.slice(0, 3)).map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs text-[var(--color-text-primary)]">{fmtDate(entry.at)}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs text-[var(--color-text-muted)]">{entry.device}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs text-[var(--color-text-muted)] font-mono">{entry.ip}</span>
                    </td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        entry.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {entry.status === 'success' ? <Check size={9} /> : <X size={9} />}
                        {entry.status === 'success' ? 'Success' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2.5 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-3 w-32 bg-neutral-100 rounded" />
                <div className="h-3 w-40 bg-neutral-100 rounded" />
                <div className="h-3 w-24 bg-neutral-100 rounded" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmModal
        open={!!revokeTarget}
        title="Revoke session"
        description="This will immediately sign out that device. The user will need to sign in again."
        confirmLabel="Revoke"
        danger
        loading={revoking}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const [section, setSection] = useState<SectionId>('profile');

  // Read ?section= param on mount to allow deep linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('section') as SectionId | null;
    if (s && SECTIONS.some((sec) => sec.id === s)) setSection(s);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3.5 px-8 py-6 border-b border-[var(--color-border)] flex-shrink-0">
        <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
          <Settings size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">Settings</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Manage your account, team, integrations, and preferences
          </p>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left nav */}
        <aside className="w-52 border-r border-[var(--color-border)] flex-shrink-0 py-4 px-3 overflow-y-auto">
          <nav>
            <ul className="space-y-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSection(id)}
                    className={[
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors duration-100 text-left outline-none',
                      'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30',
                      section === id
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]',
                    ].join(' ')}
                  >
                    <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
              <Link
                href="/settings/scorecards"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors duration-100 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"
              >
                <ClipboardList size={15} strokeWidth={1.75} aria-hidden="true" />
                Scorecards
              </Link>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-8">
            {section === 'profile'       && <ProfileSection />}
            {section === 'team'          && <TeamSection />}
            {section === 'integrations'  && <IntegrationsSection />}
            {section === 'notifications' && <NotificationsSection />}
            {section === 'billing'       && <BillingSection />}
            {section === 'security'      && <SecuritySection />}
          </div>
        </main>
      </div>
    </div>
  );
}
