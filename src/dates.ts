/**
 * Shared date utility functions.
 *
 * Rule: all date-only fields from the DB are UTC midnight ISO strings
 * (e.g. "2026-12-31T00:00:00.000Z"). Rendering them with toLocaleDateString()
 * without { timeZone: 'UTC' } causes a day-shift in UTC-offset timezones
 * (e.g. Dec 31 UTC → Dec 30 EST). All functions here avoid that bug.
 *
 * Use:
 *  - formatDateOnly()    for date-only fields (holidays, scholarships, membership dates)
 *  - formatDateTime()    for full timestamps that should display in a timezone (session times, audit logs)
 *  - formatMonthYear()   for "Month YYYY" labels of date-only fields
 *  - isDatePastUTC()     for "is this date in the past?" checks on date-only fields
 *
 * Shared by website2.0 and ckq-mobile (moved verbatim from website2.0 utils/dates.ts; formatMonth and
 * formatCurrency stay in the website). Pure Intl, no moment, no DOM.
 *
 * DEFAULT_TIMEZONE is the single place to change the application timezone.
 * All display functions accept an optional tz parameter that defaults to it.
 */

export const DEFAULT_TIMEZONE = "America/New_York";

/**
 * Formats a date-only ISO string (or Date) using UTC timezone so that
 * "2026-12-31T00:00:00.000Z" always renders as "December 31, 2026" — never Dec 30.
 *
 * @param value  ISO string or Date object
 * @param opts   Intl.DateTimeFormatOptions to override defaults (month/day/year are preset)
 */
export function formatDateOnly(
  value: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  });
}

/**
 * Formats a datetime ISO string for display in the given timezone.
 * Use for session times, payment timestamps, and any other "when did this happen" labels.
 *
 * @param value  ISO string or Date object
 * @param tz     IANA timezone string — defaults to DEFAULT_TIMEZONE
 * @param opts   Intl.DateTimeFormatOptions to override defaults
 */
export function formatDateTime(
  value: string | Date | null | undefined,
  tz: string = DEFAULT_TIMEZONE,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
    ...opts,
  });
}

/**
 * Formats a date-only ISO string (or Date) as "Month YYYY" (e.g. "May 2026").
 * Uses UTC so UTC-midnight dates always show the correct calendar month.
 * Use this when you need month+year only — not formatDateOnly() which always
 * includes the day.
 *
 * @param value  ISO string or Date object
 */
export function formatMonthYear(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Returns true if the given date-only value is strictly before today (UTC).
 *
 * Compares the stored UTC-midnight date against today's UTC midnight so the
 * result is stable throughout the day regardless of local browser timezone.
 *
 * @param value  YYYY-MM-DD string or ISO date string
 */
export function isDatePastUTC(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return false;
  const todayUTC = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate()
    )
  );
  return d < todayUTC;
}

/**
 * Formats a datetime stored with ET-aware boundaries (startDate = ET midnight,
 * endDate = ET 23:59) as a date-only label in the app timezone.
 *
 * Use for holiday, camp, and tournament dates — fields that are stored via
 * combineDateTimeEST on the backend (not as UTC midnight).
 *
 * @param value  ISO string or Date object
 */
export function formatDateOnlyET(
  value: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: DEFAULT_TIMEZONE,
    ...opts,
  });
}

/**
 * Extracts the YYYY-MM-DD calendar date in the app timezone from an ET-aware
 * datetime value. Suitable for pre-filling <input type="date"> fields whose
 * backing store uses combineDateTimeEST (not UTC midnight).
 *
 * @param value  ISO string or Date object
 */
export function toFormDateET(
  value: string | Date | null | undefined
): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  // en-CA locale produces YYYY-MM-DD directly — the format <input type="date"> expects.
  return d.toLocaleDateString("en-CA", { timeZone: DEFAULT_TIMEZONE });
}

/**
 * Extracts the YYYY-MM-DD calendar date in the GIVEN timezone from a UTC instant.
 * Generalizes toFormDateET for venues whose timezone differs from the app default
 * (e.g. a camp schedule's location.timezone). Use this — never browser-local Date
 * methods (getDate(), getDay(), toISOString() for "today") — to project a stored
 * UTC instant (e.g. "2026-03-20T04:00:00Z", ET midnight) onto its real calendar day.
 *
 * @param value  ISO string or Date object (a UTC instant)
 * @param tz     IANA timezone string — defaults to DEFAULT_TIMEZONE
 */
export function toFormDateInTz(
  value: string | Date | null | undefined,
  tz: string = DEFAULT_TIMEZONE
): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  // en-CA locale produces YYYY-MM-DD directly — the format <input type="date"> expects.
  return d.toLocaleDateString("en-CA", { timeZone: tz });
}

/**
 * Returns true if the given ET-aware datetime value represents a calendar date
 * that is strictly before today in the app timezone.
 *
 * Use for ET-stored dates (holidays, camps, tournaments) in place of isDatePastUTC.
 *
 * @param value  ISO string or Date object
 */
export function isDatePastET(
  value: string | Date | null | undefined
): boolean {
  if (!value) return false;
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return false;
  const dET = d.toLocaleDateString("en-CA", { timeZone: DEFAULT_TIMEZONE });
  const todayET = new Date().toLocaleDateString("en-CA", { timeZone: DEFAULT_TIMEZONE });
  return dET < todayET;
}

/**
 * Formats the time-of-day (hour + 2-digit minute, e.g. "4:00 PM") of a UTC
 * instant in the given timezone. No "ET"/timezone suffix — callers append
 * one when needed (e.g. masterclass-dashboard-banner-plan.md §4.1/§4.3).
 * Checked first whether `formatTimeET` (`utils/formatTime.ts`, used by
 * NextClassCard and admin calendar/schedule pages) was an exportable
 * equivalent: it isn't — that helper formats an already-ET "HH:mm" schedule
 * string with no timezone conversion at all (moment(time, ["HH:mm", ...])),
 * a different domain from this function's UTC-instant + tz input. Left
 * untouched; this is a new, separate helper.
 *
 * @param value  ISO string or Date object (a UTC instant)
 * @param tz     IANA timezone string — defaults to DEFAULT_TIMEZONE
 */
export function formatTimeInTZ(
  value: string | Date | null | undefined,
  tz: string = DEFAULT_TIMEZONE
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

/**
 * Formats a bare HH:mm clock string (a stored venue-local time of day, e.g. a
 * tournament round) as "h:mm AM/PM". Pure string formatting — no timezone, no
 * instant — for values the backend stores as time-of-day only.
 */
export function formatClockTime(hhmm: string | null | undefined): string {
  if (!hhmm) return "—";
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return "—";
  const h = Number(m[1]);
  const minutes = m[2];
  if (h > 23 || Number(minutes) > 59) return "—";
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${minutes} ${suffix}`;
}

/**
 * Steps a YYYY-MM-DD date string by whole days, staying a plain UTC-anchored
 * string op (no timezone conversion). Used for report paging, where stepping
 * ±7 days lands on the previous/next window: the parent weekly report (admin
 * `WeeklyReportView`, portal `WeeklyReportSection`), whose 7-day window starts
 * on any weekday because it ends on the student's class day, and the admin
 * weekly class report, whose weeks start on Monday.
 */
export function stepDateStr(dateStr: string, deltaDays: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/** A date-only (UTC-midnight) value as the `YYYY-MM-DD` a date input shows. */
export function toFormDateUTC(value: string | Date): string { return toFormDateInTz(value, 'UTC'); }
