// ── Domain types ─────────────────────────────────────────────────────────────
//
// Moved verbatim from website2.0's src/app/services/uscfTournaments.ts. Pure API contract
// shapes only (no axios/fetch functions — those stay web-specific).

export interface TournamentRecord {
  id: string;
  name: string;
  section: string;
  startDate: string | null;
  endDate: string | null;
  ratingBefore: number | null;
  ratingAfter: number | null;
}

type MonthlyState = 'under' | 'met' | 'above' | 'zero' | 'no-uscf';
export type MonthlyTone = 'success' | 'warn' | 'neutral';

export interface MonthlyTournamentStats {
  month: string;
  monthLabel: string;
  goalMin: number;
  count: number;
  daysLeftInMonth: number;
  hasUscfId: boolean;
  history: { month: string; count: number }[];
  played: TournamentRecord[];
  // Backend-authoritative (Hard Rule #8) — tournamentHistory.service.js
  // getMonthlyTournamentStats. Never re-derive these from the raw counts above.
  state: MonthlyState;
  tone: MonthlyTone;
}
