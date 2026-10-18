import { ChessGame } from './chessGame';
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
 * Detects checkmate/stalemate/insufficient-material/threefold/fifty-move on a
 * `ChessGame`. Requires a **persistent** game that has accumulated the full
 * move history — a game built from a bare FEN has no history, so threefold
 * repetition can never be detected from it. Callers must keep playing moves on
 * the same `ChessGame` across the whole game. Precedence is `ChessGame.outcome()`'s
 * (checkmate, stalemate, insufficient, threefold, fifty-move).
 */
export function detectOutcome(game: ChessGame): GameResult | null {
  return game.outcome();
}

// ── Stored tournament vocabulary ────────────────────────────────────────────────

/** The result reasons stored on tournament games (DB, backend enum and labels speak this set). */
export type TournamentResultReason =
  | 'checkmate' | 'timeout' | 'resign' | 'forfeit' | 'aborted'
  | 'draw-stalemate' | 'draw-repetition' | 'draw-insufficient' | 'draw-50move' | 'draw-agreed';

/**
 * Maps a live `GameResultReason` to the string stored on a tournament game.
 * stalemate→draw-stalemate, threefold→draw-repetition, insufficient→draw-insufficient,
 * fifty-move→draw-50move, agreement→draw-agreed; every other value passes through.
 */
export function toTournamentReason(reason: GameResultReason | 'forfeit' | 'aborted'): TournamentResultReason {
  switch (reason) {
    case 'stalemate': return 'draw-stalemate';
    case 'threefold': return 'draw-repetition';
    case 'insufficient': return 'draw-insufficient';
    case 'fifty-move': return 'draw-50move';
    case 'agreement': return 'draw-agreed';
    default: return reason;
  }
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
   * The persistent `ChessGame` replayed with the successfully-applied
   * SANs. Callers must keep using this exact instance (not a fresh
   * `ChessGame.fromFen(fen)`) for all subsequent moves in the game, so
   * threefold repetition detection stays correct across the whole game.
   */
  game: ChessGame;
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
 * fresh persistent `ChessGame` (so threefold repetition works correctly
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
  const { game, applied } = ChessGame.replay(startFen, sans);
  const appliedSans = sans.slice(0, applied);

  const opponentColor = playerColor === 'white' ? 'black' : 'white';
  const opponentTurnNow = game.turn === opponentColor;

  const gameResult = detectOutcome(game);

  return {
    game,
    appliedSans,
    fen: game.fen,
    gameResult,
    isOpponentTurnNext: gameResult ? false : opponentTurnNow,
  };
}
