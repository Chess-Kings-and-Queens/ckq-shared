import type { HomeworkJudgeOutcome } from '../engineJudge';
import type { BoardFile, BoardRank } from '../boardEditor';

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

/** The kind of puzzle a collection's homework (or a liveboard quiz round) is. `regular`: the student plays their side, replies auto-played. `withOpponentMoves`: the student plays both colours of the main line; variations are not asked. `withVariations`: the student plays their side through the main line and then each opponent variation as its own position, replies auto-played (homework-puzzle-type-split-plan D1–D4). */
export const PUZZLE_TYPES = ['regular', 'withOpponentMoves', 'withVariations'] as const;
export type PuzzleType = (typeof PUZZLE_TYPES)[number];

/** What a puzzle type means, in the two flags every consumer acts on (homework-puzzle-type-split-plan D2). */
export interface PuzzleTypeRules {
  /** Every ply is the student's: both colours movable and graded, nothing auto-played. */
  bothSides: boolean;
  /** Each opponent-ply variation of a game is its own position (`expandOpponentVariations`). */
  expandVariations: boolean;
}

/** The one table of what each type means. `regular` is the row an unknown value falls back to. */
export const PUZZLE_TYPE_RULES: Readonly<Record<PuzzleType, Readonly<PuzzleTypeRules>>> = Object.freeze({
  regular: Object.freeze({ bothSides: false, expandVariations: false }),
  withOpponentMoves: Object.freeze({ bothSides: true, expandVariations: false }),
  withVariations: Object.freeze({ bothSides: false, expandVariations: true }),
});

/** The rules for a type; an unknown or missing value reads as `regular` (the fallback `puzzleTypeOf` and the liveboard hook already use). */
export function puzzleTypeRules(type: string | null | undefined): Readonly<PuzzleTypeRules> {
  return (PUZZLE_TYPE_RULES as Record<string, Readonly<PuzzleTypeRules>>)[type ?? ''] ?? PUZZLE_TYPE_RULES.regular;
}

/** What a student is told while solving a puzzle of each type; null = nothing extra. One string for the liveboard quiz dialog, the website puzzle board and the app's puzzle screen. */
export const PUZZLE_TYPE_STUDENT_NOTES: Readonly<Record<PuzzleType, string | null>> = Object.freeze({
  regular: null,
  withOpponentMoves: "You have to find your opponent's best move as well.",
  withVariations: null,
});

/** The note for a type; an unknown or missing value has none (the same fallback as `puzzleTypeRules`). */
export function puzzleTypeStudentNote(type: string | null | undefined): string | null {
  return (PUZZLE_TYPE_STUDENT_NOTES as Record<string, string | null>)[type ?? ''] ?? null;
}

/** What a homework Material asks for. `board`: PGN games played on a board (every material written before the field). `choice`: a `questions` list. `square`: PGN positions answered by clicking the squares marked `[%csl]` (beginner-puzzle-kinds-revision D4). */
export const MATERIAL_KINDS = ['board', 'choice', 'square'] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];

export const NAME_MOVE_PIECES = ['K', 'Q', 'R', 'N', 'B', 'P'] as const;
export type NameMovePiece = (typeof NAME_MOVE_PIECES)[number];
export const CHOICE_IDS = ['a', 'b', 'c', 'd'] as const;
export type ChoiceId = (typeof CHOICE_IDS)[number];

/** One answer option of a `choice` question (beginner-puzzle-kinds-revision D15): its visible text ('' when none), its position (null when none), at least one of the two. */
export interface QuestionChoice { id: ChoiceId; text: string; fen: string | null }

/** The server-only key of a `choice` question. */
export interface QuestionAnswerKey { choiceIds: ChoiceId[] }

/** One stored question of a `choice` Material (admin and backend shape): a question text, an optional board position and 2–4 choices. */
export interface PuzzleQuestion {
  id: string;
  prompt: string;
  explanation: string;
  /** The position the question is about, or null for a text-only question. Any placement that parses, kings or not (it is shown, never played). */
  fen: string | null;
  choices: QuestionChoice[];
  answer: QuestionAnswerKey;
}

/** A position as a student receives it when it is not played from a PGN on the client: a `choice` question (its choices, and its position or `fen: null`), or a click or illegal-position puzzle (`fen` always set, `id` is then the 0-based index, `choices` is [], `prompt` is '' when no text is shown). `squareCount` is the number of squares a click puzzle asks for (beginner-puzzle-kinds-web D1), null for every other position. No key, no explanation. */
export type HomeworkQuestion = Pick<PuzzleQuestion, 'id' | 'prompt' | 'fen' | 'choices'> & { squareCount: number | null };

/** What a student submits for a `choice` question. */
export type QuestionAnswer = { choiceId: ChoiceId };

/** The key and explanation of a done position. `choiceIds` for a question, `squares` for a click puzzle, `move` for an illegal-position puzzle; unused lists are [] and `move` is null. */
export interface QuestionReveal { choiceIds: ChoiceId[]; squares: string[]; move: { from: string; to: string } | null; explanation: string }

/** What one pick answers (beginner-puzzle-kinds-revision D6, D7): a square of a click puzzle, or one step of naming the move. */
export const PICK_STEPS = ['square', 'piece', 'file', 'rank'] as const;
export type PickStep = (typeof PICK_STEPS)[number];
export type NamingStep = Exclude<PickStep, 'square'>;

/** One pick as the student sends it: exactly one key (the others are `never`, as in SubmitHomeworkMoveInput). */
export type HomeworkPick =
  | { square: string; piece?: never; file?: never; rank?: never }
  | { piece: NameMovePiece; square?: never; file?: never; rank?: never }
  | { file: BoardFile; square?: never; piece?: never; rank?: never }
  | { rank: BoardRank; square?: never; piece?: never; file?: never };

/** One recorded pick and the server's verdict. */
export interface StoredPick { step: PickStep; value: string; isCorrect: boolean }

/** A finished click puzzle in numbers, computed by the server (D21): squares to find, squares found, wrong clicks. */
export interface ClickSummary { total: number; found: number; wrong: number }

/** One entry of GET /homework/:id/puzzle `lines`, parallel to `games` (D8, D14 of the prior plan; D5 here): the 0-based PGN game the line came from; for a variation line the opponent's alternative move as a numbered label (`"5... Nf6"`), the FEN it was played from and its bare SAN (`"Nf6"`), so the client can replay it before the student's first move; all three null for a main line. */
export interface HomeworkPuzzleLine { game: number; branchMove: string | null; branchFen: string | null; branchSan: string | null }

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
  /** The PGN game (puzzle) this line belongs to, 0-based. Absent on a stale result (D12). */
  game?: number;
  /** The opponent move a variation line branches after ("2... Nc6"); null for a main line. Absent on a stale result. */
  branchMove?: string | null;
  /** A finished click-a-square position of a current report: squares to find, found, wrong clicks (backend `positionClicks`, beginner-puzzle-kinds-web D5). Absent on every other position. */
  clicks?: ClickSummary;
}

/** One puzzle (PGN game) of a homework with its lines' totals (backend buildPuzzleSummaries). */
export interface HomeworkPuzzleSummary {
  game: number;
  /** Position indexes of this game's lines, ascending. */
  indexes: number[];
  lineCount: number;
  linesAttempted: number;
  linesCorrect: number;
  score: number;
  maxScore: number;
}

/** GET /homework/report `summary`: the puzzle and line counts, computed by the backend. */
export interface HomeworkReportSummary {
  puzzleCount: number;
  puzzlesAttempted: number;
  lineCount: number;
  linesAttempted: number;
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
  /** One entry per puzzle with its lines; null when the result is stale (the homework changed after it started). */
  puzzles: HomeworkPuzzleSummary[] | null;
  summary: HomeworkReportSummary;
  /** True when the result's positions no longer match the live PGN. */
  changed: boolean;
  /** The homework material's kind; 'board' when the homework has no material. */
  kind: MaterialKind;
}

/** behavior.service.js getStrikeStatus. */
export interface HomeworkStrikeStatus {
  activeViolations: number;
  rushViolationsToBlock: number;
  minThinkTimePct: number;
  isBlocked: boolean;
  /** max(0, rushViolationsToBlock − activeViolations), computed by the backend. */
  strikesLeft: number;
  /** floor(minThinkTimePct / 100 × homework timeLimit) in seconds; null when the homework has no time limit. */
  rushThresholdSeconds: number | null;
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
  /** The engine judge applies to this homework: the global switch AND the collection's flag (homework engine judge D1, D12). */
  engineJudge: boolean;
  /** The collection's puzzle type (D5). `withOpponentMoves`: the student plays both sides of the main line; `withVariations`: `games` holds one standalone line per opponent variation (D1–D4). */
  puzzleType: PuzzleType;
  /** One entry per `games` entry (D8). */
  lines: HomeworkPuzzleLine[];
  /** True when the student's result no longer matches the live PGN; clients show "This homework has changed". */
  changed: boolean;
  kind: MaterialKind;
  /** One entry per position for a `choice`, `square` or illegal-position material (then `games`, `lines` and `prompts` are []); [] for a board material played from its PGN. */
  questions: HomeworkQuestion[];
  /** One entry per `games` entry: the question written in that position's PGN, or null (none written, a variation line, or the material's puzzle text is off). [] for a question material, whose prompts are in `questions`. */
  prompts: Array<string | null>;
  /** Name the move after each correct move (D1). */
  nameTheMove: boolean;
  /** Positions are played on a free board and answered with one from-to move (D3). */
  allowIllegalPosition: boolean;
  /** The material shows its PGN text: the question per position (`prompts`, or a click puzzle's `prompt`) and the explanation once a position is done (beginner-puzzle-kinds-web D6). True for every `square` material. */
  showPuzzleText: boolean;
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
  /** The clicks and name picks recorded on this position, in order; absent when there are none. */
  picks?: StoredPick[];
}

export interface HomeworkMaterialResult {
  totalPositionsCompleted: number;
  answers: HomeworkPositionAnswer[];
  /** First unfinished position (D1); null when every position is done. Computed by the server, never stored. */
  nextPositionIndex: number | null;
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
  strikesLeft: number;
}

/** PUT /homework-result/:id/move success body (homeworkResult.controller.js submitMove). */
export interface SubmitHomeworkMoveResult {
  result: HomeworkResultRecord;
  rushViolation: HomeworkRushViolation | null;
  positionDone: boolean;
  attemptsLeft: number;
  nextPositionIndex: number | null;
  /** The engine judge's outcome for this attempt; null when no judge ran (correct by the PGN, switch off, no deviation, engine unavailable). */
  judge: HomeworkJudgeOutcome | null;
  duplicate?: true;
  /** The server's verdict on this attempt (after the engine judge, when it ran). */
  attemptCorrect: boolean;
  /** Non-null for a done position that has something to reveal: a question's key, a click puzzle's squares, an illegal-position puzzle's move, or a board position's PGN explanation when its material shows puzzle text. */
  reveal: QuestionReveal | null;
}

/** Body of POST /homework-result (validation/homeworkResultSchemas.js createResultSchema: null is a 400). */
export interface CreateHomeworkResultInput {
  materialCollectionId: string;
  groupClassSessionId?: string;
  materials: Array<{ materialId: string; /** @deprecated The server derives it from the material PGN (duplication cleanup, D8); omit. */ totalPositions?: number }>;
}

interface SubmitHomeworkMoveBase { materialId: string; positionIndex: number; /** The attempt being answered, from `open`; makes a resend idempotent (D5). */ attemptNumber?: number }
/** Body of PUT /homework-result/:id/move. `moves` for a board position (one from-to move such as `d4c6` on an illegal-position material, and `[]` to abandon any position); `answer` for a `choice` question. Exactly one of the two; any other key is a 400. */
export type SubmitHomeworkMoveInput = SubmitHomeworkMoveBase & ({ moves: string[]; answer?: never } | { answer: QuestionAnswer; moves?: never });

/** Body of PUT /homework-result/:id/pick. */
export interface SubmitHomeworkPickInput { materialId: string; positionIndex: number; pick: HomeworkPick }

/** PUT /homework-result/:id/pick success body. `nextStep` is what the position asks for next ('square' while squares are left, a naming step while naming), null when there is nothing left to pick. */
export interface SubmitHomeworkPickResult {
  result: HomeworkResultRecord;
  pickCorrect: boolean;
  picks: StoredPick[];
  nextStep: PickStep | null;
  positionDone: boolean;
  nextPositionIndex: number | null;
  reveal: QuestionReveal | null;
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

/** Homework `open` response: the clock plus the server's attempt for this position (D8). Workbook `open` returns only OpenPositionResult. */
export interface HomeworkOpenPositionResult extends OpenPositionResult {
  attemptNumber: number;
  attemptsAllowed: number;
}

/** 409 body of homework `open`/`move` when the posted position is not the next one, or `open` just used up its last attempt (D6). */
export interface HomeworkPositionConflictBody {
  status: "error";
  message: "position-out-of-order" | "max_attempts_reached" | "homework-changed";
  code: 409;
  nextPositionIndex: number | null;
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
  /** Assigned as a specialized lesson (no class): Homework.isSpecialized, sent by getProgress. Never infer it from a missing groupClassName. */
  isSpecialized: boolean;
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

/** The 409 codes the homework/workbook/curriculum position routes answer with (message = code). */
export const HOMEWORK_CONFLICT_CODES = ['position-not-open', 'version-conflict', 'max_attempts_reached', 'position-out-of-order', 'already_completed', 'homework-changed'] as const;
export type HomeworkConflictCode = (typeof HOMEWORK_CONFLICT_CODES)[number];
/** The conflict code of a 409 response, or null for any other status or message. */
export function homeworkConflictCode(status: number | null | undefined, message: unknown): HomeworkConflictCode | null {
  if (status !== 409 || typeof message !== 'string') return null;
  return (HOMEWORK_CONFLICT_CODES as readonly string[]).includes(message) ? (message as HomeworkConflictCode) : null;
}
/** Optional keys the workbook/curriculum move responses carry beside the result document (backend D9). */
export interface PositionSubmissionOutcome { positionDone?: boolean; attemptsLeft?: number; nextPositionIndex?: number | null }
