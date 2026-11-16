export interface IntLimits {
  readonly min: number;
  readonly max: number;
}

/** Number of dice/coins thrown in a single roll. */
export const COUNT_PER_ROLL_LIMITS = { min: 1, max: 10 } as const satisfies IntLimits;

/** Number of rounds in a series. */
export const SERIES_LENGTH_LIMITS = { min: 1, max: 21 } as const satisfies IntLimits;

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
