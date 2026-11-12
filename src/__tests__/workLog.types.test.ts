import type { WeeklyHistoryItem, WorkLogAggregate, WorkLogStatus } from '../types/workLog';

describe('workLog types', () => {
  it('WorkLogAggregate carries the backend-sent status, pace, activities and days', () => {
    const aggregate: WorkLogAggregate = {
      totalHours: 4.2,
      perActivity: { a1: 2 },
      streak: 3,
      weekStart: '2027-03-08T05:00:00.000Z',
      weekEnd: '2027-03-15T03:59:59.999Z',
      platformGames: {},
      weekRange: 'Mar 8 – Mar 14, 2027',
      isCurrentWeek: true,
      selfHours: 3.2,
      syncedHours: 1,
      unplannedHours: 0.7,
      entryCounts: { self: 5, auto: 1 },
      targetHours: 7,
      expectedHours: 3,
      hoursShort: 3.8,
      status: 'on_pace',
      activities: [
        { activityId: 'a1', label: 'Tactics', hoursPerWeek: 4, loggedHours: 2, met: false, suggestedTools: ['lichess'] },
      ],
      focusActivityId: 'a1',
      days: [{ date: '2027-03-08', hours: 1, isToday: false, isFuture: false }],
      tools: [{ key: 'lichess', label: 'Lichess' }],
    };
    expect(aggregate.status).toBe('on_pace');
    expect(aggregate.activities[0].suggestedTools).toEqual(['lichess']);
    expect(aggregate.tools[0]).toEqual({ key: 'lichess', label: 'Lichess' });
  });

  it('WorkLogAggregate requires the tool catalog', () => {
    // @ts-expect-error missing `tools`
    const missing: WorkLogAggregate = {
      totalHours: 0,
      perActivity: {},
      streak: 0,
      weekStart: '2027-03-08T05:00:00.000Z',
      weekEnd: '2027-03-15T03:59:59.999Z',
      platformGames: {},
      weekRange: 'Mar 8 – Mar 14, 2027',
      isCurrentWeek: true,
      selfHours: 0,
      syncedHours: 0,
      unplannedHours: 0,
      entryCounts: { self: 0, auto: 0 },
      targetHours: null,
      expectedHours: null,
      hoursShort: null,
      status: 'no_target',
      activities: [],
      focusActivityId: null,
      days: [],
    };
    expect(missing.status).toBe('no_target');
  });

  it('WeeklyHistoryItem carries target and met flag, both nullable', () => {
    const item: WeeklyHistoryItem = {
      weekStart: '2027-03-08T05:00:00.000Z',
      weekEnd: '2027-03-15T03:59:59.999Z',
      weekLabel: 'Mar 8',
      totalHours: 1,
      perActivity: {},
      weekRange: 'Mar 8 – Mar 14, 2027',
      isCurrentWeek: false,
      selfHours: 1,
      syncedHours: 0,
      unplannedHours: 0,
      targetHours: null,
      metTarget: null,
    };
    expect(item.metTarget).toBeNull();
  });

  it('WorkLogStatus rejects an unknown value', () => {
    // @ts-expect-error not a WorkLogStatus
    const bad: WorkLogStatus = 'almost';
    expect(bad).toBe('almost');
  });
});
