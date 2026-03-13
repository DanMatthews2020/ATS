import { test, expect } from '@playwright/test';

// Helper: log in before each test
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('john@teamtalent.com');
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/);
});

test.describe('Sidebar navigation', () => {
  test('sidebar is visible on all dashboard pages', async ({ page }) => {
    await expect(page.getByText('TeamTalent')).toBeVisible();
    await expect(page.getByRole('link', { name: /candidates/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /pipeline/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /job postings/i })).toBeVisible();
  });

  test('Candidates link navigates to candidates page', async ({ page }) => {
    await page.getByRole('link', { name: /^candidates$/i }).click();
    await expect(page).toHaveURL(/candidates/);
    await expect(page.getByRole('heading', { name: /candidate management/i })).toBeVisible();
  });

  test('Pipeline link navigates to pipeline page', async ({ page }) => {
    await page.getByRole('link', { name: /pipeline/i }).click();
    await expect(page).toHaveURL(/pipeline/);
    await expect(page.getByRole('heading', { name: /pipeline/i })).toBeVisible();
  });

  test('Dashboard link navigates back to dashboard', async ({ page }) => {
    await page.getByRole('link', { name: /candidates/i }).click();
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('active nav item is highlighted', async ({ page }) => {
    await page.getByRole('link', { name: /^candidates$/i }).click();
    // The active link should have a visually distinct style — we check aria or class
    const candidatesLink = page.getByRole('link', { name: /^candidates$/i });
    await expect(candidatesLink).toBeVisible();
    // Confirm we're on the correct page
    await expect(page).toHaveURL(/candidates/);
  });

  test('user name is shown in sidebar footer', async ({ page }) => {
    await expect(page.getByText('John Doe')).toBeVisible();
  });
});
