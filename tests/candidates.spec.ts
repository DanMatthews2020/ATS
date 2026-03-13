import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('john@teamtalent.com');
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/);
  await page.goto('/candidates');
});

test.describe('Candidates page', () => {
  test('renders the page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /candidate management/i })).toBeVisible();
  });

  test('shows the expected candidates from mock data', async ({ page }) => {
    await expect(page.getByText('Emma Johnson')).toBeVisible();
    await expect(page.getByText('Michael Brown')).toBeVisible();
    await expect(page.getByText('Sophia Martinez')).toBeVisible();
  });

  test('shows candidate roles', async ({ page }) => {
    await expect(page.getByText('Software Engineer')).toBeVisible();
    await expect(page.getByText('Data Analyst').first()).toBeVisible();
  });

  test('shows candidate emails', async ({ page }) => {
    await expect(page.getByText('emmaj@company.com')).toBeVisible();
    await expect(page.getByText('michaelb@company.com')).toBeVisible();
  });

  test('shows status badges', async ({ page }) => {
    // Use .first() since the filter tabs also contain these words
    await expect(page.getByText('Available').first()).toBeVisible();
    await expect(page.getByText('Interviewing').first()).toBeVisible();
    await expect(page.getByText('Hired').first()).toBeVisible();
  });

  test('Add Candidate button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add candidate/i })).toBeVisible();
  });
});

test.describe('Candidate search', () => {
  test('search filters candidates by name', async ({ page }) => {
    await page.getByPlaceholder(/search candidates/i).fill('Emma');
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(page.getByText('Emma Johnson')).toBeVisible();
    await expect(page.getByText('Michael Brown')).not.toBeVisible();
  });

  test('search filters candidates by role', async ({ page }) => {
    await page.getByPlaceholder(/search candidates/i).fill('UX Designer');
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(page.getByText('Aisha Thompson')).toBeVisible();
    await expect(page.getByText('Emma Johnson')).not.toBeVisible();
  });

  test('search filters candidates by email', async ({ page }) => {
    await page.getByPlaceholder(/search candidates/i).fill('sophiam');
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(page.getByText('Sophia Martinez')).toBeVisible();
    await expect(page.getByText('Emma Johnson')).not.toBeVisible();
  });

  test('search with Enter key works', async ({ page }) => {
    await page.getByPlaceholder(/search candidates/i).fill('Marcus');
    await page.getByPlaceholder(/search candidates/i).press('Enter');
    await expect(page.getByText('Marcus Chen')).toBeVisible();
    await expect(page.getByText('Emma Johnson')).not.toBeVisible();
  });

  test('shows empty state when no results match', async ({ page }) => {
    await page.getByPlaceholder(/search candidates/i).fill('zzznomatch');
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(page.getByText(/no candidates found/i)).toBeVisible();
  });

  test('clearing search restores full list', async ({ page }) => {
    await page.getByPlaceholder(/search candidates/i).fill('Emma');
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(page.getByText('Michael Brown')).not.toBeVisible();

    // Clear and search again
    await page.getByPlaceholder(/search candidates/i).fill('');
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(page.getByText('Michael Brown')).toBeVisible();
  });
});

test.describe('Status filter tabs', () => {
  test('All tab shows all candidates', async ({ page }) => {
    await page.getByRole('button', { name: /^all/i }).click();
    await expect(page.getByText('Emma Johnson')).toBeVisible();
    await expect(page.getByText('Sophia Martinez')).toBeVisible();
  });

  test('Available tab shows only new candidates', async ({ page }) => {
    await page.getByRole('button', { name: /^available/i }).click();
    await expect(page.getByText('Emma Johnson')).toBeVisible();
    // Hired candidates should not appear
    await expect(page.getByText('Sophia Martinez')).not.toBeVisible();
  });

  test('Interviewing tab shows only interview candidates', async ({ page }) => {
    await page.getByRole('button', { name: /^interviewing/i }).click();
    await expect(page.getByText('Michael Brown')).toBeVisible();
    await expect(page.getByText('Priya Patel')).toBeVisible();
    await expect(page.getByText('Emma Johnson')).not.toBeVisible();
  });

  test('Hired tab shows only hired candidates', async ({ page }) => {
    await page.getByRole('button', { name: /^hired/i }).click();
    await expect(page.getByText('Sophia Martinez')).toBeVisible();
    await expect(page.getByText('Carlos Rivera')).toBeVisible();
    await expect(page.getByText('Emma Johnson')).not.toBeVisible();
  });

  test('Rejected tab shows only rejected candidates', async ({ page }) => {
    await page.getByRole('button', { name: /^rejected/i }).click();
    await expect(page.getByText('Nina Rodriguez')).toBeVisible();
    await expect(page.getByText('Emma Johnson')).not.toBeVisible();
  });
});

test.describe('Candidate drawer', () => {
  test('opens when a candidate row is clicked', async ({ page }) => {
    await page.getByText('Emma Johnson').click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('shows candidate details in the drawer', async ({ page }) => {
    await page.getByText('Emma Johnson').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('Emma Johnson')).toBeVisible();
    await expect(drawer.getByText('Software Engineer')).toBeVisible();
    await expect(drawer.getByText('emmaj@company.com')).toBeVisible();
    await expect(drawer.getByText('+1 (415) 555-0192')).toBeVisible();
    await expect(drawer.getByText('San Francisco, CA')).toBeVisible();
  });

  test('shows skills in the drawer', async ({ page }) => {
    await page.getByText('Emma Johnson').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('React')).toBeVisible();
    await expect(drawer.getByText('TypeScript')).toBeVisible();
  });

  test('shows action buttons in the drawer', async ({ page }) => {
    await page.getByText('Emma Johnson').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByRole('button', { name: /schedule interview/i })).toBeVisible();
    await expect(drawer.getByRole('button', { name: /send email/i })).toBeVisible();
    await expect(drawer.getByRole('button', { name: /move forward/i })).toBeVisible();
  });

  test('hides Move Forward for hired candidates', async ({ page }) => {
    // Filter to hired and click Sophia Martinez
    await page.getByRole('button', { name: /^hired/i }).click();
    await page.getByText('Sophia Martinez').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByRole('button', { name: /move forward/i })).not.toBeVisible();
  });

  test('closes when the X button is clicked', async ({ page }) => {
    await page.getByText('Emma Johnson').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /close panel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('closes when the backdrop is clicked', async ({ page }) => {
    await page.getByText('Emma Johnson').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Click the backdrop (outside the panel)
    await page.mouse.click(100, 400);
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
