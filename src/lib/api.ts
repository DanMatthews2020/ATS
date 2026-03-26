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
  getPipelineStats: () =>
    api.get<{ stats: JobPipelineStatsDto }>('/jobs/pipeline-stats'),
  getJobPipelineStats: (id: string) =>
    api.get<{ stats: JobPipelineStageCounts }>(`/jobs/${id}/pipeline-stats`),
  getJobCandidates: (jobId: string, stage: string) =>
    api.get<{ candidates: PipelineApplicationDto[] }>(`/jobs/${jobId}/candidates?stage=${encodeURIComponent(stage)}`),
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
  tags: string[];
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
  meetingLink:   string | null;
  location:      string | null;
  feedback:      FeedbackEntryDto | null;
  notes:         string;
  createdAt:     string;
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
  getFeedback: (id: string) => api.get<{ feedback: CandidateFeedbackDto[] }>(`/candidates/${id}/feedback`),
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

// ── Sequences ─────────────────────────────────────────────────────────────────

export interface SequenceStepDto {
  id: string;
  sequenceId: string;
  position: number;
  type: 'EMAIL' | 'WAIT' | 'TASK';
  templateId: string | null;
  templateName: string | null;
  waitDays: number | null;
  taskDescription: string | null;
  sendTime: string | null;
}

export interface SequenceDto {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED';
  stepCount: number;
  enrolledCount: number;
  stopOnReply: boolean;
  stopOnInterview: boolean;
  maxEmails: number;
  sendingDays: string[];
  steps: SequenceStepDto[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceEnrollmentDto {
  id: string;
  sequenceId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  currentStep: number;
  status: 'ACTIVE' | 'COMPLETED' | 'STOPPED';
  enrolledAt: string;
  completedAt: string | null;
  stoppedAt: string | null;
  stoppedReason: string | null;
}

export const sequencesApi = {
  getAll: () =>
    api.get<{ sequences: SequenceDto[] }>('/sequences'),
  getById: (id: string) =>
    api.get<{ sequence: SequenceDto }>(`/sequences/${id}`),
  create: (data: { name: string; stopOnReply?: boolean; stopOnInterview?: boolean; maxEmails?: number; sendingDays?: string[] }) =>
    api.post<{ sequence: SequenceDto }>('/sequences', data),
  update: (id: string, data: { name?: string; status?: 'ACTIVE' | 'PAUSED'; stopOnReply?: boolean; stopOnInterview?: boolean; maxEmails?: number; sendingDays?: string[] }) =>
    api.patch<{ sequence: SequenceDto }>(`/sequences/${id}`, data),
  delete: (id: string) =>
    api.delete<{ deleted: boolean }>(`/sequences/${id}`),
  toggleStatus: (id: string, status: 'ACTIVE' | 'PAUSED') =>
    api.patch<{ sequence: SequenceDto }>(`/sequences/${id}/status`, { status }),
  addStep: (id: string, data: { type: 'EMAIL' | 'WAIT' | 'TASK'; templateId?: string; waitDays?: number; taskDescription?: string; sendTime?: string }) =>
    api.post<{ step: SequenceStepDto }>(`/sequences/${id}/steps`, data),
  updateStep: (id: string, stepId: string, data: Partial<SequenceStepDto>) =>
    api.patch<{ step: SequenceStepDto }>(`/sequences/${id}/steps/${stepId}`, data),
  deleteStep: (id: string, stepId: string) =>
    api.delete<{ deleted: boolean }>(`/sequences/${id}/steps/${stepId}`),
  getEnrollments: (id: string) =>
    api.get<{ enrollments: SequenceEnrollmentDto[] }>(`/sequences/${id}/enrolled`),
  enroll: (id: string, candidateId: string) =>
    api.post<{ enrollment: SequenceEnrollmentDto }>(`/sequences/${id}/enroll`, { candidateId }),
  unenroll: (id: string, candidateId: string) =>
    api.delete<{ enrollment: SequenceEnrollmentDto }>(`/sequences/${id}/enroll/${candidateId}`),
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
  create: (data: { name: string; description?: string; criteria: Array<{ name: string; type: string; description?: string; isRequired: boolean; position: number }> }) =>
    api.post<ScorecardDto>('/scorecards', data),
  update: (id: string, data: { name?: string; description?: string; criteria?: Array<{ name: string; type: string; description?: string; isRequired: boolean; position: number }> }) =>
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
    responses: Array<{ criterionId: string; responseValue: string }>;
  }) => api.post<EvaluationDto>('/evaluations', data),
  update: (id: string, data: {
    overallRecommendation?: string;
    notes?: string;
    status?: string;
    responses?: Array<{ criterionId: string; responseValue: string }>;
  }) => api.patch<EvaluationDto>(`/evaluations/${id}`, data),
};
