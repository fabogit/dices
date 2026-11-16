import { render } from '@testing-library/svelte';
import type { Component } from 'svelte';
import type { RollStorage } from '../../core/persistence';
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
