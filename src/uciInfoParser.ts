import { Chess } from 'chess.js';
import { fenMoveContext } from './chessUtils';

// ── UCI `info` line parsing ────────────────────────────────────────────────────
//
// Ported verbatim from website2.0's useStockfishEngine.ts, where these helpers
// existed but were not exported. The rest of that hook (Worker lifecycle,
// React state, MultiPV bookkeeping) stays web-specific.

export interface EngineLine {
  rank: number;
  /** Centipawns from White's perspective. null when mateIn is set. */
  scoreCp: number | null;
  /** Mate in N. Positive = White mates, Negative = Black mates. null when scoreCp is set. */
  mateIn: number | null;
  /** UCI moves e.g. ["e2e4", "e7e5"] */
  uciMoves: string[];
  /** SAN moves e.g. ["e4", "e5"] — converted from uciMoves using the position FEN */
  sanMoves: string[];
  depth: number;
  /** Active color at the start of the line — used for move number formatting. */
  startColor: 'w' | 'b';
  /** Full-move number at the start of the line — used for move number formatting. */
  startFullMove: number;
}

/** Extract an integer following `keyword` in a UCI line, e.g. extractInt('info depth 12 ...', 'depth') === 12. */
export function extractInt(line: string, keyword: string): number | null {
  const re = new RegExp(`\\b${keyword}\\s+(-?\\d+)`);
  const m  = line.match(re);
  return m ? parseInt(m[1], 10) : null;
}

/** Convert UCI moves to SAN starting from a given FEN. */
export function uciToSan(fen: string, uciMoves: string[]): string[] {
  try {
    const chess = new Chess(fen);
    const sans: string[] = [];
    for (const uci of uciMoves) {
      const from      = uci.slice(0, 2);
      const to        = uci.slice(2, 4);
      const promotion = uci.length === 5 ? uci[4] : undefined;
      const result    = chess.move({ from, to, promotion });
      if (!result) break;
      sans.push(result.san);
    }
    return sans;
  } catch {
    return [];
  }
}

/** Format a Stockfish `info` line into a structured EngineLine. Returns null for non-`info` or unparsable lines. */
export function parseInfoLine(
  line: string,
  fen: string,
): { rank: number; data: Omit<EngineLine, 'rank'> } | null {
  if (!line.startsWith('info ')) return null;

  const depth   = extractInt(line, 'depth');
  const multipv = extractInt(line, 'multipv') ?? 1;

  const scoreMatch = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
  if (!scoreMatch) return null;

  const scoreType  = scoreMatch[1] as 'cp' | 'mate';
  const scoreValue = parseInt(scoreMatch[2], 10);

  const pvIndex = line.indexOf(' pv ');
  if (pvIndex === -1) return null;

  const uciMoves = line.slice(pvIndex + 4).trim().split(/\s+/).filter(Boolean);
  if (!depth || uciMoves.length === 0) return null;

  const sanMoves = uciToSan(fen, uciMoves);
  const { color: startColor, fullMove: startFullMove } = fenMoveContext(fen);

  // Stockfish reports score from the side-to-move perspective.
  // Normalize to White's POV: positive = White better, negative = Black better.
  const whitePov = startColor === 'b' ? -1 : 1;

  return {
    rank: multipv,
    data: {
      scoreCp:  scoreType === 'cp'   ? scoreValue * whitePov : null,
      mateIn:   scoreType === 'mate' ? scoreValue * whitePov : null,
      uciMoves,
      sanMoves,
      depth,
      startColor,
      startFullMove,
    },
  };
}
