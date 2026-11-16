import { test, expect, type Locator } from '@playwright/test';

const INSTRUMENT_NAMES = ['Coin (d2)', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const;

async function expectActiveRadio(radiogroup: Locator, activeName: string): Promise<void> {
  for (const name of INSTRUMENT_NAMES) {
    const radio = radiogroup.getByRole('radio', { name });
    const isActive = name === activeName;
    await expect(radio).toHaveAttribute('aria-checked', isActive ? 'true' : 'false');
    await expect(radio).toHaveAttribute('tabindex', isActive ? '0' : '-1');
  }
  await expect(radiogroup.getByRole('radio', { name: activeName })).toBeFocused();
}

test.describe('FaceSelector Keyboard Navigation (Issue #31)', () => {
  test('supports roving tabindex, arrow keys, Home/End, and wrap-around in both directions', async ({
    page,
  }) => {
    await page.goto('/');

    const radiogroup = page.getByRole('radiogroup', { name: 'Die face selector' });
    await expect(radiogroup).toBeVisible();

    const d6Radio = radiogroup.getByRole('radio', { name: 'd6' });
    await expect(d6Radio).toHaveAttribute('aria-checked', 'true');
    await expect(d6Radio).toHaveAttribute('tabindex', '0');

    for (const name of INSTRUMENT_NAMES) {
      if (name !== 'd6') {
        const other = radiogroup.getByRole('radio', { name });
        await expect(other).toHaveAttribute('aria-checked', 'false');
        await expect(other).toHaveAttribute('tabindex', '-1');
      }
    }

    await d6Radio.focus();
    await expect(d6Radio).toBeFocused();

    // Forward arrows: ArrowRight -> d8, ArrowDown -> d10
    await page.keyboard.press('ArrowRight');
    await expectActiveRadio(radiogroup, 'd8');

    await page.keyboard.press('ArrowDown');
    await expectActiveRadio(radiogroup, 'd10');

    // Backward arrows: ArrowLeft -> d8, ArrowUp -> d6
    await page.keyboard.press('ArrowLeft');
    await expectActiveRadio(radiogroup, 'd8');

    await page.keyboard.press('ArrowUp');
    await expectActiveRadio(radiogroup, 'd6');

    // End -> last ('d20'), then ArrowRight wraps to first ('Coin (d2)')
    await page.keyboard.press('End');
    await expectActiveRadio(radiogroup, 'd20');

    await page.keyboard.press('ArrowRight');
    await expectActiveRadio(radiogroup, 'Coin (d2)');

    // Home -> first ('Coin (d2)'), then ArrowLeft wraps to last ('d20')
    await page.keyboard.press('Home');
    await expectActiveRadio(radiogroup, 'Coin (d2)');

    await page.keyboard.press('ArrowLeft');
    await expectActiveRadio(radiogroup, 'd20');
  });
});
