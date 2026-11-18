import { describe, it, expect } from 'vite-plus/test';
import {
  COUNT_PER_ROLL_LIMITS,
  SERIES_LENGTH_LIMITS,
  clampInt,
  isIntWithinLimits,
  validateRollConfig,
  ALLOWED_FACES,
  type DieFaces,
  type RollConfig,
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

describe('validateRollConfig', () => {
  const validBaseConfig: RollConfig = {
    faces: 6,
    countPerRoll: 2,
    seriesLength: 5,
    playerId: 'player-1',
  };

  it('accepts all allowed polyhedral faces and coin', () => {
    for (const faces of ALLOWED_FACES) {
      expect(() =>
        validateRollConfig({
          ...validBaseConfig,
          faces,
        }),
      ).not.toThrow();
    }
  });

  it('rejects invalid face counts', () => {
    const invalidFaces = [0, 1, 3, 5, 7, 9, 11, 100, -6, NaN] as unknown as DieFaces[];
    for (const faces of invalidFaces) {
      expect(() =>
        validateRollConfig({
          ...validBaseConfig,
          faces,
        }),
      ).toThrow(/Invalid faces count/i);
    }
  });

  it('rejects non-integer float values for countPerRoll and seriesLength', () => {
    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        countPerRoll: 2.5,
      }),
    ).toThrow(/Invalid countPerRoll/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        seriesLength: 4.8,
      }),
    ).toThrow(/Invalid seriesLength/i);
  });

  it('rejects NaN or infinity values', () => {
    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        countPerRoll: NaN,
      }),
    ).toThrow(/Invalid countPerRoll/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        seriesLength: Infinity,
      }),
    ).toThrow(/Invalid seriesLength/i);
  });

  it('rejects out-of-range countPerRoll (< 1 or > 10)', () => {
    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        countPerRoll: 0,
      }),
    ).toThrow(/Invalid countPerRoll/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        countPerRoll: -1,
      }),
    ).toThrow(/Invalid countPerRoll/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        countPerRoll: 11,
      }),
    ).toThrow(/Invalid countPerRoll/i);
  });

  it('rejects out-of-range seriesLength (< 1 or > 21)', () => {
    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        seriesLength: 0,
      }),
    ).toThrow(/Invalid seriesLength/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        seriesLength: -5,
      }),
    ).toThrow(/Invalid seriesLength/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        seriesLength: 22,
      }),
    ).toThrow(/Invalid seriesLength/i);
  });

  it('rejects empty or whitespace-only playerId', () => {
    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        playerId: '',
      }),
    ).toThrow(/playerId must be a non-empty string/i);

    expect(() =>
      validateRollConfig({
        ...validBaseConfig,
        playerId: '    ',
      }),
    ).toThrow(/playerId must be a non-empty string/i);
  });

  it('rejects non-object configurations', () => {
    expect(() => validateRollConfig(null)).toThrow(/Roll configuration must be a valid object/i);
  });
});
