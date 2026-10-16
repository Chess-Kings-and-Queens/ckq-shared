import type { MissionClock, MissionTurn } from './types/missions';

/**
 * Remaining milliseconds for `side`, for display interpolation between server
 * responses. Only the side to move (`turn`) is running: its stored time minus
 * the time since `clock.turnStartedAt`, floored at 0. The other side (or any
 * side when no turn is running, `turnStartedAt === null`) shows its stored
 * time unchanged. `now` is epoch milliseconds and is always passed in — this
 * function reads no clock. It is not a decision: the server decides flags.
 */
export function remainingMs(
  clock: MissionClock,
  side: MissionTurn,
  now: number,
  turn: MissionTurn,
): number {
  const base = side === 'player' ? clock.playerMs : clock.engineMs;
  if (side !== turn || clock.turnStartedAt === null) return base;
  const startedAt = Date.parse(clock.turnStartedAt);
  if (Number.isNaN(startedAt)) return base;
  const elapsed = Math.max(0, now - startedAt);
  return Math.max(0, base - elapsed);
}

/** True when the side to move has no time left at `now` (the server's flag rule, shared for display). */
export function isFlagged(clock: MissionClock, now: number, turn: MissionTurn): boolean {
  if (clock.turnStartedAt === null) return false;
  return remainingMs(clock, turn, now, turn) <= 0;
}
