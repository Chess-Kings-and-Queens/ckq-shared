// ── Types ─────────────────────────────────────────────────────────────────────
//
// Extracted from website2.0's src/app/services/workbook.ts. Pure API contract
// shapes only. Validated against backend/src/services/workbook.service.js
// (getWorkbookSummary, getWorkbookContent), backend/src/services/workbookResult.service.js
// (createResult, submitMove), and backend/src/models/shared/positionResultSchemas.js.

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
  bestScore: number;
  isCorrect: boolean;
  isCompleted: boolean;
}

export interface WorkbookContentChapter {
  title: string;
  materialId: string;
  games: string[];
  totalPositions: number;
  positionsCompleted: number;
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

export interface SubmitWorkbookMoveInput {
  materialId: string;
  positionIndex: number;
  moves: string[];
  /** @deprecated Ignored by the backend, which grades the moves itself (ADR backend-024). Omit it. */
  isCorrect?: boolean;
  /** @deprecated Ignored by the backend, which grades the moves itself (ADR backend-024). Omit it. */
  score?: number;
  timeTaken?: number;
}
