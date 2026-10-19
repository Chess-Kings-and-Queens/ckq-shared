import type { Side } from '../chessGame';

// Contract of chess-engine-api GET /engine/tablebase, passed through by
// backend-2.0 GET /api/v1/engine/tablebase (docs/plans/tablebase-engine-api-plan.md D6).
// wdl/dtz are from the point of view of the side to move in `fen`; `winner` is absolute.

export type TablebaseWdl = 2 | 1 | 0 | -1 | -2;
export type TablebaseCategory = 'win' | 'cursed-win' | 'draw' | 'blessed-loss' | 'loss';

export interface TablebaseMove {
  uci: string;
  san: string;
  wdl: TablebaseWdl;
  dtz: number;
  category: TablebaseCategory;
  checkmate: boolean;
  stalemate: boolean;
}

export interface TablebaseSupported {
  supported: true;
  fen: string;
  pieces: number;
  maxPieces: number;
  wdl: TablebaseWdl;
  dtz: number;
  category: TablebaseCategory;
  /** The side that wins under the 50-move rule; null for every drawn result. */
  winner: Side | null;
  checkmate: boolean;
  stalemate: boolean;
  moves: TablebaseMove[];
  cached?: boolean;
}

export type TablebaseUnsupportedReason = 'too-many-pieces' | 'castling-rights' | 'missing-table' | 'unavailable';

export interface TablebaseUnsupported {
  supported: false;
  reason: TablebaseUnsupportedReason;
  pieces?: number;
  /** Present when the engine API answered: the largest positions its installed tables cover. */
  maxPieces?: number;
}

export type TablebaseResult = TablebaseSupported | TablebaseUnsupported;
