import { describe, it, expect } from 'vite-plus/test';
import {
  COUNT_PER_ROLL_LIMITS,
  SERIES_LENGTH_LIMITS,
  clampInt,
  isIntWithinLimits,
  validateRollConfig,
} from '..';

describe('roll limits', () => {
  it('exposes the documented bounds', () => {
    expect(COUNT_PER_ROLL_LIMITS).toEqual({ min: 1, max: 10 });
    expect(SERIES_LENGTH_LIMITS).toEqual({ min: 1, max: 21 });
  });

  it('clampInt rounds and clamps into the limits', () => {
    expect(clampInt(99, SERIES_LENGTH_LIMITS)).toBe(21);
    expect(clampInt(0, SERIES_LENGTH_LIMITS)).toBe(1);
    expect(clampInt(-5, COUNT_PER_ROLL_LIMITS)).toBe(1);
    expect(clampInt(5.4, SERIES_LENGTH_LIMITS)).toBe(5);
    expect(clampInt(5.6, SERIES_LENGTH_LIMITS)).toBe(6);
    expect(clampInt(11, COUNT_PER_ROLL_LIMITS)).toBe(10);
  });

  it('isIntWithinLimits accepts only integers inside the inclusive range', () => {
    expect(isIntWithinLimits(1, COUNT_PER_ROLL_LIMITS)).toBe(true);
    expect(isIntWithinLimits(10, COUNT_PER_ROLL_LIMITS)).toBe(true);
    expect(isIntWithinLimits(0, COUNT_PER_ROLL_LIMITS)).toBe(false);
    expect(isIntWithinLimits(11, COUNT_PER_ROLL_LIMITS)).toBe(false);
    expect(isIntWithinLimits(2.5, COUNT_PER_ROLL_LIMITS)).toBe(false);
    expect(isIntWithinLimits('3', COUNT_PER_ROLL_LIMITS)).toBe(false);
  });

  it('validateRollConfig enforces the shared limits and reports them in its messages', () => {
    const base = { faces: 6, countPerRoll: 1, seriesLength: 1, playerId: 'p' };
    expect(() =>
      validateRollConfig({ ...base, countPerRoll: COUNT_PER_ROLL_LIMITS.max }),
    ).not.toThrow();
    expect(() =>
      validateRollConfig({ ...base, seriesLength: SERIES_LENGTH_LIMITS.max }),
    ).not.toThrow();
    expect(() =>
      validateRollConfig({ ...base, countPerRoll: COUNT_PER_ROLL_LIMITS.max + 1 }),
    ).toThrow('Must be an integer between 1 and 10');
    expect(() =>
      validateRollConfig({ ...base, seriesLength: SERIES_LENGTH_LIMITS.max + 1 }),
    ).toThrow('Must be an integer between 1 and 21');
  });
});
