/**
 * @file api.ts
 * @description Centralised HTTP client for all backend communication.
 *
 * Features:
 *  - Sends `credentials: 'include'` on every request so httpOnly cookies
 *    are forwarded automatically by the browser
 *  - On a 401 response, attempts a silent token refresh then retries the
 *    original request once before throwing SESSION_EXPIRED
 *  - Throws a typed `ApiError` for all non-2xx responses
 *  - Typed API modules (authApi, dashboardApi, jobsApi, candidatesApi)
 *    provide a clean interface for each domain
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

type FetchOptions = Omit<RequestInit, 'body'> & { body?: unknown };

const REQUEST_TIMEOUT_MS = 30_000;

function withTimeout(signal?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // If the caller supplied their own signal, abort on that too
  signal?.addEventListener('abort', () => controller.abort());
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { body, ...rest } = options;
  const { signal, cleanup } = withTimeout(rest.signal as AbortSignal | undefined);

  const init: RequestInit = {
    ...rest,
    signal,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(rest.headers ?? {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, init);
  } catch (err) {
    cleanup();
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(408, 'Request timed out. The server may be starting up — please try again.', 'TIMEOUT');
    }
    throw err;
  }
  cleanup();

  // ── Auto-refresh on 401 ──────────────────────────────────────────────────
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const { signal: retrySignal, cleanup: retryCleanup } = withTimeout();
      const retry = await fetch(`${BASE_URL}${endpoint}`, { ...init, signal: retrySignal }).finally(retryCleanup);
      if (!retry.ok) {
        const errData = await retry.json().catch(() => null);
        throw new ApiError(retry.status, errData?.error?.message ?? 'Request failed', errData?.error?.code);
      }
      const retryData = await retry.json();
      return retryData.data as T;
    }
    // Refresh failed — caller must redirect to login
    throw new ApiError(401, 'Session expired. Please log in again.', 'SESSION_EXPIRED');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      errData?.error?.message ?? 'Request failed',
      errData?.error?.code,
    );
  }

  const data = await response.json();
  return data.data as T;
}

// ── Multipart upload (FormData) — does NOT set Content-Type, lets browser add boundary ──

async function uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
  // Uploads get a longer timeout (60 s) for large files
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  const baseInit = { method: 'POST', credentials: 'include' as const, body: formData, signal: controller.signal };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, baseInit);
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(408, 'Upload timed out. Please try again.', 'TIMEOUT');
    }
    throw err;
  }
  clearTimeout(timer);

  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retry = await fetch(`${BASE_URL}${endpoint}`, { method: 'POST', credentials: 'include', body: formData });
      if (!retry.ok) {
        const errData = await retry.json().catch(() => null);
        throw new ApiError(retry.status, errData?.error?.message ?? 'Upload failed', errData?.error?.code);
      }
      return ((await retry.json()).data) as T;
    }
    throw new ApiError(401, 'Session expired. Please log in again.', 'SESSION_EXPIRED');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new ApiError(response.status, errData?.error?.message ?? 'Upload failed', errData?.error?.code);
  }

  return ((await response.json()).data) as T;
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Convenience methods ───────────────────────────────────────────────────────

export const api = {
  get:    <T>(url: string, opts?: FetchOptions) =>
    request<T>(url, { ...opts, method: 'GET' }),
  post:   <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(url, { ...opts, method: 'POST', body }),
  put:    <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(url, { ...opts, method: 'PUT', body }),
  patch:  <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(url, { ...opts, method: 'PATCH', body }),
  delete: <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(url, { ...opts, method: 'DELETE', ...(body !== undefined ? { body } : {}) }),
};

// ─── Typed API methods ────────────────────────────────────────────────────────

// Auth
export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl: string | null;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: ApiUser }>('/auth/login', { email, password }),
  logout: () =>
    api.post<{ message: string }>('/auth/logout'),
  getMe: () =>
    api.get<{ user: ApiUser }>('/auth/me'),
  getGoogleUrl: (state?: string) =>
    api.get<{ url: string }>(`/auth/google/url${state ? `?state=${encodeURIComponent(state)}` : ''}`),
  getGoogleStatus: () =>
    api.get<{ configured: boolean }>('/auth/google/status'),
};

// Dashboard
export interface DashboardStats {
  openPositions: number;
  activeCandidates: number;
  interviewsScheduled: number;
  offersSent: number;
}

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
};

// Jobs
export interface JobListingDto {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;   // 'full-time' | 'part-time' | 'contract'
  status: string; // 'open' | 'closed' | 'draft' | 'on-hold'
  description: string;
  applicantCount: number;
  postedAt: string;
}

export interface JobApplicantDto {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  stage: string | null;
  appliedAt: string;
  lastUpdated: string;
  interviewCount: number;
  offerStatus: string | null;
}

export interface JobDetailDto extends JobListingDto {
  requirements?: string;
  salaryMin?: number;
  salaryMax?: number;
  createdByName: string;
  createdAt: string;
  applications: JobApplicantDto[];
}

export interface JobStatsDto {
  openPositions: number;
  totalApplicants: number;
  interviewsThisWeek: number;
  offersExtended: number;
}

export interface JobPipelineStageCounts {
  leads: number;
  applicationReview: number;
  active: number;
  pendingOffer: number;
  hired: number;
  archived: number;
}

export type JobPipelineStatsDto = Record<string, JobPipelineStageCounts>;

export interface PipelineApplicationDto {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  candidateLocation: string | null;
  cvUrl: string | null;
  source: string;
  status: string;
  stage: string | null;
  notes: string | null;
  appliedAt: string;
  lastUpdated: string;
  skills: string[];
  interviewCount: number;
  interviewRatings: (number | null)[];
  offerStatus: string | null;
  score: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const jobsApi = {
  getStats: () =>
    api.get<JobStatsDto>('/jobs/stats'),
  getJobs: (page = 1, limit = 20, status?: string) =>
    api.get<PaginatedResponse<JobListingDto>>(`/jobs?page=${page}&limit=${limit}${status ? `&status=${encodeURIComponent(status)}` : ''}`),
  getJob: (id: string) =>
    api.get<{ job: JobDetailDto }>(`/jobs/${id}`),
  createJob: (data: {
    title: string;
    department: string;
    location: string;
    type: string;
    status?: string;
    description: string;
    requirements?: string;
    salaryMin?: number;
    salaryMax?: number;
  }) => api.post<{ job: JobDetailDto }>('/jobs', data),
  updateJobStatus: (id: string, status: string) =>
    api.patch<{ job: JobDetailDto }>(`/jobs/${id}`, { status }),
  updateJob: (id: string, data: {
    title?: string;
    department?: string;
    location?: string;
    type?: string;
    description?: string;
    requirements?: string;
    salaryMin?: number | null;
    salaryMax?: number | null;
  }) => api.patch<{ job: JobDetailDto }>(`/jobs/${id}`, data),
  getJobApplications: (jobId: string) =>
    api.get<{ applications: PipelineApplicationDto[] }>(`/jobs/${jobId}/applications`),
  getArchivedApplications: (jobId: string) =>
    api.get<{ archivedCandidates: import('@/types').ArchivedCandidate[]; total: number; jobId: string }>(`/jobs/${jobId}/applications/archived`),
  getPipelineStats: () =>
    api.get<{ stats: JobPipelineStatsDto }>('/jobs/pipeline-stats'),
  getJobPipelineStats: (id: string) =>
    api.get<{ stats: JobPipelineStageCounts }>(`/jobs/${id}/pipeline-stats`),
  getJobCandidates: (jobId: string, stage: string) =>
    api.get<{ candidates: PipelineApplicationDto[] }>(`/jobs/${jobId}/candidates?stage=${encodeURIComponent(stage)}`),
  deleteJob: (id: string) =>
    api.delete<{ deleted: boolean }>(`/jobs/${id}`),
  saveStages: (jobId: string, stages: Array<{ stageName: string; stageType: string; description?: string }>) =>
    api.post<{ stages: WorkflowStageDto[] }>(`/jobs/${jobId}/stages`, { stages }),
  getStages: (jobId: string) =>
    api.get<{ stages: WorkflowStageDto[] }>(`/jobs/${jobId}/stages`),
  updateStageScorecard: (jobId: string, stageId: string, scorecardId: string | null) =>
    api.patch<{ stage: WorkflowStageDto }>(`/jobs/${jobId}/stages/${stageId}/scorecard`, { scorecardId }),
  getMembers: (jobId: string) =>
    api.get<{ members: JobMemberDto[] }>(`/jobs/${jobId}/members`),
  addMember: (jobId: string, data: { userId: string; role: string }) =>
    api.post<{ member: JobMemberDto }>(`/jobs/${jobId}/members`, data),
  removeMember: (jobId: string, memberId: string) =>
    api.delete<{ deleted: boolean }>(`/jobs/${jobId}/members/${memberId}`),
};

// Candidates
export interface CandidateListDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  source: string;
  skills: string[];
  latestJobTitle?: string;
  latestStatus?: string;
  latestAppliedAt?: string;
  privacyNoticeSentAt?: string;
  createdAt: string;
}

export interface CandidatePrivacyDto {
  legalBasis: string;
  privacyNoticeSentAt: string | null;
  privacyNoticeSentBy: string | null;
  consentGivenAt: string | null;
  consentScope: string | null;
  retentionExpiresAt: string | null;
  retentionNote: string | null;
}

export interface ReferralDto {
  id: string;
  candidateId: string;
  referredByName: string;
  referredByEmail: string | null;
  relationship: string;
  jobId: string | null;
  jobTitle: string | null;
  note: string | null;
  referralDate: string;
  createdAt: string;
}

export interface CandidateDetailDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedInUrl?: string;
  cvUrl?: string;
  location?: string;
  currentCompany?: string;
  source: string;
  skills: string[];
  tags: string[];
  doNotContact: boolean;
  doNotContactReason?: string;
  doNotContactNote?: string;
  doNotContactAt?: string;
  retentionStatus: string;
  retentionExpiresAt?: string;
  lastActivityAt?: string;
  isAnonymised: boolean;
  referrals: ReferralDto[];
  createdAt: string;
  applications: {
    id: string;
    status: string;
    stage?: string;
    notes?: string;
    appliedAt: string;
    lastUpdated: string;
    jobId: string;
    jobTitle: string;
    jobDepartment: string;
    jobLocation: string;
    interviews: {
      id: string;
      scheduledAt: string;
      type: string;
      status: string;
      feedback?: string;
      rating?: number;
      duration: number;
    }[];
    offer?: {
      id: string;
      salary: string;
      currency: string;
      status: string;
      sentAt?: string;
      expiresAt?: string;
    } | null;
    rejection?: {
      id: string;
      applicationId: string;
      reasonId: string | null;
      reasonLabel: string;
      note: string | null;
      rejectedBy: string;
      rejectedAt: string;
    } | null;
  }[];
}

// Candidate sequence enrollment summary (cross-sequence view)
export interface CandidateSequenceEnrollmentDto {
  id: string;
  sequenceId: string;
  sequenceName: string;
  status: string;
  currentStep: number;
  enrolledAt: string;
}

// Candidates / tracking
export interface CandidateTrackingDto {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  jobDepartment: string;
  status: string; // 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
  stage: string | null;
  appliedAt: string;
  lastUpdated: string;
}

// CV parsing
export interface ParsedCvData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  linkedInUrl?: string;
  location?: string;
  title?: string;
  company?: string;
  skills: string[];
}

export const candidatesApi = {
  getTracking: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<CandidateTrackingDto>>(
      `/candidates/tracking?page=${page}&limit=${limit}`,
    ),
  getCandidates: (page = 1, limit = 50, search?: string) =>
    api.get<PaginatedResponse<CandidateListDto>>(
      `/candidates?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    ),
  getCandidate: (id: string) =>
    api.get<{ candidate: CandidateDetailDto }>(`/candidates/${id}`),
  createCandidate: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    linkedInUrl?: string;
    location?: string;
    source?: string;
    skills?: string[];
  }) => api.post<{ candidate: CandidateDetailDto }>('/candidates', data),
  parseCv: (file: File) => {
    const fd = new FormData();
    fd.append('cv', file);
    return uploadFile<{ parsed: ParsedCvData }>('/candidates/parse-cv', fd);
  },
  updateCandidate: (id: string, data: { currentCompany?: string | null }) =>
    api.patch<{ updated: boolean }>(`/candidates/${id}`, data),
  getEnrollments: (id: string) =>
    api.get<{ enrollments: CandidateSequenceEnrollmentDto[] }>(`/candidates/${id}/enrollments`),
  deleteCandidate: (id: string, mode: 'soft' | 'hard' = 'soft') =>
    api.delete<{ deleted?: boolean; deletedAt?: string }>(`/candidates/${id}?mode=${mode}`),
  fetchDeletedCandidates: () =>
    api.get<{ items: { id: string; firstName: string; lastName: string; email: string | null; deletedAt: string; deletedReason: string | null }[] }>('/candidates/deleted'),
  setDoNotContact: (id: string, data: { doNotContact: boolean; reason?: string; note?: string }) =>
    api.patch<{ updated: boolean }>(`/candidates/${id}/do-not-contact`, data),
  merge: (keepId: string, mergeId: string, fieldResolutions: Record<string, 'keep' | 'merge'>) =>
    api.post<{ merged: boolean; keepId: string }>('/candidates/merge', { keepId, mergeId, fieldResolutions }),
  // Privacy & Consent
  getPrivacy: (id: string) =>
    api.get<CandidatePrivacyDto>(`/candidates/${id}/privacy`),
  updatePrivacy: (id: string, data: { legalBasis?: string; consentGivenAt?: string; consentScope?: string; retentionExpiresAt?: string; retentionNote?: string }) =>
    api.patch<CandidatePrivacyDto>(`/candidates/${id}/privacy`, data),
  sendPrivacyNotice: (id: string) =>
    api.post<{ sentAt: string; sentBy: string }>(`/candidates/${id}/privacy/send-notice`),
};

export const referralsApi = {
  create: (data: { candidateId: string; referredByName: string; referredByEmail?: string; relationship: string; jobId?: string; jobTitle?: string; note?: string; referralDate?: string }) =>
    api.post<{ referral: ReferralDto }>('/referrals', data),
  getByCandidateId: (candidateId: string) =>
    api.get<{ referrals: ReferralDto[] }>(`/referrals?candidateId=${encodeURIComponent(candidateId)}`),
  delete: (id: string) =>
    api.delete<{ deleted: boolean }>(`/referrals/${id}`),
};

// Onboarding
export interface OnboardingProfileDto {
  fullName:     string;
  pronouns:     string;
  jobTitle:     string;
  manager:      string;
  startDate:    string;
  workLocation: string;
  workEmail:    string;
  phone:        string;
}

export interface OnboardingDocumentDto {
  filename:   string;
  uploadedAt: string;
}

export interface OnboardingSessionDto {
  step:      number;
  profile:   OnboardingProfileDto;
  documents: { resume: OnboardingDocumentDto | null; id: OnboardingDocumentDto | null };
  tasks:     Record<string, boolean>;
  completed: boolean;
  activity:  { text: string; time: string }[];
}

export const onboardingApi = {
  getSession: () =>
    api.get<{ session: OnboardingSessionDto }>('/onboarding'),
  saveProfile: (profile: OnboardingProfileDto) =>
    api.post<{ session: OnboardingSessionDto }>('/onboarding/step/1', profile),
  advanceToStep3: () =>
    api.post<{ session: OnboardingSessionDto }>('/onboarding/step/2'),
  skip: () =>
    api.patch<{ session: OnboardingSessionDto }>('/onboarding/skip'),
  updateTask: (taskId: string, checked: boolean) =>
    api.patch<{ id: string; checked: boolean }>(`/onboarding/tasks/${taskId}`, { checked }),
  uploadDocument: (type: 'resume' | 'id', file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    return uploadFile<{ document: OnboardingDocumentDto }>('/onboarding/upload', fd);
  },
  complete: () =>
    api.post<{ session: OnboardingSessionDto }>('/onboarding/complete'),
  requestAssistance: (message: string) =>
    api.post<{ sent: boolean }>('/onboarding/assistance', { message }),
  getActivity: () =>
    api.get<{ activity: { text: string; time: string }[] }>('/onboarding/activity'),
};

// Reports
export type ReportCategoryId = 'workforce' | 'talent-acquisition' | 'performance' | 'compensation' | 'learning';
export type RunStatus        = 'completed' | 'processing' | 'failed';
export type OutputFormat     = 'PDF' | 'CSV' | 'Excel';
export type ScheduleFreq     = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';

export interface ReportRunDto {
  id:          string;
  reportId:    string;
  reportName:  string;
  category:    ReportCategoryId;
  runBy:       string;
  date:        string;
  format:      OutputFormat;
  status:      RunStatus;
  errorDetail: string | null;
  params:      Record<string, unknown>;
}

export interface ScheduledReportDto {
  id:         string;
  reportId:   string;
  reportName: string;
  category:   ReportCategoryId;
  frequency:  ScheduleFreq;
  nextRun:    string;
  paused:     boolean;
  createdAt:  string;
}

export interface CustomReportDefDto {
  id:          string;
  name:        string;
  category:    ReportCategoryId;
  metrics:     string[];
  filters:     { dateRange: string; department: string; location: string };
  format:      OutputFormat;
  schedule:    string | null;
  createdAt:   string;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function downloadBlob(endpoint: string, filename: string): Promise<void> {
  if (typeof window === 'undefined') throw new Error('downloadBlob must be called in a browser context');
  const res = await fetch(`${BASE}${endpoint}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const reportsApi = {
  getRuns: () =>
    api.get<{ runs: ReportRunDto[] }>('/reports/runs'),
  startRun: (data: { reportId: string; reportName: string; category: ReportCategoryId; format?: OutputFormat; params?: Record<string, unknown> }) =>
    api.post<{ run: ReportRunDto }>('/reports/run', data),
  getRunStatus: (id: string) =>
    api.get<{ id: string; status: RunStatus; errorDetail: string | null }>(`/reports/runs/${id}/status`),
  downloadRun: (id: string, filename: string) =>
    downloadBlob(`/reports/runs/${id}/download`, filename),
  exportAll: () =>
    downloadBlob('/reports/runs/export-all', `all-reports-${new Date().toISOString().slice(0,10)}.txt`),
  getScheduled: () =>
    api.get<{ scheduled: ScheduledReportDto[] }>('/reports/scheduled'),
  updateSchedule: (id: string, data: { paused?: boolean; frequency?: ScheduleFreq; nextRun?: string }) =>
    api.patch<{ schedule: ScheduledReportDto }>(`/reports/scheduled/${id}`, data),
  deleteSchedule: (id: string) =>
    api.delete<{ deleted: boolean }>(`/reports/scheduled/${id}`),
  createSchedule: (data: { reportId: string; reportName: string; category: ReportCategoryId; frequency: ScheduleFreq; nextRun: string }) =>
    api.post<{ schedule: ScheduledReportDto }>('/reports/scheduled', data),
  createCustomReport: (data: { name: string; category: ReportCategoryId; metrics: string[]; filters: { dateRange: string; department: string; location: string }; format: OutputFormat; schedule: string | null }) =>
    api.post<{ report: CustomReportDefDto; run: ReportRunDto }>('/reports/custom', data),
};

// Insights
export type InsightsPeriod = '30d' | '90d' | '6m' | '12m';

export interface InsightsStatsDto {
  totalCandidatesSourced: number;
  activePipelines:        number;
  avgTimeToHire:          number;
  offersAcceptedRate:     number;
  candidatesDelta:        string;
  pipelinesDelta:         string;
  timeToHireDelta:        string;
  offersDelta:            string;
  candidatesPositive:     boolean;
  pipelinesPositive:      boolean;
  timeToHirePositive:     boolean;
  offersPositive:         boolean;
}

export interface InsightsTrendPoint  { month: string; timeToHire: number; timeToFill: number }
export interface InsightsPipelinePoint { month: string; Sourced: number; Screened: number; Interview: number; Offer: number }
export interface InsightsSourceItem  { name: string; value: number; hires: number; color: string }

export interface InsightsAllDto {
  stats:    InsightsStatsDto;
  trends:   InsightsTrendPoint[];
  pipeline: InsightsPipelinePoint[];
  sources:  InsightsSourceItem[];
}

export interface SavedReportDto {
  id:          string;
  name:        string;
  description: string;
  type:        'Scheduled' | 'Manual';
  createdDate: string;
  lastRun:     string;
  data:        Record<string, unknown>;
}

export const insightsApi = {
  getAll: (period: InsightsPeriod = '12m') =>
    api.get<InsightsAllDto>(`/insights?period=${period}`),
  getStats: (period: InsightsPeriod = '12m') =>
    api.get<InsightsStatsDto>(`/insights/stats?period=${period}`),
  getSources: (period: InsightsPeriod = '12m') =>
    api.get<{ sources: InsightsSourceItem[] }>(`/insights/sources?period=${period}`),
  getReports: () =>
    api.get<{ reports: SavedReportDto[] }>('/insights/reports'),
  getReport: (id: string) =>
    api.get<{ report: SavedReportDto }>(`/insights/reports/${id}`),
  deleteReport: (id: string) =>
    api.delete<{ deleted: boolean }>(`/insights/reports/${id}`),
  createReport: (data: { name: string; description?: string; type?: string }) =>
    api.post<{ report: SavedReportDto }>('/insights/reports', data),
};

// Applications
// Performance
export type ReviewCycleType = 'Annual' | 'Mid-Year' | 'Calibration' | 'Check-in';
export type CycleStatus     = 'active' | 'completed' | 'upcoming';
export type GoalType        = 'Company' | 'Department' | 'Individual';
export type GoalStatus      = 'on-track' | 'at-risk' | 'completed';
export type ReviewStatus    = 'completed' | 'in-progress' | 'not-started';

export interface CycleParticipantDto {
  id:           string;
  name:         string;
  role:         string;
  department:   string;
  reviewStatus: ReviewStatus;
  score:        number | null;
}

export interface ReviewCycleDto {
  id:           string;
  name:         string;
  type:         ReviewCycleType;
  startDate:    string;
  endDate:      string;
  dueDate:      string;
  status:       CycleStatus;
  participants: CycleParticipantDto[];
  createdAt:    string;
}

export interface PerformanceGoalDto {
  id:          string;
  title:       string;
  owner:       string;
  ownerId:     string | null;
  type:        GoalType;
  dueDate:     string;
  progress:    number;
  targetPct:   number;
  status:      GoalStatus;
  description: string;
  createdAt:   string;
}

export interface TeamEmployeeDto {
  id:               string;
  name:             string;
  role:             string;
  department:       string;
  email:            string;
  reviewStatus:     ReviewStatus;
  lastScore:        number;
  goalsCompletion:  number;
  lastReviewDate:   string;
  competencies:     { subject: string; score: number }[];
  goals:            { id: string; title: string; progress: number; status: GoalStatus }[];
  reviewHistory:    { cycleId: string; cycleName: string; score: number; completedAt: string }[];
}

export interface PerformanceStatsDto {
  completionRate:      number;
  activeCycles:        number;
  goalsOnTrack:        number;
  totalGoals:          number;
  avgScore:            number;
  completionRateDelta: string;
  activeCyclesNote:    string;
  goalsAtRisk:         number;
  avgScoreDelta:       string;
}

export const performanceApi = {
  getStats: () =>
    api.get<PerformanceStatsDto>('/performance/stats'),
  getCycles: () =>
    api.get<{ cycles: ReviewCycleDto[] }>('/performance/cycles'),
  getCycle: (id: string) =>
    api.get<{ cycle: ReviewCycleDto }>(`/performance/cycles/${id}`),
  createCycle: (data: {
    name: string; type: ReviewCycleType;
    startDate: string; endDate: string; dueDate: string;
    participantIds: string[];
  }) => api.post<{ cycle: ReviewCycleDto }>('/performance/cycles', data),
  getGoals: () =>
    api.get<{ goals: PerformanceGoalDto[] }>('/performance/goals'),
  createGoal: (data: {
    title: string; owner: string; ownerId: string | null;
    type: GoalType; dueDate: string; targetPct: number; description: string;
  }) => api.post<{ goal: PerformanceGoalDto }>('/performance/goals', data),
  updateGoal: (id: string, data: Partial<PerformanceGoalDto>) =>
    api.patch<{ goal: PerformanceGoalDto }>(`/performance/goals/${id}`, data),
  getEmployees: () =>
    api.get<{ employees: TeamEmployeeDto[] }>('/performance/employees'),
  getEmployee: (id: string) =>
    api.get<{ employee: TeamEmployeeDto }>(`/performance/employees/${id}`),
  addEmployee: (data: { name: string; role: string; department: string; email: string }) =>
    api.post<{ employee: TeamEmployeeDto }>('/performance/employees', data),
  getScoreDistribution: () =>
    api.get<{ distribution: { label: string; score: string; count: number }[] }>('/performance/charts/scores'),
  getCompetencyData: () =>
    api.get<{ competencies: { subject: string; value: number }[] }>('/performance/charts/competencies'),
  getUsers: () =>
    api.get<{ users: { id: string; name: string; role: string; department: string }[] }>('/performance/users'),
};

// Interviews
export type InterviewType   = 'Phone' | 'Video' | 'On-site' | 'Technical';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';
export type Recommendation  = 'hire' | 'no-hire' | 'maybe';

export interface InterviewerDto { id: string; name: string; role: string }

export interface FeedbackEntryDto {
  rating:         number;
  recommendation: Recommendation;
  notes:          string;
  submittedAt:    string;
}

export interface InterviewDto {
  id:            string;
  candidateId:   string;
  candidateName: string;
  jobId:         string;
  jobTitle:      string;
  interviewers:  InterviewerDto[];
  type:          InterviewType;
  status:        InterviewStatus;
  scheduledAt:   string;
  duration:      number;
  meetingLink:      string | null;
  location:         string | null;
  feedback:         FeedbackEntryDto | null;
  notes:            string;
  calendarEventId:  string | null;
  createdAt:        string;
}

export const interviewsApi = {
  getAll: (from?: string, to?: string) =>
    api.get<{ interviews: InterviewDto[] }>(`/interviews${from || to ? `?${from ? `from=${from}` : ''}${from && to ? '&' : ''}${to ? `to=${to}` : ''}` : ''}`),
  getById: (id: string) =>
    api.get<{ interview: InterviewDto }>(`/interviews/${id}`),
  create: (data: {
    applicationId?: string;
    candidateId?: string; candidateName?: string;
    jobId?: string; jobTitle?: string;
    interviewers?: InterviewerDto[];
    type: InterviewType; scheduledAt: string; duration: number;
    meetingLink?: string; location?: string; notes?: string;
  }) => api.post<{ interview: InterviewDto }>('/interviews', data),
  update: (id: string, data: Partial<InterviewDto>) =>
    api.patch<{ interview: InterviewDto }>(`/interviews/${id}`, data),
  cancel: (id: string) =>
    api.patch<{ interview: InterviewDto }>(`/interviews/${id}/cancel`),
  submitFeedback: (id: string, data: { rating: number; recommendation: Recommendation; notes: string }) =>
    api.post<{ interview: InterviewDto }>(`/interviews/${id}/feedback`, data),
};

// Offers
export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface OfferDto {
  id:            string;
  candidateId:   string;
  candidateName: string;
  jobId:         string;
  jobTitle:      string;
  department:    string;
  salary:        number;
  currency:      string;
  startDate:     string;
  expiryDate:    string;
  equity:        string | null;
  benefits:      string;
  notes:         string;
  status:        OfferStatus;
  sentAt:        string | null;
  respondedAt:   string | null;
  signatureUrl:  string | null;
  createdAt:     string;
  createdBy:     string;
}

export interface OfferStatsDto {
  total: number; draft: number; sent: number;
  accepted: number; rejected: number; expired: number;
  acceptanceRate: number;
}

export const offersApi = {
  getAll: (status?: OfferStatus) =>
    api.get<{ offers: OfferDto[]; stats: OfferStatsDto }>(`/offers${status ? `?status=${status}` : ''}`),
  getById: (id: string) =>
    api.get<{ offer: OfferDto }>(`/offers/${id}`),
  create: (data: {
    applicationId?: string;
    candidateId?: string; candidateName?: string;
    jobId?: string; jobTitle?: string; department?: string;
    salary: number; currency: string;
    startDate?: string; expiryDate?: string;
    equity?: string; benefits?: string; notes?: string;
  }) => api.post<{ offer: OfferDto }>('/offers', data),
  send: (id: string) =>
    api.post<{ offer: OfferDto }>(`/offers/${id}/send`),
  updateStatus: (id: string, status: OfferStatus) =>
    api.patch<{ offer: OfferDto }>(`/offers/${id}/status`, { status }),
  update: (id: string, data: Partial<OfferDto>) =>
    api.patch<{ offer: OfferDto }>(`/offers/${id}`, data),
};

// Employees
export type EmployeeStatus = 'active' | 'on-leave' | 'terminated';

export interface EmployeeDto {
  id:          string;
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string | null;
  title:       string;
  department:  string;
  location:    string;
  status:      EmployeeStatus;
  hireDate:    string;
  managerId:   string | null;
  managerName: string | null;
  skills:      string[];
  avatarUrl:   string | null;
  bio:         string | null;
}

const BASE_URL_DIRECT = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const employeesApi = {
  getAll: (params?: { search?: string; department?: string; location?: string; status?: EmployeeStatus }) => {
    const q = new URLSearchParams();
    if (params?.search)     q.set('search',     params.search);
    if (params?.department) q.set('department', params.department);
    if (params?.location)   q.set('location',   params.location);
    if (params?.status)     q.set('status',     params.status);
    const qs = q.toString();
    return api.get<{ employees: EmployeeDto[]; departments: string[]; locations: string[]; total: number }>(`/employees${qs ? `?${qs}` : ''}`);
  },
  getById: (id: string) =>
    api.get<{ employee: EmployeeDto }>(`/employees/${id}`),
  create: (data: {
    firstName: string; lastName: string; email: string; phone?: string;
    title: string; department: string; location: string;
    hireDate: string; managerId?: string; skills?: string[]; bio?: string;
  }) => api.post<{ employee: EmployeeDto }>('/employees', data),
  update: (id: string, data: Partial<EmployeeDto>) =>
    api.patch<{ employee: EmployeeDto }>(`/employees/${id}`, data),
  exportCsv: async () => {
    if (typeof window === 'undefined') throw new Error('exportCsv must be called in a browser context');
    const res = await fetch(`${BASE_URL_DIRECT}/employees/export`, { credentials: 'include' });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// Notifications
export type NotificationType = 'interview' | 'offer' | 'application' | 'task' | 'review';

export interface NotificationDto {
  id:        string;
  type:      NotificationType;
  title:     string;
  message:   string;
  read:      boolean;
  href:      string;
  createdAt: string;
}

export const notificationsApi = {
  getAll: (type?: NotificationType) =>
    api.get<{ notifications: NotificationDto[]; unreadCount: number }>(`/notifications${type ? `?type=${type}` : ''}`),
  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) =>
    api.patch<{ read: boolean; unreadCount: number }>(`/notifications/${id}/read`),
  markAllRead: () =>
    api.post<{ marked: number; unreadCount: number }>('/notifications/mark-all-read'),
};

// Settings

export type TeamRole = 'admin' | 'recruiter' | 'hiring_manager' | 'viewer';
export type MemberStatus = 'active' | 'pending';
export type NotifKey = 'newApplication' | 'interviewScheduled' | 'offerAccepted' | 'onboardingTaskDue' | 'reviewCycleStarting';

export interface UserProfileDto {
  firstName:  string;
  lastName:   string;
  email:      string;
  timezone:   string;
  language:   string;
  avatarUrl:  string | null;
}

export interface TeamMemberDto {
  id:         string;
  name:       string;
  email:      string;
  role:       TeamRole;
  department: string;
  joinedAt:   string;
  avatarUrl:  string | null;
  status:     MemberStatus;
}

export interface IntegrationDto {
  key:         string;
  name:        string;
  description: string;
  category:    string;
  connected:   boolean;
  lastSync:    string | null;
}

export interface NotificationSettingsDto {
  email: Record<NotifKey, boolean>;
  inApp: Record<NotifKey, boolean>;
}

export interface BillingInfoDto {
  plan:            string;
  planDescription: string;
  creditsUsed:     number;
  creditsTotal:    number;
  seatsUsed:       number;
  seatsTotal:      number;
  paymentLast4:    string;
  paymentBrand:    string;
  nextBillingDate: string;
  monthlyAmount:   number;
}

export interface ActiveSessionDto {
  id:         string;
  device:     string;
  browser:    string;
  location:   string;
  ip:         string;
  lastActive: string;
  current:    boolean;
}

export interface LoginHistoryEntryDto {
  id:     string;
  at:     string;
  ip:     string;
  device: string;
  status: 'success' | 'failed';
}

export interface SecurityDto {
  security:     { twoFactorEnabled: boolean };
  sessions:     ActiveSessionDto[];
  loginHistory: LoginHistoryEntryDto[];
}

export const settingsApi = {
  getProfile: () =>
    api.get<{ profile: UserProfileDto }>('/settings/profile'),
  updateProfile: (data: Partial<UserProfileDto>) =>
    api.patch<{ profile: UserProfileDto }>('/settings/profile', data),
  getIntegrations: () =>
    api.get<{ integrations: IntegrationDto[] }>('/settings/integrations'),
  toggleIntegration: (key: string) =>
    api.patch<{ integration: IntegrationDto }>(`/settings/integrations/${key}`),
  getNotifications: () =>
    api.get<{ notifications: NotificationSettingsDto }>('/settings/notifications'),
  updateNotifications: (data: { email?: Partial<Record<NotifKey, boolean>>; inApp?: Partial<Record<NotifKey, boolean>> }) =>
    api.patch<{ notifications: NotificationSettingsDto }>('/settings/notifications', data),
  getBilling: () =>
    api.get<{ billing: BillingInfoDto }>('/settings/billing'),
  getSecurity: () =>
    api.get<SecurityDto>('/settings/security'),
  updateSecurity: (data: { twoFactorEnabled?: boolean }) =>
    api.patch<{ security: { twoFactorEnabled: boolean } }>('/settings/security', data),
  revokeSession: (id: string) =>
    api.delete<{ revoked: boolean }>(`/settings/security/sessions/${id}`),
};

export const teamApi = {
  getAll: () =>
    api.get<{ members: TeamMemberDto[] }>('/team'),
  invite: (email: string, role: TeamRole, department?: string) =>
    api.post<{ member: TeamMemberDto }>('/team/invite', { email, role, department }),
  updateRole: (id: string, role: TeamRole) =>
    api.patch<{ member: TeamMemberDto }>(`/team/${id}/role`, { role }),
  remove: (id: string) =>
    api.delete<{ deleted: boolean }>(`/team/${id}`),
};

export const applicationsApi = {
  createApplication: (data: { candidateId: string; jobPostingId: string; status?: string }) =>
    api.post<{ application: { id: string; candidateId: string; candidateName: string; candidateEmail: string; skills: string[]; jobPostingId: string; status: string; appliedAt: string; lastUpdated: string } }>(
      '/applications',
      data,
    ),
  updateStage: (id: string, status: string) =>
    api.patch<{ id: string; status: string; updatedAt: string }>(
      `/applications/${id}/stage`,
      { status },
    ),
  updateSubStage: (id: string, stage: string | null) =>
    api.patch<{ id: string; stage: string | null; updatedAt: string }>(
      `/applications/${id}/sub-stage`,
      { stage },
    ),
  updateNotes: (id: string, notes: string) =>
    api.patch<{ id: string; notes: string; updatedAt: string }>(
      `/applications/${id}/notes`,
      { notes },
    ),
  rejectApplication: (applicationId: string, data: { reasonId?: string; reasonLabel: string; note?: string }) =>
    api.patch<{ application: { id: string; status: string; rejection: { id: string; reasonLabel: string; note: string | null; rejectedBy: string; rejectedAt: string } } }>(
      `/applications/${applicationId}/reject`,
      data,
    ),
};

// Candidate Panel
export interface CandidateNoteDto {
  id: string;
  content: string;
  authorName: string;
  applicationId: string | null;
  jobTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedEventDto {
  id: string;
  type: string;
  description: string;
  actor: string;
  timestamp: string;
  jobTitle?: string;
  meta?: Record<string, string | number | null>;
}

export interface CandidateFeedbackDto {
  id: string;
  interviewType: string;
  scheduledAt: string;
  status: string;
  rating: number | null;
  recommendation: string | null;
  feedback: string | null;
  jobTitle?: string;
}

// ── Job Members ───────────────────────────────────────────────────────────────

export interface JobMemberDto {
  id: string;
  role: string;
  addedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

export const usersApi = {
  getUsers: () => api.get<{ users: UserDto[] }>('/users'),
};

// ── Workflows ─────────────────────────────────────────────────────────────────

export interface WorkflowStageDto {
  id: string;
  stageName: string;
  stageType: string;
  description: string | null;
  position: number;
  requiresScorecard: boolean;
  scorecardId: string | null;
  scorecardName: string | null;
}

export interface WorkflowTemplateDto {
  id: string;
  jobId: string;
  name: string;
  stages: WorkflowStageDto[];
  createdAt: string;
}

export const workflowsApi = {
  getByJobId: (jobId: string) =>
    api.get<WorkflowTemplateDto>(`/workflows/job/${jobId}`),
  create: (data: {
    jobId: string;
    name?: string;
    stages?: Array<{ stageName: string; stageType: string; description?: string; requiresScorecard?: boolean }>;
  }) =>
    api.post<WorkflowTemplateDto>('/workflows', data),
  update: (id: string, data: { name?: string }) =>
    api.patch<WorkflowTemplateDto>(`/workflows/${id}`, data),
  addStage: (id: string, data: { stageName: string; stageType: string; description?: string; requiresScorecard?: boolean; scorecardId?: string | null }) =>
    api.post<WorkflowStageDto>(`/workflows/${id}/stages`, data),
  updateStage: (id: string, stageId: string, data: Partial<{ stageName: string; stageType: string; description: string; requiresScorecard: boolean; scorecardId: string | null }>) =>
    api.patch<WorkflowStageDto>(`/workflows/${id}/stages/${stageId}`, data),
  deleteStage: (id: string, stageId: string) =>
    api.delete<void>(`/workflows/${id}/stages/${stageId}`),
  reorderStages: (id: string, stageIds: string[]) =>
    api.patch<WorkflowTemplateDto>(`/workflows/${id}/stages/reorder`, { stageIds }),
};

export const candidatePanelApi = {
  getFeed:     (id: string) => api.get<{ feed: FeedEventDto[] }>(`/candidates/${id}/feed`),
  getNotes:    (id: string) => api.get<{ notes: CandidateNoteDto[] }>(`/candidates/${id}/notes`),
  createNote:  (id: string, data: { content: string; applicationId?: string }) =>
    api.post<{ note: CandidateNoteDto }>(`/candidates/${id}/notes`, data),
  updateNote:  (id: string, noteId: string, content: string) =>
    api.patch<{ note: CandidateNoteDto }>(`/candidates/${id}/notes/${noteId}`, { content }),
  deleteNote:  (id: string, noteId: string) =>
    api.delete<{ deleted: boolean }>(`/candidates/${id}/notes/${noteId}`),
  updateTags:  (id: string, tags: string[]) =>
    api.patch<{ tags: string[] }>(`/candidates/${id}/tags`, { tags }),
  getFeedback: (id: string) => api.get<{ feedback: CandidateFeedbackDto[]; hiddenCount?: number }>(`/candidates/${id}/feedback`),
  getEmails:   (id: string) => api.get<{ emails: unknown[] }>(`/candidates/${id}/emails`),
};

// ── Follow-ups ────────────────────────────────────────────────────────────────

export interface FollowUpDto {
  id: string;
  candidateId: string;
  followUpDate: string;
  note: string | null;
  isCompleted: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export const followUpsApi = {
  getByCandidateId: (candidateId: string) =>
    api.get<{ followUps: FollowUpDto[] }>(`/follow-ups?candidateId=${candidateId}`),
  create: (data: { candidateId: string; followUpDate: string; note?: string }) =>
    api.post<{ followUp: FollowUpDto }>('/follow-ups', data),
  update: (id: string, data: { followUpDate?: string; note?: string; isCompleted?: boolean }) =>
    api.patch<{ followUp: FollowUpDto }>(`/follow-ups/${id}`, data),
  delete: (id: string) =>
    api.delete<{ deleted: boolean }>(`/follow-ups/${id}`),
};

// ── Sequences ─────────────────────────────────────────────────────────────────

export interface SequenceStatsDto {
  totalEnrolled: number;
  active: number;
  completed: number;
  stopped: number;
  replied: number;
  opens: number;
  clicks: number;
}

export interface SequenceListDto {
  id: string;
  name: string;
  status: string;
  stepCount: number;
  enrolledCount: number;
  senderEmail: string | null;
  linkedJobId: string | null;
  stopOnReply: boolean;
  stopOnInterview: boolean;
  stopOnHired: boolean;
  skipWeekends: boolean;
  isShared: boolean;
  maxEmails: number;
  sendingDays: string[];
  createdById: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceDetailDto extends SequenceListDto {
  steps: SequenceStepDto[];
  stats: SequenceStatsDto;
}

export interface SequenceStepDto {
  id: string;
  sequenceId: string;
  position: number;
  type: string;
  subject: string | null;
  body: string | null;
  templateId: string | null;
  templateName: string | null;
  waitDays: number | null;
  delayDays: number;
  taskDescription: string | null;
  sendTime: string | null;
  sendFrom: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentDto {
  id: string;
  sequenceId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateCurrentCompany: string | null;
  currentStep: number;
  status: string;
  sendFrom: string | null;
  startDate: string;
  response: string | null;
  opens: number;
  clicks: number;
  enrolledAt: string;
  completedAt: string | null;
  stoppedAt: string | null;
  stoppedReason: string | null;
}

export interface CreateSequenceDto {
  name: string;
  senderEmail?: string;
  linkedJobId?: string;
  stopOnReply?: boolean;
  stopOnInterview?: boolean;
  stopOnHired?: boolean;
  skipWeekends?: boolean;
  isShared?: boolean;
  maxEmails?: number;
  sendingDays?: string[];
}

export interface UpdateSequenceDto extends Partial<CreateSequenceDto> {
  status?: 'ACTIVE' | 'PAUSED';
}

export const sequencesApi = {
  getAll: (params?: { status?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString();
    return api.get<{ sequences: SequenceListDto[] }>(`/sequences${query ? `?${query}` : ''}`);
  },

  getById: (id: string) =>
    api.get<{ sequence: SequenceDetailDto }>(`/sequences/${id}`),

  create: (data: CreateSequenceDto) =>
    api.post<{ sequence: SequenceDetailDto }>('/sequences', data),

  update: (id: string, data: UpdateSequenceDto) =>
    api.patch<{ sequence: SequenceListDto }>(`/sequences/${id}`, data),

  delete: (id: string) =>
    api.delete<{ deleted: boolean }>(`/sequences/${id}`),

  updateStatus: (id: string, status: 'ACTIVE' | 'PAUSED') =>
    api.patch<{ sequence: SequenceListDto }>(`/sequences/${id}/status`, { status }),

  getEnrollments: (id: string, params?: { status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString();
    return api.get<{ enrollments: EnrollmentDto[] }>(`/sequences/${id}/enrolled${query ? `?${query}` : ''}`);
  },

  enroll: (id: string, data: { candidateId: string; sendFrom?: string; startDate?: string }) =>
    api.post<{ enrollment: EnrollmentDto }>(`/sequences/${id}/enroll`, data),

  unenroll: (id: string, candidateId: string) =>
    api.delete<{ unenrolled: boolean }>(`/sequences/${id}/enroll/${candidateId}`),

  setResponse: (id: string, enrollmentId: string, response: string) =>
    api.patch<{ enrollment: EnrollmentDto }>(
      `/sequences/${id}/enrollments/${enrollmentId}/response`,
      { response },
    ),

  // Step management
  addStep: (id: string, data: {
    type: 'EMAIL' | 'WAIT' | 'TASK';
    subject?: string;
    body?: string;
    templateId?: string;
    waitDays?: number;
    delayDays?: number;
    taskDescription?: string;
    sendTime?: string;
    sendFrom?: string;
    position?: number;
  }) => api.post<{ step: SequenceStepDto }>(`/sequences/${id}/steps`, data),

  updateStep: (id: string, stepId: string, data: Partial<SequenceStepDto>) =>
    api.patch<{ step: SequenceStepDto }>(`/sequences/${id}/steps/${stepId}`, data),

  deleteStep: (id: string, stepId: string) =>
    api.delete<{ deleted: boolean }>(`/sequences/${id}/steps/${stepId}`),

  // Legacy alias for toggleStatus
  toggleStatus: (id: string, status: 'ACTIVE' | 'PAUSED') =>
    api.patch<{ sequence: SequenceListDto }>(`/sequences/${id}/status`, { status }),
};

// Backwards-compat alias used by candidate profile page
export type SequenceDto = SequenceListDto;
export type SequenceEnrollmentDto = EnrollmentDto;

// ── Email Templates ───────────────────────────────────────────────────────────

export interface EmailTemplateDto {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  isShared: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export const emailTemplatesApi = {
  getAll: () =>
    api.get<{ templates: EmailTemplateDto[] }>('/email-templates'),
  getById: (id: string) =>
    api.get<{ template: EmailTemplateDto }>(`/email-templates/${id}`),
  create: (data: { name: string; category: string; subject: string; body: string; isShared?: boolean }) =>
    api.post<{ template: EmailTemplateDto }>('/email-templates', data),
  update: (id: string, data: { name?: string; category?: string; subject?: string; body?: string; isShared?: boolean }) =>
    api.patch<{ template: EmailTemplateDto }>(`/email-templates/${id}`, data),
  delete: (id: string) =>
    api.delete<{ deleted: boolean }>(`/email-templates/${id}`),
};

// ── Projects ──────────────────────────────────────────────────────────────────

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  category: string;
  visibility: 'PRIVATE' | 'TEAM';
  tags: string[];
  candidateCount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCandidateDto {
  id: string;
  projectId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateSkills: string[];
  addedByName: string;
  notes: string | null;
  addedAt: string;
}

export interface ProjectNoteDto {
  id: string;
  projectId: string;
  content: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export const projectsApi = {
  getAll: () =>
    api.get<{ projects: ProjectDto[] }>('/projects'),
  getById: (id: string) =>
    api.get<{ project: ProjectDto }>(`/projects/${id}`),
  create: (data: { name: string; description?: string; category?: string; visibility?: 'PRIVATE' | 'TEAM'; tags?: string[] }) =>
    api.post<{ project: ProjectDto }>('/projects', data),
  update: (id: string, data: { name?: string; description?: string; category?: string; visibility?: 'PRIVATE' | 'TEAM'; tags?: string[] }) =>
    api.patch<{ project: ProjectDto }>(`/projects/${id}`, data),
  delete: (id: string) =>
    api.delete<{ deleted: boolean }>(`/projects/${id}`),
  getCandidates: (id: string) =>
    api.get<{ candidates: ProjectCandidateDto[] }>(`/projects/${id}/candidates`),
  addCandidate: (id: string, candidateId: string) =>
    api.post<{ projectCandidate: ProjectCandidateDto }>(`/projects/${id}/candidates`, { candidateId }),
  removeCandidate: (id: string, candidateId: string) =>
    api.delete<{ deleted: boolean }>(`/projects/${id}/candidates/${candidateId}`),
  getNotes: (id: string) =>
    api.get<{ notes: ProjectNoteDto[] }>(`/projects/${id}/notes`),
  createNote: (id: string, content: string) =>
    api.post<{ note: ProjectNoteDto }>(`/projects/${id}/notes`, { content }),
};

// ── Feedback Forms ────────────────────────────────────────────────────────────

export interface FeedbackQuestion {
  id: string;
  type: 'rating' | 'yes-no' | 'recommendation' | 'text' | 'skill';
  label: string;
  skillName?: string;
  isRequired: boolean;
}

export interface FeedbackFormDto {
  id: string;
  name: string;
  stage: string | null;
  questions: FeedbackQuestion[];
  submissionCount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSubmissionDto {
  id: string;
  formId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  submittedByName: string;
  answers: Record<string, unknown>;
  overallRating: number | null;
  recommendation: string | null;
  submittedAt: string;
}

export const feedbackFormsApi = {
  getAll: () =>
    api.get<{ forms: FeedbackFormDto[] }>('/feedback-forms'),
  getById: (id: string) =>
    api.get<{ form: FeedbackFormDto }>(`/feedback-forms/${id}`),
  create: (data: { name: string; stage?: string; questions?: FeedbackQuestion[] }) =>
    api.post<{ form: FeedbackFormDto }>('/feedback-forms', data),
  update: (id: string, data: { name?: string; stage?: string; questions?: FeedbackQuestion[] }) =>
    api.patch<{ form: FeedbackFormDto }>(`/feedback-forms/${id}`, data),
  delete: (id: string) =>
    api.delete<{ deleted: boolean }>(`/feedback-forms/${id}`),
  getSubmissions: (id: string) =>
    api.get<{ submissions: FeedbackSubmissionDto[] }>(`/feedback-forms/${id}/submissions`),
  createSubmission: (id: string, data: { candidateId: string; applicationId?: string; answers: Record<string, unknown>; overallRating?: number; recommendation?: string }) =>
    api.post<{ submission: FeedbackSubmissionDto }>(`/feedback-forms/${id}/submissions`, data),
};

// ── Scorecards ────────────────────────────────────────────────────────────────

export interface ScorecardCriterionDto {
  id: string;
  name: string;
  type: string; // rating | yes-no | free-text | multiple-choice
  description: string | null;
  isRequired: boolean;
  position: number;
  allowNotes: boolean;
  notesLabel: string;
  notesPlaceholder: string | null;
  notesRequired: boolean;
}

export interface ScorecardDto {
  id: string;
  name: string;
  description: string | null;
  criteriaCount: number;
  criteria: ScorecardCriterionDto[];
  createdAt: string;
}

export const scorecardsApi = {
  getAll: () => api.get<{ scorecards: ScorecardDto[] }>('/scorecards'),
  getById: (id: string) => api.get<ScorecardDto>(`/scorecards/${id}`),
  create: (data: { name: string; description?: string; criteria: Array<{ name: string; type: string; description?: string; isRequired: boolean; position: number; allowNotes?: boolean; notesLabel?: string; notesPlaceholder?: string; notesRequired?: boolean }> }) =>
    api.post<ScorecardDto>('/scorecards', data),
  update: (id: string, data: { name?: string; description?: string; criteria?: Array<{ name: string; type: string; description?: string; isRequired: boolean; position: number; allowNotes?: boolean; notesLabel?: string; notesPlaceholder?: string; notesRequired?: boolean }> }) =>
    api.patch<ScorecardDto>(`/scorecards/${id}`, data),
  delete: (id: string) => api.delete<void>(`/scorecards/${id}`),
};

// ── Evaluations ───────────────────────────────────────────────────────────────

export interface EvaluationResponseDto {
  id: string;
  criterionId: string;
  criterionName: string;
  criterionType: string;
  responseValue: string;
  responseNotes: string;
  allowNotes: boolean;
  notesLabel: string;
}

export interface EvaluationDto {
  id: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  stageId: string | null;
  stageName: string | null;
  stageType: string | null;
  scorecardId: string | null;
  scorecardName: string | null;
  submittedByName: string;
  overallRecommendation: string | null;
  notes: string | null;
  status: string; // pending | in-progress | submitted
  responses: EvaluationResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export const evaluationsApi = {
  getByCandidate: (candidateId: string) =>
    api.get<{ evaluations: EvaluationDto[] }>(`/evaluations/candidate/${candidateId}`),
  create: (data: {
    candidateId: string;
    jobId: string;
    stageId?: string;
    scorecardId?: string;
    overallRecommendation?: string;
    notes?: string;
    status?: string;
    responses: Array<{ criterionId: string; responseValue: string; responseNotes?: string }>;
  }) => api.post<{ evaluation: EvaluationDto }>('/evaluations', data),
  update: (id: string, data: {
    overallRecommendation?: string;
    notes?: string;
    status?: string;
    responses?: Array<{ criterionId: string; responseValue: string; responseNotes?: string }>;
  }) => api.patch<{ evaluation: EvaluationDto }>(`/evaluations/${id}`, data),
};

// ── Audit Logs (GDPR) ─────────────────────────────────────────────────────

export interface AuditLogEntryDto {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogPageDto {
  items: AuditLogEntryDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const auditLogsApi = {
  getAll: (params?: { page?: number; limit?: number; action?: string; resourceType?: string; actorId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.action) qs.set('action', params.action);
    if (params?.resourceType) qs.set('resourceType', params.resourceType);
    if (params?.actorId) qs.set('actorId', params.actorId);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const query = qs.toString();
    return api.get<AuditLogPageDto>(`/gdpr/audit-logs${query ? `?${query}` : ''}`);
  },
  getCandidateLogs: (candidateId: string) =>
    api.get<{ items: AuditLogEntryDto[] }>(`/gdpr/audit-logs/candidate/${candidateId}`),
};

// ── Data Retention (GDPR) ──────────────────────────────────────────────────

export interface RetentionCandidateDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  retentionStatus: string;
  retentionExpiresAt: string | null;
  lastActivityAt: string | null;
  deletedAt: string | null;
  isAnonymised: boolean;
  retentionLabel: string;
}

export const retentionApi = {
  fetchCandidates: () =>
    api.get<{ items: RetentionCandidateDto[] }>('/gdpr/retention/candidates'),
  runReview: () =>
    api.post<{ expiringSoon: number; expired: number; overdueRequests: number; processed: number }>('/gdpr/retention/review'),
  anonymise: (candidateId: string) =>
    api.post<{ anonymisedAt: string }>(`/candidates/${candidateId}/anonymise`),
};

// ── Rights Requests (GDPR) ────────────────────────────────────────────────

export interface RightsRequestDto {
  id: string;
  candidateId: string | null;
  candidateName: string | null;
  candidateEmail: string | null;
  requesterEmail: string;
  requestType: string;
  status: string;
  receivedAt: string;
  dueAt: string;
  fulfilledAt: string | null;
  fulfilledBy: string | null;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface RightsRequestPageDto {
  items: RightsRequestDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const rightsRequestsApi = {
  fetchAll: (params?: { page?: number; limit?: number; status?: string; requestType?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.status) qs.set('status', params.status);
    if (params?.requestType) qs.set('requestType', params.requestType);
    const query = qs.toString();
    return api.get<RightsRequestPageDto>(`/gdpr/rights-requests${query ? `?${query}` : ''}`);
  },
  create: (data: { requesterEmail: string; requestType: string; receivedAt: string; candidateId?: string; notes?: string }) =>
    api.post<{ request: RightsRequestDto }>('/gdpr/rights-requests', data),
  update: (id: string, data: { status?: string; notes?: string; rejectionReason?: string }) =>
    api.patch<{ request: RightsRequestDto }>(`/gdpr/rights-requests/${id}`, data),
  downloadExport: async (requestId: string) => {
    const res = await fetch(`${BASE_URL}/gdpr/rights-requests/${requestId}/export`, { credentials: 'include' });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidate-export-${requestId.slice(-6)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  },
  fulfilErasure: (requestId: string) =>
    api.post<{ fulfilled: boolean; candidateDeleted: boolean }>(`/gdpr/rights-requests/${requestId}/fulfil-erasure`),
};

// ── RoPA Register (GDPR) ──────────────────────────────────────────────────

export interface RopaEntryDto {
  id: string;
  processingActivity: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  dataSubjects: string;
  recipients: string;
  retentionPeriod: string;
  securityMeasures: string;
  transfersOutsideEEA: boolean;
  transferMechanism: string | null;
  lastReviewedAt: string | null;
  lastReviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ropaApi = {
  fetchEntries: () =>
    api.get<{ entries: RopaEntryDto[] }>('/gdpr/ropa'),
  createEntry: (data: Omit<RopaEntryDto, 'id' | 'lastReviewedAt' | 'lastReviewedBy' | 'createdAt' | 'updatedAt'>) =>
    api.post<{ entry: RopaEntryDto }>('/gdpr/ropa', data),
  updateEntry: (id: string, data: Partial<Omit<RopaEntryDto, 'id' | 'lastReviewedAt' | 'lastReviewedBy' | 'createdAt' | 'updatedAt'>>) =>
    api.patch<{ entry: RopaEntryDto }>(`/gdpr/ropa/${id}`, data),
  markReviewed: (id: string) =>
    api.post<{ entry: RopaEntryDto }>(`/gdpr/ropa/${id}/review`),
};

// ─── Rejection Reasons ──────────────────────────────────────────────────────

export interface RejectionReasonDto {
  id: string;
  label: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const rejectionReasonsApi = {
  fetchAll: () =>
    api.get<{ reasons: RejectionReasonDto[] }>('/settings/rejection-reasons').then((d) => d.reasons),
  create: (data: { label: string; description?: string }) =>
    api.post<{ reason: RejectionReasonDto }>('/settings/rejection-reasons', data).then((d) => d.reason),
  update: (id: string, data: { label?: string; description?: string; isActive?: boolean; sortOrder?: number }) =>
    api.patch<{ reason: RejectionReasonDto }>(`/settings/rejection-reasons/${id}`, data).then((d) => d.reason),
  remove: (id: string) =>
    api.delete<{ id: string }>(`/settings/rejection-reasons/${id}`),
};

// ─── Calendar Integration ────────────────────────────────────────────────────

export interface CalendarStatusDto {
  connected: boolean;
  email?: string;
  calendarId?: string;
  provider?: string;
}

export interface BusyIntervalDto {
  start: string;
  end: string;
}

export const calendarApi = {
  getAuthUrl: () =>
    api.get<{ url: string }>('/calendar/auth-url').then((d) => d.url),
  getConnectUrl: () =>
    api.get<{ url: string }>('/calendar/connect').then((d) => d.url),
  getStatus: () =>
    api.get<CalendarStatusDto>('/calendar/status'),
  disconnect: () =>
    api.delete<{ disconnected: boolean }>('/calendar/disconnect'),
  getFreeBusy: (params: { userIds: string[]; timeMin: string; timeMax: string; timezone?: string }) =>
    api.post<{ busySlots: Record<string, BusyIntervalDto[]>; warnings: string[] }>('/calendar/free-busy', params),
  createEvent: (params: {
    interviewId: string;
    attendeeEmails?: string[];
    startTime: string;
    endTime: string;
    timezone?: string;
    addMeetLink?: boolean;
  }) => api.post<{ eventId: string; meetLink?: string }>('/calendar/events', params),
  updateEvent: (eventId: string, params: {
    startTime?: string;
    endTime?: string;
    title?: string;
    description?: string;
  }) => api.put<{ updated: boolean }>(`/calendar/events/${eventId}`, params),
  cancelEvent: (eventId: string) =>
    api.delete<{ cancelled: boolean }>(`/calendar/events/${eventId}`),
};

// ── Scheduling ────────────────────────────────────────────────────────────────

export interface TimeSlotDto {
  start: string;
  end: string;
}

export interface SuggestSlotsResponse {
  slots: TimeSlotDto[];
  warnings?: string[];
}

export interface SchedulingLinkDto {
  id: string;
  token: string;
  url: string;
  expiresAt: string;
  durationMinutes: number;
  timezone: string;
  slots: { id: string; startTime: string; endTime: string }[];
}

export interface SchedulingLinkSummaryDto {
  id: string;
  token: string;
  durationMinutes: number;
  timezone: string;
  expiresAt: string;
  usedAt: string | null;
  createdBy: string;
  createdAt: string;
  slotCount: number;
  bookedSlots: number;
}

export interface PublicSchedulingLinkDto {
  jobTitle: string;
  companyName: string;
  durationMinutes: number;
  timezone: string;
  expiresAt: string;
  slots: { id: string; startTime: string; endTime: string }[];
}

export const schedulingApi = {
  suggestSlots: (params: {
    interviewerUserIds: string[];
    durationMinutes: number;
    bufferBefore: number;
    bufferAfter: number;
    windowStart: string;
    windowEnd: string;
    timezone: string;
  }) => api.post<SuggestSlotsResponse>('/scheduling/suggest-slots', params),

  createLink: (params: {
    applicationId: string;
    interviewerUserIds: string[];
    durationMinutes: number;
    bufferBefore: number;
    bufferAfter: number;
    expiresInHours: number;
    timezone: string;
  }) => api.post<SchedulingLinkDto>('/scheduling/links', params),

  getLinksByApplication: (applicationId: string) =>
    api.get<{ links: SchedulingLinkSummaryDto[] }>(`/scheduling/links/${applicationId}`).then((d) => d.links),

  getPublicLink: (token: string) =>
    api.get<PublicSchedulingLinkDto>(`/scheduling/public/${token}`),

  bookSlot: (token: string, slotId: string) =>
    api.post<{ message: string }>(`/scheduling/public/${token}/book`, { slotId }),

  rescheduleInterview: (id: string, params: { newStart: string; newEnd: string }) =>
    api.put<{ id: string; scheduledAt: string; duration: number; status: string }>(
      `/scheduling/interviews/${id}/reschedule`, params,
    ),

  cancelInterview: (id: string, reason?: string) =>
    api.delete<{ message: string }>(`/scheduling/interviews/${id}`, { reason }),
};

// ── Comments ──────────────────────────────────────────────────────────────────

export interface CommentAuthorDto {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface MentionDto {
  id: string;
  userId: string;
  user: { id: string; firstName: string; lastName: string };
}

export interface CandidateCommentDto {
  id: string;
  candidateId: string;
  applicationId: string | null;
  authorId: string;
  author: CommentAuthorDto;
  body: string;
  mentions: MentionDto[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DeletedCommentDto {
  id: string;
  deletedAt: string;
  body: null;
  createdAt: string;
}

export type CommentDto = CandidateCommentDto | DeletedCommentDto;

export interface CommentListResponse {
  comments: CommentDto[];
  total: number;
  page: number;
  pageSize: number;
}

// Feedback workflow
export interface FeedbackRequestItemDto {
  userId: string;
  userName: string;
  status: 'PENDING' | 'SUBMITTED' | 'OVERDUE';
  submittedAt: string | null;
  scorecard: { rating: number; recommendation: string; notes: string } | null;
  locked: boolean;
}

export interface FeedbackStatusResponseDto {
  requests: FeedbackRequestItemDto[];
  summary: { total: number; submitted: number; pending: number; overdue: number };
}

export const feedbackApi = {
  getStatus: (interviewId: string) =>
    api.get<FeedbackStatusResponseDto>(`/interviews/${interviewId}/feedback-status`),
  submit: (interviewId: string, data: { rating: number; recommendation: Recommendation; notes: string }) =>
    api.post<{ submitted: boolean }>(`/interviews/${interviewId}/feedback-submit`, data),
};

// Timeline
export interface TimelineEventDto {
  id: string;
  type: string;
  actorName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export const timelineApi = {
  list: (candidateId: string, applicationId?: string) => {
    const qs = applicationId ? `?applicationId=${applicationId}` : '';
    return api.get<{ events: TimelineEventDto[] }>(`/candidates/${candidateId}/timeline${qs}`);
  },
};

export const commentsApi = {
  list: (candidateId: string, params?: { applicationId?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.applicationId) qs.set('applicationId', params.applicationId);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const query = qs.toString();
    return api.get<CommentListResponse>(`/candidates/${candidateId}/comments${query ? `?${query}` : ''}`);
  },

  create: (candidateId: string, body: { body: string; applicationId?: string }) =>
    api.post<{ comment: CandidateCommentDto }>(`/candidates/${candidateId}/comments`, body),

  delete: (candidateId: string, commentId: string) =>
    api.delete<{ deleted: boolean }>(`/candidates/${candidateId}/comments/${commentId}`),
};

// Invitations
export interface InvitationDto {
  id: string;
  email: string;
  role: string;
  token: string;
  jobIds: string[];
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
}

export const invitationsApi = {
  create: (email: string, role: string, jobIds?: string[]) =>
    api.post<{ invitation: InvitationDto }>('/invitations', { email, role, jobIds }),
  list: () =>
    api.get<{ invitations: InvitationDto[] }>('/invitations'),
  validate: (token: string) =>
    api.get<{ invitation: InvitationDto }>(`/invitations/${token}`),
  accept: (token: string) =>
    api.post<{ invitation: InvitationDto }>(`/invitations/${token}/accept`),
  cancel: (id: string) =>
    api.delete<{ deleted: boolean }>(`/invitations/${id}`),
};

