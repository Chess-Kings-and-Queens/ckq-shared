import { computeFireTime, joinWindowOpensAt } from '../onlineTournamentWindow';

describe('computeFireTime', () => {
  test("a 'tournament' fires at startAt whatever the rounds played", () => {
    expect(computeFireTime({ format: 'tournament', startAt: '2026-11-07T19:00:00Z' }, 0)).toBe('2026-11-07T19:00:00Z');
    expect(computeFireTime({ format: 'tournament', startAt: '2026-11-07T19:00:00Z' }, 3)).toBe('2026-11-07T19:00:00Z');
  });
  test("a 'tournament' without startAt is null", () => {
    expect(computeFireTime({ format: 'tournament' }, 0)).toBeNull();
    expect(computeFireTime({ format: 'tournament', startAt: null }, 0)).toBeNull();
  });
  test("a 'league' fires at roundStartTimes[roundsPlayed]", () => {
    const t = { format: 'league' as const, roundStartTimes: ['2026-11-07T19:00:00Z', '2026-11-14T19:00:00Z'] };
    expect(computeFireTime(t, 0)).toBe('2026-11-07T19:00:00Z');
    expect(computeFireTime(t, 1)).toBe('2026-11-14T19:00:00Z');
  });
  test("a 'league' past its last round, or with no array, is null", () => {
    expect(computeFireTime({ format: 'league', roundStartTimes: ['2026-11-07T19:00:00Z'] }, 5)).toBeNull();
    expect(computeFireTime({ format: 'league' }, 0)).toBeNull();
    expect(computeFireTime({ format: 'league', roundStartTimes: null }, 0)).toBeNull();
  });
});

describe('joinWindowOpensAt', () => {
  test('opens the given number of minutes before the fire time', () => {
    expect(joinWindowOpensAt('2026-11-07T19:00:00Z', 15).toISOString()).toBe('2026-11-07T18:45:00.000Z');
  });
  test('0 minutes opens at the fire time', () => {
    expect(joinWindowOpensAt('2026-11-07T19:00:00Z', 0).toISOString()).toBe('2026-11-07T19:00:00.000Z');
  });
  test('undefined and null use the 15-minute default', () => {
    expect(joinWindowOpensAt('2026-11-07T19:00:00Z', undefined).toISOString()).toBe('2026-11-07T18:45:00.000Z');
    expect(joinWindowOpensAt(new Date('2026-11-07T19:00:00Z'), null).toISOString()).toBe('2026-11-07T18:45:00.000Z');
  });
});
