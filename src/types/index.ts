// ─── Icon ────────────────────────────────────────────────────────────────────

export type IconName =
  | 'LayoutDashboard'
  | 'Search'
  | 'Users'
  | 'Layers'
  | 'Briefcase'
  | 'BarChart2'
  | 'ClipboardList'
  | 'Star'
  | 'FileText'
  | 'Settings'
  | 'Calendar'
  | 'FileCheck'
  | 'Building2'
  | 'Bell'
  | 'FolderOpen'
  | 'Mail';

// ─── Navigation ──────────────────────────────────────────────────────────────

export interface NavChild {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  children?: NavChild[];
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type JobStatus = 'open' | 'closed' | 'draft';
export type JobType = 'full-time' | 'part-time' | 'contract';

export interface Job {
  id: string;
  title: string;
  description: string;
  department: string;
  location: string;
  type: JobType;
  status: JobStatus;
  postedAt: string;
  applicantCount: number;
}

// ─── Candidates ───────────────────────────────────────────────────────────────

export type CandidateStatus =
  | 'new'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected';

export interface Candidate {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  status: CandidateStatus;
  appliedAt: string;
  jobId: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletedReason?: string | null;
  isAnonymised?: boolean;
  anonymisedAt?: string | null;
}

export interface DeletedCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  deletedAt: string;
  deletedReason: string | null;
}

// ─── Candidate Profile (extended, for Candidates page) ───────────────────────

export interface CandidateProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  status: CandidateStatus;
  appliedAt: string;
  jobTitle: string;
  skills: string[];
  experience: string;
  education?: string;
  notes?: string;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export type PipelineStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'technical'
  | 'offer'
  | 'hired';

export interface PipelineCandidate {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  stage: PipelineStage;
  score: number;
  tags: string[];
  appliedAt: string;
  jobId: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
}

export interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface StatCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

// ─── Select option ────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface JobFormData {
  title: string;
  description: string;
  criteria: string;
}

export interface ApplicationStatusEntry {
  id: string;
  jobTitle: string;
  appliedAgo: string;
  candidateName: string;
  candidateId: string;
}

// ─── Privacy & Consent ───────────────────────────────────────────────────────

export type LegalBasis = 'LEGITIMATE_INTERESTS' | 'CONSENT' | 'CONTRACT';

export interface PrivacyUpdatePayload {
  legalBasis?: LegalBasis;
  consentGivenAt?: string;
  consentScope?: string;
  retentionExpiresAt?: string;
  retentionNote?: string;
}

export interface CandidatePrivacy {
  legalBasis: string;
  privacyNoticeSentAt: string | null;
  privacyNoticeSentBy: string | null;
  consentGivenAt: string | null;
  consentScope: string | null;
  retentionExpiresAt: string | null;
  retentionNote: string | null;
}

// ─── People Search ────────────────────────────────────────────────────────────

export interface PersonResult {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  yearsExp: number;
  matchScore: number;
  skills: string[];
  industry: string;
  avatarUrl: string;
  locked?: boolean;
  savedToShortlist?: boolean;
}
