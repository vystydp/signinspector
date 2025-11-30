import { test, expect } from '@playwright/test';

test.describe('SignInspector Demo', () => {
  test('should display landing page', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page.locator('h1')).toContainText('SignInspector');

    // Check upload area
    await expect(page.locator('text=Upload a PDF file')).toBeVisible();
  });

  test('should show upload area', async ({ page }) => {
    await page.goto('/');

    // Check for file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('should display features section', async ({ page }) => {
    await page.goto('/');

    // Check for feature cards
    await expect(page.locator('text=Client-Side Validation')).toBeVisible();
    await expect(page.locator('text=Integrity Checks')).toBeVisible();
    await expect(page.locator('text=Signer Details')).toBeVisible();
  });

  test('should have GitHub link', async ({ page }) => {
    await page.goto('/');

    const githubLink = page.locator('a[href*="github.com"]').first();
    await expect(githubLink).toBeVisible();
  });
});
