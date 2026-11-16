import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __setRandomQueue?: (vals: number[]) => void;
  }
}

test.describe('Player Management, Leaderboard, & History Persistence (Issue #13)', () => {
  test('manages players, ranks leaderboard deterministically, persists to localStorage, and clears cleanly', async ({
    page,
  }) => {
    // Inject deterministic random provider queue
    await page.addInitScript(() => {
      let queue: number[] = [];
      window.__setRandomQueue = (vals: number[]) => {
        queue = [...vals];
      };
      const originalGetRandomValues: Crypto['getRandomValues'] = window.crypto.getRandomValues.bind(
        window.crypto,
      );
      const patchedGetRandomValues: Crypto['getRandomValues'] = (array) => {
        if (array instanceof Uint32Array) {
          for (let i = 0; i < array.length; i++) {
            if (queue.length > 0) {
              array[i] = queue.shift()!;
            } else {
              const fallback = new Uint32Array(1);
              originalGetRandomValues(fallback);
              array[i] = fallback[0]!;
            }
          }
          return array;
        }
        return originalGetRandomValues(array);
      };
      window.crypto.getRandomValues = patchedGetRandomValues;
    });

    await page.goto('/');

    const fastModeBtn = page.getByRole('button', { name: /Fast: (ON|OFF)/ });
    if ((await fastModeBtn.getAttribute('aria-pressed')) !== 'true') {
      await fastModeBtn.click();
    }

    // Step 1: Open Add Local Player modal, test Cancel
    await page.getByRole('button', { name: 'Add new local player' }).click();
    const modal = page.getByRole('dialog', { name: 'Add Local Player' });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Add Local Player' })).toHaveText(
      'Add Local Player',
    );

    await modal.getByLabel('Player Name:').fill('CancelledPlayer');
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).not.toBeVisible();

    const playerSelect = page.getByLabel('Player:');
    await expect(playerSelect.getByRole('option')).toHaveCount(1);
    await expect(playerSelect).toHaveValue('player-1');

    // Step 2: Add player 'Alice'
    await page.getByRole('button', { name: 'Add new local player' }).click();
    await expect(modal).toBeVisible();
    await modal.getByLabel('Player Name:').fill('Alice');
    await modal.getByRole('button', { name: 'Add Player' }).click();
    await expect(modal).not.toBeVisible();

    // Verify option exists and Alice is auto-selected
    await expect(playerSelect.getByRole('option')).toHaveCount(2);
    const getSelectedPlayerName = () =>
      playerSelect.evaluate((el: HTMLSelectElement) => el.selectedOptions[0]?.textContent?.trim());

    expect(await getSelectedPlayerName()).toBe('Alice');

    // Verify switching between Player 1 and Alice
    await playerSelect.selectOption({ label: 'Player 1' });
    expect(await getSelectedPlayerName()).toBe('Player 1');
    await playerSelect.selectOption({ label: 'Alice' });
    expect(await getSelectedPlayerName()).toBe('Alice');

    const toolbar = page.getByRole('toolbar', { name: 'Roll controls' });
    const rollBtn = toolbar.getByRole('button', {
      name: /Roll Round|Roll \d+d\d+|Flip|Series Complete/,
    });

    // Step 3: Alice executes 2d6 Single series (values [6, 6] -> Luck > 170%)
    // (5 % 6) + 1 = 6
    await page.getByRole('radio', { name: 'd6' }).click();
    await page.getByRole('button', { name: 'Single (1)' }).click();
    await page.getByRole('button', { name: 'Increase quantity' }).click(); // 2 dice

    await page.evaluate((vals) => window.__setRandomQueue?.(vals), [5, 5]);
    await rollBtn.click();
    await expect(rollBtn).toHaveText(/Series Complete/i);

    // Step 4: Player 1 executes 2d6 Single series (values [1, 1] -> Luck < 30%)
    // (0 % 6) + 1 = 1
    await playerSelect.selectOption({ label: 'Player 1' });
    await page.getByRole('button', { name: 'Single (1)' }).click(); // Ensure 1 round
    await page.evaluate((vals) => window.__setRandomQueue?.(vals), [0, 0]);
    await rollBtn.click();
    await expect(rollBtn).toHaveText(/Series Complete/i);

    // Step 5: Alice executes Coin (d2) Single series (value [1] = HEADS -> Luck 200%, Coins Won 1)
    // (0 % 2) + 1 = 1 = HEADS
    await playerSelect.selectOption({ label: 'Alice' });
    await page.getByRole('radio', { name: /Coin \(d2\)/i }).click();
    await page.getByRole('button', { name: 'Single (1)' }).click();
    // Decrease quantity back to 1 coin
    await page.getByRole('button', { name: 'Decrease quantity' }).click();
    await expect(page.getByRole('slider', { name: /Quantity Per Roll/ })).toHaveValue('1');

    await page.evaluate((vals) => window.__setRandomQueue?.(vals), [0]);
    await rollBtn.click();
    await expect(rollBtn).toHaveText(/Series Complete/i);

    // Step 6: Switch to History tab and verify Leaderboard rankings & metrics
    await page.getByRole('tab', { name: /History/i }).click();
    const playerCards = page.getByRole('list', { name: /Leaderboard/i }).getByRole('listitem');
    await expect(playerCards).toHaveCount(2);

    // Alice should be ranked #1 with hot flame icon (🔥)
    const firstPlayerCard = playerCards.nth(0);
    await expect(firstPlayerCard.getByTestId('player-name')).toHaveText('Alice');
    const firstLuckBadge = firstPlayerCard.getByRole('img', { name: /Luck Index/ });
    await expect(firstLuckBadge).toContainText('🔥');
    await expect(firstPlayerCard).toContainText('Coins Won');
    await expect(firstPlayerCard.getByTestId('coin-series-won')).toHaveText('1');
    await expect(firstPlayerCard).toContainText('Heads Rate');
    await expect(firstPlayerCard).toContainText('100.0%');

    // Player 1 should be ranked #2 with cold ice icon (❄️)
    const secondPlayerCard = playerCards.nth(1);
    await expect(secondPlayerCard.getByTestId('player-name')).toHaveText('Player 1');
    const secondLuckBadge = secondPlayerCard.getByRole('img', { name: /Luck Index/ });
    await expect(secondLuckBadge).toContainText('❄️');

    // Verify Past Completed Series log has 3 entries
    const historyItems = page
      .getByRole('region', { name: 'Scrollable list of past series' })
      .getByRole('listitem');
    await expect(historyItems).toHaveCount(3);
    await expect(historyItems.nth(0)).toContainText('Alice');
    await expect(historyItems.nth(0)).toContainText('Coin d2');
    await expect(historyItems.nth(1)).toContainText('Player 1');
    await expect(historyItems.nth(1)).toContainText('d6');
    await expect(historyItems.nth(2)).toContainText('Alice');
    await expect(historyItems.nth(2)).toContainText('d6');

    // Step 7: Reload the page and verify localStorage persistence (both players & history)
    await page.reload();
    await expect(playerSelect.getByRole('option')).toHaveCount(2);
    expect(await getSelectedPlayerName()).toBe('Alice');
    await page.getByRole('tab', { name: /History/i }).click();

    const reloadedPlayerCards = page
      .getByRole('list', { name: /Leaderboard/i })
      .getByRole('listitem');
    await expect(reloadedPlayerCards).toHaveCount(2);
    await expect(reloadedPlayerCards.nth(0).getByTestId('player-name')).toHaveText('Alice');
    await expect(reloadedPlayerCards.nth(0).getByRole('img', { name: /Luck Index/ })).toContainText(
      '🔥',
    );
    await expect(reloadedPlayerCards.nth(0)).toContainText('Coins Won');
    await expect(reloadedPlayerCards.nth(1).getByTestId('player-name')).toHaveText('Player 1');
    await expect(reloadedPlayerCards.nth(1).getByRole('img', { name: /Luck Index/ })).toContainText(
      '❄️',
    );

    const reloadedHistoryItems = page
      .getByRole('region', { name: 'Scrollable list of past series' })
      .getByRole('listitem');
    await expect(reloadedHistoryItems).toHaveCount(3);

    // Step 8: Clear history and verify empty history + preserved players across reload
    const clearBtn = page.getByRole('button', { name: 'Clear all completed series history' });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    await expect(page.getByText(/No completed series/i)).toBeVisible();
    await expect(clearBtn).not.toBeVisible();
    await expect(historyItems).toHaveCount(0);

    // Persist empty history while keeping registered players across reload
    await page.reload();
    await expect(playerSelect.getByRole('option')).toHaveCount(2);
    expect(await getSelectedPlayerName()).toBe('Alice');
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByText(/No completed series/i)).toBeVisible();
    await expect(clearBtn).not.toBeVisible();
    await expect(historyItems).toHaveCount(0);
  });

  test('Add Local Player dialog supports Escape close, Tab focus trap, focus restoration, and re-open', async ({
    page,
  }) => {
    await page.goto('/');

    const addPlayerBtn = page.getByRole('button', { name: 'Add new local player' });
    await addPlayerBtn.click();

    const modal = page.getByRole('dialog', { name: 'Add Local Player' });
    const nameInput = modal.getByLabel('Player Name:');
    const cancelBtn = modal.getByRole('button', { name: 'Cancel' });
    const submitBtn = modal.getByRole('button', { name: 'Add Player' });

    await expect(modal).toBeVisible();
    await expect(nameInput).toBeFocused();

    // Type a partial name so re-open verifies input reset on Escape close
    await nameInput.fill('TempPlayer');

    // Tab cycles through focusable controls inside the native modal; the background page is inert,
    // so tabbing past the last control steps to the browser chrome (document.body) and wraps to input.
    await page.keyboard.press('Tab');
    await expect(cancelBtn).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(submitBtn).toBeFocused();

    await page.keyboard.press('Tab');
    const activeTagAfterLast = await page.evaluate(() => document.activeElement?.tagName ?? null);
    expect(activeTagAfterLast).toBe('BODY');

    await page.keyboard.press('Tab');
    await expect(nameInput).toBeFocused();

    // Escape closes modal and restores focus to trigger button
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await expect(addPlayerBtn).toBeFocused();

    // Clicking + Player again re-opens cleanly with empty input
    await addPlayerBtn.click();
    await expect(modal).toBeVisible();
    await expect(nameInput).toHaveValue('');
    await expect(nameInput).toBeFocused();
  });
});
