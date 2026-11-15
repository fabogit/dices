import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport & Panel Collapsibility (Issue #8)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('keeps 3D arena viewport bounded <= 260px on mobile before and after roll and supports panel collapsing', async ({ page }) => {
    await page.goto('/');

    const viewport = page.getByRole('region', { name: '3D Dice Arena Viewport' });
    await expect(viewport).toBeVisible();

    // Verify initial bounded height on mobile (should be ~220px, strictly <= 260px)
    let box = await viewport.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(260);
    expect(box!.height).toBeGreaterThanOrEqual(180);

    // Enable fast mode to settle rolls instantaneously
    const fastModeBtn = page.getByRole('button', { name: /Fast: (ON|OFF)/ });
    if (!(await fastModeBtn.getAttribute('aria-pressed') === 'true')) {
      await fastModeBtn.click();
    }
    await expect(fastModeBtn).toHaveAttribute('aria-pressed', 'true');

    // Trigger roll on mobile
    const rollBtn = page
      .getByRole('toolbar', { name: 'Roll controls' })
      .getByRole('button', { name: /Roll Round|Roll \d+d\d+|Flip|Series Complete/ });
    await rollBtn.click();

    // Verify viewport height remains compact after roll
    box = await viewport.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(260);

    // Test collapsible panel toggle (Dice & Series Setup panel)
    const setupCollapseBtn = page.getByRole('button', { name: /Dice & Series Setup/ });
    const quantitySlider = page.getByRole('slider', { name: /Quantity Per Roll/ });
    await expect(setupCollapseBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(quantitySlider).toBeVisible();

    // Collapse panel
    await setupCollapseBtn.click();
    await expect(setupCollapseBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(quantitySlider).toBeHidden();

    // Expand panel back
    await setupCollapseBtn.click();
    await expect(setupCollapseBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(quantitySlider).toBeVisible();
  });
});
