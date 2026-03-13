import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows the login page at root', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login/);
    // The right panel has an h2 "Welcome back"
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('shows email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('logs in and redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('john@teamtalent.com');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('logs in with any credentials (demo mode)', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('anyone@test.com');
    await page.getByLabel(/password/i).fill('anything');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('shows a demo mode note on the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/demo mode/i)).toBeVisible();
  });

  test('shows error when submitting empty form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Use first() to skip Next.js's internal route announcer which also has role="alert"
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page.getByText(/please enter your email/i)).toBeVisible();
  });
});
