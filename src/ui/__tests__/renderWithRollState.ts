import { render } from '@testing-library/svelte';
import type { Component } from 'svelte';
import type { RollStorage } from '../../core/persistence';
import type { IRollProvider } from '../../core/provider';
import { RollState, type RollStateOptions } from '../state/rollState.svelte';
import RollStateHarness from './RollStateHarness.svelte';

/** In-memory storage so component tests never touch the real localStorage. */
export function createMemoryStorage(initialPayload: unknown = null): RollStorage {
  let stored = initialPayload;
  return {
    load: () => stored,
    save: (payload) => {
      stored = payload;
    },
  };
}

/**
 * Deterministic provider: each `rollRound` call returns the next planned round's values
 * (whatever the requested faces/count) and throws once the plan is exhausted.
 */
export function createScriptedProvider(...rounds: number[][]): IRollProvider {
  const queue = rounds.map((values) => values.slice());
  return {
    kind: 'local-csprng',
    rollRound: async () => {
      const next = queue.shift();
      if (!next) throw new Error('Scripted provider exhausted: plan one round per roll.');
      return next;
    },
  };
}

/**
 * A fresh store backed by in-memory storage; pass `provider` for deterministic rolls.
 * Call `dispose()` when the test ends to release the reduced-motion listener.
 */
export function createTestRollState(options: RollStateOptions = {}): RollState {
  return new RollState({ storage: createMemoryStorage(), ...options });
}

/** Renders a container with `rollState` provided through context, as App does in the app. */
export function renderWithRollState(component: Component, rollState: RollState) {
  return render(RollStateHarness, { props: { rollState, component } });
}
