import { describe, expect, it } from 'vite-plus/test';
import { computeRoundResult } from '../../../core/round';
import { computeSeriesSummary } from '../../../core/series-analytics';
import {
  HISTORY_CLEARED_ANNOUNCEMENT,
  QUICK_FEED_CLEARED_ANNOUNCEMENT,
  SERIES_LOCKED_ANNOUNCEMENT,
  coinSideLabel,
  modeSwitchedAnnouncement,
  quickRollAnnouncement,
  seriesCompleteAnnouncement,
  seriesResetAnnouncement,
  seriesRoundAnnouncement,
} from '../announcements';

const coinConfig = { faces: 2 as const, countPerRoll: 2, seriesLength: 3, playerId: 'p1' };
const diceConfig = { faces: 6 as const, countPerRoll: 2, seriesLength: 2, playerId: 'p1' };

describe('announcements', () => {
  it('labels coin face values as Heads (1) or Tails', () => {
    expect(coinSideLabel(1)).toBe('Heads');
    expect(coinSideLabel(2)).toBe('Tails');
  });

  it('keeps the fixed announcer messages', () => {
    expect(SERIES_LOCKED_ANNOUNCEMENT).toBe(
      'Series in progress. Reset the series to change the setup.',
    );
    expect(QUICK_FEED_CLEARED_ANNOUNCEMENT).toBe('Quick roll feed cleared.');
    expect(HISTORY_CLEARED_ANNOUNCEMENT).toBe('Roll history cleared.');
  });

  it('announces mode switches and series resets', () => {
    expect(modeSwitchedAnnouncement('quick')).toBe('Switched to Quick Roll mode.');
    expect(modeSwitchedAnnouncement('series')).toBe('Switched to Series mode.');
    expect(seriesResetAnnouncement('Alice')).toBe('Series reset for Alice. Ready to roll.');
  });

  it('announces quick coin throws with every side and the winner or a tie', () => {
    expect(quickRollAnnouncement(computeRoundResult(0, [1, 1, 2], 2))).toBe(
      'Quick roll: Heads, Heads, Tails. HEADS wins.',
    );
    expect(quickRollAnnouncement(computeRoundResult(0, [2], 2))).toBe(
      'Quick roll: Tails. TAILS wins.',
    );
    expect(quickRollAnnouncement(computeRoundResult(0, [1, 2], 2))).toBe(
      'Quick roll: Heads, Tails. Tied.',
    );
  });

  it('announces quick dice throws with their values and sum', () => {
    expect(quickRollAnnouncement(computeRoundResult(0, [3, 5], 6))).toBe(
      'Quick roll: Rolled 3, 5. Sum: 8.',
    );
  });

  it('announces series rounds with their position and outcome', () => {
    expect(seriesRoundAnnouncement(computeRoundResult(0, [1, 1], 2), 3)).toBe(
      'Round 1 of 3: Heads, Heads. HEADS wins round.',
    );
    expect(seriesRoundAnnouncement(computeRoundResult(1, [2, 2], 2), 3)).toBe(
      'Round 2 of 3: Tails, Tails. TAILS wins round.',
    );
    expect(seriesRoundAnnouncement(computeRoundResult(2, [2, 1], 2), 3)).toBe(
      'Round 3 of 3: Tails, Heads. Round tied.',
    );
    expect(seriesRoundAnnouncement(computeRoundResult(1, [6, 4], 6), 2)).toBe(
      'Round 2 of 2: Rolled 6, 4. Sum: 10.',
    );
  });

  it('announces completed coin series with the winner or a tie', () => {
    const headsWin = computeSeriesSummary('s1', coinConfig, 'Alice', [
      computeRoundResult(0, [1, 1], 2),
      computeRoundResult(1, [2, 2], 2),
      computeRoundResult(2, [1, 1], 2),
    ]);
    expect(seriesCompleteAnnouncement(headsWin)).toBe(
      'Series complete! HEADS wins series with 2 Heads rounds to 1 Tails rounds.',
    );

    const tie = computeSeriesSummary('s2', coinConfig, 'Alice', [
      computeRoundResult(0, [1, 1], 2),
      computeRoundResult(1, [2, 2], 2),
      computeRoundResult(2, [1, 2], 2),
    ]);
    expect(seriesCompleteAnnouncement(tie)).toBe(
      'Series complete! Series ended in a tie with 1 Heads rounds to 1 Tails rounds.',
    );
  });

  it('announces completed dice series with the player, totals and best round', () => {
    const summary = computeSeriesSummary('s3', diceConfig, 'Bob', [
      computeRoundResult(0, [2, 3], 6),
      computeRoundResult(1, [6, 4], 6),
    ]);
    expect(seriesCompleteAnnouncement(summary)).toBe(
      'Series complete for Bob! Total sum: 15, Average: 7.5, Best round: 2.',
    );
  });
});
