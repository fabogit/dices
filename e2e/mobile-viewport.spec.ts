import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport & Panel Collapsibility (Issue #8)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('keeps 3D arena viewport bounded <= 260px on mobile before and after roll and supports panel collapsing', async ({ page }) => {
    await page.goto('/');

    const viewport = page.locator('.arena-viewport');
    await expect(viewport).toBeVisible();

    // Verify initial bounded height on mobile (should be ~220px, strictly <= 260px)
    let box = await viewport.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(260);
    expect(box!.height).toBeGreaterThanOrEqual(180);

    // Enable fast mode to settle rolls instantaneously
    const fastModeBtn = page.locator('.instant-toggle-btn');
    if (!(await fastModeBtn.getAttribute('aria-pressed') === 'true')) {
      await fastModeBtn.click();
    }
    await expect(fastModeBtn).toHaveAttribute('aria-pressed', 'true');

    // Trigger roll on mobile
    const rollBtn = page.getByRole('toolbar', { name: 'Roll controls' }).locator('.primary-btn');
    await rollBtn.click();

    // Verify viewport height remains compact after roll
    box = await viewport.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(260);

    // Test collapsible panel toggle (Dice & Series Setup panel)
    const setupCollapseBtn = page.locator('.collapse-toggle-btn', {
      hasText: /Hide|Show/,
    }).first();
    await expect(setupCollapseBtn).toHaveAttribute('aria-expanded', 'true');

    // Collapse panel
    await setupCollapseBtn.click();
    await expect(setupCollapseBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.panel-body.collapsed')).toBeAttached();

    // Expand panel back
    await setupCollapseBtn.click();
    await expect(setupCollapseBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.panel-body.collapsed')).toHaveCount(0);
  });
});
