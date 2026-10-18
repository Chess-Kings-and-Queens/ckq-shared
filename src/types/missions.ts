import type { LagQuota } from '../lagComp';

export type { LagQuota };

// ── Domain types ─────────────────────────────────────────────────────────────
//
// Extracted from website2.0's src/app/services/missions.ts. Pure API contract
// shapes only (no axios/fetch functions — those stay web-specific).

interface SuccessCriteria {
  type: 'game_result' | 'move_count' | 'eval_threshold';
  maxMoves: number | null;
  evalThreshold: number | null;
}

export interface TrainingConfig {
  fen: string;
  objective: 'win' | 'draw';
  timeControlSeconds: number;
  incrementSeconds: number;
  maxAttempts: number | null;
  autoAssign: boolean;
  orientation: 'white' | 'black';
  stockfishLevel: number;
  /** Curriculum bucket (Level Up Score / missions filter). null on missions created before the backfill. */
  category?: 'endgame' | 'conversion' | null;
  successCriteria: SuccessCriteria;
}

export interface AttemptStats {
  total: number;
  succeeded: number;
  inProgressAttemptId: string | null;
  // 'in_progress' is real: latestStatus is the most recently started attempt's
  // status (attemptNumber desc, no status filter), so a fresh retry after a
  // prior success reports 'in_progress' here even though total/succeeded stay
  // frozen at the prior success (backend missionAttempt.service.js line ~210).
  latestStatus: 'succeeded' | 'failed' | 'in_progress' | null;
}

// Backend-authoritative aggregate status (missionAttempt.service.js getStudentMissions).
// 'succeeded' is sticky — it wins even if a fresh retry attempt is currently in_progress.
// 'failed' means at least one completed attempt has not succeeded but the mission
// is still retriable (maxAttempts unset or not yet reached) — distinct from
// 'not_started' (never attempted) and 'attempts_exhausted' (no retries left).
type MissionStatus = 'not_started' | 'in_progress' | 'succeeded' | 'failed' | 'attempts_exhausted';

export interface Mission {
  _id: string;
  title: string;
  description: string;
  levelId: { _id: string; name: string } | string;
  trainingConfig: TrainingConfig;
  isActive: boolean;
  isCurrentLevel: boolean;
  status: MissionStatus;
  isDailyMission: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MissionWithStats = Mission & { attemptStats: AttemptStats };

export interface MissionAttempt {
  _id: string;
  material: string;
  student: string;
  attemptNumber: number;
  status: 'succeeded' | 'failed' | null;
  practice: boolean;
  pgn: string;
  currentFen: string;
  timeRemainingSeconds: number | null;
  moveCount: number;
  startedAt: string;
  completedAt: string | null;
  viewToken: string;
  createdAt: string;
  updatedAt: string;
}

// ── Server-owned game contract (append-validated missions) ───────────────────
//
// Every move (the student's and the engine's) is appended to the server in
// order; the server validates it against its own board, holds the move list and
// decides the result. See docs/plans/server-owned-play-plan.md D2/D3/D6/D15.

/** Whose move it is, or who made a move: the student or the engine. */
export type MissionTurn = 'player' | 'engine';

/** One accepted move as stored by the server. `at` is the server's ISO timestamp. */
export interface MissionMove {
  ply: number;
  san: string;
  uci: string;
  by: MissionTurn;
  at: string;
  /** Network lag the server measured for this move, ms (clock-lag-compensation plan D8). */
  lagMs?: number;
  /** Lag forgiven for this move, ms. */
  compMs?: number;
  /** The think time the client claimed for this move, ms. */
  clientMoveTimeMs?: number;
}

/** Body of POST /training-positions/attempts/:attemptId/moves. */
export interface MissionMoveInput {
  ply: number;
  san: string;
  by: MissionTurn;
  /** Milliseconds the client's own clock ran for this move; absent = no forgiveness. */
  clientMoveTimeMs?: number;
}

/** Body of POST /training-positions/attempts/:attemptId/end. Resign is the only client-initiated end. */
export interface MissionEndInput {
  reason: 'resign';
}

export type MissionResultReason =
  | 'checkmate'
  | 'stalemate'
  | 'threefold'
  | 'insufficient'
  | 'fifty-move'
  | 'timeout'
  | 'forfeit'
  | 'resign';

/** The server-decided result, from the student's point of view. */
export interface MissionResult {
  outcome: 'win' | 'loss' | 'draw';
  reason: MissionResultReason;
}

/** Server-held clock. Durations are milliseconds; timestamps are ISO strings. */
export interface MissionClock {
  playerMs: number;
  engineMs: number;
  incrementMs: number;
  /** When the side to move started its turn; null when no turn is running (game over). */
  turnStartedAt: string | null;
  serverNow: string;
  /** Lag quotas per side; for the debug overlay only, the display ignores it. */
  lag?: { player: LagQuota; engine: LagQuota };
}

export interface MissionGameState {
  attemptId: string;
  status: 'in_progress' | 'succeeded' | 'failed';
  startFen: string;
  fen: string;
  moves: MissionMove[];
  turn: MissionTurn;
  playerColor: 'white' | 'black';
  clock: MissionClock;
  result: MissionResult | null;
}

export interface ListMissionsResult {
  missions: Mission[];
  total: number;
  page: number;
  limit: number;
}

export interface ViewTokenResponse {
  watchToken?: string;
  attempt?: {
    attemptId: string;
    viewToken: string;
    status: string;
    currentFen: string;
    pgn: string;
    moveCount: number;
    missionTitle: string;
    studentName: string;
  };
  isPlayer?: boolean;
  snapshot?: boolean;
  missionTitle?: string;
  status?: string;
  currentFen?: string;
  pgn?: string;
  moveCount?: number;
}

// ── Practice games (My Games → Practice Games tab) ─────────────────────────────

export interface PracticeGameRow {
  attemptId: string;
  completedAt: string;
  title: string;
  source: 'mission' | 'liveboard';
  practice: boolean;
  playerColor: 'white' | 'black' | null;
  objective: 'win' | 'draw' | null;
  status: 'succeeded' | 'failed';
  moveCount: number;
  viewToken: string;
}
