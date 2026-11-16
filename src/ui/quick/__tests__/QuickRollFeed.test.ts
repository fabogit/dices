import { describe, it, expect, vi } from 'vite-plus/test';
import { render, fireEvent, within } from '@testing-library/svelte';
import { computeRoundResult } from '../../../core/engine';
import QuickRollFeed from '../QuickRollFeed.svelte';

describe('QuickRollFeed', () => {
  it('renders mixed coin and dice throws and handles Clear button disabled state', async () => {
    const onClear = vi.fn<() => void>();
    const items = [
      computeRoundResult(1, [1, 2], 2, 1_700_000_005_000, 'qf-coin'),
      computeRoundResult(0, [2, 5], 6, 1_700_000_000_000, 'qf-dice'),
    ];

    const { getByRole, rerender } = render(QuickRollFeed, {
      props: {
        items,
        isRolling: false,
        onClear,
      },
    });

    const region = getByRole('region', { name: 'Recent quick rolls feed' });
    expect(region.getAttribute('tabindex')).toBe('0');

    const rows = within(within(region).getByRole('list')).getAllByRole('listitem');
    expect(rows).toHaveLength(2);

    const coinRow = within(rows[0]);
    expect(coinRow.getByText('#2')).toBeTruthy();
    expect(coinRow.getByText('Coin')).toBeTruthy();
    expect(coinRow.getByText('H')).toBeTruthy();
    expect(coinRow.getByText('T')).toBeTruthy();
    expect(coinRow.getByText('TIE')).toBeTruthy();

    const diceRow = within(rows[1]);
    expect(diceRow.getByText('#1')).toBeTruthy();
    expect(diceRow.getByText('d6')).toBeTruthy();
    expect(diceRow.getByText('2, 5')).toBeTruthy();
    expect(diceRow.getByText('7')).toBeTruthy();

    const clearBtn = getByRole('button', { name: 'Clear quick roll feed' });
    expect(clearBtn.hasAttribute('disabled')).toBe(false);
    await fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledOnce();

    onClear.mockClear();
    await rerender({ items, isRolling: true, onClear });
    expect(clearBtn.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(clearBtn);
    expect(onClear).not.toHaveBeenCalled();
  });
});
