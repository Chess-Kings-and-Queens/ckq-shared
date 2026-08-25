import { computeTimeTaken } from './homeworkSession';

// ── Puzzle attempt reducer ───────────────────────────────────────────────────
//
// Phase 3b of the mobile-app plan (`docs/plans/mobile-app-plan.md` Phase 3) —
// a genuine rewrite, not a mechanical port. website2.0's
// `src/app/components/chess/PuzzleBoard.tsx`'s `SinglePuzzle` function
// (lines 25-361) encodes a single homework/quiz-position attempt's state
// machine as ~18 React refs, `useState` booleans, and effect-cleanup timing,
// relying on the whole component being unmounted/remounted (via a `key={puzzleIdx}`
// at the parent) to reset per-puzzle state. This module re-derives the exact
// same behavior as a pure, framework-free reducer: `reducePuzzleAttempt(state,
// event)` returns the next state plus a list of side-effect *intents* — it
// never itself calls `setTimeout`, `Date.now()`, or any board/DOM API. See
// `docs/modules/homework.md` for the human-readable business rules ("Timer
// rules", "Attempt system", "Answer evaluation", "Multi-move puzzles",
// "Warning on exit").
//
// ── The phase model ──────────────────────────────────────────────────────────
//
// The original tracks five booleans/state slots simultaneously:
// `quizDone`, `quizResult`, `moveMade`, `briefCorrect`, `autoRetrying`
// (`PuzzleBoard.tsx` lines 63-72). This reducer replaces those five with one
// `PuzzlePhase` enum (`secondsLeft` remains its own field, unchanged in kind —
// see `PuzzleAttemptState`). The mapping, derived line-by-line from the
// original:
//
//   'playing'                    — `!quizDone`: the student can move.
//   'brief-correct'               — `briefCorrect === true`: a mid-sequence
//                                    correct move was just played and the
//                                    opponent is about to reply. This is a
//                                    sub-state of "not yet resolved" — entered
//                                    from 'playing' and returned to 'playing'
//                                    once the opponent's reply lands (see
//                                    `OPPONENT_REPLIED` below). It is NOT
//                                    entered when the puzzle's FINAL move is
//                                    correct — that goes straight to
//                                    'resolved-correct'.
//   'resolved-correct'            — `quizDone && quizResult === 'correct'`.
//                                    Always auto-advances; there is no retry
//                                    concept for a correct answer.
//   'resolved-incorrect-retry'    — `quizDone && quizResult === 'incorrect'
//                                    && autoRetrying === true`.
//   'resolved-incorrect-final'    — `quizDone && quizResult === 'incorrect'
//                                    && autoRetrying === false`: the Continue
//                                    button shows (`PuzzleBoard.tsx` line 352).
//
// `moveMade` (used only for the "White/Black to play" status text, line 336)
// is not carried as a separate boolean here — an adapter can derive the same
// fact from `state.moves.length > 0`, since this reducer already accumulates
// the move sequence as state.
//
// ── The `canRetry` external input ────────────────────────────────────────────
//
// "Is a retry available for this position" (`onShouldRetry(puzzleNumber - 1)`
// in the original, called at lines 167 and 251) depends on state that lives
// entirely outside a single position's component — the parent homework page's
// attempts-used/max-attempts bookkeeping (`@ckq/shared`'s
// `hasAttemptsRemaining`, already extracted in Phase 3a — see
// `homeworkSession.ts`). This reducer cannot and must not compute that fact
// itself. Every event whose transition depends on it (`TICK`'s timeout branch,
// `PLAYER_MOVE` with `result: 'incorrect'`) carries a `canRetry: boolean` field
// that the caller supplies, having already called `hasAttemptsRemaining`
// itself. This is the same category of "externally-supplied fact" as
// `UciSession`'s `startReady` option (`uciSession.ts`).
//
// ── Side effects this reducer never performs ─────────────────────────────────
//
// - No `setTimeout`/`clearTimeout` — every delayed action (retry-reset,
//   auto-advance, brief-overlay clear, opponent-reply) is emitted as a
//   `SCHEDULE` effect for the adapter to time.
// - No `Date.now()` — wall-clock-elapsed time (needed only for untimed
//   puzzles' `computeTimeTaken` fallback) is supplied by the caller on the
//   `PLAYER_MOVE` event as `elapsedWallClockSeconds`.
// - No board/evaluator calls (`board.applySan`, `board.loadFen`,
//   `evaluator.reset()`, `evaluator.onOpponentMoved()`) — the adapter performs
//   these itself, driven by the phase transitions and effects described below.

// ── Types ─────────────────────────────────────────────────────────────────────

export type PuzzlePhase =
  | 'playing'
  | 'brief-correct'
  | 'resolved-correct'
  | 'resolved-incorrect-retry'
  | 'resolved-incorrect-final';

/**
 * State for a single puzzle/position attempt. One instance's lifetime matches
 * one mount of `SinglePuzzle` (a retry resets it in place rather than
 * remounting — see `RETRY_RESET` below).
 */
export interface PuzzleAttemptState {
  phase: PuzzlePhase;
  /** Seconds remaining on the countdown. Null for untimed puzzles (workbook
   *  mode, `timeLimit === null`) — mirrors `secondsLeft`, `PuzzleBoard.tsx`
   *  line 72. */
  secondsLeft: number | null;
  /** The full move sequence played so far in this attempt (student + opponent
   *  SANs, in order) — mirrors `movesRef.current`, `PuzzleBoard.tsx` line 93.
   *  Reset to `[]` on retry (line 113); never reset on an opponent-reply or
   *  mid-sequence transition. */
  moves: string[];
  /** The position's full timer duration in seconds, or null if untimed.
   *  Immutable for this state's whole lifetime (including across retries) —
   *  a `RETRY_RESET` restores `secondsLeft` to exactly this value, NOT to any
   *  `initialTimeRemaining`/resume value (`PuzzleBoard.tsx` line 111 vs the
   *  `effectiveStart` computation at line 71 — resume time only ever applies
   *  once, on the very first mount). */
  readonly timeLimit: number | null;
}

/**
 * Builds the initial state for a freshly mounted puzzle. Mirrors
 * `effectiveStart = initialTimeRemaining ?? timeLimit` and
 * `useState<number | null>(effectiveStart)` (`PuzzleBoard.tsx` lines 71-72).
 *
 * @param timeLimit Seconds per attempt, or null for untimed (workbook).
 * @param initialTimeRemaining Seconds to resume from (persisted timer from an
 *   earlier session) — only ever relevant for the very first attempt on a
 *   position, never a retry. Omit/null to start from the full `timeLimit`.
 */
export function initPuzzleAttemptState(
  timeLimit: number | null,
  initialTimeRemaining?: number | null,
): PuzzleAttemptState {
  return {
    phase: 'playing',
    secondsLeft: initialTimeRemaining ?? timeLimit,
    moves: [],
    timeLimit,
  };
}

/**
 * Events this reducer accepts. Each variant cites the `PuzzleBoard.tsx` lines
 * it re-derives behavior from — see the per-handler comments in
 * `reducePuzzleAttempt` below for the full trace.
 */
export type PuzzleAttemptEvent =
  /**
   * One countdown second has elapsed (the adapter's own 1000ms interval —
   * `PuzzleBoard.tsx` lines 146-180). `canRetry` is only consulted if this
   * tick crosses zero (a timeout); the adapter must still supply it on every
   * tick since it cannot know in advance which tick that will be — same
   * shape as `hasAttemptsRemaining` being an externally-supplied fact
   * elsewhere in this event union.
   */
  | { type: 'TICK'; canRetry: boolean }
  /** The student's move resolved the puzzle correctly (final move of the
   *  sequence) — lines 210-240. */
  | { type: 'PLAYER_MOVE'; san: string; result: 'correct'; elapsedWallClockSeconds: number }
  /** The student's move resolved the puzzle incorrectly (either the final
   *  move was wrong, or any earlier move in the sequence was wrong) — lines
   *  241-257. `score` is the evaluator's own (opaque, time-decayed) score for
   *  this outcome — forwarded verbatim, never computed here. */
  | {
      type: 'PLAYER_MOVE';
      san: string;
      result: 'incorrect';
      score: number;
      canRetry: boolean;
      elapsedWallClockSeconds: number;
    }
  /** The student's move was correct so far but the sequence is not resolved
   *  yet — lines 258-268 (mid-sequence correct, `opponentSan` present) and the
   *  implicit unreachable else-branch (no `opponentSan`) covered by item 5 of
   *  the transition table this module was built from. */
  | { type: 'PLAYER_MOVE'; san: string; result: 'pending'; opponentSan?: string }
  /**
   * The adapter has applied the opponent's delayed reply to the board and
   * evaluator (`PuzzleBoard.tsx` lines 263-266, inside the 400ms
   * `setTimeout`). Not one of the transition table's 7 numbered items
   * verbatim — it is this reducer's counterpart to that delayed board/
   * evaluator mutation, required so the phase model can honor its own
   * documented rule that `'brief-correct'` "returns to playing after the
   * opponent's reply lands."
   */
  | { type: 'OPPONENT_REPLIED'; san: string }
  /**
   * Fired by the adapter ~1200ms after entering `'resolved-incorrect-retry'`
   * (the `doRetryResetRef` logic, lines 104-121). The adapter is responsible
   * for the timing and for the board-FEN-reload/`evaluator.reset()` calls
   * (lines 115-118) — this event only updates reducer state.
   */
  | { type: 'RETRY_RESET' }
  /**
   * Continue button click (`PuzzleBoard.tsx` lines 352-355, only reachable
   * from `'resolved-incorrect-final'`). Modeled as a pass-through no-op
   * rather than omitted from the union entirely, so a caller's exhaustive
   * `switch` over `PuzzleAttemptEvent['type']` stays complete — but it makes
   * no state change and emits no effects, because Continue's real job
   * ("advance to the next puzzle") belongs to the PARENT `PuzzleBoard`
   * component, not `SinglePuzzle`/this reducer: clicking it unmounts this
   * puzzle's state entirely and mounts a fresh one for the next position.
   */
  | { type: 'CONTINUE' };

/**
 * Side-effect intents this reducer emits. The reducer decides what SHOULD
 * happen; a caller-supplied adapter owns the actual `setTimeout`, DB write,
 * and board/evaluator calls.
 */
export type PuzzleAttemptEffect =
  /** Fire the DB-write callback (`onRecord` in the original) immediately —
   *  the outcome is known now, independent of any visual delay. */
  | { type: 'RECORD'; result: 'correct' | 'incorrect'; timeTaken: number; moves: string[]; score: number }
  /** `onPuzzleInProgressChange(false)` — always `false` in every transition
   *  this reducer emits it from (lines 166, 215); the field is kept for
   *  shape-symmetry/future-proofing rather than because `true` is ever
   *  emitted here (the `true` notification, lines 204-207, fires on the
   *  student's very first move regardless of outcome and is a one-shot
   *  mount-lifetime concern the adapter owns directly — it is not one of
   *  this reducer's numbered transitions). */
  | { type: 'NOTIFY_IN_PROGRESS'; inProgress: false }
  /** Run `onAdvanceRef.current()` after `delayMs` (correct-answer
   *  auto-advance, lines 237-239). Unconditional — no retry concept for a
   *  correct answer. */
  | { type: 'SCHEDULE'; kind: 'advance'; delayMs: number }
  /** Run `doRetryResetRef.current()` after `delayMs` (lines 169-171 timeout,
   *  251-256 incorrect move) — fire a `RETRY_RESET` event once the delay
   *  elapses. */
  | { type: 'SCHEDULE'; kind: 'retry-reset'; delayMs: number }
  /** Clear the brief-correct overlay after `delayMs` (line 262). The
   *  original clears any PREVIOUSLY pending clear-brief timer before setting
   *  a new one (line 261) — this reducer does not own timers, so the adapter
   *  is responsible for debouncing/replacing a still-pending clear-brief
   *  schedule; this effect is simply emitted every time a mid-sequence
   *  correct move fires. Purely a visual-overlay concern, decoupled from
   *  `PuzzlePhase` (which returns to `'playing'` on `OPPONENT_REPLIED`,
   *  independent of when this overlay clears). */
  | { type: 'SCHEDULE'; kind: 'clear-brief'; delayMs: number }
  /** Apply `opponentSan` to the board and evaluator after `delayMs` (lines
   *  263-267), then dispatch `OPPONENT_REPLIED` with that same SAN. */
  | { type: 'SCHEDULE'; kind: 'opponent-reply'; delayMs: number; opponentSan: string };

export interface PuzzleAttemptTransition {
  state: PuzzleAttemptState;
  effects: PuzzleAttemptEffect[];
}

// ── Reducer ───────────────────────────────────────────────────────────────────

/**
 * Advances a single puzzle attempt's state machine by one event. Pure — same
 * inputs always produce the same `{ state, effects }` output; never mutates
 * `state`.
 */
export function reducePuzzleAttempt(
  state: PuzzleAttemptState,
  event: PuzzleAttemptEvent,
): PuzzleAttemptTransition {
  switch (event.type) {
    case 'TICK':
      return handleTick(state, event);
    case 'PLAYER_MOVE':
      return handlePlayerMove(state, event);
    case 'OPPONENT_REPLIED':
      return handleOpponentReplied(state, event);
    case 'RETRY_RESET':
      return handleRetryReset(state);
    case 'CONTINUE':
      return { state, effects: [] };
  }
}

/** Item 1 — countdown tick, `PuzzleBoard.tsx` lines 146-180. */
function handleTick(
  state: PuzzleAttemptState,
  event: Extract<PuzzleAttemptEvent, { type: 'TICK' }>,
): PuzzleAttemptTransition {
  // Untimed puzzles never create the interval in the first place (the early
  // return at lines 137-144) — no-op mirrors that.
  if (state.timeLimit === null) return { state, effects: [] };
  // `quizDoneRef.current` guard (line 147) — once resolved, further ticks
  // (which the adapter should also be clearing its interval for) are no-ops.
  // `'brief-correct'` still counts as "not done" — the original's interval
  // keeps running through a mid-sequence brief-correct window too.
  if (state.phase !== 'playing' && state.phase !== 'brief-correct') {
    return { state, effects: [] };
  }

  const cur = state.secondsLeft ?? 0;
  if (cur <= 1) {
    // Timeout (lines 152-174). timeTaken is `timeLimit` DIRECTLY here — NOT
    // `computeTimeTaken` — a deliberate asymmetry versus every move-based
    // resolution path below (line 160). Preserved exactly, not "fixed."
    const effects: PuzzleAttemptEffect[] = [
      { type: 'RECORD', result: 'incorrect', timeTaken: state.timeLimit, moves: state.moves, score: 0 },
      { type: 'NOTIFY_IN_PROGRESS', inProgress: false }, // line 166
    ];
    const phase: PuzzlePhase = event.canRetry ? 'resolved-incorrect-retry' : 'resolved-incorrect-final';
    if (event.canRetry) {
      effects.push({ type: 'SCHEDULE', kind: 'retry-reset', delayMs: 1200 }); // lines 169-171
    }
    return { state: { ...state, phase, secondsLeft: 0 }, effects };
  }

  return { state: { ...state, secondsLeft: cur - 1 }, effects: [] };
}

/** Items 2, 3, 4, 5 — a player move, in its four possible outcomes. */
function handlePlayerMove(
  state: PuzzleAttemptState,
  event: Extract<PuzzleAttemptEvent, { type: 'PLAYER_MOVE' }>,
): PuzzleAttemptTransition {
  // Defensive: the board is disabled (`disabled: quizDone`) once resolved, so
  // a move event should never arrive after resolution. Guarded here anyway
  // rather than silently mis-recording a stray move.
  if (state.phase !== 'playing' && state.phase !== 'brief-correct') {
    return { state, effects: [] };
  }

  // Line 209 — the move is appended to the sequence unconditionally, before
  // branching on the evaluator's result.
  const moves = [...state.moves, event.san];

  if (event.result === 'correct') {
    // Item 2 — lines 210-240.
    const timeTaken = computeTimeTaken(state.timeLimit, state.secondsLeft, event.elapsedWallClockSeconds);
    return {
      state: { ...state, phase: 'resolved-correct', moves },
      effects: [
        { type: 'NOTIFY_IN_PROGRESS', inProgress: false }, // line 215 — fires FIRST, before any other state change
        { type: 'RECORD', result: 'correct', timeTaken, moves, score: 100 }, // line 236 — flat 100, never decayed
        { type: 'SCHEDULE', kind: 'advance', delayMs: 1200 }, // lines 237-239 — unconditional
      ],
    };
  }

  if (event.result === 'incorrect') {
    // Item 3 — lines 241-257.
    const timeTaken = computeTimeTaken(state.timeLimit, state.secondsLeft, event.elapsedWallClockSeconds);
    const phase: PuzzlePhase = event.canRetry ? 'resolved-incorrect-retry' : 'resolved-incorrect-final';
    const effects: PuzzleAttemptEffect[] = [
      { type: 'NOTIFY_IN_PROGRESS', inProgress: false }, // line 215 — same shared branch as the correct path
      { type: 'RECORD', result: 'incorrect', timeTaken, moves, score: event.score }, // line 247 — opaque evaluator score
    ];
    if (event.canRetry) {
      effects.push({ type: 'SCHEDULE', kind: 'retry-reset', delayMs: 1200 }); // lines 251-256
    }
    return { state: { ...state, phase, moves }, effects };
  }

  // event.result === 'pending'
  if (event.opponentSan) {
    // Item 4 — mid-sequence correct move, lines 258-268.
    return {
      state: { ...state, phase: 'brief-correct', moves },
      effects: [
        { type: 'SCHEDULE', kind: 'clear-brief', delayMs: 2000 }, // line 262
        { type: 'SCHEDULE', kind: 'opponent-reply', delayMs: 400, opponentSan: event.opponentSan }, // lines 263-267
      ],
    };
  }

  // Item 5 — the implicit, structurally-unreachable else-branch (`pending`
  // with no `opponentSan`). Preserved as a TRUE no-op: no phase change, no
  // effects. (The move is still folded into `moves` because that append at
  // line 209 is unconditional in the original — but that's a moves-array
  // fact, not a "phase change.")
  return { state: { ...state, moves }, effects: [] };
}

/**
 * Not one of the transition table's 7 numbered items — see the
 * `OPPONENT_REPLIED` event doc above for why this exists: it's the reducer
 * counterpart to `PuzzleBoard.tsx` lines 263-266's delayed
 * `board.applySan`/`evaluator.onOpponentMoved` calls, needed to complete the
 * phase model's `'brief-correct'` → `'playing'` return.
 */
function handleOpponentReplied(
  state: PuzzleAttemptState,
  event: Extract<PuzzleAttemptEvent, { type: 'OPPONENT_REPLIED' }>,
): PuzzleAttemptTransition {
  if (state.phase !== 'brief-correct') return { state, effects: [] };
  return {
    state: { ...state, phase: 'playing', moves: [...state.moves, event.san] },
    effects: [],
  };
}

/** Item 6 — the retry-reset logic, `PuzzleBoard.tsx` lines 104-121. */
function handleRetryReset(state: PuzzleAttemptState): PuzzleAttemptTransition {
  if (state.phase !== 'resolved-incorrect-retry') return { state, effects: [] };
  return {
    state: {
      ...state,
      phase: 'playing',
      secondsLeft: state.timeLimit, // line 111 — the full timeLimit, NOT initialTimeRemaining
      moves: [], // line 113
    },
    effects: [],
  };
}
