import type {
  CoinRoundResult,
  CoinSide,
  DiceRoundResult,
  DieFaces,
  PolyhedralFaces,
  RoundResult,
} from './types';

let roundIdSequence = 0;
let seriesIdSequence = 0;

function generateRoundId(timestamp: number): string {
  roundIdSequence += 1;
  const uuid = typeof crypto === 'undefined' ? undefined : crypto.randomUUID?.();
  return uuid ?? `round-${timestamp}-${roundIdSequence}`;
}

/**
 * Generates a unique identifier for a series, falling back cleanly when crypto.randomUUID is unavailable.
 */
export function createSeriesId(timestamp: number = Date.now()): string {
  seriesIdSequence += 1;
  const uuid = typeof crypto === 'undefined' ? undefined : crypto.randomUUID?.();
  return uuid ?? `series-${timestamp}-${seriesIdSequence}`;
}

export function computeRoundResult(
  roundIndex: number,
  values: number[],
  faces: 2,
  timestamp?: number,
  id?: string,
): CoinRoundResult;
export function computeRoundResult(
  roundIndex: number,
  values: number[],
  faces: PolyhedralFaces,
  timestamp?: number,
  id?: string,
): DiceRoundResult;
export function computeRoundResult(
  roundIndex: number,
  values: number[],
  faces: DieFaces,
  timestamp?: number,
  id?: string,
): RoundResult;
export function computeRoundResult(
  roundIndex: number,
  values: number[],
  faces: DieFaces,
  timestamp: number = Date.now(),
  id: string = generateRoundId(timestamp),
): RoundResult {
  const sum = values.reduce((acc, v) => acc + v, 0);
  const max = values.length > 0 ? Math.max(...values) : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;

  if (faces === 2) {
    const headsCount = values.filter((v) => v === 1).length;
    const tailsCount = values.filter((v) => v === 2).length;
    const roundWinnerSide: CoinSide | 'TIE' =
      headsCount > tailsCount ? 'HEADS' : tailsCount > headsCount ? 'TAILS' : 'TIE';

    return {
      kind: 'coin',
      id,
      roundIndex,
      values: [...values],
      sum,
      max,
      min,
      headsCount,
      tailsCount,
      roundWinnerSide,
      timestamp,
      faces: 2,
    };
  }

  return {
    kind: 'dice',
    id,
    roundIndex,
    values: [...values],
    sum,
    max,
    min,
    timestamp,
    faces,
  };
}
