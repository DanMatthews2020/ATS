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

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { body, ...rest } = options;

  const init: RequestInit = {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(rest.headers ?? {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, init);

  // ── Auto-refresh on 401 ──────────────────────────────────────────────────
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retry = await fetch(`${BASE_URL}${endpoint}`, init);
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
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retry = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
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
  patch:  <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(url, { ...opts, method: 'PATCH', body }),
  delete: <T>(url: string, opts?: FetchOptions) =>
    request<T>(url, { ...opts, method: 'DELETE' }),
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

export interface PipelineApplicationDto {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  candidateLocation: string | null;
  cvUrl: string | null;
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
  getJobs: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<JobListingDto>>(`/jobs?page=${page}&limit=${limit}`),
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
  getJobApplications: (jobId: string) =>
    api.get<{ applications: PipelineApplicationDto[] }>(`/jobs/${jobId}/applications`),
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
  source: string;
  skills: string[];
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
  }[];
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
  updateNotes: (id: string, notes: string) =>
    api.patch<{ id: string; notes: string; updatedAt: string }>(
      `/applications/${id}/notes`,
      { notes },
    ),
};
