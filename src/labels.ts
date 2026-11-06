import type { PremiumType } from './types/student';
import type { LessonPlan } from './types/lessonPlan';
import type { ActivityEvent } from './types/student';

/** Display names for a premium tier: `full` for headings, `short` for chips. */
export function premiumLabels(premiumType?: PremiumType | null): { full: string; short: string } {
  if (premiumType === 'hybrid') return { full: 'Premium Hybrid', short: 'Hybrid' };
  if (premiumType === 'online') return { full: 'Premium Online', short: 'Online' };
  return { full: 'Premium', short: 'Premium' };
}

/** "{Season} {year}" plus the server's season status. */
export function planOptionLabel(plan: LessonPlan): string {
  const base = `${plan.season} ${plan.year}`;
  switch (plan.seasonInfo.status) {
    case 'current': return base;
    case 'upcoming': return `${base} · upcoming`;
    case 'carriedOver': return `${base} · carried over`;
    default: return `${base} · past`;
  }
}

/** The plan a lesson-plan screen opens: current, else carried over, else the first. */
export function selectOpenPlan(plans: LessonPlan[]): LessonPlan | null {
  if (plans.length === 0) return null;
  return plans.find((p) => p.seasonInfo.status === 'current')
    ?? plans.find((p) => p.seasonInfo.status === 'carriedOver')
    ?? plans[0];
}

/** Display glyph per activity-feed event type (not a derived value). */
export const ACTIVITY_EVENT_SYMBOL: Record<ActivityEvent['type'], string> = { mission: '♟', homework: '✓', rating: '★', streak: '•' };

/** The glyph for an activity event type; a bullet for an unknown type. */
export function activityEventSymbol(type: ActivityEvent['type']): string { return ACTIVITY_EVENT_SYMBOL[type] ?? '•'; }

/** A time control of 36,000 s or more is shown as unlimited. */
export const UNLIMITED_TIME_CONTROL_SECONDS = 36000;

/** "5 min" / "Unlimited" for a mission's time control in seconds. */
export function missionTimeLabel(timeControlSeconds?: number | null): string {
  if (!timeControlSeconds || timeControlSeconds >= UNLIMITED_TIME_CONTROL_SECONDS) return 'Unlimited';
  return `${Math.round(timeControlSeconds / 60)} min`;
}
