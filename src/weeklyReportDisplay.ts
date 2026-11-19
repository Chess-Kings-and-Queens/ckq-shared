import type { StatusDisplay } from './statusDisplay';

// ── Weekly report display ──────────────────────────────────────────────────────
//
// Presentation only (ADR frontend-010 Decision 2): the backend sends the weekly report's
// facts (attendance, submission, homework completion, work-log kind and tools); these name
// and colour them for every renderer — the parent email, the portal section and the admin
// view. No academy rule lives here. Each renderer maps `tone` to its own style.

export type PrivateAttendance = 'attended' | 'missed' | 'unmarked';

export const privateAttendanceDisplay: Record<PrivateAttendance, StatusDisplay> = {
  attended: { label: 'Attended', tone: 'success' },
  missed: { label: 'Missed', tone: 'warning' },
  unmarked: { label: 'Not marked', tone: 'neutral' },
};

/** The line under a private session: its notes when submitted, else a fixed state line. */
export function privateSessionDetail(row: { attendance: PrivateAttendance; submitted: boolean; notes: string }): string {
  if (row.attendance === 'missed') return '';
  if (row.attendance === 'unmarked') return 'Attendance not marked yet';
  return row.submitted ? row.notes : 'Notes not submitted yet';
}

/** "Session with <coach>" — the private row's title. */
export function privateSessionTitle(coachName: string): string {
  return coachName ? `Session with ${coachName}` : 'Private session';
}

/** Group-class attendance: true = present, false = absent, null = not marked yet. */
export function groupAttendanceDisplay(present: boolean | null): StatusDisplay {
  if (present === true) return { label: 'Present', tone: 'success' };
  if (present === false) return { label: 'Absent', tone: 'danger' };
  return { label: 'Not marked', tone: 'neutral' };
}

/** Homework facts per group class (the backend decides `complete`); null = no homework assigned (no chip). */
export interface WeeklyReportHomework {
  complete: boolean;
  completion: number;
}

/** The homework chip — the email's words since 2026-08 (weekly-report-private-sessions-plan D7). */
export function homeworkDisplay(hw: WeeklyReportHomework | null): StatusDisplay | null {
  if (!hw) return null;
  if (hw.complete) return { label: 'Homework 100%', tone: 'success' };
  if (hw.completion > 0) return { label: `Homework ${hw.completion}%`, tone: 'warning' };
  return { label: 'Homework not done', tone: 'warning' };
}

/** Where a practice-log row came from: "Synced", its tools, or "Logged by <child>". */
export function workLogSourceLabel(row: { kind: string; tools: string[] }, childFirst: string): string {
  if (row.kind === 'auto') return 'Synced';
  if (row.tools.length) return row.tools.join(', ');
  return childFirst ? `Logged by ${childFirst}` : 'Logged by student';
}
