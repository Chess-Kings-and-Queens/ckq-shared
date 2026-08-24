// ── Domain types ─────────────────────────────────────────────────────────────
//
// Extracted from website2.0's src/app/services/homework/index.ts. Pure API
// contract shapes only — validated against backend/src/services/homework.service.js
// (getReport, getPuzzleContent, getLessonContent) and
// backend/src/services/homeworkResult.service.js (createResult, submitMove,
// pauseTimer) + backend/src/services/behavior.service.js (getStrikeStatus).
// Fields that the backend always sets but that no current frontend consumer
// reads are still modeled optional here (rather than widened with `any`) to
// keep this a living, low-friction contract — see the
// `HomeworkReport.homework.status` doc comment below for the one confirmed gap.

interface HomeworkPositionReport {
  score?: number;
  /** Legacy generateHomeworkReport() uses 'not attempted' (space); the newer
   *  buildPositionReport() uses 'not_attempted' (underscore) — both are real,
   *  pre-existing backend strings (homeworkUtils.js line 136 vs homework.service.js
   *  line 77). The frontend never distinguishes them (HomeworkReportView.tsx only
   *  checks for 'correct' | 'incorrect'), so both are modeled here rather than
   *  "fixed" — that's backend runtime code, out of scope for this pass. */
  timeSpent?: number | null;
  answer?: string[] | string;
  status: "correct" | "incorrect" | "not_attempted" | "not attempted";
}

interface HomeworkReportMaterialCollectionRef {
  _id?: string;
  title?: string;
  /**
   * MISMATCH (flagged, not fixed): getReport() in homework.service.js populates
   * materialCollection with `.populate('materialCollection', 'title')` — ONLY
   * `title` is ever selected. `maxAttempts` is never present on this object in a
   * real API response, even though the student homework-report page reads
   * `report.homework.materialCollection.maxAttempts ?? 3` (HomeworkDetailPage
   * page.tsx `onReportLoad`) — meaning that read always falls through to the `3`
   * default in production regardless of the collection's real maxAttempts.
   * Modeled optional so it type-checks either way; not fixed here (test-typing
   * only, no runtime changes).
   */
  maxAttempts?: number;
}

export interface HomeworkReport {
  homework: {
    _id?: string;
    noOfGames: number;
    maxScore?: number;
    timeLimit?: number;
    createdAt?: string;
    materialCollection?: HomeworkReportMaterialCollectionRef | null;
    /**
     * The material result's status, copied onto the report by getReport()'s
     * materialCollection branch (backend fix 2026-07-09 — previously never sent,
     * which left the report page's "Completed" button state permanently inactive).
     * "not_started" when no HomeworkResult exists yet (backend synthesizes this
     * default directly — see homework.service.js's getReport). Enum mirrors
     * homeworkResult.model.js.
     */
    status?: "not_started" | "in_progress" | "completed";
  };
  score?: number;
  maxScore?: number;
  /** Only present on the materialCollection+HomeworkResult branch (`matResult.score`). */
  scorePct?: number;
  timeSpent?: number;
  maxTime?: number;
  lesson?: string | null;
  student?: string;
  positions: Record<string, HomeworkPositionReport>;
}

/** getProgress() aggregation projection in homework.service.js. */
export interface HomeworkProgressEntry {
  _id: string;
  title?: string | null;
  noOfAnswers: number;
  noOfGames: number;
  totalScore: number;
  maxScore: number;
  scorePct: number;
  score?: number;
  coachName?: string;
  completionPercentage: number;
  createdAt: string;
  /** Only overlaid for materialCollection-linked homework — see getProgress()'s
   *  HomeworkResult overlay loop in homework.service.js. */
  status?: "not_started" | "in_progress" | "completed";
}

/** behaviorService.getStrikeStatus() in backend/src/services/behavior.service.js. */
export interface HomeworkStrikeStatus {
  activeViolations: number;
  rushViolationsToBlock: number;
  minThinkTimePct: number;
  isBlocked: boolean;
}

/** getPuzzleContent() in homework.service.js spreads getStrikeStatus() onto the
 *  games/totalPositions/timeLimit/maxAttempts payload (`...strikeStatus`). */
export interface HomeworkPuzzlePayload extends HomeworkStrikeStatus {
  title?: string;
  games: string[];
  totalPositions: number;
  timeLimit?: number;
  maxAttempts?: number;
  materialCollectionId?: string;
  groupClassSessionId?: string | null;
  homeworkMaterialId?: string;
}

/** getLessonContent() in homework.service.js. */
export interface LessonContent {
  title?: string;
  pgnContent: string;
  videoUrl?: string;
}

interface HomeworkMaterialResultAnswerAttempt {
  attemptNumber: number;
  moves: string[];
  isCorrect: boolean;
  score: number;
  timeTaken: number;
}

interface HomeworkMaterialResultAnswer {
  positionIndex: number;
  attempts: HomeworkMaterialResultAnswerAttempt[];
  bestScore: number;
  isCorrect: boolean;
  isCompleted: boolean;
}

/** materialResults[] subdocument on HomeworkResult — homeworkResult.model.js. */
interface HomeworkMaterialResult {
  material?: string;
  totalPositions?: number;
  totalPositionsCompleted?: number;
  status?: "not_started" | "in_progress" | "completed";
  answers?: HomeworkMaterialResultAnswer[];
  timeSpentSeconds?: number;
  correctCount?: number;
  score?: number | null;
  totalTimeTaken?: number;
  startedAt?: string | null;
  completedAt?: string | null;
  currentPuzzleStartedAt?: string | null;
}

/** The raw HomeworkResult document — createResult/submitMove/pauseTimer in
 *  homeworkResult.service.js all return this directly (never wrapped in
 *  {status, data}); see homeworkResult.controller.js. */
export interface HomeworkResultRecord {
  _id: string;
  student?: string;
  materialCollection?: string;
  groupClassSession?: string | null;
  status?: "not_started" | "in_progress" | "completed";
  materialResults: HomeworkMaterialResult[];
  createdAt?: string;
  updatedAt?: string;
}

interface HomeworkRushViolation {
  isViolation: boolean;
  isBlocked: boolean;
  violationCount: number;
}

/**
 * submitMove()'s controller response is always `{ result, rushViolation }`
 * (homeworkResult.controller.js `submitMove`) — `result` is never actually
 * omitted in a real response. `status`/`result` are modeled optional here
 * because pre-existing test fixtures only ever set the field(s) they assert on
 * (e.g. `{ rushViolation }` alone, or the unrelated `{ status: "success" }`
 * sentinel some fixtures use as inert filler) — flagged, not corrected, since
 * nothing in the page under test reads `.result` or `.status` off this call.
 */
export interface SubmitHomeworkMoveResult {
  result?: HomeworkResultRecord;
  rushViolation?: HomeworkRushViolation | null;
  status?: string;
}

export interface CreateHomeworkResultInput {
  materialCollectionId: string;
  groupClassSessionId?: string | null;
  materials: Array<{ materialId: string; totalPositions: number }>;
}

export interface SubmitHomeworkMoveInput {
  materialId: string;
  positionIndex: number;
  moves: string[];
  isCorrect: boolean;
  score: number;
  timeTaken?: number;
}

export interface PauseHomeworkTimerInput {
  materialId: string;
  additionalSeconds: number;
}

// Authoritative homework status vocabulary — mirrors the HomeworkResult enum
// (backend/src/models/homeworkResult.model.js). Every /homework/progress row
// carries one; the backend derives it, the frontend renders it verbatim
// (Hard Rule #8 — never re-derive from counters).
export type HomeworkStatus = "not_started" | "in_progress" | "completed";

// Row shape of GET /homework/progress — the getProgress aggregation $project
// plus the HomeworkResult overlay (backend/src/services/homework.service.js).
export interface HomeworkRow {
  _id: string;
  title: string;
  lessonTitle?: string;
  materialCollectionTitle?: string;
  coachName: string;
  groupClassName?: string;
  totalScore: number;
  maxScore: number;
  noOfGames: number;
  noOfAnswers: number;
  completionPercentage: number;
  scorePct?: number;
  timeSpent?: number;
  status: HomeworkStatus;
  createdAt: string;
}

export interface ProgressReportResponse {
  status: string;
  data: HomeworkRow[];
}
