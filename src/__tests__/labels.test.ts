import {
  activityEventSymbol,
  missionTimeLabel,
  planOptionLabel,
  premiumLabels,
  selectOpenPlan,
} from '../labels';
import type { LessonPlan } from '../types/lessonPlan';
import type { ActivityEvent } from '../types/student';

type Status = LessonPlan['seasonInfo']['status'];

/** Only the fields the label helpers read; the rest of a LessonPlan is irrelevant here. */
function plan(season: string, year: number, status: Status): LessonPlan {
  return { season, year, seasonInfo: { status } } as unknown as LessonPlan;
}

describe('premiumLabels', () => {
  test('hybrid', () => {
    expect(premiumLabels('hybrid')).toEqual({ full: 'Premium Hybrid', short: 'Hybrid' });
  });
  test('online', () => {
    expect(premiumLabels('online')).toEqual({ full: 'Premium Online', short: 'Online' });
  });
  test('inPerson, null and undefined fall back to plain Premium', () => {
    expect(premiumLabels('inPerson')).toEqual({ full: 'Premium', short: 'Premium' });
    expect(premiumLabels(null)).toEqual({ full: 'Premium', short: 'Premium' });
    expect(premiumLabels(undefined)).toEqual({ full: 'Premium', short: 'Premium' });
  });
});

describe('planOptionLabel', () => {
  test('current', () => expect(planOptionLabel(plan('Fall', 2026, 'current'))).toBe('Fall 2026'));
  test('upcoming', () => expect(planOptionLabel(plan('Spring', 2027, 'upcoming'))).toBe('Spring 2027 · upcoming'));
  test('carriedOver', () => expect(planOptionLabel(plan('Summer', 2026, 'carriedOver'))).toBe('Summer 2026 · carried over'));
  test('past', () => expect(planOptionLabel(plan('Fall', 2025, 'past'))).toBe('Fall 2025 · past'));
});

describe('selectOpenPlan', () => {
  test('prefers the current plan', () => {
    const plans = [plan('A', 1, 'past'), plan('B', 2, 'carriedOver'), plan('C', 3, 'current')];
    expect(selectOpenPlan(plans)).toBe(plans[2]);
  });
  test('else the carried-over plan', () => {
    const plans = [plan('A', 1, 'past'), plan('B', 2, 'carriedOver')];
    expect(selectOpenPlan(plans)).toBe(plans[1]);
  });
  test('else the first plan', () => {
    const plans = [plan('A', 1, 'past'), plan('B', 2, 'upcoming')];
    expect(selectOpenPlan(plans)).toBe(plans[0]);
  });
  test('null for an empty list', () => {
    expect(selectOpenPlan([])).toBeNull();
  });
});

describe('activityEventSymbol', () => {
  test.each([
    ['mission', '♟'],
    ['homework', '✓'],
    ['rating', '★'],
    ['streak', '•'],
  ] as const)('%s', (type, glyph) => {
    expect(activityEventSymbol(type)).toBe(glyph);
  });
  test('an unknown type falls back to a bullet', () => {
    expect(activityEventSymbol('other' as unknown as ActivityEvent['type'])).toBe('•');
  });
});

describe('missionTimeLabel', () => {
  test('0, undefined and null are unlimited', () => {
    expect(missionTimeLabel(0)).toBe('Unlimited');
    expect(missionTimeLabel(undefined)).toBe('Unlimited');
    expect(missionTimeLabel(null)).toBe('Unlimited');
  });
  test('36000 is unlimited, 35999 is 600 minutes', () => {
    expect(missionTimeLabel(36000)).toBe('Unlimited');
    expect(missionTimeLabel(35999)).toBe('600 min');
  });
  test('300 seconds is 5 min', () => {
    expect(missionTimeLabel(300)).toBe('5 min');
  });
});
