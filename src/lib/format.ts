import type { DieFaces } from '../core/types';

export type DieLabelVariant = 'default' | 'parens' | 'short';

/**
 * Formats a Unix epoch millisecond timestamp as HH:MM:SS in the runtime locale.
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formats a numeric delta or score with an explicit '+' prefix for non-negative values.
 */
export function formatSigned(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}`;
}

const COIN_LABELS: Record<DieLabelVariant, string> = {
  default: 'Coin d2',
  parens: 'Coin (d2)',
  short: 'Coin',
};

/**
 * Formats a die face count for display, handling d2 coins across UI label variants.
 */
export function dieLabel(faces: DieFaces, variant: DieLabelVariant = 'default'): string {
  if (faces !== 2) {
    return `d${faces}`;
  }
  return COIN_LABELS[variant];
}
