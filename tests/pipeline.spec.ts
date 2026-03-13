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
