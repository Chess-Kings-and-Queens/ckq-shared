// ── Trail to the Summit contract types ───────────────────────────────────────
//
// Moved verbatim from website2.0: src/app/services/trail.ts (2026-10-27). Pure
// API contract shapes only — no fetch functions. Backend source of truth:
// trailPoints.service.js `buildTrailView` / summary, trailActivity.service.js.
// Every number here is computed by the backend (ADR frontend-005); clients only
// render it.

export interface TrailSeason {
  season: string;
  year: number;
  label: string;
  startDate: string;
  endDate: string;
  daysLeft: number;
}

export interface TrailCheckpoint {
  key: string;
  name: string;
  fraction: number;
  points: number;
}

/** academy.trail settings as the backend scores them, plus categoryMax (the ceiling in points). */
export interface TrailRules {
  summitPoints: number;
  attendancePerClass: number;
  homeworkPerPositionMax: number;
  missionSolved: number;
  otbTournament: number;
  otbTournamentsPerMonthMax: number;
  otbRatingGainBonus: number;
  onlineTournamentPlayed: number;
  onlineTournamentsPerMonthMax: number;
  onlineTournamentWinBonus: number;
  onlineWinMinPlayers: number;
  workbookPerPositionMax: number;
  quizPointsPerSessionMax: number;
  homeworkPerMonthMax: number;
  categoryMaxPct: number;
  categoryMax: number;
}

export interface TrailConfig {
  summit: number;
  checkpoints: TrailCheckpoint[];
  rules: TrailRules;
}

export type TrailScope = 'location' | 'academy';

export interface TrailCohort {
  levelId: string;
  levelName: string;
  scope: TrailScope;
  hasLocation: boolean;
  locationKey: string;
  locationName: string;
  count: number;
}

export interface TrailClimber {
  studentId: string;
  name: string;
  total: number;
  rank: number;
  isMe: boolean;
  /** The requester may open this student's points activity (GET /trail/activity/:id). The staff Trail makes the name a button. */
  canOpenActivity: boolean;
}

export type TrailCategoryKey =
  | 'attendance'
  | 'classQuiz'
  | 'homework'
  | 'missions'
  | 'otbTournaments'
  | 'onlineTournaments'
  | 'workbook';

export type TrailCategoryExtra = { played: number; won: number } | { ratingGains: number };

export interface TrailCategoryPoints {
  key: TrailCategoryKey;
  points: number;
  count: number;
  /** Online: tournaments played and won; OTB: counted events with a rating gain; other categories null. */
  extra: TrailCategoryExtra | null;
  capped: boolean;
}

export interface TrailMe {
  studentId: string;
  name: string;
  firstName: string;
  rank: number;
  total: number;
  checkpoint: {
    current: string;
    next: string | null;
    nextAt: number | null;
    toNext: number | null;
  };
  progressPct: number;
  categories: TrailCategoryPoints[];
}

export interface TrailStretch {
  key: string;
  label: string;
  from: number;
  to: number | null;
  count: number;
  isMine: boolean;
}

export interface TrailCategory {
  key: TrailCategoryKey;
  label: string;
  icon: string;
  leaders: { studentId: string; name: string; points: number; isMe: boolean; canOpenActivity: boolean }[];
  me: { rank: number; points: number; capped: boolean } | null;
}

export interface TrailView {
  season: TrailSeason;
  cohort: TrailCohort | null;
  config: TrailConfig;
  me: TrailMe | null;
  climbers: TrailClimber[];
  stretches: TrailStretch[];
  categories: TrailCategory[];
  computedAt: string | null;
}

export interface TrailSummary {
  season: TrailSeason;
  cohort: TrailCohort | null;
  config: TrailConfig;
  me: TrailMe | null;
  neighbours: TrailClimber[];
}

export interface CoachTrailCohort {
  levelId: string;
  levelName: string;
  locationKey: string;
  locationName: string;
}

/** One line item behind a student's Trail points (backend trailActivity.service.js). */
export interface TrailActivityItem {
  category: TrailCategoryKey;
  id: string;
  title: string;
  detail: string;
  /** Points before the monthly limits and the category ceiling. */
  earned: number;
  /** Points that counted. */
  points: number;
  /** YYYY-MM-DD, Eastern. */
  date: string;
  capped: boolean;
}

export interface TrailActivity {
  season: TrailSeason;
  categories: TrailCategoryPoints[];
  items: TrailActivityItem[];
}
