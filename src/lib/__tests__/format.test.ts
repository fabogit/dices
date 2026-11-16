import { describe, expect, it } from 'vite-plus/test';
import { ALLOWED_FACES } from '../../core/types';
import { dieLabel, formatSigned, formatTime } from '../format';

describe('formatTime', () => {
  it('matches Date#toLocaleTimeString with 2-digit hour/minute/second options', () => {
    const timestamp = new Date(2026, 0, 15, 9, 5, 7).getTime();
    const expected = new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    expect(formatTime(timestamp)).toBe(expected);
  });
});

describe('formatSigned', () => {
  it('prefixes non-negative numbers with + and negative numbers with -', () => {
    expect(formatSigned(3.45)).toBe('+3.5');
    expect(formatSigned(0)).toBe('+0.0');
    expect(formatSigned(-1.24)).toBe('-1.2');
  });

  it('respects custom decimal precision', () => {
    expect(formatSigned(0.126, 2)).toBe('+0.13');
    expect(formatSigned(-2.5, 2)).toBe('-2.50');
    expect(formatSigned(4, 0)).toBe('+4');
  });
});

describe('dieLabel', () => {
  it('formats d2 across all label variants', () => {
    expect(dieLabel(2)).toBe('Coin d2');
    expect(dieLabel(2, 'default')).toBe('Coin d2');
    expect(dieLabel(2, 'parens')).toBe('Coin (d2)');
    expect(dieLabel(2, 'short')).toBe('Coin');
  });

  it('formats polyhedral dice consistently across all variants', () => {
    for (const faces of ALLOWED_FACES) {
      if (faces === 2) continue;
      expect(dieLabel(faces)).toBe(`d${faces}`);
      expect(dieLabel(faces, 'parens')).toBe(`d${faces}`);
      expect(dieLabel(faces, 'short')).toBe(`d${faces}`);
    }
  });
});
