// ── Types ─────────────────────────────────────────────────────────────────────
//
// Extracted from website2.0's src/app/services/curriculum.ts. Pure API contract
// shapes only. Validated against backend/src/services/curriculum.service.js
// (getMyCurricula, getCurriculumContent) and curriculumResult.service.js.

import type { WorkbookContentChapter } from './workbook';

/** One entry of GET /curriculum/my; every number is backend-computed (Hard Rule 8). */
export interface MyCurriculum {
  id: string;
  title: string;
  description: string;
  level: { id: string; name: string };
  weeksToGraduate: number | null;
  collectionCount: number;
  /** `pct` is the backend's rounded completed/total percentage (curriculum.service.js getMyCurricula). */
  progress: { completed: number; total: number; pct: number; scoreAvg: number | null; allComplete: boolean };
}

/** CurriculumResult answers share the workbook answer schema (positionResultSchemas.js). */
export type CurriculumAnswer = WorkbookContentChapter['answers'][number];

export interface CurriculumContentCollection {
  id: string;
  title: string;
  description: string;
  order: number | null;
  maxAttempts: number;
  scorePerPosition: number;
  /** Every `lesson` material's PGN joined with a blank line, and the first video URL; null when neither exists. */
  lesson: { pgnContent: string; videoUrl: string } | null;
  homework: {
    materialId: string;
    totalPositions: number;
    positionsCompleted: number;
    answers: CurriculumAnswer[];
    /** The homework PGN split into games; `games.length === totalPositions`. */
    games: string[];
  } | null;
}

export interface CurriculumContentWeek {
  /** The collections' shared `order`; null when unordered. */
  week: number | null;
  /** "Week N", or "Unordered" when `week` is null. */
  label: string;
  collections: CurriculumContentCollection[];
}

/** GET /curriculum/:id/content (403 without an order). */
export interface CurriculumContent {
  id: string;
  title: string;
  level: { id: string; name: string };
  weeksToGraduate: number | null;
  maxAttemptsDefault: number;
  weeks: CurriculumContentWeek[];
}
