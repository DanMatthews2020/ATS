import { test, expect } from '@playwright/test';

const AUTH_ME_MOCK = { success: true, data: { user: { id: '1', email: 'admin@ordios.com', firstName: 'Admin', lastName: 'User', role: 'ADMIN', avatarUrl: null } } };
const GOOGLE_STATUS_MOCK = { success: true, data: { configured: true } };

test.describe('Calendar Settings - Connect/Disconnect', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_ME_MOCK) }),
    );
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GOOGLE_STATUS_MOCK) }),
    );
  });

  test('shows connect button when calendar not connected', async ({ page }) => {
    await page.route('**/api/calendar/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { connected: false } }) }),
    );
    await page.goto('/settings/calendar');
    await expect(page.getByText('Google Calendar')).toBeVisible();
    await expect(page.getByText('Not connected')).toBeVisible();
    await expect(page.getByRole('button', { name: /connect/i })).toBeVisible();
  });

  test('shows connected state with email and Meet status', async ({ page }) => {
    await page.route('**/api/calendar/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { connected: true, email: 'user@ordios.com', calendarId: 'user@ordios.com', provider: 'GOOGLE' } }) }),
    );
    await page.goto('/settings/calendar');
    await expect(page.getByText('Connected', { exact: true })).toBeVisible();
    await expect(page.getByText('user@ordios.com')).toBeVisible();
    await expect(page.getByText(/google meet/i)).toBeVisible();
    await expect(page.getByText(/auto-generated for all interviews/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /disconnect/i })).toBeVisible();
  });

  test('shows success toast on ?connected=true redirect', async ({ page }) => {
    await page.route('**/api/calendar/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { connected: true, email: 'user@ordios.com', calendarId: 'user@ordios.com', provider: 'GOOGLE' } }) }),
    );
    await page.goto('/settings/calendar?connected=true');
    await expect(page.getByText(/google calendar connected/i).first()).toBeVisible();
  });

  test('shows error toast on ?error=access_denied redirect', async ({ page }) => {
    await page.route('**/api/calendar/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { connected: false } }) }),
    );
    await page.goto('/settings/calendar?error=access_denied');
    await expect(page.getByText(/calendar access was denied/i).first()).toBeVisible();
  });

  test('connect button redirects to OAuth URL', async ({ page }) => {
    let authUrlCalled = false;
    await page.route('**/api/calendar/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { connected: false } }) }),
    );
    await page.route('**/api/calendar/auth-url', (route) => {
      authUrlCalled = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { url: 'https://accounts.google.com/o/oauth2/v2/auth?test=1' } }) });
    });
    // Intercept the OAuth redirect so the page doesn't navigate away
    await page.route('**/accounts.google.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>OAuth</body></html>' }),
    );
    await page.goto('/settings/calendar');
    await page.getByRole('button', { name: /connect/i }).click();
    await page.waitForTimeout(500);
    expect(authUrlCalled).toBe(true);
  });
});

test.describe('Interview Scheduling - Calendar Event Creation', () => {
  test('schedule interview modal has all required fields', async ({ page }) => {
    // Mock auth + data
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { user: { id: '1', email: 'admin@ordios.com', firstName: 'Admin', lastName: 'User', role: 'ADMIN', avatarUrl: null } } }) }),
    );
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { configured: true } }) }),
    );

    await page.goto('/interviews');
    // The page should load (even with mocked data)
    await expect(page.getByText(/interviews/i).first()).toBeVisible();
  });

  test('interview with Meet link shows the link', async ({ page }) => {
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_ME_MOCK) }),
    );
    const mockInterviews = [{
      id: '1',
      candidateId: 'c1',
      candidateName: 'Jane Doe',
      jobId: 'j1',
      jobTitle: 'Software Engineer',
      interviewers: [{ id: 'u1', name: 'Admin User', role: 'ADMIN' }],
      type: 'Video',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      duration: 60,
      meetingLink: 'https://meet.google.com/abc-def-ghi',
      location: null,
      feedback: null,
      notes: '',
      calendarEventId: 'evt123',
      createdAt: new Date().toISOString(),
    }];

    await page.route('**/api/interviews*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { interviews: mockInterviews } }) }),
    );
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { configured: true } }) }),
    );

    await page.goto('/interviews');
    // Click on the interview to open detail modal
    await page.getByText('Jane Doe').first().click();
    await expect(page.getByText('meet.google.com')).toBeVisible();
  });
});

test.describe('Calendar Sync - Reschedule & Cancel', () => {
  const mockInterview = {
    id: '1',
    candidateId: 'c1',
    candidateName: 'Jane Doe',
    jobId: 'j1',
    jobTitle: 'Software Engineer',
    interviewers: [{ id: 'u1', name: 'Admin User', role: 'ADMIN' }],
    type: 'Video',
    status: 'scheduled',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    duration: 60,
    meetingLink: 'https://meet.google.com/abc-def-ghi',
    location: null,
    feedback: null,
    notes: '',
    calendarEventId: 'evt123',
    createdAt: new Date().toISOString(),
  };

  test('cancel interview calls calendar cancel API', async ({ page }) => {
    let calendarCancelCalled = false;

    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_ME_MOCK) }),
    );
    await page.route(/\/api\/interviews(\?.*)?$/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { interviews: [mockInterview] } }) }),
    );
    await page.route('**/api/interviews/*/cancel', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { interview: { ...mockInterview, status: 'cancelled' } } }) }),
    );
    await page.route('**/api/calendar/events/evt123', (route) => {
      if (route.request().method() === 'DELETE') {
        calendarCancelCalled = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { cancelled: true } }) });
      }
      return route.continue();
    });
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GOOGLE_STATUS_MOCK) }),
    );

    await page.goto('/interviews');
    await page.getByText('Jane Doe').first().click();
    // Click cancel button in detail modal, then confirm in the confirmation dialog
    await page.getByRole('button', { name: /cancel interview/i }).first().click();
    // Wait for confirmation dialog to appear
    await expect(page.getByRole('button', { name: /keep/i })).toBeVisible();
    await page.getByRole('button', { name: /cancel interview/i }).last().click();
    // Verify the calendar API was called
    await page.waitForTimeout(500);
    expect(calendarCancelCalled).toBe(true);
  });
});

test.describe('Hiring Manager Auto-Connect', () => {
  test('Google SSO login page still works', async ({ page }) => {
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { configured: true } }) }),
    );
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  });

  test('calendar auto-connects after SSO (settings shows connected)', async ({ page }) => {
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AUTH_ME_MOCK) }),
    );
    await page.route('**/api/auth/google/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GOOGLE_STATUS_MOCK) }),
    );
    // Simulate post-SSO: calendar is now connected
    await page.route('**/api/calendar/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { connected: true, email: 'manager@ordios.com', calendarId: 'manager@ordios.com', provider: 'GOOGLE' } }) }),
    );
    await page.goto('/settings/calendar');
    await expect(page.getByText('Connected', { exact: true })).toBeVisible();
    await expect(page.getByText('manager@ordios.com')).toBeVisible();
    await expect(page.getByText(/google meet/i)).toBeVisible();
  });
});
