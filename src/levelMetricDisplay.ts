import type { LevelUpMetric } from './types/student';

// ── Level Up Score metric display ──────────────────────────────────────────────
//
// Moved verbatim from website2.0's
// src/app/components/portal/ui/AdvancementRequirements/index.tsx (the pure
// helpers Level Up Score PR 3 wrote there): same logic, same strings. Every
// number and met-flag comes from the backend; these only turn a metric into text.

/** Chip text for applicable:false rows (D10). */
export const LEVEL_METRIC_NOT_IN_PROGRAM = 'Group class only';

/** One label per metric key (the API contract's keys). `t` is the backend threshold. */
export function levelMetricLabel(m: LevelUpMetric): string {
  const t = m.threshold ?? 0;
  switch (m.key) {
    case 'attendance':        return `Class coverage ≥ ${t}%`;
    case 'hwCoverage':        return `Homework completion ≥ ${t}%`;
    case 'hwScore':           return `Homework score avg ≥ ${t}%`;
    case 'missions':          return `Mission win rate ≥ ${t}%`;
    case 'tournamentsOtb':    return `Rated tournaments (this month) ≥ ${t}`;
    case 'uscf':              return `USCF rating ≥ ${m.threshold ?? '—'}`;
    case 'tournamentsOnline': return `Online tournaments (this month) ≥ ${t}`;
    case 'wbCompletion':      return `Workbook completion (${m.total ?? 0} positions)`;
    case 'wbScore':           return `Workbook score avg ≥ ${t}%`;
    case 'champion':          return 'Play like a champion';
  }
}

/** "X of Y" sub-line under the right-side value; counts and rating rows have none. */
export function levelMetricSub(m: LevelUpMetric): string | undefined {
  const e = m.extra;
  if (!e) return undefined;
  if (m.key === 'missions' && e.byCategory) {
    const { endgame, conversion, uncategorised } = e.byCategory;
    const base = `Endgames ${endgame.succeeded} of ${endgame.total} · Conversion ${conversion.succeeded} of ${conversion.total}`;
    return uncategorised.total > 0 ? `${base} · Other ${uncategorised.succeeded} of ${uncategorised.total}` : base;
  }
  if (m.key === 'attendance' && e.attended !== undefined && e.total !== undefined) {
    return `${e.attended} of ${e.total} classes`;
  }
  if (m.key === 'hwCoverage' && e.completed !== undefined && e.total !== undefined) {
    return `${e.completed} of ${e.total}`;
  }
  return undefined;
}

/** The right-side value text of a requirement row: the rounded value for 'pct' metrics, with `%` appended only for 'pct'. '' when the metric has no value. */
export function levelMetricValueText(m: LevelUpMetric): string {
  if (m.value === null) return '';
  const actual = m.unit === 'pct' ? Math.round(m.value) : m.value;
  return `${actual}${m.unit === 'pct' ? '%' : ''}`;
}

export const LEVEL_METRIC_GROUP_ONLY_KEYS = new Set<LevelUpMetric['key']>(['attendance', 'hwCoverage', 'hwScore']);

export type LevelMetricRowKind = 'hidden' | 'na-group-only' | 'na' | 'cta' | 'standard';

/** Which row shape a backend metric renders as (the branch conditions of the web's `metricRow`). 'hidden' = not rendered (D28). */
export function levelMetricRowKind(m: LevelUpMetric): LevelMetricRowKind {
  if (!m.applicable) {
    if (LEVEL_METRIC_GROUP_ONLY_KEYS.has(m.key)) return 'na-group-only';
    if (m.key === 'uscf') return 'na';
    return 'hidden';
  }
  if (m.key === 'missions' && m.extra?.succeeded === 0) return 'cta';
  if (m.value === null) return 'na';
  return 'standard';
}
