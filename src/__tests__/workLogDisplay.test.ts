import {
  WORK_LOG_ACTIVITY_COLORS,
  WORK_LOG_OTHER_COLOR,
  WORK_LOG_QUICK_HOURS,
  WORK_LOG_STATUS_HEADLINES,
  WORK_LOG_SYNCED_COLOR,
  formatHoursMinutes,
  formatUpdatedAgo,
  workLogActivityColor,
} from '../workLogDisplay';

describe('formatHoursMinutes', () => {
  it.each([
    [1.5, '1 hr 30 min'],
    [0.75, '45 min'],
    [2, '2 hr'],
    [0, '0 min'],
    [0.25, '15 min'],
    [0.2, '12 min'],
    [1.9999, '2 hr'],
    [NaN, '0 min'],
    [Infinity, '0 min'],
    [-Infinity, '0 min'],
  ])('%s → %s', (hours, expected) => {
    expect(formatHoursMinutes(hours)).toBe(expected);
  });
});

describe('Work Log constants', () => {
  it('headlines are the four status literals', () => {
    expect(WORK_LOG_STATUS_HEADLINES).toEqual({
      goal_reached: 'Goal reached — great week!',
      on_pace: "You're on pace",
      behind: "A little behind — you've got this",
      no_target: 'Log your practice this week',
    });
    expect(Object.keys(WORK_LOG_STATUS_HEADLINES).sort()).toEqual(
      ['behind', 'goal_reached', 'no_target', 'on_pace']
    );
  });

  it('quick hours', () => {
    expect([...WORK_LOG_QUICK_HOURS]).toEqual([0.25, 0.5, 0.75, 1, 1.5, 2]);
  });

  it('colours are the literal hexes', () => {
    expect([...WORK_LOG_ACTIVITY_COLORS]).toEqual([
      '#1565c0',
      '#f5921e',
      '#7c3aed',
      '#0e9f6e',
      '#0d2b6e',
      '#fbbf24',
    ]);
    expect(WORK_LOG_OTHER_COLOR).toBe('#9ca3af');
    expect(WORK_LOG_SYNCED_COLOR).toBe('#dbeafe');
  });
});

describe('workLogActivityColor', () => {
  it.each([
    [0, '#1565c0'],
    [5, '#fbbf24'],
    [6, '#1565c0'],
    [-1, '#fbbf24'],
    [-7, '#fbbf24'],
  ])('index %s → %s', (index, expected) => {
    expect(workLogActivityColor(index)).toBe(expected);
  });
});

describe('formatUpdatedAgo', () => {
  const nowMs = Date.parse('2026-10-20T16:00:00.000Z');
  const HOUR = 3_600_000;
  const before = (ms: number) => new Date(nowMs - ms).toISOString();

  it('buckets', () => {
    expect(formatUpdatedAgo(before(0.5 * HOUR), nowMs)).toBe('Just now');
    expect(formatUpdatedAgo(before(5 * HOUR), nowMs)).toBe('5h ago');
    expect(formatUpdatedAgo(before(30 * HOUR), nowMs)).toBe('Yesterday');
    expect(formatUpdatedAgo(before(72 * HOUR), nowMs)).toBe('3 days ago');
  });

  it('falls back to the ET date (Oct 9 22:30 EDT, not Oct 10)', () => {
    expect(formatUpdatedAgo('2026-10-10T02:30:00.000Z', nowMs)).toBe('Oct 9');
  });

  it('bucket edges', () => {
    expect(formatUpdatedAgo(before(1 * HOUR), nowMs)).toBe('1h ago');
    expect(formatUpdatedAgo(before(24 * HOUR), nowMs)).toBe('Yesterday');
    expect(formatUpdatedAgo(before(48 * HOUR), nowMs)).toBe('2 days ago');
    expect(formatUpdatedAgo(before(7 * 24 * HOUR), nowMs)).toBe('Oct 13');
  });

  it('a future recordedAt (clock skew) is "Just now"', () => {
    expect(formatUpdatedAgo(new Date(nowMs + 5 * HOUR).toISOString(), nowMs)).toBe('Just now');
  });
});
