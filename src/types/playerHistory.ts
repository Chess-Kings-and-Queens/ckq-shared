// Student rating history rows — the backend `PlayerHistory` model shape, as returned by
// GET /rating-history/student/:studentId?source= (backend-2.0 playerHistory.routes.js),
// newest `periodStart` first.

export type PlayerHistorySource = "uscf" | "fide" | "lichess" | "chesscom";
export type PlayerHistoryMetric =
  | "rating_regular"
  | "rating_quick"
  | "rating_blitz"
  | "rating_online_regular"
  | "rating_online_quick"
  | "rating_online_blitz"
  | "rating_standard"
  | "rating_rapid"
  | "rating_bullet"
  | "rating_puzzle"
  | "games_played"
  | "puzzles_played";

export interface PlayerHistorySnapshot {
  _id: string;
  student: string;
  source: PlayerHistorySource;
  metric: PlayerHistoryMetric;
  value: number;
  isProvisional: boolean;
  provisionalGameCount: number | null;
  periodStart: string;
  periodEnd: string | null;
  recordedAt: string;
}
