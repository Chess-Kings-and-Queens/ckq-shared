import type { PlayerHistorySnapshot } from '../types/playerHistory';

const base: PlayerHistorySnapshot = {
  _id: 'ph-1',
  student: 'stu-1',
  source: 'chesscom',
  metric: 'rating_rapid',
  value: 1450,
  isProvisional: false,
  provisionalGameCount: null,
  periodStart: '2026-10-19T16:00:00.000Z',
  periodEnd: null,
  recordedAt: '2026-10-20T16:00:00.000Z',
};

describe('playerHistory types', () => {
  it('a PlayerHistorySnapshot literal compiles', () => {
    expect(base.value).toBe(1450);
  });

  it('rejects an unknown metric', () => {
    // @ts-expect-error not a PlayerHistoryMetric
    const bad: PlayerHistorySnapshot = { ...base, metric: 'rating_unknown' };
    expect(bad.metric).toBe('rating_unknown');
  });

  it('rejects an unknown source', () => {
    // @ts-expect-error not a PlayerHistorySource
    const bad: PlayerHistorySnapshot = { ...base, source: 'chesskid' };
    expect(bad.source).toBe('chesskid');
  });
});
