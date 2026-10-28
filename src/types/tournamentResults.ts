// ── Domain types ─────────────────────────────────────────────────────────────
//
// Moved verbatim from website2.0's src/app/services/tournamentResults.ts. Pure
// API contract shapes only (no axios/fetch functions — those stay web-specific).
// The shared online-tournament results API (`GET /online-tournament/results[...]`),
// scoped by the caller's role on the backend.

import type {
  OnlineTournamentFormat,
  OnlineTournamentLevelRef,
  OnlineTournamentStatus,
} from './onlineTournaments';

// Moved from website2.0 src/app/utils/onlineTournamentResultLabels.ts.
export type TiebreakKey = "points" | "sb" | "wins" | "name";
export type PlayerOutcome = "win" | "loss" | "draw" | null;
/** A finished game's PGN result. Named `TournamentGameResult` because `GameResult` is already the
 * package's game-end type (gameOutcome.ts); website2.0 re-exports it under its old name. */
export type TournamentGameResult = "1-0" | "0-1" | "1/2-1/2" | null;

export type PlayerKind = "student" | "guest" | "engine";
export type JoinState = "upcoming" | "open" | "in_round" | "between_rounds" | "done";
export type RoundStatus = "played" | "in_progress" | "upcoming";
export type ResultsListStatus = "in_progress" | "completed";

export interface PlayerRef {
  id: string;
  name: string;
  kind: PlayerKind;
  userId: string | null;
  canViewProfile: boolean;
}

export interface StandingsRow {
  rank: number;
  playerId: string;
  name: string;
  kind: PlayerKind;
  userId: string | null;
  canViewProfile: boolean;
  points: number;
  sb: number;
  wins: number;
  games: number;
  joinedAtRound: number;
  byeRounds: number;
  tiebreakOver: Exclude<TiebreakKey, "points"> | null;
  /** Present only for a scoped viewer (a student, a parent's child, a staff `studentId`). */
  isMe?: boolean;
}

export interface ResultsLeader {
  playerId: string;
  name: string;
  points: number;
  decidedBy: TiebreakKey;
}

export interface MyStanding {
  rank: number;
  points: number;
  sb: number;
  wins: number;
  games: number;
}

export interface ResultsListRow {
  _id: string;
  name: string;
  format: OnlineTournamentFormat;
  status: ResultsListStatus;
  levels: OnlineTournamentLevelRef[];
  rounds: number;
  roundsPlayed: number;
  startAt: string;
  endedAt: string | null;
  currentRound: number | null;
  nextRoundAt: string | null;
  joinState: JoinState;
  playerCount: number;
  gameCount: number;
  leader: ResultsLeader | null;
  myStanding: MyStanding | null;
}

export interface ResultsList {
  tournaments: ResultsListRow[];
  totalPages: number;
  currentPage: number;
  total: number;
}

export interface ResultsListParams {
  page?: number;
  limit?: number;
  status?: ResultsListStatus | "";
  format?: OnlineTournamentFormat | "";
  q?: string;
  studentId?: string;
}

export interface ResultsScope {
  studentId?: string;
}

export interface RoundSummary {
  round: number;
  scheduledAt: string | null;
  status: RoundStatus;
  gameCount: number;
}

export interface ResultsHeader {
  status: "active" | "completed" | "aborted";
  roundsPlayed: number;
  startedAt: string | null;
  endedAt: string | null;
}

export interface ResultsDetail {
  _id: string;
  name: string;
  format: OnlineTournamentFormat;
  status: OnlineTournamentStatus;
  levels: OnlineTournamentLevelRef[];
  timeControlSeconds: number;
  incrementSeconds: number;
  pairingSystem: string;
  startAt: string;
  roundStartTimes: string[] | null;
  currentRound: number | null;
  nextRoundAt: string | null;
  joinState: JoinState;
  header: ResultsHeader | null;
  counts: { players: number; games: number };
  tiebreakOrder: TiebreakKey[];
  leader: ResultsLeader | null;
  standings: StandingsRow[];
  /**
   * One entry per configured round. The backend's detail payload builds `rounds`
   * twice (the number, then this list) and the list wins, so the configured round
   * count is `rounds.length`.
   */
  rounds: RoundSummary[];
  viewer: { scopeId: string | null; shortNames: boolean };
}

export interface RoundGame {
  _id: string;
  white: PlayerRef;
  black: PlayerRef;
  pgn: string;
  result: TournamentGameResult;
  resultReason: string | null;
  startFen: string | null;
  viewToken: string | null;
}

export interface RoundPairings {
  round: number;
  scheduledAt: string | null;
  status: RoundStatus;
  roundsPlayed: number;
  games: RoundGame[];
}

export interface ResultsGame {
  _id: string;
  round: number;
  tournament: { _id: string; name: string; timeControlSeconds: number; incrementSeconds: number };
  white: PlayerRef;
  black: PlayerRef;
  result: TournamentGameResult;
  resultReason: string | null;
  pgn: string;
  startFen: string | null;
  moveCount: number;
  clocksFinal: { whiteMs: number | null; blackMs: number | null };
  startedAt: string | null;
  endedAt: string | null;
  viewToken: string | null;
}

export interface PlayerGame {
  _id: string;
  round: number;
  color: "white" | "black";
  opponent: PlayerRef | null;
  result: TournamentGameResult;
  outcome: PlayerOutcome;
  resultReason: string | null;
  moveCount: number;
  viewToken: string | null;
  endedAt: string | null;
}

export interface PlayerResults {
  tournament: {
    _id: string;
    name: string;
    format: OnlineTournamentFormat;
    status: OnlineTournamentStatus;
    rounds: number;
  };
  player: PlayerRef;
  standing: StandingsRow | null;
  games: PlayerGame[];
}

/**
 * GET /liveboard-tournament/view/:token — a finished tournament game by its watch token (public).
 * Names are as stored (full names); the results routes shorten names for students and parents.
 */
export interface TournamentGameByViewToken {
  round: number;
  white: { id: string; name: string };
  black: { id: string; name: string };
  pgn: string;
  moveCount: number;
  result: TournamentGameResult;
  resultReason: string | null;
  clocksFinal: { whiteMs: number | null; blackMs: number | null };
  startFen: string | null;
  startedAt: string;
  endedAt: string;
}
