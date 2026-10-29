// ── Student contract types ───────────────────────────────────────────────────
//
// Moved verbatim from website2.0: src/app/services/studentActivity.ts (activity,
// level progress, Level Up Score / advancement readiness), src/app/services/
// authentication/index.ts (the GET /student/details profile shape) and the
// group-class / subscription types that profile references. Pure API contract
// shapes only — no axios/fetch functions. Backend sources of truth:
// studentActivity.service.js, student.service.js `buildStudentProfile`,
// scheduleUtils.js (nextClass / classWeek / isToday).

// ── Student activity / level progress ────────────────────────────────────────

export interface CoachInfo {
  _id: string;
  firstName: string;
  lastName: string;
  photo?: string;
}

export interface ActivityEvent {
  type: 'mission' | 'homework' | 'rating' | 'streak';
  date: string;
  title: string;
  subtitle: string;
}

export interface AcademyStandards {
  attendance: { goodPct: number };
  homework: { goodPct: number; coveragePct: number; scoreAvgPct: number };
  missions: { levelReadyPct: number };
  /** Golden-standard home practice hours per week — used for camp value narrative. */
  practiceHoursPerWeek?: number;
}

/** A piece position key, lichess file-name style. */
export type PieceKey = 'wK' | 'wQ' | 'wR' | 'wB' | 'wN' | 'wP' | 'bK' | 'bQ' | 'bR' | 'bB' | 'bN' | 'bP';

/** One board colour theme — backend config/boardAppearance.js BOARD_THEMES. Every value is CSS colour text. */
export interface BoardTheme {
  id: string;
  name: string;
  tagline: string;
  sortOrder: number;
  isDefault: boolean;
  colors: {
    lightSquare: string;
    darkSquare: string;
    frame: string;
    coordOnFrame: string;
    lastMove: string;
    selected: string;
    moveDest: string;
  };
  /** Position the Settings previews draw. */
  previewFen: string;
}

/** One piece set — backend config/boardAppearance.js PIECE_SETS. `pieces` holds absolute SVG URLs. */
export interface PieceSet {
  id: string;
  name: string;
  tagline: string;
  sortOrder: number;
  isDefault: boolean;
  pieces: Record<PieceKey, string>;
  /** Shown under the set in Settings when present. */
  attribution: string | null;
}

/** GET and PATCH /student-activity/board-preferences — backend studentActivity.service.js getBoardPreferences. */
export interface BoardPreferences {
  /** Show legal-move dots when a piece is picked up. False for students above Pawn 1. */
  showMoveHints: boolean;
  /** The stored choice; null means "the default". */
  boardThemeId: string | null;
  pieceSetId: string | null;
  /** Resolved server-side: the stored choice, or the default when null, unknown or retired. */
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  /** Active entries, sorted by sortOrder. */
  catalog: { boardThemes: BoardTheme[]; pieceSets: PieceSet[] };
}

/** PATCH /student-activity/board-preferences body — at least one key. */
export interface BoardPreferencesPatch {
  boardThemeId?: string;
  pieceSetId?: string;
}

export type LevelUpMetricKey =
  | 'attendance' | 'hwCoverage' | 'hwScore' | 'missions' | 'tournamentsOtb'
  | 'uscf' | 'tournamentsOnline' | 'champion' | 'wbCompletion' | 'wbScore';
export interface CategoryCount { succeeded: number; total: number }
/** Raw counts the backend stores per metric (levelScore.service.js); only the keys a metric uses are present. */
export interface LevelUpMetricExtra {
  attended?: number; completed?: number; succeeded?: number; total?: number;
  currentRating?: number | null; goal?: number | null;
  byCategory?: { endgame: CategoryCount; conversion: CategoryCount; uncategorised: CategoryCount };
}
export interface LevelUpMetric {
  key: LevelUpMetricKey;
  group: 'participation' | 'performance' | 'recommended' | 'reserved';
  pair: LevelUpMetricKey | null;
  unit: 'pct' | 'count' | 'rating';
  value: number | null; total: number | null; threshold: number | null;
  score: number | null; met: boolean | null; applicable: boolean; gate: boolean;
  extra: LevelUpMetricExtra | null;
}
export interface LevelUpScore {
  name: string; target: number; overall: number | null; ready: boolean;
  computedAt: string; levelId: string; metrics: LevelUpMetric[];
}

/** applicable:false ⇒ this requirement does not exist for the student's level pathway (e.g. curriculum criteria for a private-class student, USCF goal at the top level); met is then null. Such rows are excluded from metCount/totalRequirements on the backend (docs/plans/student-level-sot-plan.md D6/D7). */
export interface AdvancementReadiness {
  criteria: {
    attendance:  { attended: number; total: number; pct: number; threshold: number; met: boolean | null; applicable: boolean };
    hwCoverage:  { completed: number; total: number; pct: number; threshold: number; met: boolean | null; applicable: boolean };
    hwScore:     { avg: number | null; threshold: number; met: boolean | null; applicable: boolean };
    missions:    { succeeded: number; total: number; pct: number; threshold: number; met: boolean; applicable: boolean };
    uscf:        { currentRating: number | null; goal: number | null; pct: number | null; met: boolean | null; applicable: boolean };
    /** Recommended tier (never blocks advancement) — see docs/plans/workbook-advancement-metric-plan.md. */
    wbCompletion: { completed: number; total: number; pct: number; met: boolean | null; required: false };
    wbScore:      { avg: number | null; threshold: number; met: boolean | null; required: false };
  };
  metCount: number;
  totalRequirements: number;
  progressPct: number;
  isReadyToAdvance: boolean;
  levelUpScore: LevelUpScore | null;
}

export type LevelPathway = 'group' | 'private' | 'rating';

export interface LevelProgress {
  currentLevelId: string | null;
  /** Which pathway resolved currentLevelId — null when no level. */
  levelPathway: LevelPathway | null;
  curriculumLessons: number;
  attended: number;
  missedCount: number;
  homeworkAccessible: number;
  homeworkCompleted: number;
  homeworkScoreAvg: number | null;
  totalMissions: number;
  succeededMissions: number;
  uscfGoal: number | null;
  /** Recommended tier (never blocks advancement) — see docs/plans/workbook-advancement-metric-plan.md. */
  workbookExists: boolean;
  workbookOwned: boolean;
  workbookTotalPositions: number;
  workbookPositionsCompleted: number;
  workbookScoreAvg: number | null;
  /** The ordered level ladder with the student's place on it (studentActivity.service.js `journeyShape`). */
  journey: LevelJourney;
}

export interface LevelJourneyLevel {
  _id: string;
  name: string;
  order: number;
}

export interface LevelJourney {
  levels: LevelJourneyLevel[];
  currentIndex: number;
  currentLevel: LevelJourneyLevel | null;
  nextLevel: LevelJourneyLevel | null;
}

/** GET /student-activity/streak — studentActivity.service.js getActivityStreak. */
export interface StreakResponse {
  currentStreak: number;
}

/** GET /student-activity/badge-counts — studentActivity.service.js getBadgeCounts. */
export interface BadgeCounts {
  homework: number;
  missions: number;
}

// ── Group class + subscription types the student profile references ──────────

/**
 * Populated GroupClass reference embedded in a GroupClassSchedule listing item.
 * Validated against backend/src/models/groupClass.model.js — only the fields
 * the ckq.service.js `getAllGroupClasses` populate+select actually returns
 * (`.populate({ path: 'groupClass', select: 'name maxStrength' })`).
 */
export interface GroupClass {
  _id?: string;
  name: string;
  maxStrength?: number;
}

/**
 * A populated Location reference. Validated against
 * backend/src/models/location.model.js. Some callers populate the full
 * document (e.g. student.service.js `buildStudentProfile`'s
 * `.populate({ path: 'location' })` with no select), others only
 * `{_id, name}` (ckq.service.js listing selects) — every field beyond
 * `_id` is therefore optional here to cover both population depths.
 */
export interface LocationRef {
  _id?: string;
  name?: string;
  city?: string;
  state?: string;
  streetAddress?: string;
  zipCode?: string;
  country?: string;
  timezone?: string;
}

/**
 * A single class-schedule item as returned by GET /ckq/group-class-schedules
 * (CkqService.getFlatGroupClassSchedules) and the grouped-by-level
 * GET /ckq/group-classes (CkqService.getAllGroupClasses) — see the
 * `validSchedules` mapping in backend/src/services/ckq.service.js. Every
 * field below is unconditional EXCEPT the three pricing fields, which are
 * only included when the caller passed `includePricing=true`.
 * Cross-checked against backend/src/models/groupClassSchedule.model.js for
 * the underlying stored fields (daysOfWeek, startTime/endTime, isOnline,
 * classLink, startDate — also present when this same model is populated
 * via student.service.js `buildStudentProfile`, which selects no fields on
 * the top-level schedule populate, unlike the listing endpoints above).
 */
export interface GroupClassSchedule {
  _id: string;
  groupClass: GroupClass;
  isOnline: boolean;
  /** null for online schedules — the backend never returns a location object in that case. */
  location?: LocationRef | null;
  coach?: { _id?: string; firstName?: string; lastName?: string };
  startTime: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  daysOfWeek: string[];
  availableSpots?: number;
  level?: { _id?: string; name?: string; desc?: string };
  /** Zoom/meeting link — only present on schedules populated by student.service.js (raw model field, not selected by the ckq.service.js listing endpoints). */
  classLink?: string;
  /** Present only when the schedules query was called with includePricing=true. */
  oneClassFees?: number | null;
  monthlyFees?: number | null;
  premiumOnlineFee?: number | null;
  premiumHybridFee?: number | null;
}

/**
 * A schedule's next N occurrences (holiday-aware), as computed by
 * backend/src/utils/scheduleUtils.js `getUpcomingDatesForSchedule`.
 * `holidayName` is always present in the return value (`?? null`), never
 * omitted — kept optional here anyway since older/other callers may not set it.
 */
interface GroupClassUpcomingDate {
  date: string;
  isHoliday: boolean;
  holidayName?: string | null;
  /** Backend-computed (scheduleUtils.js `isToday`, Eastern time) — never derived on the client. */
  isToday: boolean;
}

/** The schedule's next class occurrence — scheduleUtils.js `buildNextClass`. `null` when none is upcoming. */
export interface NextClass {
  date: string;
  startsAt: string;
  endsAt: string;
  isToday: boolean;
  /** "Today" / "Tomorrow" / weekday / "MMM D" — rendered verbatim. */
  label: string;
}

/** The Monday-to-Sunday (Eastern) week strip — scheduleUtils.js `buildClassWeek`. */
export interface ClassWeek {
  label: string;
  days: Array<{ date: string; dayShort: string; dayNum: number; isToday: boolean; hasClass: boolean }>;
}

/**
 * A GroupClassSchedule annotated with `upcomingDates` — the shape produced by
 * student.service.js `buildStudentProfile` for `activeGroupClassRegistration.serviceTypeId`
 * and each entry of `premiumSchedules`. `upcomingDates` is always assigned (never
 * left undefined) once this annotation step runs, so it is required here (not optional).
 */
export interface ScheduleWithUpcomingDates extends GroupClassSchedule {
  upcomingDates: GroupClassUpcomingDate[];
  nextClass: NextClass | null;
}

/**
 * Populated GroupClassSchedule reference embedded on a Subscription, as returned
 * by both getMySubscriptions' aggregation $lookup chain (subscription.service.js
 * ~lines 746-805: schedule → level, coach, location, groupClass → price) and
 * (via the same underlying GroupClassSchedule model) student.service.js's
 * mongoose `.populate()` chain. `location` uses the shared `LocationRef` since
 * the aggregate's location $lookup returns the full Location document, not a
 * `{_id, name}` slice.
 */
export interface SubscriptionScheduleRef {
  _id: string;
  groupClass?: {
    _id?: string;
    name?: string;
    /** Populated via the aggregate's price $lookup. Not currently read by any consumer. */
    price?: {
      monthlyFees?: number | null;
      oneClassFees?: number | null;
      premiumOnlineFee?: number | null;
      premiumHybridFee?: number | null;
      premiumInPersonFee?: number | null;
    };
  };
  coach?: { _id?: string; firstName?: string; lastName?: string };
  location?: LocationRef | null;
  level?: { _id?: string; name?: string };
  daysOfWeek?: string[];
  startTime?: string;
  endTime?: string;
  isOnline?: boolean;
  /** Zoom/meeting link — raw GroupClassSchedule field, present when populated by student.service.js. */
  classLink?: string;
}

/**
 * Validated against backend/src/models/subscription.model.js — the enrollment
 * record backing group-class registrations (schedule ref, status, billing
 * flags). `student`/`parent` may be a raw ObjectId string or a populated
 * ref depending on the endpoint.
 */
/** Subscription.premiumType (backend subscription.model.js enum). */
export type PremiumType = "online" | "inPerson" | "hybrid";

export interface Subscription {
  _id: string;
  parent?: string | { _id: string; firstName?: string; lastName?: string };
  student?: string | { _id: string; firstName?: string; lastName?: string; email?: string };
  schedule?: SubscriptionScheduleRef | null;
  status: "active" | "inactive" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed";
  subscriptionEndDate?: string | null;
  isSiblingApplied?: boolean;
  agreedRate?: number;
  cancelAtPeriodEnd?: boolean;
  isPremium?: boolean;
  /** Set by the backend when isPremium is true. Never derived on the frontend (ADR frontend-005). */
  premiumType?: PremiumType;
  /** Soft-delete/enabled flag — distinct from `status`. Defaults true on the model. */
  isActive?: boolean;
  isDeleted?: boolean;
  /**
   * How many daily payment retries remain before cancellation — computed
   * server-side ($addFields in the getMySubscriptions aggregate,
   * subscription.service.js ~lines 807-816). Only present on that endpoint's
   * response, not on subscriptions embedded elsewhere (e.g. PortalStudent.activeSubscription).
   */
  retriesLeft?: number;
  /**
   * What the next renewal run will charge for this subscription — computed
   * server-side from calculateUpcomingPayment() (the same single source the
   * renewal cron charges from; Hard Rule #8). Dollars, not cents. Present only
   * on renewal-eligible rows of the getMySubscriptions endpoint (active, not
   * cancelAtPeriodEnd); null when the backend calculation errored.
   */
  monthlyCost?: number | null;
  /** Same vocabulary as the admin upcoming-payments preview (subscription.service.js). */
  billingStatus?: "will_charge" | "credit_applied" | "credit_covered" | "scholarship" | "already_charged" | "error";
  /** Full discount breakdown behind monthlyCost (paymentCalculator.js calculateUpcomingPayment). */
  calculation?: SubscriptionCalculation | null;
  /** Present only when billingStatus === "error". */
  calculationError?: string;
  createdAt?: string;
}

/**
 * The renewal calculator's breakdown, as attached per-subscription by
 * getMySubscriptions (backend/src/utils/paymentCalculator.js — the exact
 * object the renewal cron charges from). All money fields are dollars.
 */
interface SubscriptionCalculation {
  originalAmount: number;
  finalAmount: number;
  sessionCount?: number;
  isScholarship?: boolean;
  membershipDiscountAmount?: number;
  isSiblingApplied?: boolean;
  siblingDiscountAmount?: number;
  isCreditApplied?: boolean;
  creditDiscountAmount?: number;
  /** 'list' | 'agreed' — which base rate billed (ADR backend-011). */
  rateSource?: string;
}

// ── Student profile (GET /student/details) ──────────────────────────────────


/**
 * The enriched student shape returned by GET /student/details (buildStudentProfile
 * in backend/src/services/student.service.js) and consumed across the parent
 * portal (ParentPortalContext.students, register-flow pages). This is a
 * narrower slice — only the fields the parent-portal register flows actually
 * read — not the full backend shape (which also carries previousClasses,
 * upcomingTournaments, upcomingCamps, premiumSchedules, etc.).
 * NOTE: ParentPortalContext itself still types `students` as `any[]` — that
 * migration is tracked separately and out of scope here.
 */
export interface EnrolledStudent {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  userName?: string;
  school?: string;
  grade?: string;
  hasUsedTrialClass?: boolean;
  uscfId?: string;
  uscfRating?: number | string | null;
  /** True only when isFreeForSubscribers tournaments/backend academy eligibility applies. */
  isAcademyEligible?: boolean;
  /** Raw Subscription doc (or a lightweight subset) — non-null means an active group-class enrollment. */
  activeSubscription?: { _id?: string; isActive?: boolean; status?: string } | null;
  /** Raw TrialClass doc (or a lightweight subset) — non-null means a booked/upcoming trial. */
  trialClass?: { _id: string } | null;
}

// ── PortalStudent — the full buildStudentProfile shape ──────────────────────────
// Validated against backend/src/services/student.service.js `buildStudentProfile`
// (~lines 292-470), the single source of truth for both GET /student/details
// (parent portal, getAllStudentDetails) and GET /student/details/:id
// (student portal, getStudentDetails/getUserById).

/**
 * A GroupClassSession-scoped coach entry — `groupClassSession.model.js`
 * `coaches: [{ coach, role }]`, populated by `buildStudentProfile` with
 * `.populate('coaches.coach', 'firstName lastName')`.
 */
interface PortalSessionCoach {
  coach?: { _id?: string; firstName?: string; lastName?: string };
  role: "primary" | "substitute";
}

/**
 * `trialClass.groupClassSession`, populated by `buildStudentProfile`
 * (student.service.js ~lines 304-314): groupClass{name}, coaches.coach{firstName,lastName},
 * location (full doc, no select), level{name}.
 */
export interface PortalTrialClassSession {
  _id: string;
  startDate: string;
  endDate?: string;
  /** Raw GroupClassSession field (groupClassSession.model.js `isOnline`, required
   *  on the model) — the populate chain only narrows sub-refs, so `.lean()`
   *  returns it. Read by TrialAtAGlance (`session?.isOnline ? "Online" : …`). */
  isOnline?: boolean;
  /** Raw GroupClassSession field (groupClassSession.model.js `groupClassSchedule`,
   *  required ObjectId ref) — NOT populated on this path, so it arrives as the
   *  id string. Read by confirm-trial/[id]/page.tsx
   *  (`String(currentSession.groupClassSchedule ?? "")`). */
  groupClassSchedule?: string;
  groupClass?: { _id?: string; name?: string };
  coaches?: PortalSessionCoach[];
  location?: LocationRef | null;
  level?: { _id?: string; name?: string };
}

/**
 * `student.trialClass` — a TrialClass doc (trialClass.model.js), populated
 * with its groupClassSession (student.service.js ~lines 300-314). Non-null
 * means a booked (scheduled) or missed trial exists.
 */
interface PortalTrialClass {
  _id: string;
  status: "scheduled" | "attended" | "missed" | "cancelled";
  groupClassSession?: PortalTrialClassSession | null;
}

/**
 * `student.nextTrialClass` / each entry of `student.previousClasses` — a
 * GroupClassSession doc (groupClassSession.model.js), populated by
 * `buildStudentProfile` (~lines 380-413):
 *   nextTrialClass:    groupClassSchedule{daysOfWeek,classLink}, coaches.coach{firstName,lastName},
 *                       level{name}, location{name} (the backend also selects a
 *                       non-existent "address" field — location.model.js has no such
 *                       field, so it never actually comes back), groupClass{name,description}, lesson{lessonTitle}
 *   previousClasses:   same populate chain, but groupClassSchedule selects only 'daysOfWeek' (no classLink)
 */
export interface PortalClassSession {
  _id: string;
  startDate: string;
  endDate?: string;
  /** Raw GroupClassSession field — always present (required on the model); no select narrows the top-level document in this populate chain. */
  isOnline: boolean;
  groupClassSchedule?: { _id?: string; daysOfWeek?: string[]; classLink?: string } | null;
  coaches?: PortalSessionCoach[];
  level?: { _id?: string; name?: string };
  location?: { _id?: string; name?: string } | null;
  groupClass?: { _id?: string; name?: string; description?: string };
  lesson?: { _id?: string; lessonTitle?: string } | null;
}

/**
 * `student.activeSubscription` — a Subscription doc (subscription.model.js),
 * populated by `buildStudentProfile` (~lines 317-340): `schedule` and
 * `homeSchedule` both populate the full GroupClassSchedule doc (only
 * sub-refs are select-narrowed: groupClass{name}, coach{firstName,lastName},
 * location full, level{name}). `schedule` is annotated with `upcomingDates`
 * (~lines 361-368) — the annotation mutates the SAME object that
 * `activeGroupClassRegistration.serviceTypeId` points to (spread only copies
 * the top-level Subscription fields, not a deep clone of `schedule`), so
 * `upcomingDates` ends up present on `activeSubscription.schedule` too.
 */
export interface PopulatedActiveSubscription extends Omit<Subscription, "schedule"> {
  schedule: ScheduleWithUpcomingDates | null;
  homeSchedule?: GroupClassSchedule | null;
}

/**
 * `student.activeGroupClassRegistration` — `{ ...activeSubscription, serviceTypeId: activeSubscription.schedule }`
 * (student.service.js ~lines 361-368). `serviceTypeId` and `schedule` are the
 * SAME object reference (see PopulatedActiveSubscription doc above).
 */
export interface ActiveGroupClassRegistration extends PopulatedActiveSubscription {
  serviceTypeId: ScheduleWithUpcomingDates | null;
}

/**
 * `student.premiumSchedules` — GroupClassSchedule docs: the online schedules at the
 * active subscription's level, led by the in-person home schedule for a hybrid
 * premium sub (student.service.js buildStudentProfile), each annotated
 * with `upcomingDates` (~lines 369-375). Only populated (non-null) when the
 * active subscription is premium.
 */
export type PortalPremiumSchedule = ScheduleWithUpcomingDates;

/**
 * `student.upcomingTournaments` — TournamentSchedule docs (tournamentSchedule.model.js),
 * populated with `.populate('tournament', 'name')` (student.service.js ~lines 429-437).
 */
export interface PortalUpcomingTournament {
  _id: string;
  tournamentStartDate: string;
  tournamentEndDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  isRegistrationOpen: boolean;
  tournament?: { _id?: string; name?: string };
}

/**
 * `student.upcomingCamps` — CampSchedule docs (campSchedule.model.js), populated
 * with `.populate('camp', 'name location').populate('coach', 'firstName lastName')`
 * (student.service.js ~lines 440-449). `camp.location` is an unpopulated
 * ObjectId string (Camp.model.js has no nested populate here).
 */
export interface PortalUpcomingCamp {
  _id: string;
  startDate: string;
  endDate: string;
  isOnline: boolean;
  camp?: { _id?: string; name?: string; location?: string | null };
  coach?: { _id?: string; firstName?: string; lastName?: string }[];
}

/**
 * `student.upcomingAfterschool` — AfterschoolSchedule docs, `.select()`ed to
 * this exact allowlist (baseCost/ptoAmount are internal accounting, never
 * sent) and populated with `.populate('school', 'name')` (student.service.js,
 * "Upcoming afterschool programs" block). No embedded students[] roster on the
 * schedule itself (unlike Camp/Tournament) — the backend derives this list
 * from Registration, see that block's comment.
 */
export interface PortalUpcomingAfterschool {
  _id: string;
  term: string;
  grades: string;
  scheduleSummary: string;
  sessionDates: string[];
  registrationDeadline: string;
  school?: { _id?: string; name?: string };
}

/**
 * `student.activePrivateClassEnrollments` — active (`accepted`, non-ended)
 * `PrivateClassEnrollment` docs for this student (private-class-only
 * students have no group `Subscription`/`activeGroupClassRegistration`, so
 * this is their only student-portal-visible class data). Added by
 * `buildStudentProfile` (student.service.js) via the shared
 * `activePrivateEnrollmentQuery` predicate (academyEligibility.service.js) —
 * see PR 4 of `docs/plans/coach-feedback-lesson-plan-and-private-class-visibility-plan.md`.
 * `[]` when the student has no active private enrollment. `nextSession` is
 * the soonest upcoming real `PrivateClassSession` doc (never derived from
 * `dayOfWeek` arithmetic) — `null` when none is scheduled yet.
 */
export interface StudentPrivateClassEnrollmentSummary {
  _id: string;
  coach: { firstName: string; lastName: string };
  schedules: Array<{ _id: string; dayOfWeek: string; startTime: string; durationMinutes: number }>;
  nextSession: { _id: string; startDate: string; endDate: string } | null;
}

/**
 * The full enriched student profile — `buildStudentProfile`'s return
 * (student.service.js ~lines 451-464), spread over the base `select`
 * (~line 295: firstName, lastName, hasUsedTrialClass, uscfRating, uscfId,
 * fideRating, fideId, fideTitle, uscfTitle).
 */
export interface PortalStudent {
  _id: string;
  firstName: string;
  lastName: string;
  hasUsedTrialClass?: boolean;
  uscfRating?: number | string | null;
  uscfId?: string;
  fideRating?: number | string | null;
  fideId?: string;
  fideTitle?: string;
  uscfTitle?: string;
  trialClass: PortalTrialClass | null;
  activeSubscription: PopulatedActiveSubscription | null;
  activeGroupClassRegistration: ActiveGroupClassRegistration | null;
  premiumSchedules: PortalPremiumSchedule[] | null;
  nextTrialClass: PortalClassSession | null;
  previousClasses: PortalClassSession[];
  isAcademyEligible: boolean;
  isMember: boolean;
  membershipEndDate: string | null;
  upcomingTournaments: PortalUpcomingTournament[];
  upcomingCamps: PortalUpcomingCamp[];
  upcomingAfterschool: PortalUpcomingAfterschool[];
  activePrivateClassEnrollments: StudentPrivateClassEnrollmentSummary[];
  /** The schedule whose `nextClass` the home screen leads with (hybrid home schedule first); null when none. */
  nextScheduleId: string | null;
  classWeek: ClassWeek;
}

/** GET /student/details (parent portal) response envelope. */
export interface GetAllStudentDetailsResponse {
  status: "success" | "error";
  message?: string;
  data?: { students: PortalStudent[] };
}

/** GET /student/details/:id (student portal) response envelope. */
export interface GetStudentDetailsResponse {
  status: "success" | "error";
  message?: string;
  data?: PortalStudent;
}
