import { Chess } from 'chess.js';
import type { MoveNode } from './moveTree';

// ── Game result ────────────────────────────────────────────────────────────────
//
// Ported verbatim from website2.0's usePlayBoard.ts (the React hook keeps the
// rest — phase/clock/turn state, socket relaying). This is the pure game-end
// detection + PGN/UCI helpers + resume-replay logic.

export type GameResultReason =
  | 'checkmate'
  | 'stalemate'
  | 'threefold'
  | 'insufficient'
  | 'fifty-move'
  | 'timeout'
  | 'resign'
  | 'agreement';

export interface GameResult {
  reason: GameResultReason;
  /** null for draws */
  winner: 'white' | 'black' | null;
}

/**
 * Detects checkmate/threefold/insufficient-material/stalemate/fifty-move on a
 * `Chess` instance. Requires a **persistent** instance that has accumulated the
 * full move history — `new Chess(fen)` has no history, so threefold repetition
 * can never be detected from a fresh instance per call. Callers must keep
 * applying moves to the same `Chess` object across the whole game (this is
 * exactly what website2.0's usePlayBoard does via a ref).
 */
export function detectOutcome(chess: Chess): GameResult | null {
  if (!chess.isGameOver()) return null;
  if (chess.isCheckmate()) {
    // chess.turn() is the side that got checkmated (can't move)
    const loser = chess.turn() === 'w' ? 'white' : 'black';
    return { reason: 'checkmate', winner: loser === 'white' ? 'black' : 'white' };
  }
  if (chess.isThreefoldRepetition()) return { reason: 'threefold', winner: null };
  if (chess.isInsufficientMaterial()) return { reason: 'insufficient', winner: null };
  if (chess.isStalemate()) return { reason: 'stalemate', winner: null };
  return { reason: 'fifty-move', winner: null };
}

/** Collect the main-line SAN history (space-separated) up to `currentNode`. */
export function collectPgn(currentNode: MoveNode): string {
  const sans: string[] = [];
  let node = currentNode;
  while (node.parent) {
    sans.unshift(node.san);
    node = node.parent;
  }
  return sans.join(' ');
}

/** Build a UCI move string ("e2e4", "a7a8q") from a from/to pair + the SAN that produced it. */
export function buildUci(from: string, to: string, san: string): string {
  let uci = from + to;
  const promoMatch = san.match(/=([QRBN])/i);
  if (promoMatch) uci += promoMatch[1].toLowerCase();
  return uci;
}

// ── Resume-replay ──────────────────────────────────────────────────────────────

export interface ResumeReplayResult {
  /**
   * The persistent `Chess` instance replayed with the successfully-applied
   * SANs. Callers must keep using this exact instance (not a fresh
   * `new Chess(fen)`) for all subsequent moves in the game, so threefold
   * repetition detection stays correct across the whole game.
   */
  chess: Chess;
  /** SANs from the input that were successfully applied, stopping at the first illegal move. */
  appliedSans: string[];
  /** Resulting FEN after replay. */
  fen: string;
  /** Game outcome if the replayed history already ended the game, else null. */
  gameResult: GameResult | null;
  /**
   * True if, after replay, it is the opponent's turn to move next — false if
   * it's the player's turn, or if the replayed history already ended the
   * game. Synchronous so callers (e.g. to decide whether to fire the engine
   * immediately) don't need to wait for a render cycle.
   */
  isOpponentTurnNext: boolean;
}

/**
 * Rebuilds a game's position/history/turn/ended-state from a starting FEN and
 * a list of SANs — for reconnect/resume scenarios. Replays each SAN onto a
 * fresh persistent `Chess` instance (so threefold repetition works correctly
 * going forward), stopping at the first illegal SAN rather than throwing.
 *
 * Ported from usePlayBoard.ts's `resumeGame` — the pure half. The React hook
 * additionally replays the applied SANs onto the display board and resets
 * clock/phase state; that stays in the web/mobile adapter.
 */
export function resumeReplay(
  startFen: string,
  sans: string[],
  playerColor: 'white' | 'black',
): ResumeReplayResult {
  const chess = new Chess(startFen);
  const appliedSans: string[] = [];
  for (const san of sans) {
    try {
      chess.move(san);
      appliedSans.push(san);
    } catch {
      break; // stop at the first illegal move — defensive, mirrors buildPgn's replay pattern
    }
  }

  const opponentColorCode = playerColor === 'white' ? 'b' : 'w';
  const opponentTurnNow = chess.turn() === opponentColorCode;

  const gameResult = detectOutcome(chess);

  return {
    chess,
    appliedSans,
    fen: chess.fen(),
    gameResult,
    isOpponentTurnNext: gameResult ? false : opponentTurnNow,
  };
}
