import { ALLOWED_FACES, type RollConfig } from './types';

export interface IntLimits {
  readonly min: number;
  readonly max: number;
}

/** Number of dice/coins thrown in a single roll. */
export const COUNT_PER_ROLL_LIMITS = { min: 1, max: 10 } as const satisfies IntLimits;

/** Number of rounds in a series. */
export const SERIES_LENGTH_LIMITS = { min: 1, max: 21 } as const satisfies IntLimits;

/** Completed series kept in memory and in storage, newest first. */
export const MAX_HISTORY_ENTRIES = 50;

/** Quick-roll results kept in the feed, newest first (not persisted). */
export const MAX_QUICK_ROLLS = 25;

/** Rounds a finite number to the nearest integer and clamps it into `limits`. */
export function clampInt(value: number, limits: IntLimits): number {
  return Math.min(limits.max, Math.max(limits.min, Math.round(value)));
}

export function isIntWithinLimits(value: unknown, limits: IntLimits): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= limits.min &&
    value <= limits.max
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateRollConfig(config: unknown): asserts config is RollConfig {
  if (!isObjectRecord(config)) {
    throw new Error('Roll configuration must be a valid object');
  }

  if (!(ALLOWED_FACES as readonly unknown[]).includes(config.faces)) {
    throw new Error(
      `Invalid faces count: ${String(config.faces)}. Allowed values are: ${ALLOWED_FACES.join(', ')}`,
    );
  }

  if (!isIntWithinLimits(config.countPerRoll, COUNT_PER_ROLL_LIMITS)) {
    throw new Error(
      `Invalid countPerRoll: ${String(config.countPerRoll)}. Must be an integer between ${COUNT_PER_ROLL_LIMITS.min} and ${COUNT_PER_ROLL_LIMITS.max}`,
    );
  }

  if (!isIntWithinLimits(config.seriesLength, SERIES_LENGTH_LIMITS)) {
    throw new Error(
      `Invalid seriesLength: ${String(config.seriesLength)}. Must be an integer between ${SERIES_LENGTH_LIMITS.min} and ${SERIES_LENGTH_LIMITS.max}`,
    );
  }

  if (typeof config.playerId !== 'string' || config.playerId.trim().length === 0) {
    throw new Error('playerId must be a non-empty string');
  }
}

export function isValidRollConfig(value: unknown): value is RollConfig {
  try {
    validateRollConfig(value);
    return true;
  } catch {
    return false;
  }
}
