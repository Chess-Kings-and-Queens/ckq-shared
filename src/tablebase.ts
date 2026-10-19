import { ChessGame } from './chessGame';
import type { Side } from './chessGame';
import { draftFromFen, placementToMap, validatePosition } from './boardEditor';
import { fenFields, fenFromFields } from './fen';
import type { TablebaseCategory, TablebaseWdl } from './types/tablebase';

/**
 * The largest positions any Syzygy table covers. Consumers skip a tablebase
 * request above it; the engine API's real limit comes from the tables it has
 * installed (docs/plans/tablebase-engine-api-plan.md D10).
 */
export const SYZYGY_MAX_PIECES = 7;

/** Pieces on the board; 0 for an unreadable placement. */
export function countPieces(fen: string): number {
  return placementToMap(fenFields(fen)?.placement ?? '')?.size ?? 0;
}

/**
 * One definition of "the same position": placement, side to move, castling and
 * en passant from ChessGame's canonical FEN (chess.js keeps an en-passant square
 * only when a capture is possible). Move clocks are ignored (plan D6, D21). A
 * readable-but-illegal FEN keys on its first three fields plus '-', so a typed
 * en-passant field never splits one position in two; text `fenFields` rejects
 * keys on its trimmed self. The result is never null.
 */
export function positionKey(fen: string): string {
  const game = ChessGame.fromFen(fen);
  const f = fenFields(game ? game.fen : fen);
  if (!f) return String(fen ?? '').trim();
  return game ? `${f.placement} ${f.turn} ${f.castling} ${f.enPassant}` : `${f.placement} ${f.turn} ${f.castling} -`;
}

export type TablebaseIneligibleReason = 'invalid-fen' | 'too-many-pieces' | 'castling-rights';
export type TablebaseEligibility =
  | { ok: true; game: ChessGame; pieces: number }
  | { ok: false; reason: TablebaseIneligibleReason; pieces: number };

/**
 * Can a Syzygy table of up to `maxPieces` answer this position? Legality is
 * shared validatePosition (it also rejects a side-not-to-move-in-check position,
 * which chess.js accepts). Tables never include castling rights; impossible
 * rights are pruned first (draftFromFen), since chess.js keeps them.
 */
export function tablebaseEligibility(fen: string, maxPieces: number = SYZYGY_MAX_PIECES): TablebaseEligibility {
  const pieces = countPieces(fen);
  const legal = typeof fen === 'string' && fen.trim() !== '' && validatePosition(fen).ok;
  const draft = legal ? draftFromFen(fen) : null;
  if (!draft) return { ok: false, reason: 'invalid-fen', pieces };
  if (pieces > maxPieces) return { ok: false, reason: 'too-many-pieces', pieces };
  if (draft.castling !== '-') return { ok: false, reason: 'castling-rights', pieces };
  // The game is the position the tables answer: no castling rights. chess.js keeps
  // impossible rights and generates castling moves for them, so they are dropped here (D22).
  const f = fenFields(fen)!; // non-null: draft is non-null
  const game = ChessGame.fromFen(fenFromFields({ ...f, castling: '-' }));
  if (!game) return { ok: false, reason: 'invalid-fen', pieces };
  return { ok: true, game, pieces };
}

const CATEGORY: Record<TablebaseWdl, TablebaseCategory> = {
  2: 'win', 1: 'cursed-win', 0: 'draw', [-1]: 'blessed-loss', [-2]: 'loss',
};

export function tablebaseCategory(wdl: TablebaseWdl): TablebaseCategory {
  return CATEGORY[wdl];
}

/** The side that wins under the 50-move rule from a mover-relative WDL; null for any drawn result. */
export function tablebaseWinner(wdl: TablebaseWdl, turn: Side): Side | null {
  if (wdl === 2) return turn;
  if (wdl === -2) return turn === 'white' ? 'black' : 'white';
  return null;
}
