import { describe, it, expect, afterEach, vi } from 'vite-plus/test';
import { fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { DieFaces } from '../../../core/types';
import type { RollState } from '../../state/rollState.svelte';
import {
  createScriptedProvider,
  createTestRollState,
  renderWithRollState,
} from '../../__tests__/renderWithRollState';
import ArenaViewport from '../ArenaViewport.svelte';

interface ArenaCallbacks {
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

type RollVisual = (
  faces: DieFaces,
  values: number[],
  options?: { skipAnimation?: boolean },
) => Promise<void>;

// happy-dom has no WebGL, so the lazily imported three.js arena is replaced at its module
// boundary by a double whose animated rolls only land on `skipCurrentAnimation()`.
const arenas = vi.hoisted(() => ({
  instances: [] as Array<{
    canvas: HTMLCanvasElement;
    callbacks: ArenaCallbacks;
    rollVisual: RollVisual;
    skipCurrentAnimation: () => void;
    dispose: () => void;
  }>,
  failNext: false,
}));

vi.mock('../../../three/DiceArena3D', () => ({
  DiceArena3D: class {
    private landing: (() => void) | undefined;
    readonly rollVisual = vi.fn<RollVisual>((_faces, _values, options) =>
      options?.skipAnimation
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            this.landing = resolve;
          }),
    );
    readonly skipCurrentAnimation = vi.fn<() => void>(() => {
      this.landing?.();
      this.landing = undefined;
    });
    readonly dispose = vi.fn<() => void>();

    constructor(
      readonly canvas: HTMLCanvasElement,
      readonly callbacks: ArenaCallbacks = {},
    ) {
      if (arenas.failNext) {
        arenas.failNext = false;
        throw new Error('WebGL unavailable');
      }
      arenas.instances.push(this);
    }
  },
}));

let rollState: RollState;

async function renderArena(...rounds: number[][]) {
  rollState = createTestRollState({ provider: createScriptedProvider(...rounds) });
  rollState.instantMode = false;
  const view = renderWithRollState(ArenaViewport, rollState);
  await vi.waitFor(() => expect(arenas.instances).toHaveLength(1));
  return { ...view, arena: arenas.instances[0] };
}

/** Lets a roll that is waiting on the provider reach the (fake) arena. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await tick();
}

describe('ArenaViewport container', () => {
  afterEach(() => {
    rollState.dispose();
    arenas.instances.length = 0;
    arenas.failNext = false;
    vi.restoreAllMocks();
  });

  it('creates the arena on its canvas, hands it to the store and disposes it on unmount', async () => {
    const { arena, getByTestId, unmount } = await renderArena([5]);
    expect(arena.canvas).toBe(getByTestId('dice-canvas'));

    rollState.instantMode = true;
    await rollState.rollNextRound();
    expect(arena.rollVisual).toHaveBeenCalledWith(6, [5], { skipAnimation: true });

    unmount();
    expect(arena.dispose).toHaveBeenCalledOnce();
    // Detached from the store: skipping no longer reaches the disposed arena
    rollState.skipAnimation();
    expect(arena.skipCurrentAnimation).not.toHaveBeenCalled();
  });

  it('does not create the arena when unmounted before the 3D module loads', async () => {
    rollState = createTestRollState();
    const { unmount } = renderWithRollState(ArenaViewport, rollState);
    unmount();
    await settle();
    expect(arenas.instances).toHaveLength(0);
  });

  it('logs and keeps the UI usable when the arena cannot be created', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    arenas.failNext = true;
    rollState = createTestRollState({ provider: createScriptedProvider([2]) });
    const { getByRole, getByText } = renderWithRollState(ArenaViewport, rollState);
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledOnce());
    expect(consoleError.mock.calls[0]?.[0]).toBe('Failed to load 3D Dice Arena:');

    await fireEvent.click(getByRole('button', { name: 'Roll Round (1/3)' }));
    await settle();
    expect(rollState.rounds).toHaveLength(1);
    expect(getByText('Round 1 of 3')).toBeTruthy();
  });

  it('shows the context-loss banner from the arena callbacks', async () => {
    const { arena, getByRole, queryByRole } = await renderArena();
    expect(queryByRole('alert')).toBeNull();

    arena.callbacks.onContextLost?.();
    await tick();
    expect(rollState.contextLost).toBe(true);
    expect(getByRole('alert').textContent).toContain('WebGL Context Suspended');

    arena.callbacks.onContextRestored?.();
    await tick();
    expect(rollState.contextLost).toBe(false);
    expect(queryByRole('alert')).toBeNull();
  });

  it('rolls a series round, offers to skip the animation and updates the HUD', async () => {
    const { arena, getByRole, getByText, queryByRole } = await renderArena([4]);
    expect(getByText('Ready to Roll')).toBeTruthy();

    await fireEvent.click(getByRole('button', { name: 'Roll Round (1/3)' }));
    await settle();
    expect(arena.rollVisual).toHaveBeenCalledWith(6, [4], { skipAnimation: false });
    expect(rollState.isRolling).toBe(true);

    await fireEvent.click(getByRole('button', { name: /Skip Animation/ }));
    await settle();
    expect(rollState.rounds).toHaveLength(1);
    expect(queryByRole('button', { name: /Skip Animation/ })).toBeNull();
    expect(getByText('Round 1 of 3')).toBeTruthy();
    expect(getByText('Round #1:')).toBeTruthy();
    expect(getByRole('button', { name: 'Roll Round (2/3)' })).toBeTruthy();

    await fireEvent.click(getByRole('button', { name: /Reset/ }));
    expect(rollState.rounds).toHaveLength(0);
    expect(getByRole('button', { name: 'Roll Round (1/3)' })).toBeTruthy();
  });

  it('starts and stops auto-roll through the store', async () => {
    const { arena, getByRole } = await renderArena([3], [3]);

    await fireEvent.click(getByRole('button', { name: /Auto-Roll Series \(3\)/ }));
    await settle();
    expect(rollState.isAutoRolling).toBe(true);

    await fireEvent.click(getByRole('button', { name: /Stop Auto-Roll/ }));
    expect(rollState.isAutoRolling).toBe(false);
    arena.skipCurrentAnimation();
    await settle();
    expect(rollState.rounds).toHaveLength(1);
    expect(getByRole('button', { name: /Auto-Roll Series \(3\)/ })).toBeTruthy();
  });

  it('runs quick rolls in Quick mode and labels them with the die that produced them', async () => {
    const { getByRole, getByText } = await renderArena([2]);
    rollState.instantMode = true;
    rollState.setMode('quick');
    rollState.setFaces(2);
    await tick();
    expect(getByText('Quick Roll (Free)')).toBeTruthy();

    await fireEvent.click(getByRole('button', { name: /Flip Coin/ }));
    await settle();
    expect(rollState.quickRolls).toHaveLength(1);
    expect(getByText('Quick Roll:')).toBeTruthy();
    expect(getByText('TAILS')).toBeTruthy();

    // Changing the die keeps the shown roll labelled as a coin
    rollState.setFaces(6);
    await tick();
    expect(getByText('TAILS')).toBeTruthy();

    await fireEvent.click(getByRole('button', { name: 'Clear feed of all quick rolls' }));
    expect(rollState.quickRolls).toHaveLength(0);
  });

  it('collapses and expands the arena', async () => {
    const { getByRole } = await renderArena();
    await fireEvent.click(getByRole('button', { name: 'Hide Arena for 3D Dice' }));
    expect(
      getByRole('button', { name: 'Show Arena for 3D Dice' }).getAttribute('aria-expanded'),
    ).toBe('false');
  });
});
