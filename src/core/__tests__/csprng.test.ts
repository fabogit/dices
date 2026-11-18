import { describe, expect, it } from 'vite-plus/test';
import { rollBatchCryptoFair, rollCryptoFair } from '../csprng';
import type { DieFaces } from '../types';

const zeroMinMock = (buf: Uint32Array): Uint32Array => {
  buf[0] = 0;
  return buf;
};

describe('rollCryptoFair and rollBatchCryptoFair', () => {
  it('rejects values >= rejection limit deterministically and recovers on valid value', () => {
    // For d6: limit is Math.floor(0x100000000 / 6) * 6 = 4294967292 (0xfffffffcu)
    // 4294967295 (0xffffffffu) >= limit -> MUST REJECT
    // 4294967293 (0xfffffffdu) >= limit -> MUST REJECT
    // 8 < limit -> ACCEPT -> (8 % 6) + 1 = 3
    const sequence = [4294967295, 4294967293, 8];
    let callCount = 0;

    const mockRandomSource = (buf: Uint32Array): Uint32Array => {
      buf[0] = sequence[callCount++];
      return buf;
    };

    const result = rollCryptoFair(6, mockRandomSource);

    expect(callCount).toBe(3);
    expect(result).toBe(3);
  });

  it('maps boundary values correctly', () => {
    // Minimum value: rand = 0 -> (0 % 20) + 1 = 1
    expect(rollCryptoFair(20, zeroMinMock)).toBe(1);

    // Maximum accepted value for d6: limit - 1 = 4294967291 -> (4294967291 % 6) + 1 = 5 + 1 = 6
    const limitD6 = Math.floor(0x100000000 / 6) * 6;
    const maxMock = (buf: Uint32Array): Uint32Array => {
      buf[0] = limitD6 - 1;
      return buf;
    };
    expect(rollCryptoFair(6, maxMock)).toBe(6);
  });

  it('throws when rollCryptoFair is called with unsupported face count', () => {
    expect(() => rollCryptoFair(7 as unknown as DieFaces)).toThrow(/Invalid faces count/i);
  });

  it('generates batches of fair rolls in range [1, faces]', () => {
    const results = rollBatchCryptoFair(20, 50);
    expect(results).toHaveLength(50);
    for (const val of results) {
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(20);
    }
  });

  it('handles empty batch (count = 0)', () => {
    const results = rollBatchCryptoFair(6, 0);
    expect(results).toEqual([]);
  });

  it('rejects negative or non-integer counts in rollBatchCryptoFair', () => {
    expect(() => rollBatchCryptoFair(6, -1)).toThrow(/non-negative integer/i);
    expect(() => rollBatchCryptoFair(6, 1.5)).toThrow(/non-negative integer/i);
  });
});
