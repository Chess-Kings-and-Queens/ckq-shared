// ── Homework session — pure computations ────────────────────────────────────
//
// Small, genuinely pure computations extracted verbatim (behavior-identical)
// from website2.0's homework-report page
// (`src/app/(nonheadless)/portal/@student/homework-report/[id]/page.tsx`) and
// `PuzzleBoard.tsx`. This is Phase 3a of the mobile-app plan — the narrow
// "lift the inline arithmetic" slice, NOT the Phase 3 "rewrite the timer as a
// state machine" work. See `docs/plans/mobile-app-plan.md` Phase 3 and
// `docs/modules/homework.md` for the underlying business rules.
// Since v0.28.0 the strike arithmetic (strikes left, threshold seconds) is backend-sent (ADR frontend-010); this file keeps client timing and dialog rules only.
//
// IMPORTANT: none of these functions compute points. Points come only from
// `attemptScoring.ts`, run by the backend and the liveboard server (Hard Rule #8,
// ADR backend-051). The client sends the moves it played and nothing else.

/**
 * Formats a whole number of seconds for the rush-strike notice: under a minute "N sec", otherwise "M min" with no
 * leftover seconds or "Mm Ss". Pure presentation: the seconds come from the backend (`rushThresholdSeconds`).
 */
export function formatThinkSeconds(secs: number): string {
  if (secs < 60) return `${secs} sec`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `${m} min` : `${m}m ${s}s`;
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

export type PositionAdvance = { kind: 'retry' } | { kind: 'move'; to: number | null };

/** What the board does after a saved answer: the server decides (positionDone, nextPositionIndex). A browser-correct answer the server left open moves to the server's index (a remount of the same position). */
export function positionAdvance(outcome: { positionDone: boolean; nextPositionIndex: number | null }, previewCorrect: boolean): PositionAdvance {
  if (!outcome.positionDone && !previewCorrect) return { kind: 'retry' };
  return { kind: 'move', to: outcome.nextPositionIndex };
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
