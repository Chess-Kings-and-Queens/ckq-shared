import { formatDateOnlyET } from './dates';
import { tokens } from './tokens';
import type { WorkLogStatus } from './types/workLog';

// ── Work Log display helpers ───────────────────────────────────────────────────
//
// Presentation only (ADR frontend-010 §2): the backend owns every Work Log number,
// the status value and the tool catalog; these format and name them for the clients.

/**
 * Decimal hours → "H hr M min". Units never pluralize; rounds to the nearest
 * minute; drops a zero part; non-finite input is 0. e.g. 1.5 → "1 hr 30 min",
 * 0.75 → "45 min", 2 → "2 hr", 0 → "0 min".
 */
export function formatHoursMinutes(hours: number): string {
  const totalMinutes = Math.round((Number.isFinite(hours) ? hours : 0) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0 && m === 0) return '0 min';
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/** The Work Log hero headline for the backend's weekly `status`. */
export const WORK_LOG_STATUS_HEADLINES: Record<WorkLogStatus, string> = {
  goal_reached: 'Goal reached — great week!',
  on_pace: "You're on pace",
  behind: "A little behind — you've got this",
  no_target: 'Log your practice this week',
};

/** Quick duration choices in the log form, in hours. */
export const WORK_LOG_QUICK_HOURS = [0.25, 0.5, 0.75, 1, 1.5, 2] as const;

/** Plan-activity identity colours, by the activity's position in `aggregate.activities`. */
export const WORK_LOG_ACTIVITY_COLORS = [
  tokens.color.blue,
  tokens.color.orange,
  tokens.color.purple,
  tokens.color.success,
  tokens.color.navy,
  tokens.color.amber,
] as const;

/** Self-logged hours with no plan activity. */
export const WORK_LOG_OTHER_COLOR = tokens.color.muted2;
/** Hours synced from Chess.com / Lichess. */
export const WORK_LOG_SYNCED_COLOR = tokens.color.blueSoft2;

/** The colour of the activity at `index` (wraps; a negative index wraps from the end). */
export function workLogActivityColor(index: number): string {
  const n = WORK_LOG_ACTIVITY_COLORS.length;
  return WORK_LOG_ACTIVITY_COLORS[((index % n) + n) % n];
}

const HOUR_MS = 3_600_000;

/**
 * "Updated …" label for a server timestamp, measured from `nowMs` (a clock display,
 * like a countdown — ADR frontend-005). Pass `Date.now()` at render; tests pass a literal.
 */
export function formatUpdatedAgo(recordedAt: string, nowMs: number): string {
  const hours = (nowMs - new Date(recordedAt).getTime()) / HOUR_MS;
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  if (hours < 48) return 'Yesterday';
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return formatDateOnlyET(recordedAt, { month: 'short', day: 'numeric', year: undefined });
}
