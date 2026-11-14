import { test, expect } from '@playwright/test';
import pkg from '../package.json' with { type: 'json' };

test.describe('Production Boot & Baseline Sanity', () => {
  test('boots without console errors, renders correct title, favicon, and 3D canvas', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto('/');

    // Verify document title
    await expect(page).toHaveTitle('Dices - 3D Polyhedral Dice & Coin Roller');

    // Verify SVG favicon
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon).toHaveAttribute('href', '/favicon.svg');

    // Verify header branding
    const titleText = page.locator('.title-gradient');
    await expect(titleText).toHaveText('Dices');

    // Verify semantic footer version, build year, license, and author links
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    await expect(footer.getByRole('link', { name: `Dices v${pkg.version}` })).toHaveAttribute(
      'href',
      'https://github.com/fabogit/dices',
    );
    await expect(footer).toContainText(new Date().getFullYear().toString());
    await expect(footer.getByRole('link', { name: 'MIT License' })).toHaveAttribute(
      'href',
      'https://github.com/fabogit/dices/blob/main/LICENSE',
    );
    await expect(footer.getByRole('link', { name: 'fabogit' })).toHaveAttribute(
      'href',
      'https://github.com/fabogit',
    );

    // Verify 3D canvas is mounted with non-zero dimensions
    const canvas = page.locator('canvas.three-canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    // Verify no runtime or unhandled console errors during boot
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
