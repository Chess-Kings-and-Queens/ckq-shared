import { ChessGame } from './chessGame';
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

/**
 * Convert UCI moves to SAN starting from a given FEN. Returns the legal prefix:
 * conversion stops at the first illegal move; an invalid FEN yields [].
 */
export function uciToSan(fen: string, uciMoves: string[]): string[] {
  const game = ChessGame.fromFen(fen);
  if (!game) return [];
  const sans: string[] = [];
  for (const uci of uciMoves) {
    const result = game.play({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length === 5 ? uci[4] : undefined,
    });
    if (!result.ok) break;
    sans.push(result.move.san);
  }
  return sans;
}

/** A UCI `info` line as parsed from the raw text. */
export interface RawInfoLine { depth: number; multipv: number; scoreCp: number | null; mateIn: number | null; uciMoves: string[]; nodes: number | null; nps: number | null; time: number | null }

/** A UCI `info` line as the engine reports it: score from the side to move, no SAN. null unless it carries depth, score and pv. */
export function parseUciInfoRaw(line: string): RawInfoLine | null {
  if (!line.startsWith('info ')) return null;
  const depth = extractInt(line, 'depth');
  const multipv = extractInt(line, 'multipv') ?? 1;
  const scoreMatch = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
  if (!scoreMatch) return null;
  const scoreValue = parseInt(scoreMatch[2], 10);
  const pvIndex = line.indexOf(' pv ');
  if (pvIndex === -1) return null;
  const uciMoves = line.slice(pvIndex + 4).trim().split(/\s+/).filter(Boolean);
  if (!depth || uciMoves.length === 0) return null;
  return { depth, multipv, scoreCp: scoreMatch[1] === 'cp' ? scoreValue : null, mateIn: scoreMatch[1] === 'mate' ? scoreValue : null, uciMoves, nodes: extractInt(line, 'nodes'), nps: extractInt(line, 'nps'), time: extractInt(line, 'time') };
}

/** The move a `bestmove` line names, or null for `(none)`/malformed. */
export function parseBestmove(line: string): string | null {
  if (!line.startsWith('bestmove')) return null;
  const uci = line.split(/\s+/)[1];
  return !uci || uci === '(none)' ? null : uci;
}

/** Format a Stockfish `info` line into a structured EngineLine. Returns null for non-`info` or unparsable lines. */
export function parseInfoLine(
  line: string,
  fen: string,
): { rank: number; data: Omit<EngineLine, 'rank'> } | null {
  const raw = parseUciInfoRaw(line);
  if (!raw) return null;

  const sanMoves = uciToSan(fen, raw.uciMoves);
  const { color: startColor, fullMove: startFullMove } = fenMoveContext(fen);

  // Stockfish reports score from the side-to-move perspective.
  // Normalize to White's POV: positive = White better, negative = Black better.
  const whitePov = startColor === 'b' ? -1 : 1;

  return {
    rank: raw.multipv,
    data: {
      scoreCp:  raw.scoreCp !== null ? raw.scoreCp * whitePov : null,
      mateIn:   raw.mateIn !== null ? raw.mateIn * whitePov : null,
      uciMoves: raw.uciMoves,
      sanMoves,
      depth: raw.depth,
      startColor,
      startFullMove,
    },
  };
}
