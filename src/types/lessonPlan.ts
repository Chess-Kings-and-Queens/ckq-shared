// ── Domain types ─────────────────────────────────────────────────────────────
//
// Moved verbatim from website2.0's src/app/services/lessonPlan.ts. Pure API contract
// shapes only (no axios/fetch functions — those stay web-specific).

export const SEASONS = ["Winter", "Spring", "Summer", "Fall"] as const;
export type Season = typeof SEASONS[number];

export type LessonPlanSeasonStatus = "current" | "upcoming" | "carriedOver" | "past";

export interface SeasonBounds {
  season: Season;
  year: number;
  startDate: string;
  endDate: string;
}

export interface LessonPlanSeasonCalendar {
  current: SeasonBounds;
  previous: SeasonBounds;
  next: SeasonBounds;
  planning: SeasonBounds;
}

export interface LessonPlanSeasonInfo {
  startDate: string;
  endDate: string;
  weeksLeft: number;
  status: LessonPlanSeasonStatus;
}

interface PopulatedTag {
  _id: string;
  name: string;
}

interface LessonActivity {
  _id?: string;
  tags: PopulatedTag[];
  medium?: string;
  hoursPerWeek: number;
  description?: string;
  resources?: string[];
}

export interface LessonPlan {
  _id: string;
  student: string;
  createdBy: { _id: string; firstName: string; lastName: string; role: string };
  season: Season;
  year: number;
  activities: LessonActivity[];
  totalHoursPerWeek?: number;
  notes?: string;
  seasonInfo: LessonPlanSeasonInfo;
  createdAt: string;
  updatedAt: string;
}

// A plan as the live preview renders it: a draft has no backend seasonInfo yet.
export type LessonPlanPreview = Omit<LessonPlan, "seasonInfo"> & { seasonInfo?: LessonPlanSeasonInfo };

export interface ActivityInput {
  tags: string[];
  medium?: string;
  hoursPerWeek: number;
  description?: string;
  resources?: string[];
}
