/**
 * The system "Liveboard" OnlineTournament program (tournament-single-record-plan.md D7):
 * the parent of every coach-run class tournament's schedule. A fixed id, so both servers
 * recognise it without a lookup. Created by backend-2.0
 * scripts/migrate-tournament-results-to-schedules.js; never deleted.
 */
export const LIVEBOARD_PROGRAM_ID = '6c697665626f617264303031';

/** True when `id` (string or ObjectId-like) is the Liveboard program. */
export function isLiveboardProgram(id: unknown): boolean {
  return id != null && String(id) === LIVEBOARD_PROGRAM_ID;
}
