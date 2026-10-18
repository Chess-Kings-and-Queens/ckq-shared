import { Chess, DEFAULT_POSITION, validateFen } from 'chess.js';
import type { Square } from 'chess.js';
import type { GameResult } from './gameOutcome';

// ── ChessGame — the one chess.js boundary ──────────────────────────────────────
//
// This is the ONLY file in the package (and, by guard test, in every CKQ repo)
// that imports `chess.js`. Everything else — game end naming, legal
// destinations, PGN, UCI/SAN conversion, start-position validation — goes
// through this class. No `chess.js` type appears in any public signature.
// Type-only imports of `GameResult` keep the module graph acyclic at runtime.

export type Side = 'white' | 'black';

export interface PlayedMove {
  /** 0-based index in the game. */
  ply: number;
  san: string;
  /** from + to + promotion letter, e.g. "e2e4", "a7a8q". */
  uci: string;
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
  color: Side;
  fenBefore: string;
  fenAfter: string;
}

export type MoveInput = string | { from: string; to: string; promotion?: string };
export type PlayResult = { ok: true; move: PlayedMove } | { ok: false; error: 'illegal-move' };
export interface PieceOnSquare {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: Side;
}

type PromotionPiece = 'q' | 'r' | 'b' | 'n';

const toSide = (code: 'w' | 'b'): Side => (code === 'w' ? 'white' : 'black');

export class ChessGame {
  /** The position the game started from, exactly as supplied (or the standard start). */
  readonly startFen: string;
  private readonly chess: Chess;

  private constructor(chess: Chess, startFen: string) {
    this.chess = chess;
    this.startFen = startFen;
  }

  /** null when the FEN is not a legal chess.js position (never throws). */
  static fromFen(fen?: string): ChessGame | null {
    try {
      return new ChessGame(new Chess(fen), fen ?? DEFAULT_POSITION);
    } catch {
      return null;
    }
  }

  /**
   * Replays SANs from startFen; stops at the first illegal one.
   * Throws on an invalid `startFen` (the constructor path — callers that need a
   * non-throwing check use `fromFen`).
   */
  static replay(startFen: string, sans: readonly string[]): { game: ChessGame; applied: number } {
    const game = new ChessGame(new Chess(startFen), startFen);
    let applied = 0;
    for (const san of sans) {
      if (!game.play(san).ok) break;
      applied += 1;
    }
    return { game, applied };
  }

  /** Main line of a PGN (headers honoured, incl. [FEN]); null when unparseable. */
  static fromPgn(pgn: string): ChessGame | null {
    try {
      const chess = new Chess();
      chess.loadPgn(pgn);
      const headerFen = chess.getHeaders().FEN;
      return new ChessGame(chess, typeof headerFen === 'string' && headerFen ? headerFen : DEFAULT_POSITION);
    } catch {
      return null;
    }
  }

  get fen(): string {
    return this.chess.fen();
  }

  get turn(): Side {
    return toSide(this.chess.turn());
  }

  get ply(): number {
    return this.chess.history().length;
  }

  get sans(): string[] {
    return this.chess.history();
  }

  get moves(): PlayedMove[] {
    return this.chess.history({ verbose: true }).map((m, ply) => ({
      ply,
      san: m.san,
      uci: m.from + m.to + (m.promotion ?? ''),
      from: m.from,
      to: m.to,
      ...(m.promotion ? { promotion: m.promotion as PromotionPiece } : {}),
      color: toSide(m.color),
      fenBefore: m.before,
      fenAfter: m.after,
    }));
  }

  /** Plays a move on this game. Never throws. */
  play(move: MoveInput): PlayResult {
    const played = this.tryMove(move);
    return played ? { ok: true, move: played } : { ok: false, error: 'illegal-move' };
  }

  /** The result of a move without playing it (the game is left unchanged). */
  peek(move: MoveInput): PlayedMove | null {
    const played = this.tryMove(move);
    if (played) this.chess.undo();
    return played;
  }

  /** Every from-square of the side to move, with its legal destinations. */
  legalDests(): Map<string, string[]> {
    const dests = new Map<string, string[]>();
    for (const m of this.chess.moves({ verbose: true })) {
      const list = dests.get(m.from);
      if (!list) dests.set(m.from, [m.to]);
      else if (!list.includes(m.to)) list.push(m.to);
    }
    return dests;
  }

  legalDestsFrom(square: string): string[] {
    try {
      const out: string[] = [];
      for (const m of this.chess.moves({ square: square as Square, verbose: true })) {
        if (!out.includes(m.to)) out.push(m.to);
      }
      return out;
    } catch {
      return [];
    }
  }

  needsPromotion(from: string, to: string): boolean {
    try {
      return this.chess
        .moves({ square: from as Square, verbose: true })
        .some((m) => m.to === to && Boolean(m.promotion));
    } catch {
      return false;
    }
  }

  pieceAt(square: string): PieceOnSquare | null {
    try {
      const p = this.chess.get(square as Square);
      return p ? { type: p.type, color: toSide(p.color) } : null;
    } catch {
      return null;
    }
  }

  inCheck(): boolean {
    return this.chess.isCheck();
  }

  /**
   * Game result from the full move history (so threefold works), or null while
   * the game is in progress. Precedence (D4): checkmate, stalemate, insufficient
   * material, threefold repetition, fifty-move rule.
   */
  outcome(): GameResult | null {
    const c = this.chess;
    if (!c.isGameOver()) return null;
    if (c.isCheckmate()) {
      // The side to move has been mated.
      return { reason: 'checkmate', winner: c.turn() === 'w' ? 'black' : 'white' };
    }
    if (c.isStalemate()) return { reason: 'stalemate', winner: null };
    if (c.isInsufficientMaterial()) return { reason: 'insufficient', winner: null };
    if (c.isThreefoldRepetition()) return { reason: 'threefold', winner: null };
    return { reason: 'fifty-move', winner: null };
  }

  /**
   * 'ckq' (default) is the quiz-answer format: a `[FEN]`/`[SetUp]` header for a
   * non-standard start, `N...` for a black first move, a trailing ` *`, and ''
   * for a game with no moves. 'chessjs' is chess.js's own `pgn()` verbatim.
   */
  pgn(opts: { style?: 'ckq' | 'chessjs' } = {}): string {
    if (opts.style === 'chessjs') return this.chess.pgn();

    const moves = this.moves;
    if (moves.length === 0) return '';

    const fenTag = this.startFen !== DEFAULT_POSITION ? `[FEN "${this.startFen}"]\n[SetUp "1"]\n\n` : '';

    const fenParts = this.startFen.split(' ');
    let moveNum = parseInt(fenParts[5] ?? '1', 10) || 1;
    const startColor = fenParts[1] ?? 'w';

    let moveText = '';
    moves.forEach((move, i) => {
      if (move.color === 'white') {
        moveText += `${moveNum}. `;
      } else if (i === 0 && startColor === 'b') {
        // First move is black's — ellipsis notation so pgn-reader assigns turn='b'.
        moveText += `${moveNum}... `;
      }
      moveText += move.san + ' ';
      if (move.color === 'black') moveNum++;
    });

    return `${fenTag}${moveText.trim()} *`;
  }

  /** An independent copy with the same history. */
  clone(): ChessGame {
    return ChessGame.replay(this.startFen, this.sans).game;
  }

  private tryMove(move: MoveInput): PlayedMove | null {
    try {
      const ply = this.chess.history().length;
      const m = this.chess.move(move);
      if (!m) return null;
      return {
        ply,
        san: m.san,
        uci: m.from + m.to + (m.promotion ?? ''),
        from: m.from,
        to: m.to,
        ...(m.promotion ? { promotion: m.promotion as PromotionPiece } : {}),
        color: toSide(m.color),
        fenBefore: m.before,
        fenAfter: m.after,
      };
    } catch {
      return null;
    }
  }
}

/** chess.js validateFen, for validatePosition only. */
export function isLegalFenSyntax(fen: string): { ok: true } | { ok: false; error: string } {
  const result = validateFen(fen);
  return result.ok ? { ok: true } : { ok: false, error: result.error ?? '' };
}

/** Whether `square` is attacked by `by` in `fen`, for validatePosition only. */
export function isSquareAttacked(fen: string, square: string, by: Side): boolean {
  return new Chess(fen).isAttacked(square as Square, by === 'white' ? 'w' : 'b');
}
