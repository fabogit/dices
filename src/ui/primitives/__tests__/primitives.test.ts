import { describe, it, expect, vi } from 'vite-plus/test';
import { render, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Tabs from '../Tabs.svelte';
import CollapsiblePanel from '../CollapsiblePanel.svelte';
import RangeStepper from '../RangeStepper.svelte';
import DeltaBadge from '../DeltaBadge.svelte';
import CoinPills from '../CoinPills.svelte';
import StatBox from '../StatBox.svelte';
import EmptyState from '../EmptyState.svelte';
import Dialog from '../Dialog.svelte';

function htmlSnippet(html: string) {
  return createRawSnippet(() => ({
    render: () => html,
  }));
}

describe('Tabs primitive', () => {
  const panelSnippet = createRawSnippet((id: () => string) => ({
    render: () => `<p>Panel ${id()}</p>`,
  }));

  const sampleTabs = [
    { id: 'scoreboard', label: 'Scoreboard', badge: '2/3' },
    { id: 'analytics', label: 'Breakdown' },
    { id: 'history', label: 'History', badge: 5 },
  ];

  it('renders tabs with badges, active styling, and roving tabindex', () => {
    const onSelect = vi.fn<(id: string) => void>();
    const { getByRole } = render(Tabs, {
      props: {
        tabs: sampleTabs,
        activeTab: 'scoreboard',
        ariaLabel: 'Analysis views',
        onSelect,
        panel: panelSnippet,
      },
    });

    const tablist = getByRole('tablist', { name: 'Analysis views' });
    expect(tablist).toBeTruthy();

    const scoreboardTab = getByRole('tab', { name: /Scoreboard/ });
    const breakdownTab = getByRole('tab', { name: /Breakdown/ });
    const historyTab = getByRole('tab', { name: /History/ });

    expect(scoreboardTab.getAttribute('aria-selected')).toBe('true');
    expect(scoreboardTab.getAttribute('tabindex')).toBe('0');
    expect(scoreboardTab.textContent).toContain('2/3');

    expect(breakdownTab.getAttribute('aria-selected')).toBe('false');
    expect(breakdownTab.getAttribute('tabindex')).toBe('-1');

    expect(historyTab.textContent).toContain('5');
  });

  it('wires each tab to its own tabpanel through generated ids and renders the panel snippet', () => {
    const { getByRole, getAllByRole, getByText, container } = render(Tabs, {
      props: {
        tabs: sampleTabs,
        activeTab: 'analytics',
        ariaLabel: 'Analysis views',
        onSelect: vi.fn<(id: string) => void>(),
        panel: panelSnippet,
      },
    });

    const panels = Array.from(container.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    expect(panels).toHaveLength(3);
    for (const tab of getAllByRole('tab')) {
      const panelEl = document.querySelector(`[id="${tab.getAttribute('aria-controls')!}"]`);
      expect(panelEl?.getAttribute('role')).toBe('tabpanel');
      expect(panelEl?.getAttribute('aria-labelledby')).toBe(tab.id);
    }
    expect(panels.map((el) => el.hidden)).toEqual([true, false, true]);
    expect(getByRole('tabpanel', { name: /Breakdown/ }).textContent).toBe('Panel analytics');
    expect(getByText('Panel history')).toBeTruthy();
  });

  it('generates unique ids per instance', () => {
    const props = {
      tabs: sampleTabs,
      activeTab: 'scoreboard',
      ariaLabel: 'Analysis views',
      onSelect: vi.fn<(id: string) => void>(),
      panel: panelSnippet,
    };
    const first = render(Tabs, { props });
    const second = render(Tabs, { props });

    const ids = [...first.getAllByRole('tab'), ...second.getAllByRole('tab')].map((t) => t.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('invokes onSelect on click and supports ArrowRight, ArrowLeft, Home, End keyboard navigation', async () => {
    const onSelect = vi.fn<(id: string) => void>();

    const { getByRole, rerender } = render(Tabs, {
      props: {
        tabs: sampleTabs,
        activeTab: 'scoreboard',
        ariaLabel: 'Analysis views',
        onSelect,
        panel: panelSnippet,
      },
    });

    const scoreboardTab = getByRole('tab', { name: /Scoreboard/ });
    const breakdownTab = getByRole('tab', { name: /Breakdown/ });
    const historyTab = getByRole('tab', { name: /History/ });

    // Click triggers selection
    await fireEvent.click(breakdownTab);
    expect(onSelect).toHaveBeenCalledWith('analytics');
    await rerender({
      tabs: sampleTabs,
      activeTab: 'analytics',
      ariaLabel: 'Analysis views',
      onSelect,
      panel: panelSnippet,
    });

    // ArrowRight moves to History and focuses it
    breakdownTab.focus();
    await fireEvent.keyDown(breakdownTab, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenLastCalledWith('history');
    expect(document.activeElement).toBe(historyTab);
    await rerender({
      tabs: sampleTabs,
      activeTab: 'history',
      ariaLabel: 'Analysis views',
      onSelect,
      panel: panelSnippet,
    });

    // ArrowRight wraps around to Scoreboard
    await fireEvent.keyDown(historyTab, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenLastCalledWith('scoreboard');
    expect(document.activeElement).toBe(scoreboardTab);
    await rerender({
      tabs: sampleTabs,
      activeTab: 'scoreboard',
      ariaLabel: 'Analysis views',
      onSelect,
      panel: panelSnippet,
    });

    // ArrowLeft wraps around to History
    await fireEvent.keyDown(scoreboardTab, { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenLastCalledWith('history');
    expect(document.activeElement).toBe(historyTab);

    // Home jumps to first tab
    await fireEvent.keyDown(historyTab, { key: 'Home' });
    expect(onSelect).toHaveBeenLastCalledWith('scoreboard');
    expect(document.activeElement).toBe(scoreboardTab);

    // End jumps to last tab
    await fireEvent.keyDown(scoreboardTab, { key: 'End' });
    expect(onSelect).toHaveBeenLastCalledWith('history');
    expect(document.activeElement).toBe(historyTab);

    // Unrelated key does nothing
    const callsBefore = onSelect.mock.calls.length;
    await fireEvent.keyDown(historyTab, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(callsBefore);
  });

  it('handles empty tabs array and fallback activeTab without throwing on keydown', async () => {
    const onSelect = vi.fn<(id: string) => void>();
    const { getByRole, rerender } = render(Tabs, {
      props: {
        tabs: sampleTabs,
        activeTab: 'unknown',
        ariaLabel: 'Analysis views',
        onSelect,
        panel: panelSnippet,
      },
    });

    const scoreboardTab = getByRole('tab', { name: /Scoreboard/ });
    await fireEvent.keyDown(scoreboardTab, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith('analytics');

    onSelect.mockClear();
    await rerender({
      tabs: [],
      activeTab: 'scoreboard',
      ariaLabel: 'Analysis views',
      onSelect,
      panel: panelSnippet,
    });
    const tablist = getByRole('tablist', { name: 'Analysis views' });
    await fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('starts keyboard navigation from index 0 when activeTab is missing in tabs', async () => {
    const onSelect = vi.fn<(id: string) => void>();
    const { getByRole } = render(Tabs, {
      props: {
        tabs: sampleTabs,
        activeTab: 'missing-tab',
        ariaLabel: 'Analysis views',
        onSelect,
        panel: panelSnippet,
      },
    });

    const scoreboardTab = getByRole('tab', { name: /Scoreboard/ });
    const historyTab = getByRole('tab', { name: /History/ });

    scoreboardTab.focus();
    await fireEvent.keyDown(scoreboardTab, { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenCalledWith('history');
    expect(document.activeElement).toBe(historyTab);
  });
});

describe('CollapsiblePanel primitive', () => {
  it('assigns unique $props.id() values across multiple instances and wires aria-expanded', () => {
    const first = render(CollapsiblePanel, {
      props: {
        title: 'First Panel',
        children: htmlSnippet('<p>Body One</p>'),
      },
    });

    const second = render(CollapsiblePanel, {
      props: {
        title: 'Second Panel',
        collapsed: true,
        children: htmlSnippet('<p>Body Two</p>'),
      },
    });

    const btnOne = first.getByRole('button', { name: 'Hide First Panel' });
    const btnTwo = second.getByRole('button', { name: 'Show Second Panel' });

    const controlsOne = btnOne.getAttribute('aria-controls');
    const controlsTwo = btnTwo.getAttribute('aria-controls');
    expect(controlsOne).toBeTruthy();
    expect(controlsTwo).toBeTruthy();
    expect(controlsOne).not.toBe(controlsTwo);

    // Without a `collapsed` prop the panel starts expanded
    expect(btnOne.getAttribute('aria-expanded')).toBe('true');
    expect(btnTwo.getAttribute('aria-expanded')).toBe('false');

    const bodyTwo = document.querySelector(`[id="${controlsTwo!}"]`);
    expect(bodyTwo?.classList.contains('collapsed')).toBe(true);
  });

  it('toggles its own state when the consumer does not bind collapsed', async () => {
    const { getByRole, getByTestId } = render(CollapsiblePanel, {
      props: {
        title: 'Setup',
        bodyTestId: 'setup-body',
        children: htmlSnippet('<p>Body</p>'),
      },
    });

    await fireEvent.click(getByRole('button', { name: 'Hide Setup' }));
    const showBtn = getByRole('button', { name: 'Show Setup' });
    expect(showBtn.getAttribute('aria-expanded')).toBe('false');
    expect(showBtn.textContent).toContain('Show');
    expect(getByTestId('setup-body').classList.contains('collapsed')).toBe(true);

    await fireEvent.click(showBtn);
    expect(getByRole('button', { name: 'Hide Setup' }).getAttribute('aria-expanded')).toBe('true');
    expect(getByTestId('setup-body').classList.contains('collapsed')).toBe(false);
  });

  it('writes the toggled state back through bind:collapsed', async () => {
    // Accessor props are what `bind:collapsed` compiles to in a parent component. The getter
    // is not reactive here, so only the write-back is asserted; RightPanel tests the full loop.
    const writes: boolean[] = [];
    const { getByRole } = render(CollapsiblePanel, {
      props: {
        title: 'History',
        get collapsed() {
          return true;
        },
        set collapsed(next: boolean) {
          writes.push(next);
        },
        children: htmlSnippet('<p>Body</p>'),
      },
    });

    await fireEvent.click(getByRole('button', { name: 'Show History' }));
    expect(writes).toEqual([false]);
  });

  it('supports semantic tags, a root class, headingLevel, badge/actions snippets, and custom toggle copy', async () => {
    const { container, getByRole, getByTestId, rerender } = render(CollapsiblePanel, {
      props: {
        as: 'aside',
        class: 'surface-card',
        headingLevel: 'h3',
        title: '3D Dice Arena',
        headingId: 'custom-arena-heading',
        bodyTestId: 'arena-body',
        expandText: 'Show Arena',
        collapseText: 'Hide Arena',
        expandAriaLabel: 'Show Arena for 3D Dice',
        collapseAriaLabel: 'Hide Arena for 3D Dice',
        badge: htmlSnippet('<span>Badge 1</span>'),
        actions: htmlSnippet('<button type="button">Clear</button>'),
        children: htmlSnippet('<div>Viewport</div>'),
      },
    });

    const aside = container.querySelector('aside');
    expect(aside).toBeTruthy();
    // The consumer class is appended to the primitive's own root class
    expect(aside?.classList.contains('cp-root')).toBe(true);
    expect(aside?.classList.contains('surface-card')).toBe(true);
    expect(aside?.getAttribute('aria-labelledby')).toBe('custom-arena-heading');

    const heading = container.querySelector('h3');
    expect(heading?.textContent).toBe('3D Dice Arena');

    expect(getByRole('button', { name: 'Clear' })).toBeTruthy();
    expect(container.textContent).toContain('Badge 1');

    const collapseBtn = getByRole('button', { name: 'Hide Arena for 3D Dice' });
    expect(collapseBtn.textContent).toContain('Hide Arena');
    expect(getByTestId('arena-body').classList.contains('collapsed')).toBe(false);

    // The toggle rendered next to the actions snippet must also toggle the panel
    await fireEvent.click(collapseBtn);
    const expandBtn = getByRole('button', { name: 'Show Arena for 3D Dice' });
    expect(expandBtn.textContent).toContain('Show Arena');
    expect(getByTestId('arena-body').classList.contains('collapsed')).toBe(true);

    await rerender({
      as: 'div',
      headingLevel: 'h3',
      title: '3D Dice Arena',
      collapsed: false,
      expandText: 'Show Arena',
      collapseText: 'Hide Arena',
      expandAriaLabel: 'Show Arena for 3D Dice',
      collapseAriaLabel: 'Hide Arena for 3D Dice',
      children: htmlSnippet('<div>Viewport</div>'),
    });

    const divRoot = container.querySelector('.cp-root');
    expect(divRoot?.tagName.toLowerCase()).toBe('div');
    expect(divRoot?.getAttribute('aria-labelledby')).toBeNull();
    expect(getByRole('button', { name: 'Hide Arena for 3D Dice' }).textContent).toContain(
      'Hide Arena',
    );
  });

  it('renders directly with as="div" and omits aria-labelledby on initial mount', () => {
    const { container } = render(CollapsiblePanel, {
      props: {
        as: 'div',
        title: 'Inline Section',
        children: htmlSnippet('<div>Body</div>'),
      },
    });

    const root = container.firstElementChild;
    expect(root?.tagName.toLowerCase()).toBe('div');
    expect(root?.hasAttribute('aria-labelledby')).toBe(false);
  });
});

describe('RangeStepper primitive', () => {
  it('enforces min/max boundary button disabling and invokes onChange on steppers and range input', async () => {
    const onChange = vi.fn<(next: number) => void>();
    const { getByRole, container, rerender } = render(RangeStepper, {
      props: {
        id: 'qty-slider',
        label: 'Quantity:',
        value: 1,
        min: 1,
        max: 10,
        hint: '1 to 10 dice',
        decreaseAriaLabel: 'Decrease quantity',
        increaseAriaLabel: 'Increase quantity',
        onChange,
        beforeSlider: htmlSnippet('<div data-testid="presets">Presets</div>'),
        afterSlider: htmlSnippet('<div data-testid="after">After</div>'),
      },
    });

    const decBtn = getByRole('button', { name: 'Decrease quantity' }) as HTMLButtonElement;
    const incBtn = getByRole('button', { name: 'Increase quantity' }) as HTMLButtonElement;
    const slider = getByRole('slider') as HTMLInputElement;

    expect(container.textContent).toContain('1 to 10 dice');
    expect(container.querySelector('[data-testid="presets"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="after"]')).toBeTruthy();

    // At min=1: decrease disabled, increase enabled
    expect(decBtn.disabled).toBe(true);
    expect(incBtn.disabled).toBe(false);

    await fireEvent.click(incBtn);
    expect(onChange).toHaveBeenCalledWith(2);

    // At middle value=5: both enabled, step works in both directions
    await rerender({
      id: 'qty-slider',
      label: 'Quantity:',
      value: 5,
      min: 1,
      max: 10,
      decreaseAriaLabel: 'Decrease quantity',
      increaseAriaLabel: 'Increase quantity',
      onChange,
    });
    expect(decBtn.disabled).toBe(false);
    expect(incBtn.disabled).toBe(false);

    await fireEvent.click(decBtn);
    expect(onChange).toHaveBeenLastCalledWith(4);

    // Range slider input triggers onChange with numeric value
    await fireEvent.input(slider, { target: { value: '8' } });
    expect(onChange).toHaveBeenLastCalledWith(8);

    // At max=10: increase disabled
    await rerender({
      id: 'qty-slider',
      label: 'Quantity:',
      value: 10,
      min: 1,
      max: 10,
      decreaseAriaLabel: 'Decrease quantity',
      increaseAriaLabel: 'Increase quantity',
      onChange,
    });
    expect(decBtn.disabled).toBe(false);
    expect(incBtn.disabled).toBe(true);

    // Whole control disabled
    await rerender({
      id: 'qty-slider',
      label: 'Quantity:',
      value: 5,
      min: 1,
      max: 10,
      disabled: true,
      decreaseAriaLabel: 'Decrease quantity',
      increaseAriaLabel: 'Increase quantity',
      onChange,
    });
    expect(decBtn.disabled).toBe(true);
    expect(incBtn.disabled).toBe(true);
    expect(slider.disabled).toBe(true);
  });
});

describe('DeltaBadge primitive', () => {
  it('renders positive, negative, and neutral tones across tag, dist, inline, and pill variants', async () => {
    const { container, rerender } = render(DeltaBadge, {
      props: { tone: 'positive', text: '+5.0%', variant: 'tag' },
    });

    let badge = container.querySelector('.delta-tag');
    expect(badge?.classList.contains('positive')).toBe(true);
    expect(badge?.classList.contains('negative')).toBe(false);
    expect(badge?.textContent?.trim()).toBe('+5.0%');

    await rerender({ tone: 'negative', text: '-3.0%', variant: 'tag' });
    badge = container.querySelector('.delta-tag');
    expect(badge?.classList.contains('negative')).toBe(true);

    await rerender({ tone: 'neutral', text: '0.0%', variant: 'dist' });
    const dist = container.querySelector('.delta-pct');
    expect(dist?.classList.contains('delta-pos')).toBe(false);
    expect(dist?.classList.contains('delta-neg')).toBe(false);

    await rerender({ tone: 'positive', text: '+1.2%', variant: 'dist' });
    expect(container.querySelector('.delta-pct')?.classList.contains('delta-pos')).toBe(true);

    await rerender({ tone: 'negative', text: '-1.2%', variant: 'dist' });
    expect(container.querySelector('.delta-pct')?.classList.contains('delta-neg')).toBe(true);

    await rerender({ tone: 'positive', prefix: 'Δ: ', text: '+2', variant: 'inline' });
    const inline = container.querySelector('.delta-indicator');
    expect(inline?.classList.contains('pos')).toBe(true);
    expect(inline?.textContent).toBe('Δ: +2');

    await rerender({ tone: 'negative', text: '-1.50 Δ', variant: 'pill' });
    const pill = container.querySelector('.session-pill.pill-delta');
    expect(pill?.classList.contains('neg')).toBe(true);
    expect(pill?.textContent?.trim()).toBe('-1.50 Δ');
  });
});

describe('CoinPills primitive', () => {
  it('renders H and T mini-coins with matching classes and optional data-testid', async () => {
    const { getAllByTestId, rerender, container } = render(CoinPills, {
      props: {
        values: [1, 2, 1],
        itemTestId: 'mini-coin',
      },
    });

    const coins = getAllByTestId('mini-coin');
    expect(coins).toHaveLength(3);
    expect(coins[0]?.textContent?.trim()).toBe('H');
    expect(coins[0]?.classList.contains('heads')).toBe(true);
    expect(coins[1]?.textContent?.trim()).toBe('T');
    expect(coins[1]?.classList.contains('tails')).toBe(true);
    expect(coins[2]?.textContent?.trim()).toBe('H');

    await rerender({ values: [2], itemTestId: undefined });
    const singleCoin = container.querySelectorAll('.mini-coin');
    expect(singleCoin).toHaveLength(1);
    expect(singleCoin[0]?.textContent?.trim()).toBe('T');
    expect((singleCoin[0] as HTMLElement | undefined)?.dataset.testid).toBeUndefined();
  });
});

describe('StatBox primitive', () => {
  it('renders label, value, tone classes, subtext, and children snippet', async () => {
    const { container, rerender } = render(StatBox, {
      props: {
        label: 'Heads Share',
        value: '66.7%',
        valueTone: 'heads',
        subtext: '(4/6)',
        children: htmlSnippet('<span data-testid="extra-child">Delta</span>'),
      },
    });

    expect(container.querySelector('.stat-box-label')?.textContent).toBe('Heads Share');
    expect(container.querySelector('.stat-main-num')?.textContent).toBe('66.7%');
    expect(container.querySelector('.stat-main-num')?.classList.contains('highlight-heads')).toBe(
      true,
    );
    expect(container.querySelector('.sub-label')?.textContent).toBe('(4/6)');
    expect(container.querySelector('[data-testid="extra-child"]')?.textContent).toBe('Delta');

    await rerender({ label: 'Tails', value: '33.3%', valueTone: 'tails' });
    expect(container.querySelector('.stat-main-num')?.classList.contains('highlight-tails')).toBe(
      true,
    );

    await rerender({ label: 'Crit Max', value: '10.0%', valueTone: 'crit-max' });
    expect(container.querySelector('.stat-main-num')?.classList.contains('highlight-crit')).toBe(
      true,
    );

    await rerender({ label: 'Crit Min', value: '5.0%', valueTone: 'crit-min' });
    expect(container.querySelector('.stat-main-num')?.classList.contains('highlight-min')).toBe(
      true,
    );
  });
});

describe('EmptyState primitive', () => {
  it('renders card and inline variants with message or snippet children', async () => {
    const { container, rerender } = render(EmptyState, {
      props: {
        variant: 'card',
        icon: '🎲',
        title: 'Ready to Roll',
        message: 'Press Roll to start.',
      },
    });

    expect(container.querySelector('.empty-icon')?.textContent).toBe('🎲');
    expect(container.querySelector('.empty-title')?.textContent).toBe('Ready to Roll');
    expect(container.querySelector('.empty-desc')?.textContent).toBe('Press Roll to start.');

    await rerender({
      variant: 'inline',
      message: 'No completed series yet.',
    });
    expect(container.querySelector('.empty-history')?.textContent?.trim()).toBe(
      'No completed series yet.',
    );

    await rerender({
      variant: 'inline',
      children: htmlSnippet('<span>Custom empty message</span>'),
    });
    expect(container.querySelector('.empty-history')?.textContent).toContain(
      'Custom empty message',
    );
  });
});

describe('Dialog primitive', () => {
  it('syncs native dialog open/close with props and invokes onClose on native close and backdrop clicks', async () => {
    const onClose = vi.fn<() => void>();
    const { container, rerender } = render(Dialog, {
      props: {
        open: false,
        title: 'Add Local Player',
        onClose,
        children: htmlSnippet('<div data-testid="inner">Inner Content</div>'),
      },
    });

    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    expect(dialog).toBeTruthy();

    // happy-dom implements HTMLDialogElement, ensure showModal/close behave consistently
    const showModalSpy = vi.spyOn(dialog, 'showModal');
    const closeSpy = vi.spyOn(dialog, 'close');

    await rerender({
      open: true,
      title: 'Add Local Player',
      onClose,
      children: htmlSnippet('<div data-testid="inner">Inner Content</div>'),
    });

    expect(showModalSpy).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.querySelector(`[id="${labelledBy!}"]`)?.textContent).toBe('Add Local Player');

    // Click inside content does NOT close
    const inner = container.querySelector('[data-testid="inner"]')!;
    await fireEvent.click(inner);
    expect(closeSpy).not.toHaveBeenCalled();

    // Backdrop click (target === dialog) calls close(), which fires close -> onClose
    await fireEvent.click(dialog);
    expect(closeSpy).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();

    // Simulate parent updating open = false after onClose: should NOT fire onClose again
    onClose.mockClear();
    await rerender({
      open: false,
      title: 'Add Local Player',
      onClose,
      children: htmlSnippet('<div data-testid="inner">Inner Content</div>'),
    });
    expect(onClose).not.toHaveBeenCalled();

    // Re-open, then close programmatically from parent (e.g. Cancel/Submit handler): calls close() without re-triggering onClose
    await rerender({
      open: true,
      title: 'Add Local Player',
      onClose,
      children: htmlSnippet('<div data-testid="inner">Inner Content</div>'),
    });
    expect(dialog.open).toBe(true);
    closeSpy.mockClear();
    await rerender({
      open: false,
      title: 'Add Local Player',
      onClose,
      children: htmlSnippet('<div data-testid="inner">Inner Content</div>'),
    });
    expect(closeSpy).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});
