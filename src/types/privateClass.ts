// ── Private-class types ──────────────────────────────────────────────────────
//
// Moved from ckq-mobile's lib/privateClass.ts and website2.0's
// services/admin/catalog.ts, reconciled field by field against backend-2.0
// (privateClassEnrollment.model.js and service, privateClassSchedule.service.js
// getAvailableSlotsForCoach, cancellationReason.controller.js). Backend wins.
// Pure API contract shapes only.
//
// Cancellation reasons are response types only: the reason list itself is served by
// GET /cancellation-reason and rendered verbatim (ADR frontend-010) — no list, label
// map or constant belongs here.

/** Guardianship of a student (ADR backend-042): a child has a parent account, an adult is their own account holder. */
export type AccountType = "child" | "adult";

/**
 * Private-class contract sub-type — whether the coach teaches the student or plays
 * chess games against them instead. Fixed backend enum (privateClassEnrollment.model.js).
 */
export type ContractType = "coach-teaching" | "coach-playing";

/**
 * Display label of each `ContractType` — pure presentation of a fixed backend enum
 * (like `statusLabel`), not business logic (ADR frontend-010 §2).
 */
export const PRIVATE_CLASS_CONTRACT_TYPE_LABELS = {
  "coach-teaching": "Lesson",
  "coach-playing": "Playing Coach",
} as const satisfies Record<ContractType, string>;

export type PrivateClassEnrollmentStatus = "pending" | "accepted" | "rejected" | "cancelled";

/** A populated user reference (the backend populates `firstName lastName email`; names are required on User). */
export interface PrivateClassPersonRef {
  _id: string;
  firstName: string;
  lastName: string;
}

/** A weekly slot as linked to an enrollment (`SCHEDULE_SELECT` of privateClassEnrollment.service.js). */
export interface PrivateClassScheduleRef {
  _id: string;
  /** Monday to Sunday (backend enum). */
  dayOfWeek: string;
  /** HH:mm. */
  startTime: string;
  durationMinutes: number;
}

/**
 * One open weekly slot from GET /private-class/schedules/available.
 * `firstSessionDate` and `sessionPrice` are backend-computed.
 */
export interface PrivateClassSlot extends PrivateClassScheduleRef {
  /** YYYY-MM-DD, backend-computed (ET). */
  firstSessionDate?: string;
  /** Backend-computed per-session price. Present only when the `enrollment` query param was passed and the enrollment has a rate. */
  sessionPrice?: number;
}

/** One backend-computed per-session price per linked slot (`withDisplayPricing`). */
export interface PrivateClassSessionPrice {
  scheduleId: string;
  dayOfWeek: string;
  startTime: string;
  durationMinutes: number;
  /** Display only. */
  price: number;
}

/** A curriculum level as populated on an enrollment (`level` select `name order`). */
export interface PrivateClassLevelRef {
  _id: string;
  name: string;
  order: number;
}

/** One entry of the append-only level audit trail. */
export interface PrivateClassLevelHistoryEntry {
  level: string | null;
  order: number | null;
  source: "manual" | "rating";
  changedAt: string;
  changedBy: string | null;
}

/**
 * A private-class enrollment (offer) as sent by GET /private-class/enrollments/:id and
 * GET /private-class/enrollments/mine. Money figures are backend-computed, display only.
 */
export interface PrivateClassOffer {
  _id: string;
  status: PrivateClassEnrollmentStatus;
  createdAt?: string;
  /** Null when the populated user no longer exists. */
  coach?: PrivateClassPersonRef | null;
  student?: PrivateClassPersonRef | null;
  parent?: PrivateClassPersonRef | null;
  /** Every slot linked to the enrollment (reverse link); `[]` while pending. */
  schedules?: PrivateClassScheduleRef[];
  /** Backend-computed display rate (agreed ?? proposed ?? legacy); null when none of them is set. */
  hourlyRate?: number | null;
  /** One entry per linked slot; `[]` until accepted. */
  sessionPrices?: PrivateClassSessionPrice[];
  proposedHourlyRate?: number;
  /** Pinned at acceptance; null before. */
  agreedHourlyRate?: number | null;
  /** @deprecated legacy field, only on documents predating the hourly-rate migration. */
  proposedRatePerSession?: number;
  /** @deprecated legacy field, only on documents predating the hourly-rate migration. */
  agreedRatePerSession?: number | null;
  /** Lesson or playing coach; absent on enrollments predating the field. */
  contractType?: ContractType;
  /** This enrollment's coach is the student's head coach; absent on rows predating the field. */
  isHeadCoach?: boolean;
  level?: PrivateClassLevelRef | null;
  /** Provenance of `level`. */
  levelSource?: "rating" | "manual" | null;
  /** The level the student's current USCF rating maps to, backend-computed; null when none. */
  ratingDerivedLevel?: PrivateClassLevelRef | null;
  levelHistory?: PrivateClassLevelHistoryEntry[];
  /** Terms version accepted at acceptance ('3.0' since recording became always on); null before acceptance. */
  termsVersion?: string | null;
  /** ISO datetime the account holder accepted terms that include recording; informational, recording does not depend on it. */
  recordingConsentAt?: string | null;
}

/** One entry of GET /cancellation-reason — rendered verbatim (ADR frontend-010). */
export interface CancellationReason {
  code: string;
  label: string;
  requiresText: boolean;
}

/** GET /cancellation-reason. */
export interface CancellationReasonsResponse {
  reasons: CancellationReason[];
  textMin: number;
  textMax: number;
}

/** The body every cancel and decline route takes. `reason` only when the chosen reason `requiresText`. */
export interface CancellationRequest {
  reasonCode: string;
  reason?: string;
}
