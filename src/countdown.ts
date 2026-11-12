/**
 * Time left to an instant, split as the class heroes show it (website `NextClassHero` countdown rail,
 * mobile `NextSessionHero`). A clock display over a backend instant, not a business value (ADR frontend-005).
 * `days`: "--" no target, "00" under 24 h, else whole days. `hrs`/`min`: "--" with no target or at 24 h
 * or more, else zero-padded and floored. An instant that has passed reads "00"/"00"/"00".
 */
export interface Countdown {
  days: string;
  hrs: string;
  min: string;
}

const NO_TARGET: Countdown = { days: '--', hrs: '--', min: '--' };

export function countdownParts(target: string | number | null | undefined, nowMs: number): Countdown {
  if (target === null || target === undefined || target === '') return NO_TARGET;
  const diff = new Date(target).getTime() - nowMs;
  if (Number.isNaN(diff)) return NO_TARGET;
  if (diff <= 0) return { days: '00', hrs: '00', min: '00' };
  const totalMins = Math.floor(diff / 60000);
  const totalHrs = Math.floor(totalMins / 60);
  if (totalHrs >= 24) return { days: String(Math.floor(totalHrs / 24)), hrs: '--', min: '--' };
  return { days: '00', hrs: String(totalHrs).padStart(2, '0'), min: String(totalMins % 60).padStart(2, '0') };
}
