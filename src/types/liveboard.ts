// ── Domain types ─────────────────────────────────────────────────────────────
//
// Moved verbatim from website2.0's src/app/services/admin/liveboard.ts
// (LiveboardTokenResult and MyClassroomSession only). Pure API contract shapes.

export interface LiveboardTokenResult {
  token: string;
  /** Whether this caller gets full host/edit permissions on the room. */
  isHost: boolean;
}

export interface MyClassroomSession {
  sessionId: string;
  scheduleId: string | null;
  className: string | null;
  level: string | null;
  startDate: string;
  endDate: string;
  isTrial: boolean;
  /** True for a private-class session (backend getMyClassroom source (e)). */
  isPrivate: boolean;
  /** PrivateClassEnrollment id for a private entry; null for group entries. */
  enrollmentId: string | null;
  roomActive: boolean;
  roomId: string | null;
}
