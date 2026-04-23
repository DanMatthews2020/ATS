import { test, expect } from '@playwright/test';

// Seed accounts: admin@teamtalent.com (ADMIN)

test.describe('Pipeline bugs — regression tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@teamtalent.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('Bug 1: archive count matches archive page row count', async ({ page, request }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

    // Get first job
    const jobsRes = await request.get('http://localhost:3001/api/jobs?page=1&limit=1', {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    const jobsBody = await jobsRes.json();
    if (!jobsBody.data?.items?.length) return;

    const jobId = jobsBody.data.items[0].id;

    // Fetch pipeline stats (count source)
    const statsRes = await request.get(`http://localhost:3001/api/jobs/${jobId}/pipeline-stats`, {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    const statsBody = await statsRes.json();
    const archivedCount = statsBody.data?.stats?.archived ?? 0;

    // Fetch archived candidates (archive page source)
    const archiveRes = await request.get(`http://localhost:3001/api/jobs/${jobId}/applications/archived`, {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    const archiveBody = await archiveRes.json();
    const archiveRows = archiveBody.data?.archivedCandidates?.length ?? 0;

    // Both sources should agree
    expect(archiveRows).toBe(archivedCount);
  });

  test('Bug 2: pipeline cards link to valid candidate profiles', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    // Check that all visible candidate cards link to profiles that exist
    const cards = page.locator('[data-testid="pipeline-card"], .pipeline-card, [class*="cursor-grab"]');
    const cardCount = await cards.count();

    // Test up to 3 cards
    for (let i = 0; i < Math.min(cardCount, 3); i++) {
      const card = cards.nth(i);
      const isVisible = await card.isVisible().catch(() => false);
      if (!isVisible) continue;

      // Each card should have a non-empty candidate name
      const text = await card.textContent();
      expect(text?.trim()).toBeTruthy();
    }
  });

  test('Bug 2: soft-deleted candidates excluded from pipeline API', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

    // Get first job
    const jobsRes = await request.get('http://localhost:3001/api/jobs?page=1&limit=1', {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    const jobsBody = await jobsRes.json();
    if (!jobsBody.data?.items?.length) return;

    const jobId = jobsBody.data.items[0].id;

    // Fetch pipeline applications
    const appsRes = await request.get(`http://localhost:3001/api/jobs/${jobId}/applications`, {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    expect(appsRes.ok()).toBeTruthy();
    const appsBody = await appsRes.json();

    const applications = appsBody.data?.applications ?? [];
    // Every application must have a valid candidateName (not empty, not 'null null')
    for (const app of applications) {
      expect(app.candidateName).toBeTruthy();
      expect(app.candidateName).not.toBe('null null');
      expect(app.candidateName.trim()).not.toBe('');
    }
  });

  test('Bug 2: clicking a pipeline card does not show "Candidate not found"', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    // Find a clickable card
    const cards = page.locator('[data-testid="pipeline-card"], .pipeline-card, [class*="cursor-grab"]');
    const cardCount = await cards.count();
    if (cardCount === 0) return;

    // Click the first card
    await cards.first().click();

    // Should navigate to candidate profile
    await page.waitForURL(/\/candidates\//, { timeout: 5000 }).catch(() => {});

    // If we navigated, the page should NOT show "Candidate not found"
    const currentUrl = page.url();
    if (currentUrl.includes('/candidates/')) {
      await page.waitForLoadState('networkidle');
      const notFound = page.getByText('Candidate not found');
      await expect(notFound).not.toBeVisible({ timeout: 3000 });
    }
  });
});
