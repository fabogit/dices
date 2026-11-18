import { createContext } from 'svelte';
import type { RollState } from './rollState.svelte';

/**
 * Typed context for the app's single RollState. The root component provides it with
 * `setRollState`; containers read it with `getRollState`, which throws if no ancestor set it.
 * Presentational components must not call it (enforced by `no-restricted-imports`).
 */
export const [getRollState, setRollState] = createContext<RollState>();
