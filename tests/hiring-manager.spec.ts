import { test, expect } from '@playwright/test';

const AUTH_ADMIN = { success: true, data: { user: { id: '1', email: 'admin@ordios.com', firstName: 'Admin', lastName: 'User', role: 'ADMIN', avatarUrl: null } } };
const AUTH_MANAGER = { success: true, data: { user: { id: '2', email: 'manager@ordios.com', firstName: 'Manager', lastName: 'User', role: 'MANAGER', avatarUrl: null } } };
const GOOGLE_STATUS = { success: true, data: { configured: true } };

const MOCK_MANAGER_DASHBOARD = {
  success: true,
  data: {
    myJobs: [
      { id: 'j1', title: 'Software Engineer', department: 'Engineering', location: 'London', status: 'OPEN', applicantCount: 12 },
      { id: 'j2', title: 'Product Designer', department: 'Design', location: 'Remote', status: 'OPEN', applicantCount: 5 },
    ],
    pendingFeedback: [
      { interviewId: 'iv1', candidateName: 'Jane Doe', jobTitle: 'Software Engineer', scheduledAt: new Date().toISOString(), type: 'TECHNICAL' },
    ],
    upcomingInterviews: [
      { id: 'iv2', candidateName: 'John Smith', jobTitle: 'Software Engineer', scheduledAt: new Date(Date.now() + 86400000).toISOString(), duration: 60, type: 'VIDEO', meetingLink: 'https://meet.google.com/abc' },
    ],
    recentActivity: [
      { id: 'e1', type: 'STAGE_CHANGE', description: 'Jane Doe moved to Technical Interview', createdAt: new Date().toISOString() },
    ],
    stats: { totalJobs: 2, totalCandidates: 17, pendingFeedbackCount: 1, upcomingInterviewCount: 1 },
  },
};

const MOCK_JOB = {
  success: true,
  data: {
    job: {
      id: 'j1', title: 'Software Engineer', department: 'Engineering',
      location: 'London', type: 'full-time', status: 'open',
      description: 'Build stuff', salaryMin: 60000, salaryMax: 90000,
      postedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), applications: [],
    },
  },
};

const MOCK_STAGES = {
  success: true,
  data: {
    stages: [
      { id: 's1', stageName: 'Applied', stageType: 'INTERVIEW', position: 0, requiresScorecard: false },
      { id: 's2', stageName: 'Technical', stageType: 'INTERVIEW', position: 1, requiresScorecard: true },
    ],
  },
};

const MOCK_MEMBERS = { success: true, data: { members: [] } };
const MOCK_STATS = { success: true, data: { stats: { applicationReview: 5, active: 3, pendingOffer: 1 } } };
const MOCK_APPLICATIONS = {
  success: true,
  data: {
    applications: [
      {
        id: 'a1', candidateId: 'c1', candidateName: 'Jane Doe',
        candidateEmail: 'jane@example.com', candidatePhone: null,
        candidateLocation: 'London', cvUrl: null, source: 'JOB_BOARD',
        status: 'applied', stage: 'Applied', notes: null,
        appliedAt: new Date().toISOString(), lastUpdated: new Date().toISOString(),
        skills: ['TypeScript'], interviewCount: 0, interviewRatings: [],
        offerStatus: null, score: 80,
      },
    ],
  },
};

const MOCK_CANDIDATE = {
  id: 'c1', firstName: 'Jane', lastName: 'Doe',
  email: 'jane@example.com', phone: '+44 7700 900000',
  source: 'JOB_BOARD', skills: ['TypeScript'], tags: [],
  location: 'London', currentCompany: null,
  doNotContact: false, doNotContactReason: null,
  deletedAt: null, isAnonymised: false,
  legalBasis: 'LEGITIMATE_INTERESTS', retentionStatus: 'ACTIVE',
  linkedInUrl: null, retentionExpiresAt: null,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  applications: [{
    id: 'a1', jobPostingId: 'j1', jobId: 'j1', jobTitle: 'Software Engineer',
    status: 'applied', stage: 'screening',
    appliedAt: new Date().toISOString(),
    interviews: [], rejection: null,
    rejectionReasonId: null, rejectionNotes: null,
  }],
};

function setupManagerJobRoutes(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_MANAGER) }),
    ),
    page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GOOGLE_STATUS) }),
    ),
    page.route('**/api/jobs/j1', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_JOB) }),
    ),
    page.route('**/api/jobs/j1/stages', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_STAGES) }),
    ),
    page.route('**/api/jobs/j1/members', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_MEMBERS) }),
    ),
    page.route('**/api/jobs/j1/pipeline-stats', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_STATS) }),
    ),
    page.route('**/api/jobs/j1/applications', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_APPLICATIONS) }),
    ),
  ]);
}

// ── Test: Manager sees scoped dashboard ──────────────────────────────────────

test.describe('Hiring Manager - Dashboard', () => {
  test('MANAGER sees scoped dashboard with assigned jobs', async ({ page }) => {
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_MANAGER) }),
    );
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GOOGLE_STATUS) }),
    );
    await page.route('**/api/manager-dashboard', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_MANAGER_DASHBOARD) }),
    );

    await page.goto('/dashboard');

    // Should see "My Dashboard" heading
    await expect(page.getByText('My Dashboard')).toBeVisible();

    // Should see assigned jobs
    await expect(page.getByText('Software Engineer').first()).toBeVisible();
    await expect(page.getByText('Product Designer')).toBeVisible();

    // Should see stat labels
    await expect(page.getByText('My Jobs').first()).toBeVisible();
    await expect(page.getByText('Total Candidates')).toBeVisible();

    // Should see pending feedback section
    await expect(page.getByText('Pending Feedback').first()).toBeVisible();
    await expect(page.getByText('Jane Doe').first()).toBeVisible();
  });
});

// ── Test: Manager cannot move pipeline stage ─────────────────────────────────

test.describe('Hiring Manager - Pipeline Read-Only', () => {
  test('MANAGER cannot drag candidates in Kanban board', async ({ page }) => {
    await setupManagerJobRoutes(page);

    await page.goto('/jobs/j1');

    // Wait for the pipeline tab to load with candidate
    await expect(page.getByText('Jane Doe')).toBeVisible();

    // The "Add candidate" plus button should NOT be visible (readOnly hides it)
    const addButtons = page.locator('button[title*="Add candidate"]');
    await expect(addButtons).toHaveCount(0);
  });
});

// ── Test: Manager cannot reject on candidate profile ─────────────────────────

test.describe('Hiring Manager - Candidate Controls', () => {
  test('MANAGER does not see Reject button or admin actions on candidate', async ({ page }) => {
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_MANAGER) }),
    );
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GOOGLE_STATUS) }),
    );
    await page.route('**/api/candidates/c1', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { candidate: MOCK_CANDIDATE } }) }),
    );
    await page.route('**/api/candidates/c1/feed', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { feed: [] } }) }),
    );
    await page.route('**/api/rejection-reasons', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { reasons: [] } }) }),
    );

    await page.goto('/candidates/c1');

    // Should see candidate name
    await expect(page.getByText('Jane Doe')).toBeVisible();

    // Should NOT see Reject button
    await expect(page.getByRole('button', { name: /reject/i })).not.toBeVisible();

    // Should NOT see "More" dropdown (admin actions)
    await expect(page.getByRole('button', { name: /more/i })).not.toBeVisible();

    // Should see Schedule Interview and Submit Feedback buttons
    await expect(page.getByRole('button', { name: /schedule interview/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /submit feedback/i })).toBeVisible();
  });
});

// ── Test: Admin still sees full controls ─────────────────────────────────────

test.describe('Hiring Manager - Admin Retains Full Access', () => {
  test('ADMIN sees Reject and More dropdown on candidate', async ({ page }) => {
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_ADMIN) }),
    );
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GOOGLE_STATUS) }),
    );
    await page.route('**/api/candidates/c1', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { candidate: MOCK_CANDIDATE } }) }),
    );
    await page.route('**/api/candidates/c1/feed', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { feed: [] } }) }),
    );
    await page.route('**/api/rejection-reasons', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { reasons: [] } }) }),
    );

    await page.goto('/candidates/c1');

    // Should see candidate name
    await expect(page.getByText('Jane Doe')).toBeVisible();

    // ADMIN should see Reject button
    await expect(page.getByRole('button', { name: /reject/i })).toBeVisible();

    // ADMIN should see More dropdown
    await expect(page.getByRole('button', { name: /more/i })).toBeVisible();
  });
});
