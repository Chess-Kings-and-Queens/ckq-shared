// ── Types ─────────────────────────────────────────────────────────────────────
//
// Extracted from website2.0's src/app/services/workbook.ts. Pure API contract
// shapes only. Validated against backend/src/services/workbook.service.js
// (getWorkbookSummary, getWorkbookContent), backend/src/services/workbookResult.service.js
// (createResult, submitMove), and backend/src/models/shared/positionResultSchemas.js.

import type { PickOutcomeFields, PositionAnswerBody, PositionSubmissionOutcome, PuzzlePlayContent, QuestionReveal, StoredPick, SubmitHomeworkPickInput } from './homework';

export interface WorkbookChapterSummary {
  title: string;
  totalPositions: number;
  completed: number;
  /** Backend-computed rounded completion percentage (workbook.service.js getWorkbookSummary). */
  pct: number;
  hasImage: boolean;
  hasPdf: boolean;
  imageKey: string | null;
  pdfKey: string | null;
}

export interface WorkbookProductOption {
  id: string;
  format: 'digital' | 'physical';
  price: number;
  imageKey: string | null;
}

export interface MyWorkbookSummary {
  exists: boolean;
  owned: boolean;
  workbook: { id: string; title: string; chapters: WorkbookChapterSummary[]; totalPositions: number } | null;
  progress: { completed: number; total: number; scoreAvg: number | null; allComplete: boolean } | null;
  products: WorkbookProductOption[];
}

interface WorkbookAttempt {
  attemptNumber: number;
  moves: string[];
  isCorrect: boolean;
  score: number;
  timeTaken: number;
  answeredAt: string;
}

interface WorkbookAnswer {
  positionIndex: number;
  attempts: WorkbookAttempt[];
  /** The position's earned points, 0–100: the sum of its attempts' scores (ADR backend-051). */
  bestScore: number;
  isCorrect: boolean;
  isCompleted: boolean;
  /** Clicks and name picks, in order; absent when there are none. */
  picks?: StoredPick[];
}

export interface WorkbookContentChapter extends PuzzlePlayContent {
  title: string;
  materialId: string;
  positionsCompleted: number;
  /** The first unfinished position, computed by the server (positionOrder.nextPositionIndex); null when the chapter is done or has no positions. */
  nextPositionIndex: number | null;
  answers: WorkbookAnswer[];
}

export interface WorkbookContent {
  workbookId: string;
  title: string;
  maxAttempts: number;
  scorePerPosition: number;
  resultId: string | null;
  chapters: WorkbookContentChapter[];
}

/** Body of a board-only move (PUT /curriculum-result/:id/move): moves only. */
export interface SubmitBoardMoveInput {
  materialId: string;
  positionIndex: number;
  moves: string[];
  /** The attempt being answered, from `open`; makes a resend idempotent (D5). */
  attemptNumber?: number;
}

/** Body of PUT /workbook-result/:id/move: `moves` (board) or `answer` (choice), exactly one. */
export type SubmitWorkbookMoveInput = Omit<SubmitBoardMoveInput, 'moves'> & PositionAnswerBody;

/** PUT /workbook-result/:id/move success data: the result document plus the position outcome, the verdict and the reveal. */
export interface WorkbookMoveResult extends PositionSubmissionOutcome {
  _id: string;
  attemptCorrect: boolean;
  reveal: QuestionReveal | null;
}

/** Body of PUT /workbook-result/:id/pick (the homework pick body). */
export type SubmitWorkbookPickInput = SubmitHomeworkPickInput;

/** PUT /workbook-result/:id/pick success data. */
export interface SubmitWorkbookPickResult extends PickOutcomeFields {
  result: { _id: string };
}
