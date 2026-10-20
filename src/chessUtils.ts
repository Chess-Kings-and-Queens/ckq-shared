import { ChessGame } from './chessGame';
import { fenFields } from './fen';

/**
 * Convert a single UCI move (e.g. "e2e4", "a7a8q") to SAN given the position FEN.
 * Returns null if the move is illegal or the FEN is invalid.
 */
export function uciMoveToSan(fen: string, uci: string): string | null {
  const result = ChessGame.fromFen(fen)?.play({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return result?.ok ? result.move.san : null;
}

/**
 * Given a position FEN and a SAN move, returns the move's origin/destination
 * squares. Returns null if the SAN is illegal in that position or the FEN is
 * invalid. Used to backfill lastMove highlighting for events that only carry
 * SAN + resulting FEN (no from/to), e.g. mission:student-move.
 */
export function sanToMove(fen: string, san: string): { from: string; to: string } | null {
  const result = ChessGame.fromFen(fen)?.play(san);
  return result?.ok ? { from: result.move.from, to: result.move.to } : null;
}

/**
 * Given a position FEN and a SAN move, returns the move as UCI ("e2e4",
 * "a7a8q"). Returns null if the SAN is illegal there or the FEN is invalid.
 */
export function sanToUci(fen: string, san: string): string | null {
  const result = ChessGame.fromFen(fen)?.play(san);
  return result?.ok ? result.move.uci : null;
}

/**
 * Whether the engine (the side opposite `playerColor`) moves first from `fen`.
 * False when the FEN is invalid.
 */
export function engineMovesFirst(fen: string, playerColor: 'white' | 'black'): boolean {
  const game = ChessGame.fromFen(fen);
  return game !== null && game.turn !== playerColor;
}

/**
 * Truncate a formatted move string (e.g. "1. e4 e5 2. d4 d5 3. Nc3…") to the
 * first `maxMoves` individual moves, appending "…" if truncated.
 * Move-number tokens ("1.", "2.", "1...") are not counted as moves.
 * Returns { display, truncated, full } — callers can use `full` as a tooltip.
 */
export function truncateMoveString(
  formatted: string,
  maxMoves = 4,
): { display: string; truncated: boolean; full: string } {
  const full = formatted;
  if (formatted === '—') return { display: formatted, truncated: false, full };
  const tokens = formatted.trim().split(/\s+/);
  let moveCount = 0;
  const kept: string[] = [];
  for (const token of tokens) {
    kept.push(token);
    if (!/^\d+\.{1,3}$/.test(token)) moveCount++;
    if (moveCount === maxMoves) break;
  }
  if (kept.length === tokens.length) return { display: formatted, truncated: false, full };
  return { display: kept.join(' ') + '…', truncated: true, full };
}

/** Split a multi-game PGN file into individual game strings. A leading byte-order mark is dropped. */
export function splitPgnGames(raw: string): string[] {
  const lines = raw.replace(/^\uFEFF/, '').split('\n');
  const games: string[] = [];
  let current: string[] = [];
  let seenMoves = false; // true once we've accumulated non-header, non-blank content

  for (const line of lines) {
    const trimmed = line.trim();
    const isTagLine = trimmed.startsWith('[');

    if (isTagLine && seenMoves) {
      // A new game's header block is starting — flush the completed game
      games.push(current.join('\n').trim());
      current = [line];
      seenMoves = false;
    } else {
      current.push(line);
      // Any non-tag, non-blank line counts as move text
      if (!isTagLine && trimmed.length > 0) {
        seenMoves = true;
      }
    }
  }

  // Flush the final game
  if (current.length > 0) games.push(current.join('\n').trim());
  return games.filter((g) => g.length > 0);
}

export const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Return the color whose turn it is ('white' | 'black') from a ChessGame.
 */
export function toColor(game: ChessGame): 'white' | 'black' {
  return game.turn;
}

/**
 * Parse PGN header tags into a key-value record.
 * E.g. `[White "Kasparov"]` → `{ White: "Kasparov" }`.
 */
export function parsePgnHeader(pgn: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const re = /\[(\w+)\s+"([^"]*)"\]/g;
  let m;
  while ((m = re.exec(pgn)) !== null) tags[m[1]] = m[2];
  return tags;
}

/** PGN tag order: the Seven Tag Roster, then the set-up pair, then anything else as given. */
const PGN_TAG_ORDER = ['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result', 'SetUp', 'FEN'];
const PGN_TAG_LINE = /^\s*\[\w+\s+"[^"]*"\]\s*$/;
const PGN_RESULT_TOKEN = /\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/;

/**
 * The one PGN tag writer in the platform (pgn-single-source-plan.md D3). Returns `pgn` with
 * `tags` applied over any tags it already carries: existing tags are kept, given tags
 * override, a FEN implies `[SetUp "1"]`, a given Result also replaces the game-termination
 * token. Tag lines come first in PGN_TAG_ORDER then as given, one blank line, then the move
 * text (`*` when there is none). `ChessGame.pgn()` is the one move-text writer; pass its
 * output, a stored SAN list, or '' as `pgn`.
 */
export function withPgnTags(pgn: string, tags: Record<string, string>): string {
  const merged: Record<string, string> = { ...parsePgnHeader(pgn), ...tags };
  if (merged.FEN && !merged.SetUp) merged.SetUp = '1';
  let moveText = pgn.split('\n').filter((line) => !PGN_TAG_LINE.test(line)).join('\n').trim();
  if (tags.Result) moveText = `${moveText.replace(PGN_RESULT_TOKEN, '')} ${tags.Result}`.trim();
  if (!moveText) moveText = merged.Result ?? '*';
  const keys = [...PGN_TAG_ORDER.filter((k) => k in merged), ...Object.keys(merged).filter((k) => !PGN_TAG_ORDER.includes(k))];
  const tagLines = keys.map((k) => `[${k} "${merged[k]}"]`);
  return tagLines.length ? `${tagLines.join('\n')}\n\n${moveText}` : moveText;
}

/** Short label for a game in a multi-game selector dropdown. */
export function gameLabel(pgn: string, idx: number): string {
  const h = parsePgnHeader(pgn);
  const players = [h.White, h.Black].filter(Boolean).join(' vs ') || '(unknown)';
  const extra = [h.Event, h.Date].filter(Boolean).join(', ');
  return `${idx + 1}. ${players}${extra ? ` — ${extra}` : ''}`;
}

/** Auto-detect PGN vs FEN from input text. */
export function isFenString(text: string): boolean {
  const f = fenFields(text);
  return f !== null && f.placement.split('/').length === 8;
}

// ── Shape serialization (for liveboard socket) ──────────────────────────────

/**
 * Serialize chessground DrawShape[] to a compact wire format for socket transport.
 * Each shape becomes [orig, dest, brush] — dest is "" for square highlights.
 */
export function serializeShapes(shapes: { orig: string; dest?: string; brush?: string }[]): string[][] {
  return shapes.map((s) => [s.orig, s.dest ?? '', s.brush ?? 'green']);
}

/**
 * Deserialize the wire format back to chessground DrawShape[].
 */
export function deserializeShapes(wire: string[][]): { orig: string; dest?: string; brush: string }[] {
  return wire.map(([orig, dest, brush]) => ({
    orig,
    ...(dest ? { dest } : {}),
    brush: brush || 'green',
  }));
}

/**
 * Extracts the active color and full-move number from a FEN string.
 * Returns defaults { color: 'w', fullMove: 1 } for an empty or invalid FEN.
 */
export function fenMoveContext(fen: string): { color: 'w' | 'b'; fullMove: number } {
  const f = fenFields(fen);
  return f ? { color: f.turn, fullMove: f.fullmove } : { color: 'w', fullMove: 1 };
}

/**
 * Formats a flat array of SAN moves into human-readable chess notation with move numbers.
 *
 *   formatMoveSequence(['e4', 'e5', 'Nf3'], 'w', 1) → "1. e4 e5 2. Nf3"
 *   formatMoveSequence(['e5', 'Nf3'],        'b', 1) → "1... e5 2. Nf3"
 *
 * White moves always receive a number prefix ("N. san").
 * The first move receives an ellipsis prefix when black starts ("N... san").
 * Subsequent black moves follow white's numbered move inline with no prefix.
 *
 * @param sans       - SAN strings in game order (alternating colors)
 * @param startColor - Color to move first. Default 'w'.
 * @param startMove  - Full-move number at the start. Default 1.
 */
export function formatMoveSequence(
  sans: string[],
  startColor: 'w' | 'b' = 'w',
  startMove = 1,
): string {
  if (sans.length === 0) return '';
  const parts: string[] = [];
  let moveNum = startMove;
  let color = startColor;

  sans.forEach((san, i) => {
    if (color === 'w') {
      parts.push(`${moveNum}. ${san}`);
    } else {
      if (i === 0 && startColor === 'b') {
        parts.push(`${moveNum}... ${san}`);
      } else {
        parts.push(san);
      }
      moveNum++;
    }
    color = color === 'w' ? 'b' : 'w';
  });

  return parts.join(' ');
}

/**
 * The move-number label printed before the ply at 0-based `ply` in a game started from
 * `startFen`: "N." before a white move, "N..." before a black move that opens a line
 * (`lineStart`), "" otherwise. One rule for the website notation panel and the app's
 * move strips (pgn-single-source-plan.md D4).
 */
export function moveNumberLabel(startFen: string, ply: number, lineStart: boolean): string {
  const { color, fullMove } = fenMoveContext(startFen);
  const offset = color === 'b' ? 1 : 0;
  const number = fullMove + Math.floor((ply + offset) / 2);
  const white = (ply + offset) % 2 === 0;
  if (white) return `${number}.`;
  return lineStart ? `${number}...` : '';
}

/**
 * Build a PGN string from a starting FEN and a sequence of SAN moves.
 * Used by the coach liveboard page to encode the quiz answer sequence.
 * Invalid SANs are silently skipped (the sequence stops there).
 *
 * Generates correct PGN move notation regardless of starting color:
 *   - White-to-move start: "1. e4 e5 2. Nf3 *"
 *   - Black-to-move start: "1... e5 2. Nf3 Nc6 *"
 * This ensures @mliebelt/pgn-reader assigns the correct `turn` to the first
 * move, which is what QuizEvaluator uses to determine playerColor.
 */
export function buildQuizPgn(startFen: string, sans: string[]): string {
  return ChessGame.replay(startFen, sans).game.pgn();
}
