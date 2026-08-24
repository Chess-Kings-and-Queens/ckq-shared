import { Chess } from 'chess.js';

/**
 * Convert a single UCI move (e.g. "e2e4", "a7a8q") to SAN given the position FEN.
 * Returns null if the move is illegal or the FEN is invalid.
 */
export function uciMoveToSan(fen: string, uci: string): string | null {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci[4] ?? undefined;
    const move = chess.move({ from, to, promotion });
    return move?.san ?? null;
  } catch {
    return null;
  }
}

/**
 * Given a position FEN and a SAN move, returns the move's origin/destination
 * squares. Returns null if the SAN is illegal in that position or the FEN is
 * invalid. Used to backfill lastMove highlighting for events that only carry
 * SAN + resulting FEN (no from/to), e.g. mission:student-move.
 */
export function sanToMove(fen: string, san: string): { from: string; to: string } | null {
  try {
    const move = new Chess(fen).move(san);
    return move ? { from: move.from, to: move.to } : null;
  } catch {
    return null;
  }
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

/** Split a multi-game PGN file into individual game strings. */
export function splitPgnGames(raw: string): string[] {
  const lines = raw.split('\n');
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
 * Return the color whose turn it is ('white' | 'black') from a Chess.js instance.
 */
export function toColor(chess: Chess): 'white' | 'black' {
  return chess.turn() === 'w' ? 'white' : 'black';
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

/** Short label for a game in a multi-game selector dropdown. */
export function gameLabel(pgn: string, idx: number): string {
  const h = parsePgnHeader(pgn);
  const players = [h.White, h.Black].filter(Boolean).join(' vs ') || '(unknown)';
  const extra = [h.Event, h.Date].filter(Boolean).join(', ');
  return `${idx + 1}. ${players}${extra ? ` — ${extra}` : ''}`;
}

/** Auto-detect PGN vs FEN from input text. */
export function isFenString(text: string): boolean {
  const parts = text.trim().split(/\s+/);
  return parts.length >= 4 && parts[0].split('/').length === 8;
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
  const parts = fen.split(' ');
  return {
    color: parts[1] === 'b' ? 'b' : 'w',
    fullMove: parseInt(parts[5] ?? '1', 10) || 1,
  };
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

export function buildQuizPgn(startFen: string, sans: string[]): string {
  const chess = new Chess(startFen);
  const moves: { san: string; color: 'w' | 'b' }[] = [];
  for (const san of sans) {
    try {
      const m = chess.move(san);
      moves.push({ san: m.san, color: m.color });
    } catch { break; }
  }
  if (moves.length === 0) return '';

  const fenTag =
    startFen !== START_FEN
      ? `[FEN "${startFen}"]\n[SetUp "1"]\n\n`
      : '';

  // Parse starting move number and active color from FEN
  const fenParts = startFen.split(' ');
  let moveNum = parseInt(fenParts[5] ?? '1', 10) || 1;
  const startColor = fenParts[1] ?? 'w'; // 'w' or 'b'

  let moveText = '';
  moves.forEach((move, i) => {
    if (move.color === 'w') {
      moveText += `${moveNum}. `;
    } else if (i === 0 && startColor === 'b') {
      // First move is black's — use ellipsis notation so pgn-reader
      // assigns turn='b' to the first move (sets correct playerColor).
      moveText += `${moveNum}... `;
    }
    moveText += move.san + ' ';
    if (move.color === 'b') moveNum++;
  });

  return `${fenTag}${moveText.trim()} *`;
}
