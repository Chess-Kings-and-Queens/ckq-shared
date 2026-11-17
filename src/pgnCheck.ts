// The one PGN acceptance check and tag repair in the platform (docs/plans/pgn-check-single-source-plan.md).
// Reads through `parsePgnTree`/`parsePgnHeader`, writes tags through `withPgnTags`.

import { parsePgnHeader, splitPgnGames, withPgnTags } from './chessUtils';
import { mainLine, parsePgnTree } from './moveTree';

export const PGN_ISSUE_CODES = ['unreadable', 'no-moves', 'rating-in-name', 'missing-player', 'missing-result'] as const;
export type PgnIssueCode = typeof PGN_ISSUE_CODES[number];
export type PgnIssueSeverity = 'blocking' | 'fixable' | 'advisory';
export interface PgnIssue { code: PgnIssueCode; severity: PgnIssueSeverity; side?: 'white' | 'black'; }
export interface PgnCheck { usable: boolean; plies: number; issues: PgnIssue[]; }
export interface PgnRepair { code: 'rating-in-name'; side: 'white' | 'black'; before: string; name: string; elo: number; }
export const PGN_ISSUE_MESSAGES: Readonly<Record<'unreadable' | 'no-moves', string>> =
  { unreadable: 'PGN could not be read', 'no-moves': 'PGN has no moves' };

const RESULTS = ['1-0', '0-1', '1/2-1/2', '*'];
const SIDES = ['white', 'black'] as const;
const RATING_NAME = /^(\d{3,4})\s+(\S.*)$/;

/** The rating-in-name pattern alone: a leading 100-3000 number, whitespace, then a name. */
export function splitRatingFromName(value: string): { name: string; elo: number } | null {
  const m = RATING_NAME.exec(value.trim());
  if (!m) return null;
  const elo = Number(m[1]);
  if (elo < 100 || elo > 3000) return null;
  return { name: m[2], elo };
}

function ratingInName(value: string | undefined, elo: string | undefined): { name: string; elo: number } | null {
  if (value === undefined) return null;
  if (elo !== undefined && elo !== '' && elo !== '?' && elo !== '0') return null;
  return splitRatingFromName(value);
}

function sideTags(tags: Record<string, string>, side: 'white' | 'black'): { name: string | undefined; elo: string | undefined } {
  return side === 'white' ? { name: tags.White, elo: tags.WhiteElo } : { name: tags.Black, elo: tags.BlackElo };
}

/** Check one game: blocking issues make it unusable, the rest are tag quality. */
export function checkPgn(pgn: string): PgnCheck {
  const root = parsePgnTree(pgn);
  if (root === null) return { usable: false, plies: 0, issues: [{ code: 'unreadable', severity: 'blocking' }] };
  const issues: PgnIssue[] = [];
  const plies = mainLine(root).length;
  if (plies === 0) issues.push({ code: 'no-moves', severity: 'blocking' });
  const tags = parsePgnHeader(pgn);
  for (const side of SIDES) {
    const { name, elo } = sideTags(tags, side);
    if (ratingInName(name, elo)) issues.push({ code: 'rating-in-name', severity: 'fixable', side });
    else if (name === undefined || name.trim() === '' || name.trim() === '?') {
      issues.push({ code: 'missing-player', severity: 'advisory', side });
    }
  }
  if (tags.Result === undefined || !RESULTS.includes(tags.Result)) {
    issues.push({ code: 'missing-result', severity: 'advisory' });
  }
  return { usable: !issues.some((i) => i.severity === 'blocking'), plies, issues };
}

/** Check a text that may hold several games; blank text holds none. */
export function checkPgnText(raw: string): { games: number; checks: PgnCheck[] } {
  if (!raw.trim()) return { games: 0, checks: [] };
  const checks = splitPgnGames(raw).map(checkPgn);
  return { games: checks.length, checks };
}

/** The message of the first blocking issue, prefixed `Game N: ` (1-based) when `numbered`; null when none. */
export function firstBlockingMessage(checks: PgnCheck[], numbered: boolean): string | null {
  for (let i = 0; i < checks.length; i++) {
    const blocking = checks[i].issues.find((issue) => issue.severity === 'blocking');
    if (blocking && (blocking.code === 'unreadable' || blocking.code === 'no-moves')) {
      const message = PGN_ISSUE_MESSAGES[blocking.code];
      return numbered ? `Game ${i + 1}: ${message}` : message;
    }
  }
  return null;
}

/** Move a rating typed into a player name onto the Elo tag. Moves and comments are untouched; a no-op returns the same string. */
export function repairPgnTags(pgn: string): { pgn: string; repairs: PgnRepair[] } {
  const tags = parsePgnHeader(pgn);
  const collected: Record<string, string> = {};
  const repairs: PgnRepair[] = [];
  for (const side of SIDES) {
    const { name, elo } = sideTags(tags, side);
    const split = ratingInName(name, elo);
    if (!split || name === undefined) continue;
    const key = side === 'white' ? 'White' : 'Black';
    collected[key] = split.name;
    collected[`${key}Elo`] = String(split.elo);
    repairs.push({ code: 'rating-in-name', side, before: name, name: split.name, elo: split.elo });
  }
  if (repairs.length === 0) return { pgn, repairs };
  return { pgn: withPgnTags(pgn, collected), repairs };
}

/** Repair every game of a multi-game text; the input itself when no game needs a repair. */
export function repairPgnText(raw: string): { text: string; repairs: { game: number; repair: PgnRepair }[] } {
  if (!raw.trim()) return { text: raw, repairs: [] };
  const repairs: { game: number; repair: PgnRepair }[] = [];
  const games = splitPgnGames(raw).map((game, i) => {
    const fixed = repairPgnTags(game);
    for (const repair of fixed.repairs) repairs.push({ game: i + 1, repair });
    return fixed.pgn;
  });
  if (repairs.length === 0) return { text: raw, repairs };
  return { text: games.join('\n\n'), repairs };
}
