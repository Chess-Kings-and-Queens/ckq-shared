// ── Domain types ─────────────────────────────────────────────────────────────
//
// Moved verbatim from website2.0's src/app/services/studentGames.ts. Pure API contract
// shapes only (no axios/fetch functions — those stay web-specific).

export interface StudentGame {
  _id: string;
  student: string;
  white: string;
  black: string;
  whiteElo: number | null;
  blackElo: number | null;
  event: string;
  site: string;
  date: string;
  round: string;
  result: string;
  pgn: string;
  startFen: string | null;
  moveCount: number;
  title: string;
  notes: string;
  tags: string[];
  source: 'manual' | 'upload' | 'liveboard';
  createdAt: string;
  updatedAt: string;
}

/** Game returned in list view (no PGN field for performance). */
export type StudentGameListItem = Omit<StudentGame, 'pgn'>;

export interface ListGamesResult {
  games: StudentGameListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateGameInput {
  pgn: string;
  white?: string;
  black?: string;
  whiteElo?: number | null;
  blackElo?: number | null;
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  result?: string;
  title?: string;
  notes?: string;
  tags?: string[];
}

// ── Unified game timeline (shared-student-detail-architecture-plan Phase 1) ─────
// Merges library games, online-tournament games, and mission games behind one
// read endpoint. See backend/src/services/gameTimeline.service.js for the row
// shapes this type was validated against.

export interface GameTimelineRow {
  id: string;
  source: 'library' | 'online-tournament' | 'mission';
  playedAt: string | null;
  title: string;
  white: string | null;
  black: string | null;
  playerColor: 'white' | 'black' | null;
  opponent: { name: string; kind: 'engine' | 'human' } | null;
  outcome: 'win' | 'loss' | 'draw' | null;
  resultText: string;
  moveCount: number | null;
  event: string | null;
  practice: boolean | null;
  link: { type: 'library' | 'tournament-watch' | 'mission-watch'; ref: string } | null;
}

export interface GameTimelineResult {
  rows: GameTimelineRow[];
  total: number;
  page: number;
  limit: number;
}
