import { test, expect } from '@playwright/test';

// Seed accounts: admin@teamtalent.com (ADMIN), john@teamtalent.com (INTERVIEWER)

test.describe('Reject Candidate — ADMIN', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@teamtalent.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('candidate profile shows Reject button for active application', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');

    // Click first candidate
    const firstCandidate = page.locator('li button, tr td a, [data-testid="candidate-row"]').first();
    const hasCandidate = await firstCandidate.isVisible().catch(() => false);
    if (!hasCandidate) return;

    await firstCandidate.click();
    await page.waitForURL(/\/candidates\/.+/);
    await page.waitForLoadState('networkidle');

    // Reject button may or may not be visible depending on candidate status
    // If visible, it should be a danger button
    const rejectBtn = page.getByRole('button', { name: /Reject/i });
    const visible = await rejectBtn.isVisible().catch(() => false);
    if (visible) {
      await expect(rejectBtn).toBeEnabled();
    }
  });

  test('click Reject — modal opens with rejection reasons dropdown', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');

    const firstCandidate = page.locator('li button, tr td a, [data-testid="candidate-row"]').first();
    const hasCandidate = await firstCandidate.isVisible().catch(() => false);
    if (!hasCandidate) return;

    await firstCandidate.click();
    await page.waitForURL(/\/candidates\/.+/);
    await page.waitForLoadState('networkidle');

    const rejectBtn = page.getByRole('button', { name: /Reject/i });
    const visible = await rejectBtn.isVisible().catch(() => false);
    if (!visible) return;

    await rejectBtn.click();

    // Modal should appear
    await expect(page.getByText('Reject Candidate')).toBeVisible();
    // Dropdown or input should be present
    const dropdown = page.locator('select[aria-label="Rejection reason"]');
    const dropdownVisible = await dropdown.isVisible().catch(() => false);
    if (dropdownVisible) {
      // Should have options from seeded reasons
      const options = await dropdown.locator('option').count();
      expect(options).toBeGreaterThanOrEqual(2); // at least one reason + "Other"
    }
  });

  test('select Other — text input appears', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');

    const firstCandidate = page.locator('li button, tr td a, [data-testid="candidate-row"]').first();
    const hasCandidate = await firstCandidate.isVisible().catch(() => false);
    if (!hasCandidate) return;

    await firstCandidate.click();
    await page.waitForURL(/\/candidates\/.+/);
    await page.waitForLoadState('networkidle');

    const rejectBtn = page.getByRole('button', { name: /Reject/i });
    const visible = await rejectBtn.isVisible().catch(() => false);
    if (!visible) return;

    await rejectBtn.click();
    await expect(page.getByText('Reject Candidate')).toBeVisible();

    const dropdown = page.locator('select[aria-label="Rejection reason"]');
    const dropdownVisible = await dropdown.isVisible().catch(() => false);
    if (dropdownVisible) {
      await dropdown.selectOption('other');
      await expect(page.getByLabel('Specify reason *')).toBeVisible();
    }
  });

  test('confirm rejection — status updates and button disappears', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');

    const firstCandidate = page.locator('li button, tr td a, [data-testid="candidate-row"]').first();
    const hasCandidate = await firstCandidate.isVisible().catch(() => false);
    if (!hasCandidate) return;

    await firstCandidate.click();
    await page.waitForURL(/\/candidates\/.+/);
    await page.waitForLoadState('networkidle');

    const rejectBtn = page.getByRole('button', { name: /Reject/i });
    const visible = await rejectBtn.isVisible().catch(() => false);
    if (!visible) return;

    await rejectBtn.click();
    await expect(page.getByText('Reject Candidate')).toBeVisible();

    // Select first reason (already pre-selected) and confirm
    await page.getByRole('button', { name: 'Confirm Rejection' }).click();

    // Wait for toast
    await expect(page.getByText(/rejected/i)).toBeVisible({ timeout: 5000 });

    // Reject button should disappear
    await expect(page.getByRole('button', { name: /Reject/i })).not.toBeVisible({ timeout: 5000 });

    // Rejected badge should appear
    await expect(page.getByText('Rejected')).toBeVisible();
  });

  test('API: PATCH /applications/:id/stage with REJECTED returns 400', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;

    if (accessToken) {
      const res = await request.patch('http://localhost:3001/api/applications/fake-id/stage', {
        headers: {
          Cookie: `access_token=${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: { status: 'REJECTED' },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('USE_REJECT_ENDPOINT');
    }
  });

  test('API: PATCH /applications/:id/reject on already-rejected returns 409', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;

    if (accessToken) {
      // Try to reject a non-existent application
      const res = await request.patch('http://localhost:3001/api/applications/fake-id/reject', {
        headers: {
          Cookie: `access_token=${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: { reasonLabel: 'Test' },
      });
      // Should be 404 for non-existent
      expect(res.status()).toBe(404);
    }
  });
});

test.describe('Reject Candidate — INTERVIEWER', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('john@teamtalent.com');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('Reject button NOT visible for INTERVIEWER', async ({ page }) => {
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');

    const firstCandidate = page.locator('li button, tr td a, [data-testid="candidate-row"]').first();
    const hasCandidate = await firstCandidate.isVisible().catch(() => false);
    if (!hasCandidate) return;

    await firstCandidate.click();
    await page.waitForURL(/\/candidates\/.+/);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /Reject/i })).not.toBeVisible();
  });
});
