// ── Domain types ─────────────────────────────────────────────────────────────
//
// Moved verbatim from website2.0's src/app/services/onlineTournaments.ts. Pure API contract
// shapes only (no axios/fetch functions — those stay web-specific).


export type OnlineTournamentFormat = 'tournament' | 'league';
export type OnlineTournamentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Backend-computed join state (Hard Rule #8 — the dashboard card renders this
 * verbatim, never re-derives eligibility/windows from raw dates on the
 * client). `'done'` is part of the documented contract but never actually
 * appears in practice today — `getMyOnlineTournaments`'s own query filters to
 * `status: { $in: ['scheduled', 'in_progress'] }`, so a completed/cancelled
 * tournament never reaches the client in the first place. Handled here
 * defensively anyway since it's part of the documented enum.
 */
export type OnlineTournamentJoinState = 'upcoming' | 'open' | 'in_round' | 'between_rounds' | 'done';

export interface MyOnlineTournament {
  _id: string;
  name: string;
  format: OnlineTournamentFormat;
  status: OnlineTournamentStatus;
  rounds: number;
  /** LiveboardRoom._id — the student page route is `/portal/student/liveboard/{roomId}`. */
  roomId: string;
  /** 1-based. Null until the tournament is in_progress. */
  currentRound: number | null;
  /** ISO datetime string, or null when there's no known upcoming round (e.g. a
   *  same-day tournament already 'open' — it stays open for the whole event,
   *  no per-round window). */
  nextRoundAt: string | null;
  joinState: OnlineTournamentJoinState;
  /**
   * Minutes before `nextRoundAt` that the join window opens. Optional — not
   * yet sent by the backend (added in
   * online-tournament-monthly-readiness-plan.md Phase 4); the banner shows
   * an extra hint line only when this is present, never a hardcoded number.
   */
  joinWindowMinutes?: number;
}

export interface OnlineTournamentLevelRef {
  _id: string;
  name: string;
}

export interface ChildOnlineTournaments {
  student: { _id: string; firstName: string; lastName: string };
  tournaments: MyOnlineTournament[];
}
