// ── Domain types ─────────────────────────────────────────────────────────────
//
// Moved verbatim from website2.0's src/app/services/admin/liveboard.ts
// (LiveboardTokenResult and MyClassroomSession only). Pure API contract shapes.

/** Video call attached to a liveboard room (Zoom classroom pool, zoom-classroom-pool-plan). */
export interface LiveboardVideo {
  provider: 'zoom';
  /** Host start link (host callers) or participant join link (everyone else). Never both. */
  url: string;
  /** True when the meeting is being cloud-recorded. */
  recording: boolean;
  /** Why `recording` is false while a meeting exists; null when recording or when the pool said no room. */
  notRecordedReason: 'consent-pending' | null;
  /** Pool room label, e.g. "Classroom 03", for the host chip. */
  roomLabel: string;
}

export type VideoUnavailableReason = 'pool-exhausted' | 'in-person' | 'zoom-error';

export interface LiveboardTokenResult {
  token: string;
  /** Whether this caller gets full host/edit permissions on the room. */
  isHost: boolean;
  /** Present for a private-class room; null when no Zoom room could be allocated; absent for group/ad-hoc/tournament rooms. */
  video?: LiveboardVideo | null;
  /** Why video is null on a private-class room; null when video exists; absent for other room types. */
  videoUnavailable?: VideoUnavailableReason | null;
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

/** Engine-judge verdict stored on a LiveSession answer (null = exact match / v1 / timeout). */
export const QUIZ_VERDICTS = ["better", "equivalent", "acceptable", "wrong"] as const;
export type QuizVerdict = (typeof QUIZ_VERDICTS)[number];
/** `quiz:move-result.status` as live-classroom-server emits it (sessionRoom.js finalizeV2). */
export const QUIZ_MOVE_RESULT_STATUSES = ["correct", "alternate", "acceptable", "wrong"] as const;
export type QuizMoveResultStatus = (typeof QUIZ_MOVE_RESULT_STATUSES)[number];
