import type { OnlineTournamentFormat, OnlineTournamentStatus } from './types/onlineTournaments';
import type { PlayerOutcome, TiebreakKey, TournamentGameResult as GameResult } from './types/tournamentResults';

// ── Online tournament result labels ──────────────────────────────────────────
//
// Pure formatting of server values for the tournament results pages, shared by
// website2.0 and ckq-mobile (moved verbatim from the website's
// utils/onlineTournamentResultLabels.ts, mobile-student-app-design-plan rev 7).
// Nothing here derives a result, rank or points — every input comes from the
// backend; these only write it out. Date formatting stays in each client
// (browser-locale Intl).

export function formatPoints(points: number): string {
  const whole = Math.floor(points);
  const half = points - whole >= 0.5;
  if (whole === 0 && half) return '½';
  return half ? `${whole}½` : String(whole);
}

export function formatClockMs(ms: number | null): string {
  if (ms === null) return '—';
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatTimeControl(seconds: number, increment: number): string {
  return `${Math.round(seconds / 60)}+${increment}`;
}

export const formatLabel = (f: OnlineTournamentFormat): string => (f === 'league' ? 'League' : 'Tournament');

export const statusLabel = (s: OnlineTournamentStatus): string =>
  ({ scheduled: 'Scheduled', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' })[s];

export const tiebreakLabel = (k: TiebreakKey): string =>
  ({ points: 'Points', sb: 'Sonneborn-Berger', wins: 'Wins', name: 'Name' })[k];

export function resultReasonLabel(reason: string | null): string {
  const map: Record<string, string> = {
    checkmate: 'Checkmate',
    timeout: 'Time',
    resign: 'Resignation',
    forfeit: 'Forfeit',
    'draw-stalemate': 'Stalemate',
    'draw-repetition': 'Repetition',
    'draw-insufficient': 'Insufficient material',
    'draw-50move': '50-move rule',
    'draw-agreed': 'Draw agreed',
    aborted: 'Aborted',
  };
  return reason ? map[reason] ?? reason : '—';
}

export const resultPill = (r: GameResult): string =>
  r === '1-0' ? '1–0' : r === '0-1' ? '0–1' : r === '1/2-1/2' ? '½–½' : '—';

export function playerScore(r: GameResult, color: 'white' | 'black'): string {
  if (r === '1/2-1/2') return '½';
  if (r === '1-0') return color === 'white' ? '1' : '0';
  if (r === '0-1') return color === 'white' ? '0' : '1';
  return '—';
}

/** 'Ethan Patel won by resignation' / 'Draw agreed' / 'Game over' — same inputs as the watch page's resultText. */
export function resultSummary(r: GameResult, reason: string | null, white: string, black: string): string {
  if (r === '1/2-1/2') return reason ? resultReasonLabel(reason) : 'Draw';
  if (r === '1-0' || r === '0-1') {
    const winner = r === '1-0' ? white : black;
    return reason ? `${winner} won by ${resultReasonLabel(reason).toLowerCase()}` : `${winner} won`;
  }
  return 'Game over';
}

/** '4½/6' — points over games played (formatting only; both numbers come from the server). */
export function scoreLine(points: number, games: number): string {
  return `${formatPoints(points)}/${games}`;
}

export function outcomeLabel(outcome: PlayerOutcome): string {
  if (outcome === 'win') return 'Win';
  if (outcome === 'loss') return 'Loss';
  if (outcome === 'draw') return 'Draw';
  return '—';
}
