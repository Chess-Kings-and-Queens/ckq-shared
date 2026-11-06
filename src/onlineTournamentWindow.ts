import type { OnlineTournamentFormat } from './types/onlineTournaments';

/** The fields of a tournament that decide when its next round fires. */
export interface FireTimeSource { format: OnlineTournamentFormat; startAt?: string | Date | null; roundStartTimes?: Array<string | Date> | null }

/** The scheduled time of the upcoming or in-flight round: startAt for 'tournament', roundStartTimes[roundsPlayed] for 'league'. */
export function computeFireTime(t: FireTimeSource, roundsPlayed: number): string | Date | null {
  if (t.format === 'league') return (t.roundStartTimes ?? [])[roundsPlayed] ?? null;
  return t.startAt ?? null;
}

/** Minutes before a round the student join window opens when the tournament sets none. */
export const DEFAULT_JOIN_WINDOW_MINUTES = 15;

/** When the student join window for `fireTime` opens. */
export function joinWindowOpensAt(fireTime: string | Date, joinWindowMinutes: number | null | undefined): Date {
  return new Date(new Date(fireTime).getTime() - (joinWindowMinutes ?? DEFAULT_JOIN_WINDOW_MINUTES) * 60_000);
}
