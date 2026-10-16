import { detectOutcome, resumeReplay, type GameResult } from './gameOutcome';
import type { MissionTurn } from './types/missions';

export type ValidateAppendError = 'illegal-move' | 'out-of-turn' | 'ply-behind' | 'ply-gap';

export type ValidateAppendResult =
  | {
      ok: true;
      /** Position after the move — computed here, never taken from a client. */
      fen: string;
      uci: string;
      /** The move in normalized SAN (what chess.js produces, e.g. "Nf3" or "Qh4#"). */
      san: string;
      /** Board result of the full-history replay after the move, else null. */
      outcome: GameResult | null;
    }
  | {
      ok: false;
      /** `ply-behind` is the idempotent-resend signal: the consumer returns the current state. */
      error: ValidateAppendError;
    };

/**
 * The one legality / turn / ply check for an appended mission move, used by the
 * backend and the liveboard server so they cannot drift (ADR backend-024).
 *
 * Replays `startFen` + `moves` on one persistent `Chess` (full history, so
 * threefold repetition works), then checks, in order:
 *   1. `ply` against the stored move count (behind -> `ply-behind`, ahead -> `ply-gap`)
 *   2. `by` against the side to move, derived from the replayed position and `playerColor`
 *   3. the SAN against the board
 * A stored move list that does not replay cleanly is reported as `illegal-move`.
 */
export function validateAppend(
  startFen: string,
  moves: ReadonlyArray<{ san: string }>,
  move: { ply: number; san: string; by: MissionTurn },
  playerColor: 'white' | 'black',
): ValidateAppendResult {
  if (move.ply < moves.length) return { ok: false, error: 'ply-behind' };
  if (move.ply > moves.length) return { ok: false, error: 'ply-gap' };

  const replay = resumeReplay(
    startFen,
    moves.map((m) => m.san),
    playerColor,
  );
  if (replay.appliedSans.length !== moves.length) return { ok: false, error: 'illegal-move' };

  const { chess } = replay;
  const playerCode = playerColor === 'white' ? 'w' : 'b';
  const expectedBy: MissionTurn = chess.turn() === playerCode ? 'player' : 'engine';
  if (move.by !== expectedBy) return { ok: false, error: 'out-of-turn' };

  try {
    const played = chess.move(move.san);
    return {
      ok: true,
      fen: chess.fen(),
      uci: played.from + played.to + (played.promotion ?? ''),
      san: played.san,
      outcome: detectOutcome(chess),
    };
  } catch {
    return { ok: false, error: 'illegal-move' };
  }
}
