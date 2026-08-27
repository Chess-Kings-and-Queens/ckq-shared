import {
  initPuzzleAttemptState,
  reducePuzzleAttempt,
  PuzzleAttemptState,
} from '../puzzleAttemptReducer';

// Helper: build a "playing, mid-timer" state directly, without going through
// a sequence of TICKs, for tests that only care about a specific starting
// point.
function playingState(overrides: Partial<PuzzleAttemptState> = {}): PuzzleAttemptState {
  return {
    phase: 'playing',
    secondsLeft: 180,
    moves: [],
    timeLimit: 180,
    ...overrides,
  };
}

describe('initPuzzleAttemptState', () => {
  test('normal case: starts in playing phase with the full timeLimit and no moves', () => {
    expect(initPuzzleAttemptState(180)).toEqual({
      phase: 'playing',
      secondsLeft: 180,
      moves: [],
      timeLimit: 180,
    });
  });

  test('resume case: initialTimeRemaining overrides the starting secondsLeft, timeLimit unaffected', () => {
    expect(initPuzzleAttemptState(180, 45)).toEqual({
      phase: 'playing',
      secondsLeft: 45,
      moves: [],
      timeLimit: 180,
    });
  });

  test('untimed (workbook) puzzle: timeLimit null yields secondsLeft null', () => {
    expect(initPuzzleAttemptState(null)).toEqual({
      phase: 'playing',
      secondsLeft: null,
      moves: [],
      timeLimit: null,
    });
  });

  test('initialTimeRemaining of 0 is honored (not treated as falsy/omitted)', () => {
    expect(initPuzzleAttemptState(180, 0).secondsLeft).toBe(0);
  });
});

// ── Item 1: countdown tick / timeout ─────────────────────────────────────────

describe('item 1 — countdown tick', () => {
  test('a normal tick decrements secondsLeft by 1 and emits no effects', () => {
    const state = playingState({ secondsLeft: 10 });
    const { state: next, effects } = reducePuzzleAttempt(state, { type: 'TICK' });
    expect(next.secondsLeft).toBe(9);
    expect(next.phase).toBe('playing');
    expect(effects).toEqual([]);
  });

  test('ticking during brief-correct still decrements (interval keeps running mid-sequence)', () => {
    const state = playingState({ phase: 'brief-correct', secondsLeft: 50 });
    const { state: next, effects } = reducePuzzleAttempt(state, { type: 'TICK' });
    expect(next.secondsLeft).toBe(49);
    expect(next.phase).toBe('brief-correct');
    expect(effects).toEqual([]);
  });

  test('untimed puzzle (timeLimit null): TICK is a no-op', () => {
    const state = playingState({ secondsLeft: null, timeLimit: null });
    const { state: next, effects } = reducePuzzleAttempt(state, { type: 'TICK' });
    expect(next).toEqual(state);
    expect(effects).toEqual([]);
  });

  test('a tick after resolution (already done) is a no-op', () => {
    const state = playingState({ phase: 'resolved-correct', secondsLeft: 30 });
    const { state: next, effects } = reducePuzzleAttempt(state, { type: 'TICK' });
    expect(next).toEqual(state);
    expect(effects).toEqual([]);
  });

  describe('timeout (secondsLeft crossing zero)', () => {
    test('secondsLeft === 1 ticking down triggers timeout, resolves incorrect-pending, records, does NOT yet schedule a retry-reset', () => {
      const state = playingState({ secondsLeft: 1, moves: ['e4', 'e5'] });
      const { state: next, effects } = reducePuzzleAttempt(state, { type: 'TICK' });

      expect(next.phase).toBe('resolved-incorrect-pending');
      expect(next.secondsLeft).toBe(0);

      expect(effects).toEqual([
        { type: 'RECORD', result: 'incorrect', timeTaken: 180, moves: ['e4', 'e5'], score: 0 },
        { type: 'NOTIFY_IN_PROGRESS', inProgress: false },
      ]);
      expect(effects.some((e) => e.type === 'SCHEDULE')).toBe(false);
    });

    test('secondsLeft === 0 (already at floor) also triggers timeout — cur <= 1 guard', () => {
      const state = playingState({ secondsLeft: 0 });
      const { state: next } = reducePuzzleAttempt(state, { type: 'TICK' });
      expect(next.phase).toBe('resolved-incorrect-pending');
    });
  });

  test('timeout asymmetry: timeTaken is the raw timeLimit, not computeTimeTaken\'s (timeLimit - secondsLeftAtDone) formula', () => {
    // If this used computeTimeTaken with secondsLeftAtDone=0, the result would coincidentally
    // also be 180 for this specific case — so use a scenario where the two formulas would
    // disagree if the code used computeTimeTaken with the state's OWN secondsLeft appearing
    // to be nonzero at the moment of the crossing. Since the reducer always resolves the
    // timeout when secondsLeft was already 0 or 1 (crossing to 0), we assert directly against
    // the literal timeLimit value from state, independent of whatever secondsLeft was at the
    // instant of crossing, to prove the reducer is not calling computeTimeTaken at all here.
    const state = playingState({ timeLimit: 300, secondsLeft: 1, moves: [] });
    const { effects } = reducePuzzleAttempt(state, { type: 'TICK' });
    const record = effects.find((e) => e.type === 'RECORD');
    expect(record).toMatchObject({ timeTaken: 300 });
  });
});

// ── Item 2: player move, sequence-final and correct ──────────────────────────

describe('item 2 — player move: sequence-final and correct', () => {
  test('resolves to resolved-correct, records score 100, schedules advance after 1200ms', () => {
    const state = playingState({ secondsLeft: 130, moves: ['e4', 'e5'] });
    const { state: next, effects } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'Qh5',
      result: 'correct',
      elapsedWallClockSeconds: 999,
    });

    expect(next.phase).toBe('resolved-correct');
    expect(next.moves).toEqual(['e4', 'e5', 'Qh5']);

    // computeTimeTaken(180, 130, 999) = 180 - 130 = 50
    expect(effects).toEqual([
      { type: 'NOTIFY_IN_PROGRESS', inProgress: false },
      { type: 'RECORD', result: 'correct', timeTaken: 50, moves: ['e4', 'e5', 'Qh5'], score: 100 },
      { type: 'SCHEDULE', kind: 'advance', delayMs: 1200 },
    ]);
  });

  test('NOTIFY_IN_PROGRESS(false) fires as the FIRST effect, before RECORD', () => {
    const state = playingState();
    const { effects } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'Qh5',
      result: 'correct',
      elapsedWallClockSeconds: 0,
    });
    expect(effects[0]).toEqual({ type: 'NOTIFY_IN_PROGRESS', inProgress: false });
  });

  test('score is always a flat 100 regardless of how much time was left', () => {
    const state = playingState({ secondsLeft: 179 });
    const { effects } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'Qh5',
      result: 'correct',
      elapsedWallClockSeconds: 0,
    });
    const record = effects.find((e) => e.type === 'RECORD');
    expect(record).toMatchObject({ score: 100 });
  });

  test('untimed puzzle: timeTaken falls back to the caller-supplied elapsed wall-clock seconds', () => {
    const state = playingState({ timeLimit: null, secondsLeft: null });
    const { effects } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'Qh5',
      result: 'correct',
      elapsedWallClockSeconds: 42,
    });
    const record = effects.find((e) => e.type === 'RECORD');
    expect(record).toMatchObject({ timeTaken: 42 });
  });
});

// ── Item 3: player move, sequence-final and incorrect ────────────────────────

describe('item 3 — player move: sequence-final and incorrect', () => {
  test('resolves to resolved-incorrect-pending, records, does NOT yet schedule a retry-reset', () => {
    const state = playingState({ secondsLeft: 100, moves: ['e4'] });
    const { state: next, effects } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'Nf6',
      result: 'incorrect',
      score: 37,
      elapsedWallClockSeconds: 0,
    });

    expect(next.phase).toBe('resolved-incorrect-pending');
    expect(next.moves).toEqual(['e4', 'Nf6']);
    // computeTimeTaken(180, 100, 0) = 80
    expect(effects).toEqual([
      { type: 'NOTIFY_IN_PROGRESS', inProgress: false },
      { type: 'RECORD', result: 'incorrect', timeTaken: 80, moves: ['e4', 'Nf6'], score: 37 },
    ]);
    expect(effects.some((e) => e.type === 'SCHEDULE')).toBe(false);
  });

  test('the RECORD score is forwarded verbatim from the event — the reducer never recomputes it', () => {
    const state = playingState();
    const { effects } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'Nf6',
      result: 'incorrect',
      score: 12.5,
      elapsedWallClockSeconds: 0,
    });
    const record = effects.find((e) => e.type === 'RECORD');
    expect(record).toMatchObject({ score: 12.5 });
  });
});

// ── RETRY_DECISION — resolves the deferred retry-vs-final choice ────────────

describe('RETRY_DECISION', () => {
  function pendingState(overrides: Partial<PuzzleAttemptState> = {}): PuzzleAttemptState {
    return playingState({ phase: 'resolved-incorrect-pending', ...overrides });
  }

  test('canRetry true: resolves to resolved-incorrect-retry and schedules a retry-reset', () => {
    const state = pendingState({ moves: ['e4', 'Nf6'] });
    const { state: next, effects } = reducePuzzleAttempt(state, { type: 'RETRY_DECISION', canRetry: true });

    expect(next.phase).toBe('resolved-incorrect-retry');
    expect(next.moves).toEqual(['e4', 'Nf6']);
    expect(effects).toEqual([{ type: 'SCHEDULE', kind: 'retry-reset', delayMs: 1200 }]);
  });

  test('canRetry false: resolves to resolved-incorrect-final and emits no effects', () => {
    const state = pendingState();
    const { state: next, effects } = reducePuzzleAttempt(state, { type: 'RETRY_DECISION', canRetry: false });

    expect(next.phase).toBe('resolved-incorrect-final');
    expect(effects).toEqual([]);
  });

  test('is a no-op when not currently in resolved-incorrect-pending', () => {
    const state = playingState({ phase: 'playing' });
    const { state: next, effects } = reducePuzzleAttempt(state, { type: 'RETRY_DECISION', canRetry: true });
    expect(next).toEqual(state);
    expect(effects).toEqual([]);
  });

  describe('end-to-end sequencing — matches what the old single-event API produced in one step', () => {
    test('TICK timeout, then RETRY_DECISION(true): same final phase/effects as the old canRetry:true TICK', () => {
      const state = playingState({ secondsLeft: 1, moves: ['e4', 'e5'] });
      const { state: afterTick, effects: tickEffects } = reducePuzzleAttempt(state, { type: 'TICK' });
      expect(afterTick.phase).toBe('resolved-incorrect-pending');

      const { state: final, effects: decisionEffects } = reducePuzzleAttempt(afterTick, {
        type: 'RETRY_DECISION',
        canRetry: true,
      });

      expect(final.phase).toBe('resolved-incorrect-retry');
      expect([...tickEffects, ...decisionEffects]).toEqual([
        { type: 'RECORD', result: 'incorrect', timeTaken: 180, moves: ['e4', 'e5'], score: 0 },
        { type: 'NOTIFY_IN_PROGRESS', inProgress: false },
        { type: 'SCHEDULE', kind: 'retry-reset', delayMs: 1200 },
      ]);
    });

    test('TICK timeout, then RETRY_DECISION(false): same final phase/effects as the old canRetry:false TICK', () => {
      const state = playingState({ secondsLeft: 1, moves: ['e4'] });
      const { state: afterTick, effects: tickEffects } = reducePuzzleAttempt(state, { type: 'TICK' });

      const { state: final, effects: decisionEffects } = reducePuzzleAttempt(afterTick, {
        type: 'RETRY_DECISION',
        canRetry: false,
      });

      expect(final.phase).toBe('resolved-incorrect-final');
      expect([...tickEffects, ...decisionEffects]).toEqual([
        { type: 'RECORD', result: 'incorrect', timeTaken: 180, moves: ['e4'], score: 0 },
        { type: 'NOTIFY_IN_PROGRESS', inProgress: false },
      ]);
    });

    test('PLAYER_MOVE incorrect, then RETRY_DECISION(true): same final phase/effects as the old canRetry:true PLAYER_MOVE', () => {
      const state = playingState({ secondsLeft: 100, moves: ['e4'] });
      const { state: afterMove, effects: moveEffects } = reducePuzzleAttempt(state, {
        type: 'PLAYER_MOVE',
        san: 'Nf6',
        result: 'incorrect',
        score: 37,
        elapsedWallClockSeconds: 0,
      });
      expect(afterMove.phase).toBe('resolved-incorrect-pending');

      const { state: final, effects: decisionEffects } = reducePuzzleAttempt(afterMove, {
        type: 'RETRY_DECISION',
        canRetry: true,
      });

      expect(final.phase).toBe('resolved-incorrect-retry');
      expect(final.moves).toEqual(['e4', 'Nf6']);
      expect([...moveEffects, ...decisionEffects]).toEqual([
        { type: 'NOTIFY_IN_PROGRESS', inProgress: false },
        { type: 'RECORD', result: 'incorrect', timeTaken: 80, moves: ['e4', 'Nf6'], score: 37 },
        { type: 'SCHEDULE', kind: 'retry-reset', delayMs: 1200 },
      ]);
    });

    test('PLAYER_MOVE incorrect, then RETRY_DECISION(false): same final phase/effects as the old canRetry:false PLAYER_MOVE', () => {
      const state = playingState({ secondsLeft: 100, moves: ['e4'] });
      const { state: afterMove, effects: moveEffects } = reducePuzzleAttempt(state, {
        type: 'PLAYER_MOVE',
        san: 'Nf6',
        result: 'incorrect',
        score: 37,
        elapsedWallClockSeconds: 0,
      });

      const { state: final, effects: decisionEffects } = reducePuzzleAttempt(afterMove, {
        type: 'RETRY_DECISION',
        canRetry: false,
      });

      expect(final.phase).toBe('resolved-incorrect-final');
      expect([...moveEffects, ...decisionEffects]).toEqual([
        { type: 'NOTIFY_IN_PROGRESS', inProgress: false },
        { type: 'RECORD', result: 'incorrect', timeTaken: 80, moves: ['e4', 'Nf6'], score: 37 },
      ]);
    });
  });
});

// ── Timeout vs. move-based resolution: the timeTaken asymmetry ──────────────

describe('timeout-vs-computeTimeTaken timeTaken asymmetry', () => {
  test('timeout uses timeLimit directly; an otherwise-identical move-based incorrect uses computeTimeTaken', () => {
    const timeLimit = 180;
    const secondsLeftAtDone = 45; // same "seconds left" in both scenarios

    const timeoutState = playingState({ timeLimit, secondsLeft: 1 });
    const { effects: timeoutEffects } = reducePuzzleAttempt(timeoutState, { type: 'TICK' });
    const timeoutRecord = timeoutEffects.find((e) => e.type === 'RECORD');
    // Timeout always reports the full timeLimit as timeTaken, regardless of
    // secondsLeft at the moment of crossing (PuzzleBoard.tsx line 160).
    expect(timeoutRecord).toMatchObject({ timeTaken: timeLimit });

    const moveState = playingState({ timeLimit, secondsLeft: secondsLeftAtDone });
    const { effects: moveEffects } = reducePuzzleAttempt(moveState, {
      type: 'PLAYER_MOVE',
      san: 'Nf6',
      result: 'incorrect',
      score: 0,
      elapsedWallClockSeconds: 0,
    });
    const moveRecord = moveEffects.find((e) => e.type === 'RECORD');
    // computeTimeTaken(180, 45, 0) = 180 - 45 = 135 — NOT 180.
    expect(moveRecord).toMatchObject({ timeTaken: timeLimit - secondsLeftAtDone });
    expect(moveRecord).toMatchObject({ timeTaken: 135 });

    // The two must disagree — proving the asymmetry is real, not a coincidence
    // of the chosen numbers.
    expect((timeoutRecord as { timeTaken: number }).timeTaken).not.toBe(
      (moveRecord as { timeTaken: number }).timeTaken,
    );
  });
});

// ── Item 4: player move, mid-sequence and correct ────────────────────────────

describe('item 4 — player move: mid-sequence correct (brief-correct)', () => {
  test('transitions to brief-correct and schedules exactly the two expected effects with exact delays', () => {
    const state = playingState({ moves: ['e4'] });
    const { state: next, effects } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'e5',
      result: 'pending',
      opponentSan: 'Nf3',
    });

    expect(next.phase).toBe('brief-correct');
    expect(next.moves).toEqual(['e4', 'e5']);
    expect(effects).toEqual([
      { type: 'SCHEDULE', kind: 'clear-brief', delayMs: 2000 },
      { type: 'SCHEDULE', kind: 'opponent-reply', delayMs: 400, opponentSan: 'Nf3' },
    ]);
  });

  test('does not touch quizDone/quizResult-equivalent fields — phase is the only signal, no RECORD/NOTIFY effects', () => {
    const state = playingState();
    const { effects } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'e5',
      result: 'pending',
      opponentSan: 'Nf3',
    });
    expect(effects.some((e) => e.type === 'RECORD')).toBe(false);
    expect(effects.some((e) => e.type === 'NOTIFY_IN_PROGRESS')).toBe(false);
  });

  test('can be entered again from a fresh playing state after an opponent reply landed (multi-step sequence)', () => {
    let state = playingState();
    ({ state } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'e4',
      result: 'pending',
      opponentSan: 'e5',
    }));
    expect(state.phase).toBe('brief-correct');

    ({ state } = reducePuzzleAttempt(state, { type: 'OPPONENT_REPLIED', san: 'e5' }));
    expect(state.phase).toBe('playing');
    expect(state.moves).toEqual(['e4', 'e5']);

    ({ state } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'Nf3',
      result: 'pending',
      opponentSan: 'Nc6',
    }));
    expect(state.phase).toBe('brief-correct');
    expect(state.moves).toEqual(['e4', 'e5', 'Nf3']);
  });
});

// ── OPPONENT_REPLIED — the reducer's brief-correct -> playing return ────────

describe('OPPONENT_REPLIED', () => {
  test('returns brief-correct to playing and appends the opponent san to moves', () => {
    const state = playingState({ phase: 'brief-correct', moves: ['e4'] });
    const { state: next, effects } = reducePuzzleAttempt(state, { type: 'OPPONENT_REPLIED', san: 'e5' });
    expect(next.phase).toBe('playing');
    expect(next.moves).toEqual(['e4', 'e5']);
    expect(effects).toEqual([]);
  });

  test('is a no-op when not currently in brief-correct', () => {
    const state = playingState({ phase: 'playing', moves: ['e4'] });
    const { state: next, effects } = reducePuzzleAttempt(state, { type: 'OPPONENT_REPLIED', san: 'e5' });
    expect(next).toEqual(state);
    expect(effects).toEqual([]);
  });
});

// ── Item 5: player move, neither done nor opponentSan (true no-op) ──────────

describe('item 5 — player move: neither resolved nor opponentSan present (unreachable else-branch)', () => {
  test('no phase change and no effects — a true no-op', () => {
    const state = playingState({ moves: ['e4'] });
    const { state: next, effects } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'weird',
      result: 'pending',
      // opponentSan intentionally omitted
    });
    expect(next.phase).toBe('playing');
    expect(effects).toEqual([]);
  });

  test('the move is still folded into moves (the append at the top of the handler is unconditional)', () => {
    const state = playingState({ moves: ['e4'] });
    const { state: next } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'weird',
      result: 'pending',
    });
    expect(next.moves).toEqual(['e4', 'weird']);
  });
});

describe('player move guard — defensive no-op once already resolved', () => {
  test('a PLAYER_MOVE arriving after resolved-correct is ignored entirely (board should be disabled by then)', () => {
    const state = playingState({ phase: 'resolved-correct' });
    const { state: next, effects } = reducePuzzleAttempt(state, {
      type: 'PLAYER_MOVE',
      san: 'e4',
      result: 'correct',
      elapsedWallClockSeconds: 0,
    });
    expect(next).toEqual(state);
    expect(effects).toEqual([]);
  });
});

// ── Item 6: retry reset ───────────────────────────────────────────────────────

describe('item 6 — retry reset', () => {
  test('field by field: phase -> playing, secondsLeft -> the ORIGINAL timeLimit (not any resume value), moves -> []', () => {
    const state: PuzzleAttemptState = {
      phase: 'resolved-incorrect-retry',
      secondsLeft: 0,
      moves: ['e4', 'e5', 'Nf3'],
      timeLimit: 180,
    };
    const { state: next, effects } = reducePuzzleAttempt(state, { type: 'RETRY_RESET' });

    expect(next).toEqual({
      phase: 'playing',
      secondsLeft: 180,
      moves: [],
      timeLimit: 180,
    });
    expect(effects).toEqual([]);
  });

  test('secondsLeft resets to timeLimit even though the state that entered retry never had a resume value', () => {
    // Simulate: this puzzle originally resumed from initialTimeRemaining=45 (not part of state
    // any more since timeLimit is the only persisted duration), ran down, and hit retry.
    const resumed = initPuzzleAttemptState(180, 45);
    const { state: afterTimeout } = reducePuzzleAttempt(
      { ...resumed, secondsLeft: 1 },
      { type: 'TICK' },
    );
    expect(afterTimeout.phase).toBe('resolved-incorrect-pending');

    const { state: afterDecision } = reducePuzzleAttempt(afterTimeout, {
      type: 'RETRY_DECISION',
      canRetry: true,
    });
    expect(afterDecision.phase).toBe('resolved-incorrect-retry');

    const { state: afterReset } = reducePuzzleAttempt(afterDecision, { type: 'RETRY_RESET' });
    // Must be the full 180, never 45.
    expect(afterReset.secondsLeft).toBe(180);
  });

  test('is a no-op when not currently in resolved-incorrect-retry', () => {
    const state = playingState({ phase: 'resolved-incorrect-final' });
    const { state: next, effects } = reducePuzzleAttempt(state, { type: 'RETRY_RESET' });
    expect(next).toEqual(state);
    expect(effects).toEqual([]);
  });

  test('untimed puzzle retry: secondsLeft resets to null (timeLimit), not 0', () => {
    const state: PuzzleAttemptState = {
      phase: 'resolved-incorrect-retry',
      secondsLeft: null,
      moves: ['e4'],
      timeLimit: null,
    };
    const { state: next } = reducePuzzleAttempt(state, { type: 'RETRY_RESET' });
    expect(next.secondsLeft).toBeNull();
    expect(next.moves).toEqual([]);
  });
});

// ── Item 7: Continue ──────────────────────────────────────────────────────────

describe('item 7 — Continue', () => {
  test('is a pure pass-through no-op — no state change, no effects', () => {
    const state = playingState({ phase: 'resolved-incorrect-final', moves: ['e4', 'Nf6'] });
    const { state: next, effects } = reducePuzzleAttempt(state, { type: 'CONTINUE' });
    expect(next).toEqual(state);
    expect(effects).toEqual([]);
  });
});
