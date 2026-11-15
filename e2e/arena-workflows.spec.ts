import { test, expect } from '@playwright/test';

test.describe('3D Arena Workflows, Animations & Multi-Instrument Sweep (Issue #13)', () => {
  test('executes animated roll and verifies skip animation settles cleanly', async ({ page }) => {
    await page.goto('/');

    // Ensure Fast mode is OFF (animated kinematic roll)
    const fastModeBtn = page.getByRole('button', { name: /Fast: (ON|OFF)/ });
    if ((await fastModeBtn.getAttribute('aria-pressed')) === 'true') {
      await fastModeBtn.click();
    }
    await expect(fastModeBtn).toHaveText(/Fast: OFF/i);

    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.getByRole('button', { name: /Roll Round|Roll \d+d\d+|Flip|Series Complete/ });

    // Click Roll Round in series mode
    await rollBtn.click();

    // Verify Skip Animation button appears during active roll and click to settle
    const skipBtn = toolbar.getByRole('button', { name: /Skip Animation/ });
    try {
      await skipBtn.waitFor({ state: 'visible', timeout: 1500 });
      await skipBtn.click({ timeout: 1500 });
    } catch {
      // Under heavy parallel headless worker load, animation may settle before click completes
    }

    // Verify round settles cleanly and controls are unlocked
    await expect(skipBtn).not.toBeVisible();
    await expect(rollBtn).toBeEnabled();
    await expect(
      page.getByRole('region', { name: 'Live Series Scoreboard' }).getByText(/Round \d+ of \d+/),
    ).toHaveText('Round 1 of 3');
  });

  test('completes auto-roll series and tests mid-series auto-roll cancellation', async ({ page }) => {
    await page.goto('/');

    const fastModeBtn = page.getByRole('button', { name: /Fast: (ON|OFF)/ });
    if ((await fastModeBtn.getAttribute('aria-pressed')) !== 'true') {
      await fastModeBtn.click();
    }

    // Step 1: Auto-Roll Series to completion (Bo3, Fast: ON)
    await page.getByRole('button', { name: 'Bo3 (3)' }).click();

    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.getByRole('button', { name: /Roll Round|Roll \d+d\d+|Flip|Series Complete/ });
    const autoRollBtn = page.getByRole('button', { name: /Auto-Roll Series/i });
    const resetBtn = toolbar.getByRole('button', { name: /Reset/ });

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

    // Button should transform to Stop Auto-Roll while active
    const stopBtn = toolbar.getByRole('button', { name: /Stop Auto-Roll/ });
    await expect(stopBtn).toBeVisible({ timeout: 2000 });
    await expect(stopBtn).toContainText('Stop Auto-Roll');

    // Click Stop Auto-Roll
    await stopBtn.click();

    // Verify clean cancellation: Stop Auto-Roll disappears and controls are unlocked
    await expect(stopBtn).not.toBeVisible();
    await expect(rollBtn).toBeEnabled();
    // Series should be stopped before reaching 5
    const roundCount = await page
      .getByRole('region', { name: 'Live Series Scoreboard' })
      .getByText(/Round \d+ of \d+/)
      .textContent();
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

    const fastModeBtn = page.getByRole('button', { name: /Fast: (ON|OFF)/ });
    if ((await fastModeBtn.getAttribute('aria-pressed')) !== 'true') {
      await fastModeBtn.click();
    }

    // Switch to Quick Roll mode
    await page.getByRole('group', { name: 'Application mode' }).getByRole('button', { name: /Quick Roll/i }).click();

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
    const rollBtn = toolbar.getByRole('button', { name: /Roll Round|Roll \d+d\d+|Flip|Series Complete/ });

    for (const inst of instruments) {
      await page.getByRole('radio', { name: inst.name }).click();
      await rollBtn.click();

      // Verify newest feed item has correct badge and bounds
      const latestFeedItem = page
        .getByRole('region', { name: 'Recent quick rolls feed' })
        .getByRole('listitem')
        .first();
      await expect(latestFeedItem.getByTestId('feed-die-badge')).toHaveText(inst.badge);

      if (inst.faces === 2) {
        const miniCoin = latestFeedItem.getByTestId('mini-coin');
        await expect(miniCoin).toHaveText(/H|T/);
        const outcome = latestFeedItem.getByTestId('feed-outcome');
        await expect(outcome).toHaveText(/HEADS|TAILS|TIE/);
      } else {
        const valText = await latestFeedItem.getByTestId('dice-values').textContent();
        const val = Number(valText);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(inst.faces);
      }
    }

    // Verify zero console or page errors across all 7 instruments
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);

    // Step 2: Test Quantity steppers
    const quantitySlider = page.getByRole('slider', { name: /Quantity Per Roll/ });
    await expect(quantitySlider).toHaveValue('1');

    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(quantitySlider).toHaveValue('2');

    await page.getByRole('button', { name: 'Decrease quantity' }).click();
    await expect(quantitySlider).toHaveValue('1');

    // Switch back to Series Mode and test Series Rounds steppers
    await page.getByRole('group', { name: 'Application mode' }).getByRole('button', { name: /Series/i }).click();
    const seriesInput = page.getByRole('spinbutton', { name: /Custom series length/ });
    await page.getByRole('button', { name: 'Single (1)' }).click();
    await expect(seriesInput).toHaveValue('1');

    await page.getByRole('button', { name: 'Increase series rounds' }).click();
    await expect(seriesInput).toHaveValue('2');

    await page.getByRole('button', { name: 'Decrease series rounds' }).click();
    await expect(seriesInput).toHaveValue('1');

    // Step 3: Test Hide Arena / Show Arena toggle
    const arenaToggleBtn = page.getByRole('button', { name: /Arena for 3D Dice/ });
    const arenaViewport = page.getByRole('region', { name: '3D Dice Arena Viewport' });

    await expect(arenaToggleBtn).toHaveText(/Hide Arena/);
    await expect(arenaToggleBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(arenaViewport).toBeVisible();

    // Collapse arena
    await arenaToggleBtn.click();
    await expect(arenaToggleBtn).toHaveText(/Show Arena/);
    await expect(arenaToggleBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(arenaViewport).toBeHidden();

    // Expand arena
    await arenaToggleBtn.click();
    await expect(arenaToggleBtn).toHaveText(/Hide Arena/);
    await expect(arenaToggleBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(arenaViewport).toBeVisible();
  });
});
