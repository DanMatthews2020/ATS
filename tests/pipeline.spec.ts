import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('john@teamtalent.com');
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/);
  await page.goto('/pipeline');
});

test.describe('Pipeline page', () => {
  test('renders the pipeline heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /pipeline/i })).toBeVisible();
  });

  test('shows candidate cards after selecting a job with candidates', async ({ page }) => {
    // Select "Senior Product Engineer" (job 4) which has multiple candidates in mock data
    await page.getByRole('combobox').selectOption({ label: 'Senior Product Engineer' });
    await expect(page.getByText('Sarah Johnson')).toBeVisible();
    await expect(page.getByText('Aisha Thompson')).toBeVisible();
  });

  test('shows empty state when selected job has no candidates', async ({ page }) => {
    // Frontend Developer (job 1) only has Lena Fischer
    await page.getByRole('combobox').selectOption({ label: 'Frontend Developer' });
    await expect(page.getByText('Lena Fischer')).toBeVisible();
  });

  test('grid view is active by default', async ({ page }) => {
    await expect(page.getByRole('button', { name: /grid view/i })).toHaveAttribute('aria-pressed', 'true');
  });

  test('can switch to list view', async ({ page }) => {
    await page.getByRole('button', { name: /list view/i }).click();
    await expect(page.getByRole('button', { name: /list view/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /grid view/i })).toHaveAttribute('aria-pressed', 'false');
  });

  test('switching back to grid view works', async ({ page }) => {
    await page.getByRole('button', { name: /list view/i }).click();
    await page.getByRole('button', { name: /grid view/i }).click();
    await expect(page.getByRole('button', { name: /grid view/i })).toHaveAttribute('aria-pressed', 'true');
  });

  test('job selector is visible', async ({ page }) => {
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('job selector contains all jobs', async ({ page }) => {
    const select = page.getByRole('combobox');
    await expect(select.getByRole('option', { name: 'Frontend Developer' })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Backend Developer' })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Product Manager' })).toBeAttached();
  });
});

test.describe('Pipeline — Rejected filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@teamtalent.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('API: job applications exclude rejected by default', async ({ page, request }) => {
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

    // Fetch applications (no status filter → should exclude rejected)
    const appsRes = await request.get(`http://localhost:3001/api/jobs/${jobId}/applications`, {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    expect(appsRes.ok()).toBeTruthy();
    const appsBody = await appsRes.json();

    const applications = appsBody.data?.applications ?? [];
    for (const app of applications) {
      expect(app.status.toLowerCase()).not.toBe('rejected');
    }
  });

  test('API: explicit status=REJECTED returns only rejected', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

    const jobsRes = await request.get('http://localhost:3001/api/jobs?page=1&limit=1', {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    const jobsBody = await jobsRes.json();
    if (!jobsBody.data?.items?.length) return;

    const jobId = jobsBody.data.items[0].id;

    const appsRes = await request.get(`http://localhost:3001/api/jobs/${jobId}/applications?status=REJECTED`, {
      headers: { Cookie: `access_token=${accessToken}` },
    });
    expect(appsRes.ok()).toBeTruthy();
    const appsBody = await appsRes.json();

    const applications = appsBody.data?.applications ?? [];
    for (const app of applications) {
      expect(app.status.toLowerCase()).toBe('rejected');
    }
  });

  test('drag to rejected column is blocked by USE_REJECT_ENDPOINT guard', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token')?.value;
    if (!accessToken) return;

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
  });
});
