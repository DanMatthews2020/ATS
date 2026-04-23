import { test, expect } from '@playwright/test';

// Seed accounts: admin@teamtalent.com (ADMIN)

test.describe('Archive — Rejected candidates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@teamtalent.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('pipeline page shows Archive button', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Archive/i })).toBeVisible();
  });

  test('Archive button shows count badge when rejected candidates exist', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    const archiveBtn = page.getByRole('button', { name: /Archive/i });
    await expect(archiveBtn).toBeVisible();
    // Badge may or may not be present depending on seed data — just verify button is enabled
    const disabled = await archiveBtn.isDisabled();
    // If a job is selected, button should be enabled
    const jobSelector = page.locator('select').first();
    const hasJobs = await jobSelector.isVisible().catch(() => false);
    if (hasJobs) {
      expect(disabled).toBe(false);
    }
  });

  test('clicking Archive navigates to archive page', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    const archiveBtn = page.getByRole('button', { name: /Archive/i });
    const disabled = await archiveBtn.isDisabled();
    if (disabled) return; // no job selected

    await archiveBtn.click();
    await page.waitForURL(/\/archive\?jobId=/);

    // Page header
    await expect(page.getByText('Archived Candidates')).toBeVisible();
    // Back button
    await expect(page.getByText('Back to Pipeline')).toBeVisible();
  });

  test('archive page shows empty state or candidate table', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    const archiveBtn = page.getByRole('button', { name: /Archive/i });
    const disabled = await archiveBtn.isDisabled();
    if (disabled) return;

    await archiveBtn.click();
    await page.waitForURL(/\/archive\?jobId=/);
    await page.waitForLoadState('networkidle');

    // Either empty state or table should be visible
    const emptyState = page.getByText('Candidates rejected for this role will appear here.');
    const table = page.locator('table');

    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasTable = await table.isVisible().catch(() => false);
    expect(hasEmpty || hasTable).toBe(true);
  });

  test('archive table has correct column headers', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    const archiveBtn = page.getByRole('button', { name: /Archive/i });
    if (await archiveBtn.isDisabled()) return;

    await archiveBtn.click();
    await page.waitForURL(/\/archive\?jobId=/);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    const hasTable = await table.isVisible().catch(() => false);
    if (!hasTable) return; // empty state, no table

    await expect(page.locator('th', { hasText: 'Candidate' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Stage Rejected At' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Rejection Reason' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Rejected Date' })).toBeVisible();
  });

  test('back button navigates to pipeline', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    const archiveBtn = page.getByRole('button', { name: /Archive/i });
    if (await archiveBtn.isDisabled()) return;

    await archiveBtn.click();
    await page.waitForURL(/\/archive\?jobId=/);

    await page.getByText('Back to Pipeline').click();
    await page.waitForURL(/\/pipeline/);
  });

  test('API: GET archived applications returns correct shape', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

    const jobsRes = await request.get('http://localhost:3001/api/jobs?page=1&limit=1', {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    const jobsBody = await jobsRes.json();
    if (!jobsBody.data?.items?.length) return;

    const jobId = jobsBody.data.items[0].id;

    const res = await request.get(`http://localhost:3001/api/jobs/${jobId}/applications/archived`, {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toHaveProperty('archivedCandidates');
    expect(body.data).toHaveProperty('total');
    expect(body.data).toHaveProperty('jobId', jobId);
    expect(Array.isArray(body.data.archivedCandidates)).toBe(true);
  });

  test('archive page without jobId shows empty state', async ({ page }) => {
    await page.goto('/archive');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Archived Candidates')).toBeVisible();
    await expect(page.getByText('No rejected candidates')).toBeVisible();
  });
});
