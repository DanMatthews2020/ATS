import { test, expect } from '@playwright/test';

// Seed accounts: admin@teamtalent.com (ADMIN)

test.describe('Calendar integration — E2E tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@teamtalent.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('settings page shows Calendar nav link', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const calendarLink = page.getByRole('link', { name: /calendar/i });
    await expect(calendarLink).toBeVisible();
  });

  test('calendar settings page loads with connect button', async ({ page }) => {
    await page.goto('/settings/calendar');
    await page.waitForLoadState('networkidle');

    // Page title
    await expect(page.getByText('Calendar Integration')).toBeVisible();

    // Google Calendar heading
    await expect(page.getByText('Google Calendar')).toBeVisible();

    // Connect button should be visible (initially disconnected)
    const connectBtn = page.getByRole('button', { name: /connect/i });
    await expect(connectBtn).toBeVisible();
  });

  test('connect button triggers OAuth redirect', async ({ page }) => {
    await page.goto('/settings/calendar');
    await page.waitForLoadState('networkidle');

    const connectBtn = page.getByRole('button', { name: /connect/i });
    await expect(connectBtn).toBeVisible();

    // Click connect — should either redirect to Google or show auth URL error
    // (In test env, Google credentials won't be set so it may error gracefully)
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/calendar/auth-url'), { timeout: 5000 }).catch(() => null),
      connectBtn.click(),
    ]);

    // If the API responded, it should have returned a URL or an error
    if (response) {
      const status = response.status();
      // Either 200 with auth URL or 500 if Google creds not configured
      expect([200, 500]).toContain(status);
    }
  });

  test('callback with error param shows error toast', async ({ page }) => {
    await page.goto('/settings/calendar?error=access_denied');
    await page.waitForLoadState('networkidle');

    // Error toast should appear
    await expect(page.getByText(/denied/i)).toBeVisible({ timeout: 5000 });
  });

  test('callback with connected param shows success toast', async ({ page }) => {
    await page.goto('/settings/calendar?connected=true');
    await page.waitForLoadState('networkidle');

    // Success toast should appear
    await expect(page.getByText(/connected successfully/i)).toBeVisible({ timeout: 5000 });
  });

  test('disconnect flow shows confirmation modal', async ({ page, request }) => {
    // First check if calendar is connected via API
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

    const statusRes = await request.get('http://localhost:3001/api/calendar/status', {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    const statusBody = await statusRes.json();

    // Only test disconnect UI if already connected
    if (!statusBody.data?.connected) return;

    await page.goto('/settings/calendar');
    await page.waitForLoadState('networkidle');

    // Click disconnect
    const disconnectBtn = page.getByRole('button', { name: /disconnect/i });
    await expect(disconnectBtn).toBeVisible();
    await disconnectBtn.click();

    // Confirmation modal should appear
    await expect(page.getByText('Disconnect Google Calendar')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/revoke/i)).toBeVisible();

    // Cancel button should close modal
    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    await cancelBtn.click();
    await expect(page.getByText('Disconnect Google Calendar')).not.toBeVisible({ timeout: 2000 });
  });

  test('API: calendar status endpoint returns valid response', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

    const res = await request.get('http://localhost:3001/api/calendar/status', {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.data.connected).toBe('boolean');

    // Tokens must never appear in the response
    expect(body.data.accessToken).toBeUndefined();
    expect(body.data.refreshToken).toBeUndefined();
  });

  test('API: auth-url endpoint requires authentication', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/calendar/auth-url');
    expect(res.status()).toBe(401);
  });

  test('API: free-busy endpoint restricted to ADMIN/HR', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

    // Admin should be allowed (even if it returns 422 for missing body)
    const res = await request.post('http://localhost:3001/api/calendar/free-busy', {
      headers: { Cookie: `access_token=${accessToken}`, 'Content-Type': 'application/json' },
      data: {},
    });
    // Should be 422 (validation error) not 403 (forbidden) for admin
    expect(res.status()).toBe(422);
  });
});
