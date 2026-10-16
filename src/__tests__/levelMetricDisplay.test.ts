import {
  LEVEL_METRIC_GROUP_ONLY_KEYS,
  LEVEL_METRIC_NOT_IN_PROGRAM,
  levelMetricLabel,
  levelMetricRowKind,
  levelMetricSub,
  levelMetricValueText,
} from '../levelMetricDisplay';
import type { LevelUpMetric, LevelUpMetricKey } from '../types/student';

function metric(key: LevelUpMetricKey, overrides: Partial<LevelUpMetric> = {}): LevelUpMetric {
  return {
    key,
    group: 'participation',
    pair: null,
    unit: 'pct',
    value: 80,
    total: null,
    threshold: 75,
    score: 100,
    met: true,
    applicable: true,
    gate: false,
    extra: null,
    ...overrides,
  };
}

const ALL_KEYS: LevelUpMetricKey[] = [
  'attendance', 'hwCoverage', 'hwScore', 'missions', 'tournamentsOtb',
  'uscf', 'tournamentsOnline', 'champion', 'wbCompletion', 'wbScore',
];

describe('levelMetricLabel', () => {
  it('has a non-empty label for every metric key', () => {
    for (const key of ALL_KEYS) {
      expect(levelMetricLabel(metric(key)).length).toBeGreaterThan(0);
    }
  });

  it('formats each label with the backend threshold', () => {
    expect(levelMetricLabel(metric('attendance'))).toBe('Class coverage ≥ 75%');
    expect(levelMetricLabel(metric('hwCoverage'))).toBe('Homework completion ≥ 75%');
    expect(levelMetricLabel(metric('hwScore'))).toBe('Homework score avg ≥ 75%');
    expect(levelMetricLabel(metric('missions'))).toBe('Mission win rate ≥ 75%');
    expect(levelMetricLabel(metric('tournamentsOtb', { unit: 'count' }))).toBe('Rated tournaments (this month) ≥ 75');
    expect(levelMetricLabel(metric('uscf', { unit: 'rating', threshold: 1200 }))).toBe('USCF rating ≥ 1200');
    expect(levelMetricLabel(metric('tournamentsOnline', { unit: 'count' }))).toBe('Online tournaments (this month) ≥ 75');
    expect(levelMetricLabel(metric('wbCompletion', { total: 120 }))).toBe('Workbook completion (120 positions)');
    expect(levelMetricLabel(metric('wbScore'))).toBe('Workbook score avg ≥ 75%');
    expect(levelMetricLabel(metric('champion'))).toBe('Play like a champion');
  });

  it('falls back for a null threshold or total', () => {
    expect(levelMetricLabel(metric('attendance', { threshold: null }))).toBe('Class coverage ≥ 0%');
    expect(levelMetricLabel(metric('uscf', { unit: 'rating', threshold: null }))).toBe('USCF rating ≥ —');
    expect(levelMetricLabel(metric('wbCompletion', { total: null }))).toBe('Workbook completion (0 positions)');
  });
});

describe('levelMetricValueText', () => {
  it('rounds a pct value and appends %', () => {
    expect(levelMetricValueText(metric('attendance', { value: 82.6 }))).toBe('83%');
    expect(levelMetricValueText(metric('hwScore', { value: 70 }))).toBe('70%');
  });

  it('leaves count and rating values as given, without %', () => {
    expect(levelMetricValueText(metric('tournamentsOtb', { unit: 'count', value: 2 }))).toBe('2');
    expect(levelMetricValueText(metric('uscf', { unit: 'rating', value: 1187 }))).toBe('1187');
  });

  it('is empty when the value is null', () => {
    expect(levelMetricValueText(metric('attendance', { value: null }))).toBe('');
  });
});

describe('levelMetricSub', () => {
  it('is undefined without extra', () => {
    expect(levelMetricSub(metric('attendance'))).toBeUndefined();
  });

  it('formats the attendance and homework-coverage counts', () => {
    expect(levelMetricSub(metric('attendance', { extra: { attended: 9, total: 12 } }))).toBe('9 of 12 classes');
    expect(levelMetricSub(metric('hwCoverage', { extra: { completed: 5, total: 8 } }))).toBe('5 of 8');
  });

  it('formats the mission category breakdown, adding Other only when uncategorised has missions', () => {
    const byCategory = {
      endgame: { succeeded: 2, total: 3 },
      conversion: { succeeded: 1, total: 4 },
      uncategorised: { succeeded: 0, total: 0 },
    };
    expect(levelMetricSub(metric('missions', { extra: { byCategory } }))).toBe(
      'Endgames 2 of 3 · Conversion 1 of 4',
    );
    expect(
      levelMetricSub(metric('missions', { extra: { byCategory: { ...byCategory, uncategorised: { succeeded: 1, total: 2 } } } })),
    ).toBe('Endgames 2 of 3 · Conversion 1 of 4 · Other 1 of 2');
  });

  it('has no sub-line for other keys', () => {
    expect(levelMetricSub(metric('uscf', { unit: 'rating', extra: { currentRating: 1100, goal: 1200 } }))).toBeUndefined();
  });
});

describe('levelMetricRowKind', () => {
  it('exports the group-only chip text and keys', () => {
    expect(LEVEL_METRIC_NOT_IN_PROGRAM).toBe('Group class only');
    expect([...LEVEL_METRIC_GROUP_ONLY_KEYS].sort()).toEqual(['attendance', 'hwCoverage', 'hwScore']);
  });

  it('not applicable: group-only keys are na-group-only, uscf is na, everything else is hidden', () => {
    expect(levelMetricRowKind(metric('attendance', { applicable: false }))).toBe('na-group-only');
    expect(levelMetricRowKind(metric('hwCoverage', { applicable: false }))).toBe('na-group-only');
    expect(levelMetricRowKind(metric('hwScore', { applicable: false }))).toBe('na-group-only');
    expect(levelMetricRowKind(metric('uscf', { applicable: false }))).toBe('na');
    expect(levelMetricRowKind(metric('missions', { applicable: false }))).toBe('hidden');
    expect(levelMetricRowKind(metric('wbScore', { applicable: false }))).toBe('hidden');
  });

  it('missions with no successes is the cta row', () => {
    expect(levelMetricRowKind(metric('missions', { extra: { succeeded: 0, total: 3 } }))).toBe('cta');
  });

  it('a null value is na; otherwise standard', () => {
    expect(levelMetricRowKind(metric('hwScore', { value: null }))).toBe('na');
    expect(levelMetricRowKind(metric('missions', { extra: { succeeded: 2, total: 3 } }))).toBe('standard');
    expect(levelMetricRowKind(metric('attendance'))).toBe('standard');
  });
});
