import { ALLOWED_FACES, type DieFaces } from './types';

export type RandomSource = (buf: Uint32Array) => Uint32Array;

// Fill a private ArrayBuffer-backed array and copy it over: crypto.getRandomValues
// rejects SharedArrayBuffer-backed views, and `buf` may be any ArrayBufferLike.
const defaultRandomSource: RandomSource = (buf) => {
  const tmp = new Uint32Array(buf.length);
  globalThis.crypto.getRandomValues(tmp);
  buf.set(tmp);
  return buf;
};

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
