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
