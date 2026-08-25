// ── Homework session — pure computations ────────────────────────────────────
//
// Small, genuinely pure computations extracted verbatim (behavior-identical)
// from website2.0's homework-report page
// (`src/app/(nonheadless)/portal/@student/homework-report/[id]/page.tsx`) and
// `PuzzleBoard.tsx`. This is Phase 3a of the mobile-app plan — the narrow
// "lift the inline arithmetic" slice, NOT the Phase 3 "rewrite the timer as a
// state machine" work. See `docs/plans/mobile-app-plan.md` Phase 3 and
// `docs/modules/homework.md` for the underlying business rules.
//
// IMPORTANT: none of these functions compute or apply attempt-based score
// decay (100%/50%/25% for attempt 1/2/3 — see homework.md's "Attempt system"
// and "Score calculation" sections). That decay is applied **server-side
// only** (Hard Rule #8 — backend is the source of truth for scoring/business
// logic). The client always sends a flat `score: 100` for a correct answer,
// or the quiz evaluator's own time-based score for an incorrect one; this
// file must never diverge from that.

/**
 * Rush strikes remaining before the student is blocked to 1 attempt per
 * position. Ported verbatim from the homework-report page's `strikesLeft`
 * (`page.tsx` lines 229-231). Clamped to 0 — `activeViolations` can exceed
 * `rushViolationsToBlock` transiently, and the UI must never show a negative
 * strike count. See `docs/modules/homework.md`'s "Strike (rush limit) system".
 */
export function computeStrikesLeft(rushViolationsToBlock: number, activeViolations: number): number {
  return Math.max(0, rushViolationsToBlock - activeViolations);
}

/**
 * Formats the rush-strike minimum-think-time threshold for display. Ported
 * verbatim from the homework-report page's `rushThresholdDisplay`
 * (`page.tsx` lines 234-242): seconds under a minute are shown as
 * `"N sec"`; a minute or more is shown as `"M min"` when there's no leftover
 * seconds, or `"Mm Ss"` otherwise. See `docs/modules/homework.md`'s "Strike
 * (rush limit) system" for what `minThinkTimePct` means (a strike is recorded
 * when `timeTaken < (minThinkTimePct / 100) × positionTimeLimit`).
 */
export function formatRushThreshold(minThinkTimePct: number, timeLimit: number): string {
  const secs = Math.floor((minThinkTimePct / 100) * timeLimit);
  if (secs < 60) return `${secs} sec`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `${m} min` : `${m}m ${s}s`;
}

export interface ResumePoint {
  initialPuzzleIdx: number;
  initialTimeRemaining: number;
}

/**
 * Computes where a student resumes an in-progress homework set: which
 * position to start on, and how much time remains on the timer. Ported
 * verbatim from the homework-report page's `handleCompleteHomework`
 * (`page.tsx` lines 108-115). `timeSpentSeconds` is the previously-persisted
 * elapsed time on the current position (see homework.md's "Timer rules" >
 * "Persistence" — this only ever applies to Attempt 1 with no move made yet;
 * the caller is responsible for only invoking this in that scenario).
 */
export function computeResumePoint(
  completedCount: number,
  timeSpentSeconds: number,
  timeLimit: number,
): ResumePoint {
  return {
    initialPuzzleIdx: completedCount,
    initialTimeRemaining: Math.max(0, timeLimit - timeSpentSeconds),
  };
}

/**
 * Whether the "leave homework?" confirmation dialog should be shown when the
 * student tries to close the puzzle dialog mid-position. Ported verbatim from
 * the homework-report page's `handleDialogCloseRequest`
 * (`page.tsx` lines 165-166). Per `docs/modules/homework.md`'s "Warning on
 * exit" section, the warning appears if **either**: the student has played
 * the correct first move of a multi-move puzzle and not yet completed the
 * sequence (`puzzleInProgress`), **or** they are on attempt 2+ for the
 * current position (`attemptsUsedOnCurrentPuzzle > 0`). No warning appears
 * only on Attempt 1 with no move made — closing there is always free.
 */
export function shouldShowExitWarning(puzzleInProgress: boolean, attemptsUsedOnCurrentPuzzle: number): boolean {
  return puzzleInProgress || attemptsUsedOnCurrentPuzzle > 0;
}

/**
 * Whether the student has attempts remaining on a position. Ported verbatim
 * from the homework-report page's `handleShouldRetry`
 * (`page.tsx` lines 193-197).
 */
export function hasAttemptsRemaining(attemptsUsedOnPosition: number, maxAttempts: number): boolean {
  return attemptsUsedOnPosition < maxAttempts;
}

export interface EffectiveMaxAttempts {
  maxAttempts: number;
  pendingBlock: boolean;
}

/**
 * Resolves the "deferred block" rule: a rush-block reduces future positions'
 * attempts to 1, but never retroactively shrinks a position already in
 * progress. Ported verbatim from the homework-report page's
 * `onPositionComplete` (`page.tsx` lines 391-396, the `isNewPosition` /
 * `pendingBlockRef` half). Per `docs/modules/homework.md`'s "Strike (rush
 * limit) system" > "Strike effects": on strike 3, the student is limited to
 * 1 attempt per position for any position they have not yet started;
 * positions already in progress keep their original attempt count. The block
 * is applied only when a *new* position begins while a block is pending —
 * never immediately when the strike is recorded.
 */
export function resolveEffectiveMaxAttempts(
  isNewPosition: boolean,
  pendingBlock: boolean,
  currentMaxAttempts: number,
): EffectiveMaxAttempts {
  if (isNewPosition && pendingBlock) {
    return { maxAttempts: 1, pendingBlock: false };
  }
  return { maxAttempts: currentMaxAttempts, pendingBlock };
}

export interface AttemptRecordResult {
  attemptsUsed: Record<number, number>;
  shouldAdvanceIndex: boolean;
}

/**
 * Immutably records that an attempt was made on `positionIndex`, and decides
 * whether the current-position index should advance. Ported verbatim from
 * the homework-report page's `onPositionComplete`
 * (`page.tsx` lines 397-401, the attempts-used counter + advance-index
 * decision half) — behavior-identical, but returns a new `attemptsUsed`
 * object instead of mutating a ref, so this function is pure/testable.
 * Per `docs/modules/homework.md`: a correct answer always advances; a wrong
 * answer advances only once all attempts are exhausted.
 */
export function recordAttemptAndShouldAdvance(
  attemptsUsed: Record<number, number>,
  positionIndex: number,
  isCorrect: boolean,
  maxAttempts: number,
): AttemptRecordResult {
  const newCount = (attemptsUsed[positionIndex] ?? 0) + 1;
  const nextAttemptsUsed = { ...attemptsUsed, [positionIndex]: newCount };
  const shouldAdvanceIndex = isCorrect || newCount >= maxAttempts;
  return { attemptsUsed: nextAttemptsUsed, shouldAdvanceIndex };
}

/**
 * Computes the `timeTaken` value recorded for a completed position. Ported
 * verbatim from `PuzzleBoard.tsx`'s `onMove` callback (lines 225-227).
 * Untimed puzzles (`timeLimit === null`, e.g. workbook mode) have no
 * countdown to subtract from, so the caller supplies the already-computed
 * wall-clock elapsed seconds instead (`Math.round((Date.now() - mountedAt) /
 * 1000)` at the call site — this function stays pure and never reads the
 * clock itself). Timed puzzles use the countdown-remaining value captured at
 * the moment the puzzle was resolved.
 */
export function computeTimeTaken(
  timeLimit: number | null,
  secondsLeftAtDone: number | null,
  elapsedWallClockSeconds: number,
): number {
  return timeLimit === null
    ? elapsedWallClockSeconds
    : Math.max(0, timeLimit - (secondsLeftAtDone ?? 0));
}
