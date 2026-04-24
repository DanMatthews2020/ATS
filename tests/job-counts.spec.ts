import { test, expect } from '@playwright/test';

// Seed accounts: admin@teamtalent.com (ADMIN)

test.describe('Job counts — regression tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@teamtalent.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('API: job list applicantCount excludes rejected and soft-deleted', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

    // Get jobs list
    const jobsRes = await request.get('http://localhost:3001/api/jobs?page=1&limit=50', {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    expect(jobsRes.ok()).toBeTruthy();
    const jobsBody = await jobsRes.json();
    const jobs = jobsBody.data.items;
    if (!jobs.length) return;

    // For each job, verify applicantCount matches pipeline active count
    for (const job of jobs.slice(0, 3)) {
      const statsRes = await request.get(`http://localhost:3001/api/jobs/${job.id}/pipeline-stats`, {
        headers: { Cookie: `access_token=${accessToken}` },
      });
      const statsBody = await statsRes.json();
      const stats = statsBody.data.stats;

      // Active count = everything except archived
      const activeFromStats = (stats.leads ?? 0) + (stats.applicationReview ?? 0)
        + (stats.active ?? 0) + (stats.pendingOffer ?? 0) + (stats.hired ?? 0);

      expect(job.applicantCount).toBe(activeFromStats);
    }
  });

  test('API: pipeline stats exclude soft-deleted candidates', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

    const jobsRes = await request.get('http://localhost:3001/api/jobs?page=1&limit=1', {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    const jobsBody = await jobsRes.json();
    if (!jobsBody.data?.items?.length) return;

    const jobId = jobsBody.data.items[0].id;

    // Get pipeline applications (already filters soft-deleted)
    const appsRes = await request.get(`http://localhost:3001/api/jobs/${jobId}/applications`, {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    const appsBody = await appsRes.json();
    const apps = appsBody.data?.applications ?? [];

    // Get pipeline stats
    const statsRes = await request.get(`http://localhost:3001/api/jobs/${jobId}/pipeline-stats`, {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    const statsBody = await statsRes.json();
    const stats = statsBody.data.stats;

    // Total from stats should equal total apps count (both exclude soft-deleted)
    const totalFromStats = Object.values(stats).reduce((a: number, b) => a + (b as number), 0);
    expect(totalFromStats).toBe(apps.length);
  });

  test('API: job detail applicantCount matches active applications', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

    const jobsRes = await request.get('http://localhost:3001/api/jobs?page=1&limit=1', {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    const jobsBody = await jobsRes.json();
    if (!jobsBody.data?.items?.length) return;

    const jobId = jobsBody.data.items[0].id;

    const detailRes = await request.get(`http://localhost:3001/api/jobs/${jobId}`, {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    expect(detailRes.ok()).toBeTruthy();
    const detailBody = await detailRes.json();
    const job = detailBody.data.job;

    // applicantCount should equal non-rejected applications in the response
    const activeApps = job.applications.filter((a: { status: string }) => a.status !== 'rejected');
    expect(job.applicantCount).toBe(activeApps.length);
  });

  test('jobs list page counts match pipeline view counts', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    // Find a job row with applicant count and click it
    const rows = page.locator('tr').filter({ has: page.locator('td') });
    const rowCount = await rows.count();
    if (rowCount === 0) return;

    // Get the count from the first row's applicant column
    const firstRow = rows.first();
    const cells = firstRow.locator('td');
    const cellCount = await cells.count();
    if (cellCount < 5) return;

    // The applicant count is in the 5th column (index 4)
    const countText = await cells.nth(4).textContent();
    const listCount = parseInt(countText?.trim() ?? '0', 10);

    // Click the row to navigate to the job detail
    await firstRow.click();
    await page.waitForURL(/\/jobs\/.+/);
    await page.waitForLoadState('networkidle');

    // The pipeline tab should show the same number of cards (non-archived)
    // Wait for pipeline to load
    await page.waitForTimeout(1500);

    // Count pipeline cards across all columns (exclude archived column)
    const cards = page.locator('[data-testid="pipeline-card"], .pipeline-card, [class*="cursor-grab"]');
    const cardCount = await cards.count();

    // The card count should match the list count (both exclude archived + soft-deleted)
    expect(cardCount).toBe(listCount);
  });
});
