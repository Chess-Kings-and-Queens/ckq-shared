import { isFlagged, remainingMs } from '../missionClock';
import type { MissionClock } from '../types/missions';

const T0 = Date.parse('2026-10-16T12:00:00.000Z');

function clock(overrides: Partial<MissionClock> = {}): MissionClock {
  return {
    playerMs: 60_000,
    engineMs: 45_000,
    incrementMs: 2_000,
    turnStartedAt: '2026-10-16T12:00:00.000Z',
    serverNow: '2026-10-16T12:00:00.000Z',
    ...overrides,
  };
}

describe('remainingMs', () => {
  test('the side to move counts down from its turn start', () => {
    expect(remainingMs(clock(), 'player', T0 + 10_000, 'player')).toBe(50_000);
    expect(remainingMs(clock(), 'engine', T0 + 10_000, 'engine')).toBe(35_000);
  });

  test('the side not to move is not running', () => {
    expect(remainingMs(clock(), 'engine', T0 + 10_000, 'player')).toBe(45_000);
    expect(remainingMs(clock(), 'player', T0 + 10_000, 'engine')).toBe(60_000);
  });

  test('at the turn start nothing has elapsed', () => {
    expect(remainingMs(clock(), 'player', T0, 'player')).toBe(60_000);
  });

  test('now before the turn start does not add time', () => {
    expect(remainingMs(clock(), 'player', T0 - 5_000, 'player')).toBe(60_000);
  });

  test('floors at 0 after the flag', () => {
    expect(remainingMs(clock(), 'player', T0 + 90_000, 'player')).toBe(0);
  });

  test('increment is not added by the display (the server adds it on an accepted append)', () => {
    expect(remainingMs(clock({ incrementMs: 5_000 }), 'player', T0 + 1_000, 'player')).toBe(
      59_000,
    );
  });

  test('no running turn (turnStartedAt null) shows stored time for both sides', () => {
    const c = clock({ turnStartedAt: null });
    expect(remainingMs(c, 'player', T0 + 99_000, 'player')).toBe(60_000);
    expect(remainingMs(c, 'engine', T0 + 99_000, 'engine')).toBe(45_000);
  });

  test('an unparseable turnStartedAt falls back to stored time', () => {
    expect(remainingMs(clock({ turnStartedAt: 'nope' }), 'player', T0 + 1_000, 'player')).toBe(
      60_000,
    );
  });
});

describe('isFlagged', () => {
  test('false while the side to move has time left', () => {
    expect(isFlagged(clock(), T0 + 59_999, 'player')).toBe(false);
  });

  test('true exactly at 0 and after', () => {
    expect(isFlagged(clock(), T0 + 60_000, 'player')).toBe(true);
    expect(isFlagged(clock(), T0 + 100_000, 'player')).toBe(true);
  });

  test('the engine flags from its own stamp', () => {
    expect(isFlagged(clock(), T0 + 45_000, 'engine')).toBe(true);
    expect(isFlagged(clock(), T0 + 44_999, 'engine')).toBe(false);
  });

  test('never flagged when no turn is running', () => {
    expect(isFlagged(clock({ turnStartedAt: null }), T0 + 999_000, 'player')).toBe(false);
  });
});
