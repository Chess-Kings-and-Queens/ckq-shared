// ── Domain types ─────────────────────────────────────────────────────────────
//
// Moved verbatim from website2.0's src/app/services/workLog.ts. Pure API contract
// shapes only (no axios/fetch functions — those stay web-specific).

type WorkLogSource = "self" | "lichess" | "chesscom" | "chesskid" | "uscf" | "ckq";
type WorkLogKind = "self" | "auto";
type WorkLogResult = "won" | "draw" | "lost";

export type WorkLogPlatform = "chesscom" | "lichess";

export interface WorkLogPlatformGames {
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
}

/** Response of POST /work-log/sync/:source (synced-practice-by-day D9). */
export interface WorkLogSyncResult {
  source: WorkLogPlatform;
  title: string;
  /** Day rows written by this sync. */
  days: number;
  /** Games in the synced window. */
  gamesPlayed: number;
}

export interface WorkLogEntry {
  _id: string;
  student: string;
  source: WorkLogSource;
  kind: WorkLogKind;
  title: string;
  hours: number;
  occurredAt: string;
  lessonPlanId?: string;
  lessonPlanActivityId?: string;
  tools?: string[];
  resourceUrl?: string;
  result?: WorkLogResult;
  accuracy?: number;
  gamesPlayed?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  rating?: number;
  createdAt: string;
}

export interface WorkLogAggregate {
  totalHours: number;
  perActivity: Record<string, number>;
  streak: number;
  /** ISO start of the window the server used (the ET ISO week when no dates are sent, backend-2.0 workLog.service). */
  weekStart: string;
  /** ISO end of that window. Clients filter entries and label the week from these, never computing bounds. */
  weekEnd: string;
  /** Week game totals per synced platform, from the window's auto rows (backend-2.0 workLog.service, synced-practice-by-day D8). A key is present only when that platform has synced rows in the window. */
  platformGames: Partial<Record<WorkLogPlatform, WorkLogPlatformGames>>;
}

export interface WeeklyHistoryItem {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  totalHours: number;
  perActivity: Record<string, number>;
}
