import { test, expect } from '@playwright/test';

test.describe('Player Management, Leaderboard, & History Persistence (Issue #13)', () => {
  test('manages players, ranks leaderboard deterministically, persists to localStorage, and clears cleanly', async ({ page }) => {
    // Inject deterministic random provider queue
    await page.addInitScript(() => {
      let queue: number[] = [];
      (window as any).__setRandomQueue = (vals: number[]) => {
        queue = [...vals];
      };
      const originalGetRandomValues = window.crypto.getRandomValues.bind(window.crypto);
      window.crypto.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
        if (array instanceof Uint32Array) {
          for (let i = 0; i < array.length; i++) {
            if (queue.length > 0) {
              array[i] = queue.shift()!;
            } else {
              originalGetRandomValues(array);
            }
          }
          return array;
        }
        return originalGetRandomValues(array);
      };
    });

    await page.goto('/');

    const fastModeBtn = page.locator('.instant-toggle-btn');
    if ((await fastModeBtn.getAttribute('aria-pressed')) !== 'true') {
      await fastModeBtn.click();
    }

    // Step 1: Open Add Local Player modal, test Cancel
    await page.getByRole('button', { name: 'Add new local player' }).click();
    const modal = page.locator('.modal-backdrop');
    await expect(modal).toBeVisible();
    await expect(page.locator('#add-player-title')).toHaveText('Add Local Player');

    await page.fill('#new-player-input', 'CancelledPlayer');
    await page.locator('.modal-btn.cancel').click();
    await expect(modal).not.toBeVisible();

    const playerSelect = page.locator('#player-select');
    await expect(playerSelect.locator('option')).toHaveCount(1);
    await expect(playerSelect).toHaveValue('player-1');

    // Step 2: Add player 'Alice'
    await page.getByRole('button', { name: 'Add new local player' }).click();
    await page.fill('#new-player-input', 'Alice');
    await page.locator('.modal-btn.confirm').click();
    await expect(modal).not.toBeVisible();

    // Verify option exists and Alice is auto-selected
    await expect(playerSelect.locator('option')).toHaveCount(2);
    const selectedText = await playerSelect.locator('option:checked').textContent();
    expect(selectedText).toBe('Alice');

    // Verify switching between Player 1 and Alice
    await playerSelect.selectOption({ label: 'Player 1' });
    expect(await playerSelect.locator('option:checked').textContent()).toBe('Player 1');
    await playerSelect.selectOption({ label: 'Alice' });
    expect(await playerSelect.locator('option:checked').textContent()).toBe('Alice');

    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.locator('.primary-btn');

    // Step 3: Alice executes 2d6 Single series (values [6, 6] -> Luck > 170%)
    // (5 % 6) + 1 = 6
    await page.getByRole('radio', { name: 'd6' }).click();
    await page.getByRole('button', { name: 'Single (1)' }).click();
    await page.getByRole('button', { name: 'Increase quantity' }).click(); // 2 dice

    await page.evaluate((vals) => (window as any).__setRandomQueue(vals), [5, 5]);
    await rollBtn.click();
    await expect(rollBtn).toHaveText(/Series Complete/i);

    // Step 4: Player 1 executes 2d6 Single series (values [1, 1] -> Luck < 30%)
    // (0 % 6) + 1 = 1
    await playerSelect.selectOption({ label: 'Player 1' });
    await page.getByRole('button', { name: 'Single (1)' }).click(); // Ensure 1 round
    await page.evaluate((vals) => (window as any).__setRandomQueue(vals), [0, 0]);
    await rollBtn.click();
    await expect(rollBtn).toHaveText(/Series Complete/i);

    // Step 5: Alice executes Coin (d2) Single series (value [1] = HEADS -> Luck 200%, Coins Won 1)
    // (0 % 2) + 1 = 1 = HEADS
    await playerSelect.selectOption({ label: 'Alice' });
    await page.getByRole('radio', { name: /Coin \(d2\)/i }).click();
    await page.getByRole('button', { name: 'Single (1)' }).click();
    // Decrease quantity back to 1 coin
    await page.getByRole('button', { name: 'Decrease quantity' }).click();
    await expect(page.locator('.count-value').first()).toHaveText('1');

    await page.evaluate((vals) => (window as any).__setRandomQueue(vals), [0]);
    await rollBtn.click();
    await expect(rollBtn).toHaveText(/Series Complete/i);

    // Step 6: Switch to History tab and verify Leaderboard rankings & metrics
    await page.getByRole('tab', { name: /History/i }).click();
    const playerCards = page.locator('.leaderboard-grid .player-card');
    await expect(playerCards).toHaveCount(2);

    // Alice should be ranked #1 with hot flame icon (🔥)
    const firstPlayerCard = playerCards.nth(0);
    await expect(firstPlayerCard.locator('.player-name')).toHaveText('Alice');
    const firstLuckBadge = firstPlayerCard.locator('.luck-badge');
    await expect(firstLuckBadge).toContainText('🔥');
    await expect(firstPlayerCard).toContainText('Coins Won');
    await expect(firstPlayerCard.locator('.highlight-gold').first()).toHaveText('1');
    await expect(firstPlayerCard).toContainText('Heads Rate');
    await expect(firstPlayerCard).toContainText('100.0%');

    // Player 1 should be ranked #2 with cold ice icon (❄️)
    const secondPlayerCard = playerCards.nth(1);
    await expect(secondPlayerCard.locator('.player-name')).toHaveText('Player 1');
    const secondLuckBadge = secondPlayerCard.locator('.luck-badge');
    await expect(secondLuckBadge).toContainText('❄️');

    // Verify Past Completed Series log has 3 entries
    const historyItems = page.locator('.history-list .history-item');
    await expect(historyItems).toHaveCount(3);
    await expect(historyItems.nth(0)).toContainText('Alice');
    await expect(historyItems.nth(0)).toContainText('Coin d2');
    await expect(historyItems.nth(1)).toContainText('Player 1');
    await expect(historyItems.nth(1)).toContainText('d6');
    await expect(historyItems.nth(2)).toContainText('Alice');
    await expect(historyItems.nth(2)).toContainText('d6');

    // Step 7: Reload the page and verify localStorage persistence
    await page.reload();
    await page.getByRole('tab', { name: /History/i }).click();

    const reloadedPlayerCards = page.locator('.leaderboard-grid .player-card');
    await expect(reloadedPlayerCards).toHaveCount(2);
    await expect(reloadedPlayerCards.nth(0).locator('.player-name')).toHaveText('Alice');
    await expect(reloadedPlayerCards.nth(0).locator('.luck-badge')).toContainText('🔥');
    await expect(reloadedPlayerCards.nth(0)).toContainText('Coins Won');
    await expect(reloadedPlayerCards.nth(1).locator('.player-name')).toHaveText('Player 1');
    await expect(reloadedPlayerCards.nth(1).locator('.luck-badge')).toContainText('❄️');

    const reloadedHistoryItems = page.locator('.history-list .history-item');
    await expect(reloadedHistoryItems).toHaveCount(3);

    // Step 8: Clear history and verify empty state across reload
    const clearBtn = page.locator('.clear-btn');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    await expect(page.locator('.empty-history')).toBeVisible();
    await expect(page.locator('.clear-btn')).not.toBeVisible();
    await expect(page.locator('.history-item')).toHaveCount(0);

    // Persist empty history across reload
    await page.reload();
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.locator('.empty-history')).toBeVisible();
    await expect(page.locator('.clear-btn')).not.toBeVisible();
    await expect(page.locator('.history-item')).toHaveCount(0);
  });
});
