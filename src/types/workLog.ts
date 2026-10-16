// ── Domain types ─────────────────────────────────────────────────────────────
//
// Moved verbatim from website2.0's src/app/services/workLog.ts. Pure API contract
// shapes only (no axios/fetch functions — those stay web-specific).

type WorkLogSource = "self" | "lichess" | "chesscom" | "chesskid" | "uscf" | "ckq";
type WorkLogKind = "self" | "auto";
type WorkLogResult = "won" | "draw" | "lost";

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
}

export interface WeeklyHistoryItem {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  totalHours: number;
  perActivity: Record<string, number>;
}
