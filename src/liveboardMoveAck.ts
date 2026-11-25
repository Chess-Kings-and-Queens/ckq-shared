import type {
  LiveboardServerMove,
  MissionMoveAck,
  MissionMoveRefusedAck,
  TournamentByeMoveAck,
  TournamentByeMoveRefusedAck,
} from './types/liveboardProtocol';
import type { MissionClock } from './types/missions';

/** The replies to a queued board move (mission:move, tournament:bye-move). */
export type BoardMoveAck = MissionMoveAck | TournamentByeMoveAck;

export type BoardMoveOutcome =
  | { kind: 'accepted'; clock: MissionClock | null } // { ok: true } with or without clock, or { ok: true, duplicate: true }
  | { kind: 'already-finished' } // { ok: true, ignored: 'already-finished' }
  | { kind: 'restore'; moves: LiveboardServerMove[] } // a validateAppend failure: { ok: false, error, fen, moves }
  | { kind: 'flagged'; moves: LiveboardServerMove[]; clock: MissionClock } // { ok: false, error: 'flagged', … }
  | { kind: 'gap' } // 'move-index-gap'
  | { kind: 'gone' } // MOVE_ACK_GONE_ERRORS, or ignored: 'coach'
  | { kind: 'threw'; message: string }; // any other { ok: false, error }

/**
 * Replies meaning the move's mission, tournament, game or participant no longer exists on the
 * server: no resend can succeed. The one list (website useLiveboardSocket and ckq-mobile
 * boardMoveQueue). Typed against the ack unions, so a renamed server code fails the compile.
 */
export const MOVE_ACK_GONE_ERRORS = [
  'no-active-mission',
  'no-participant',
  'no-active-tournament',
  'no-such-game',
  'not-your-game',
] as const satisfies readonly (MissionMoveRefusedAck['error'] | TournamentByeMoveRefusedAck['error'])[];

/** True when a move reply's error means the move can never be accepted (MOVE_ACK_GONE_ERRORS). */
export function isGoneMoveAckError(error: string): boolean {
  return (MOVE_ACK_GONE_ERRORS as readonly string[]).includes(error);
}

/** How a queued board move's reply is classified (website and ckq-mobile, once). */
export function classifyMoveAck(ack: BoardMoveAck): BoardMoveOutcome {
  if (ack.ok) {
    if ('ignored' in ack) return ack.ignored === 'already-finished' ? { kind: 'already-finished' } : { kind: 'gone' };
    return { kind: 'accepted', clock: 'clock' in ack && ack.clock ? ack.clock : null };
  }
  if ('clock' in ack) return { kind: 'flagged', moves: ack.moves, clock: ack.clock };
  if ('moves' in ack) return { kind: 'restore', moves: ack.moves };
  if (ack.error === 'move-index-gap') return { kind: 'gap' };
  if (isGoneMoveAckError(ack.error)) return { kind: 'gone' };
  return { kind: 'threw', message: ack.error };
}
