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
  status: string; // 'open' | 'closed' | 'draft'
  description: string;
  applicantCount: number;
  postedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const jobsApi = {
  getJobs: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<JobListingDto>>(`/jobs?page=${page}&limit=${limit}`),
};

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

export const candidatesApi = {
  getTracking: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<CandidateTrackingDto>>(
      `/candidates/tracking?page=${page}&limit=${limit}`,
    ),
};
