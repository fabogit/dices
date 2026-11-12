import { ALLOWED_FACES, type DieFaces, type RollConfig } from './types';

export type RandomSource = (buf: Uint32Array) => Uint32Array;

const defaultRandomSource: RandomSource = (buf: Uint32Array): Uint32Array => {
  globalThis.crypto.getRandomValues(buf as any);
  return buf;
};

export function validateRollConfig(config: RollConfig): void {
  if (!config || typeof config !== 'object') {
    throw new Error('Roll configuration must be a valid object');
  }

  if (!ALLOWED_FACES.includes(config.faces)) {
    throw new Error(
      `Invalid faces count: ${config.faces}. Allowed values are: ${ALLOWED_FACES.join(', ')}`
    );
  }

  if (
    !Number.isInteger(config.countPerRoll) ||
    config.countPerRoll < 1 ||
    config.countPerRoll > 10
  ) {
    throw new Error(
      `Invalid countPerRoll: ${config.countPerRoll}. Must be an integer between 1 and 10`
    );
  }

  if (
    !Number.isInteger(config.seriesLength) ||
    config.seriesLength < 1 ||
    config.seriesLength > 21
  ) {
    throw new Error(
      `Invalid seriesLength: ${config.seriesLength}. Must be an integer between 1 and 21`
    );
  }

  if (typeof config.playerId !== 'string' || config.playerId.trim().length === 0) {
    throw new Error('playerId must be a non-empty string');
  }
}

export function rollCryptoFair(
  faces: DieFaces,
  randomSource: RandomSource = defaultRandomSource,
): number {
  if (!ALLOWED_FACES.includes(faces)) {
    throw new Error(
      `Invalid faces count: ${faces}. Allowed values are: ${ALLOWED_FACES.join(', ')}`
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

  const results = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    results[i] = rollCryptoFair(faces, randomSource);
  }
  return results;
}
