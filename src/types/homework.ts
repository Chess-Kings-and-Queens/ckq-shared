// ── Homework API contract ────────────────────────────────────────────────────
//
// Validated field by field against backend-2.0 on 2026-10-23
// (docs/plans/homework-types-and-pathways-plan.md §5.2): homework.service.js
// getReport / getPuzzleContent / getLessonContent / getProgress,
// homeworkResult.service.js createResult / submitMove / openPosition / pauseTimer,
// behavior.service.js getStrikeStatus.
//
// The rule: a field is modelled only when the backend sends it AND website2.0 or
// ckq-mobile reads it. A field sent on every response is required. A field sent on
// some responses only is optional and its comment names the branch. Fields the
// backend sends that no consumer reads are not modelled; adding one needs a reader.

export type HomeworkStatus = "not_started" | "in_progress" | "completed";

export type HomeworkPositionStatus = "correct" | "incorrect" | "not_attempted";

/** One entry of GET /homework/report `positions`, keyed "0".."noOfGames-1" (homeworkUtils.js buildPositionReport). */
export interface HomeworkPositionReport {
  /** Best attempt's points for this position; 0 when not attempted. */
  score: number;
  /** Best attempt's score as 0-100 (the stored bestScore); 0 when not attempted. Drives the report's per-position colour. */
  scorePct: number;
  /** Sum of the attempts' server-measured seconds; null when not attempted. */
  timeSpent: number | null;
  status: HomeworkPositionStatus;
}

/** GET /homework/report (homework.service.js getReport). Both branches send every field. */
export interface HomeworkReport {
  homework: {
    noOfGames: number;
    /** Seconds per position (Homework.timeLimit, required with a default). */
    timeLimit: number;
    createdAt: string;
    /** Populated `title maxAttempts`; null for a legacy homework with no collection. */
    materialCollection: { title: string; maxAttempts: number } | null;
    /** The material result's status, or "not_started" when no HomeworkResult exists. */
    status: HomeworkStatus;
  };
  score: number;
  maxScore: number;
  scorePct: number;
  timeSpent: number;
  /** The collection title; null for a legacy homework with no collection. */
  lesson: string | null;
  /** The homework's student id (both getReport branches send it). Read by website2.0's admin homework page to send Back to the student's profile. */
  student: string;
  /** Never empty: one entry per position (Homework.noOfGames is at least 1). */
  positions: Record<string, HomeworkPositionReport>;
}

/** behavior.service.js getStrikeStatus. */
export interface HomeworkStrikeStatus {
  activeViolations: number;
  rushViolationsToBlock: number;
  minThinkTimePct: number;
  isBlocked: boolean;
}

/** GET /homework/:id/puzzle (homework.service.js getPuzzleContent); one success branch. */
export interface HomeworkPuzzlePayload extends HomeworkStrikeStatus {
  title: string;
  games: string[];
  totalPositions: number;
  timeLimit: number;
  maxAttempts: number;
  materialCollectionId: string;
  groupClassSessionId: string | null;
  homeworkMaterialId: string;
}

/** GET /homework/:id/lesson (homework.service.js getLessonContent). pgnContent and videoUrl may be "" for a video-only or PGN-only lesson. */
export interface LessonContent {
  title: string;
  pgnContent: string;
  videoUrl: string;
}

export interface HomeworkAnswerAttempt {
  /** Server-measured seconds, capped at the limit. */
  timeTaken: number;
}

export interface HomeworkPositionAnswer {
  positionIndex: number;
  attempts: HomeworkAnswerAttempt[];
  /** Best attempt's score as 0-100. */
  bestScore: number;
  isCorrect: boolean;
  isCompleted: boolean;
}

export interface HomeworkMaterialResult {
  totalPositionsCompleted: number;
  answers: HomeworkPositionAnswer[];
}

/** The raw HomeworkResult document: POST /homework-result (201), the `result` of PUT …/move, and PUT …/pause-timer all return it unwrapped (homeworkResult.controller.js). */
export interface HomeworkResultRecord {
  _id: string;
  materialResults: HomeworkMaterialResult[];
}

/** behavior.service.js handleRushDetection; present only when a strike was recorded, so isViolation is always true when the object exists. */
export interface HomeworkRushViolation {
  isViolation: boolean;
  isBlocked: boolean;
  violationCount: number;
}

/** PUT /homework-result/:id/move success body (homeworkResult.controller.js submitMove). */
export interface SubmitHomeworkMoveResult {
  result: HomeworkResultRecord;
  rushViolation: HomeworkRushViolation | null;
}

/** Body of POST /homework-result (validation/homeworkResultSchemas.js createResultSchema: null is a 400). */
export interface CreateHomeworkResultInput {
  materialCollectionId: string;
  groupClassSessionId?: string;
  materials: Array<{ materialId: string; totalPositions: number }>;
}

/** Body of PUT /homework-result/:id/move. The server grades `moves` and measures the time (ADR backend-024, backend-029); any other key is a 400. */
export interface SubmitHomeworkMoveInput {
  materialId: string;
  positionIndex: number;
  moves: string[];
}

/** Body of PUT /homework-result/:id/open and /workbook-result/:id/open: the server stamps the position start. */
export interface OpenPositionInput {
  materialId: string;
  positionIndex: number;
}

/** Response of `open`: the countdown's only source. 0 means untimed. */
export interface OpenPositionResult {
  timeLimit: number;
  secondsRemaining: number;
}

export interface PauseHomeworkTimerInput {
  materialId: string;
}

/** Row of GET /homework/progress: the getProgress $project plus the HomeworkResult overlay (homework.service.js). */
export interface HomeworkRow {
  _id: string;
  /** Collection title, else lesson title; absent or null when both are gone (a deleted collection). */
  title?: string | null;
  materialCollectionTitle?: string;
  coachName: string;
  groupClassName?: string;
  noOfGames: number;
  noOfAnswers: number;
  completionPercentage: number;
  scorePct: number;
  timeSpent: number;
  /** Backend-derived; rendered verbatim (Hard Rule 8). */
  status: HomeworkStatus;
  createdAt: string;
  /** The backend's "do this next" row: the newest in-progress, else the newest not-started. */
  isNext: boolean;
}

/** GET /homework/progress envelope; the fetchers throw on error, so only the success shape exists. */
export interface ProgressReportResponse {
  status: "success";
  data: HomeworkRow[];
}
