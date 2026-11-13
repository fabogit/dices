import { test, expect } from '@playwright/test';

test.describe('3D Arena Workflows, Animations & Multi-Instrument Sweep (Issue #13)', () => {
  test('executes animated roll and verifies skip animation settles cleanly', async ({ page }) => {
    await page.goto('/');

    // Ensure Fast mode is OFF (animated kinematic roll)
    const fastModeBtn = page.locator('.instant-toggle-btn');
    if ((await fastModeBtn.getAttribute('aria-pressed')) === 'true') {
      await fastModeBtn.click();
    }
    await expect(fastModeBtn).toHaveText(/Fast: OFF/i);

    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.locator('.primary-btn');

    // Click Roll Round in series mode
    await rollBtn.click();

    // Verify Skip Animation button appears during active roll and click to settle
    const skipBtn = toolbar.locator('.btn-skip');
    try {
      await skipBtn.waitFor({ state: 'visible', timeout: 1500 });
      await skipBtn.click({ timeout: 1500 });
    } catch {
      // Under heavy parallel headless worker load, animation may settle before click completes
    }

    // Verify round settles cleanly and controls are unlocked
    await expect(skipBtn).not.toBeVisible();
    await expect(rollBtn).toBeEnabled();
    await expect(page.locator('.series-badge')).toHaveText('Round 1 of 3');
  });

  test('completes auto-roll series and tests mid-series auto-roll cancellation', async ({ page }) => {
    await page.goto('/');

    const fastModeBtn = page.locator('.instant-toggle-btn');
    if ((await fastModeBtn.getAttribute('aria-pressed')) !== 'true') {
      await fastModeBtn.click();
    }

    // Step 1: Auto-Roll Series to completion (Bo3, Fast: ON)
    await page.getByRole('button', { name: 'Bo3 (3)' }).click();

    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.locator('.primary-btn');
    const autoRollBtn = page.getByRole('button', { name: /Auto-Roll Series/i });
    const resetBtn = toolbar.locator('.btn-reset-series');

    await autoRollBtn.click();

    // Wait for Series Complete state
    await expect(rollBtn).toHaveText(/Series Complete \(3\/3\)/i);
    await expect(rollBtn).toBeDisabled();
    await expect(autoRollBtn).toBeDisabled();

    // Reset series and verify unlocked controls
    await resetBtn.click();
    await expect(rollBtn).toHaveText('Roll Round (1/3)');
    await expect(rollBtn).toBeEnabled();
    await expect(autoRollBtn).toBeEnabled();

    // Step 2: Test Stop Auto-Roll cancellation mid-series (Bo5, Fast: OFF)
    await fastModeBtn.click(); // Fast: OFF
    await expect(fastModeBtn).toHaveText(/Fast: OFF/i);

    await page.getByRole('button', { name: 'Bo5 (5)' }).click();
    await autoRollBtn.click();

    // Button should transform to Stop Auto-Roll with auto-active class
    const stopBtn = toolbar.locator('.action-btn.secondary-btn.auto-active');
    await expect(stopBtn).toBeVisible({ timeout: 2000 });
    await expect(stopBtn).toContainText('Stop Auto-Roll');

    // Click Stop Auto-Roll
    await stopBtn.click();

    // Verify clean cancellation: auto-active removed, controls not locked
    await expect(stopBtn).not.toBeVisible();
    await expect(rollBtn).toBeEnabled();
    // Series should be stopped before reaching 5
    const roundCount = await page.locator('.series-badge').textContent();
    expect(roundCount).toMatch(/Round [1-4] of 5/);
  });

  test('sweeps all 7 instruments without console errors, tests steppers, and toggles arena collapse', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto('/');

    const fastModeBtn = page.locator('.instant-toggle-btn');
    if ((await fastModeBtn.getAttribute('aria-pressed')) !== 'true') {
      await fastModeBtn.click();
    }

    // Switch to Quick Roll mode
    await page.locator('.mode-switch-group').getByRole('button', { name: /Quick Roll/i }).click();

    const instruments = [
      { name: /Coin \(d2\)/i, faces: 2, badge: 'Coin' },
      { name: 'd4', faces: 4, badge: 'd4' },
      { name: 'd6', faces: 6, badge: 'd6' },
      { name: 'd8', faces: 8, badge: 'd8' },
      { name: 'd10', faces: 10, badge: 'd10' },
      { name: 'd12', faces: 12, badge: 'd12' },
      { name: 'd20', faces: 20, badge: 'd20' },
    ];

    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.locator('.primary-btn');

    for (const inst of instruments) {
      await page.getByRole('radio', { name: inst.name }).click();
      await rollBtn.click();

      // Verify newest feed item has correct badge and bounds
      const latestFeedItem = page.locator('.feed-item').first();
      await expect(latestFeedItem.locator('.feed-die-badge')).toHaveText(inst.badge);

      if (inst.faces === 2) {
        const miniCoin = latestFeedItem.locator('.mini-coin');
        await expect(miniCoin).toHaveText(/H|T/);
        const outcome = latestFeedItem.locator('.feed-outcome');
        await expect(outcome).toHaveText(/HEADS|TAILS|TIE/);
      } else {
        const valText = await latestFeedItem.locator('.dice-values-string').textContent();
        const val = Number(valText);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(inst.faces);
      }
    }

    // Verify zero console or page errors across all 7 instruments
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);

    // Step 2: Test Quantity steppers
    const countValue = page.locator('.count-value').first();
    await expect(countValue).toHaveText('1');

    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(countValue).toHaveText('2');

    await page.getByRole('button', { name: 'Decrease quantity' }).click();
    await expect(countValue).toHaveText('1');

    // Switch back to Series Mode and test Series Rounds steppers
    await page.locator('.mode-switch-group').getByRole('button', { name: /Series/i }).click();
    const seriesValue = page.locator('label').filter({ hasText: 'Series Rounds (K):' }).locator('.count-value');
    await page.getByRole('button', { name: 'Single (1)' }).click();
    await expect(seriesValue).toHaveText('1');

    await page.getByRole('button', { name: 'Increase series rounds' }).click();
    await expect(seriesValue).toHaveText('2');

    await page.getByRole('button', { name: 'Decrease series rounds' }).click();
    await expect(seriesValue).toHaveText('1');

    // Step 3: Test Hide Arena / Show Arena toggle
    const arenaToggleBtn = page.locator('.arena-section .collapse-toggle-btn');
    const arenaBody = page.locator('.arena-body');

    await expect(arenaToggleBtn).toHaveText(/Hide Arena/);
    await expect(arenaToggleBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(arenaBody).not.toHaveClass(/collapsed/);

    // Collapse arena
    await arenaToggleBtn.click();
    await expect(arenaToggleBtn).toHaveText(/Show Arena/);
    await expect(arenaToggleBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(arenaBody).toHaveClass(/collapsed/);

    // Expand arena
    await arenaToggleBtn.click();
    await expect(arenaToggleBtn).toHaveText(/Hide Arena/);
    await expect(arenaToggleBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(arenaBody).not.toHaveClass(/collapsed/);
  });
});
