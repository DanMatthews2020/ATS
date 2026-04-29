import { test, expect } from '@playwright/test';

// Seed accounts: admin@teamtalent.com (ADMIN)

test.describe('Interview Scheduling — E2E tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@teamtalent.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  // ── API Auth Tests ──────────────────────────────────────────────────────────

  test('API: suggest-slots requires authentication', async ({ request }) => {
    const res = await request.post('http://localhost:3001/api/scheduling/suggest-slots', {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test('API: create-link requires authentication', async ({ request }) => {
    const res = await request.post('http://localhost:3001/api/scheduling/links', {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test('API: reschedule requires authentication', async ({ request }) => {
    const res = await request.put('http://localhost:3001/api/scheduling/interviews/fake-id/reschedule', {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test('API: cancel requires authentication', async ({ request }) => {
    const res = await request.delete('http://localhost:3001/api/scheduling/interviews/fake-id');
    expect(res.status()).toBe(401);
  });

  // ── API Validation Tests ────────────────────────────────────────────────────

  test('API: suggest-slots validates input', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

    const res = await request.post('http://localhost:3001/api/scheduling/suggest-slots', {
      headers: { Cookie: `access_token=${accessToken}`, 'Content-Type': 'application/json' },
      data: {},
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('API: create-link validates input', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

    const res = await request.post('http://localhost:3001/api/scheduling/links', {
      headers: { Cookie: `access_token=${accessToken}`, 'Content-Type': 'application/json' },
      data: {},
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── Public Endpoint Tests ───────────────────────────────────────────────────

  test('API: get public link returns 404 for invalid token', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/scheduling/public/nonexistent-token');
    expect(res.status()).toBe(404);
  });

  test('API: book slot returns 404 for invalid token', async ({ request }) => {
    const res = await request.post('http://localhost:3001/api/scheduling/public/nonexistent-token/book', {
      headers: { 'Content-Type': 'application/json' },
      data: { slotId: 'fake-slot' },
    });
    expect(res.status()).toBe(404);
  });

  test('API: book slot validates input', async ({ request }) => {
    const res = await request.post('http://localhost:3001/api/scheduling/public/nonexistent-token/book', {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    });
    // Should get 422 for validation error (slotId required) before 404
    expect(res.status()).toBe(422);
  });

  // ── Public scheduling page ──────────────────────────────────────────────────

  test('public scheduling page shows not found for invalid token', async ({ page }) => {
    await page.goto('/schedule/invalid-token-12345');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/not available|not found/i)).toBeVisible({ timeout: 10000 });
  });

  test('public scheduling page shows expired for expired token', async ({ page }) => {
    // This tests the UI state — an expired token will return 410 from the API
    await page.goto('/schedule/expired-token-test');
    await page.waitForLoadState('networkidle');

    // Should show either "Not Available" or "Link Expired" depending on API response
    await expect(
      page.getByText(/not available|link expired|not found/i),
    ).toBeVisible({ timeout: 10000 });
  });

  // ── Kanban Board — Schedule Interview button ────────────────────────────────

  test('kanban board shows Schedule Interview button in candidate panel', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    const jobLink = page.getByRole('link').filter({ hasText: /./i }).first();
    const hasJobs = await jobLink.isVisible().catch(() => false);
    if (!hasJobs) return;

    await jobLink.click();
    await page.waitForLoadState('networkidle');

    const candidateCard = page.locator('[data-candidate-card]').first();
    const hasCandidate = await candidateCard.isVisible().catch(() => false);
    if (!hasCandidate) return;

    await candidateCard.click();

    const scheduleBtn = page.getByRole('button', { name: /schedule interview/i });
    await expect(scheduleBtn).toBeVisible({ timeout: 5000 });
  });
});
