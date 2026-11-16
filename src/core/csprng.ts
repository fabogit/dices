import { COUNT_PER_ROLL_LIMITS, SERIES_LENGTH_LIMITS, isIntWithinLimits } from './limits';
import { ALLOWED_FACES, type DieFaces, type RollConfig } from './types';

export type RandomSource = (buf: Uint32Array) => Uint32Array;

const defaultRandomSource: RandomSource = (buf: Uint32Array): Uint32Array => {
  if (buf.buffer instanceof ArrayBuffer) {
    globalThis.crypto.getRandomValues(new Uint32Array(buf.buffer, buf.byteOffset, buf.length));
  } else {
    const tmp = new Uint32Array(buf.length);
    globalThis.crypto.getRandomValues(tmp);
    buf.set(tmp);
  }
  return buf;
};

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

export function rollCryptoFair(
  faces: DieFaces,
  randomSource: RandomSource = defaultRandomSource,
): number {
  if (!ALLOWED_FACES.includes(faces)) {
    throw new Error(
      `Invalid faces count: ${faces}. Allowed values are: ${ALLOWED_FACES.join(', ')}`,
    );
  }

  const limit = Math.floor(0x100000000 / faces) * faces;
  const buf = new Uint32Array(1);

  while (true) {
    randomSource(buf);
    const rand = buf[0];
    if (rand < limit) {
      return (rand % faces) + 1;
    }
  }
}

export function rollBatchCryptoFair(
  faces: DieFaces,
  count: number,
  randomSource: RandomSource = defaultRandomSource,
): number[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Count must be a non-negative integer, received: ${count}`);
  }

  return Array.from({ length: count }, () => rollCryptoFair(faces, randomSource));
}
