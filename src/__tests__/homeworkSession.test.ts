import {
  computeStrikesLeft,
  formatRushThreshold,
  computeResumePoint,
  shouldShowExitWarning,
  hasAttemptsRemaining,
  resolveEffectiveMaxAttempts,
  recordAttemptAndShouldAdvance,
  computeTimeTaken,
} from '../homeworkSession';

describe('computeStrikesLeft', () => {
  test('normal case: subtracts active violations from the threshold', () => {
    expect(computeStrikesLeft(3, 1)).toBe(2);
  });

  test('boundary: clamps to 0 rather than going negative when violations exceed the threshold', () => {
    expect(computeStrikesLeft(3, 5)).toBe(0);
  });

  test('boundary: exactly at the threshold leaves 0 strikes', () => {
    expect(computeStrikesLeft(3, 3)).toBe(0);
  });

  test('no violations yet leaves the full threshold', () => {
    expect(computeStrikesLeft(3, 0)).toBe(3);
  });
});

describe('formatRushThreshold', () => {
  test('normal case: sub-minute threshold formats as seconds', () => {
    // 20% of 180s = 36s
    expect(formatRushThreshold(20, 180)).toBe('36 sec');
  });

  test('boundary: exactly 60 seconds formats as whole minutes with no leftover', () => {
    // 20% of 300s = 60s
    expect(formatRushThreshold(20, 300)).toBe('1 min');
  });

  test('minute-and-seconds case formats as "Mm Ss"', () => {
    // 20% of 600s = 120s -> 2 min exactly
    expect(formatRushThreshold(20, 600)).toBe('2 min');
    // 25% of 600s = 150s -> 2m 30s
    expect(formatRushThreshold(25, 600)).toBe('2m 30s');
  });

  test('boundary: just under 60 seconds still formats as seconds', () => {
    expect(formatRushThreshold(19, 300)).toBe('57 sec');
  });
});

describe('computeResumePoint', () => {
  test('normal case: resumes at the completed count with remaining time', () => {
    expect(computeResumePoint(2, 30, 180)).toEqual({
      initialPuzzleIdx: 2,
      initialTimeRemaining: 150,
    });
  });

  test('boundary: time spent exceeding the limit clamps remaining time to 0', () => {
    expect(computeResumePoint(0, 200, 180)).toEqual({
      initialPuzzleIdx: 0,
      initialTimeRemaining: 0,
    });
  });

  test('no time spent yet leaves the full time limit remaining', () => {
    expect(computeResumePoint(0, 0, 180)).toEqual({
      initialPuzzleIdx: 0,
      initialTimeRemaining: 180,
    });
  });
});

describe('shouldShowExitWarning', () => {
  test('normal case: puzzle in progress (mid multi-move sequence) shows the warning', () => {
    expect(shouldShowExitWarning(true, 0)).toBe(true);
  });

  test('normal case: attempt 2+ on the current position shows the warning', () => {
    expect(shouldShowExitWarning(false, 1)).toBe(true);
  });

  test('boundary: attempt 1 with no move made shows no warning (free close)', () => {
    expect(shouldShowExitWarning(false, 0)).toBe(false);
  });

  test('both conditions true still shows the warning', () => {
    expect(shouldShowExitWarning(true, 2)).toBe(true);
  });
});

describe('hasAttemptsRemaining', () => {
  test('normal case: attempts used below the max leaves attempts remaining', () => {
    expect(hasAttemptsRemaining(1, 3)).toBe(true);
  });

  test('boundary: a position never attempted before (0 used) has attempts remaining', () => {
    expect(hasAttemptsRemaining(0, 3)).toBe(true);
  });

  test('boundary: attempts used equal to the max has none remaining', () => {
    expect(hasAttemptsRemaining(3, 3)).toBe(false);
  });

  test('attempts used exceeding the max has none remaining', () => {
    expect(hasAttemptsRemaining(4, 3)).toBe(false);
  });
});

describe('resolveEffectiveMaxAttempts', () => {
  test('normal case: a new position with a pending block gets reduced to 1 attempt, clearing the pending flag', () => {
    expect(resolveEffectiveMaxAttempts(true, true, 3)).toEqual({
      maxAttempts: 1,
      pendingBlock: false,
    });
  });

  test('boundary: pendingBlock true but NOT a new position must not apply the block yet', () => {
    expect(resolveEffectiveMaxAttempts(false, true, 3)).toEqual({
      maxAttempts: 3,
      pendingBlock: true,
    });
  });

  test('a new position with no pending block is unaffected', () => {
    expect(resolveEffectiveMaxAttempts(true, false, 3)).toEqual({
      maxAttempts: 3,
      pendingBlock: false,
    });
  });

  test('not a new position and no pending block is unaffected', () => {
    expect(resolveEffectiveMaxAttempts(false, false, 3)).toEqual({
      maxAttempts: 3,
      pendingBlock: false,
    });
  });
});

describe('recordAttemptAndShouldAdvance', () => {
  test('normal case: a position never attempted before increments from 0 to 1', () => {
    const result = recordAttemptAndShouldAdvance({}, 0, false, 3);
    expect(result.attemptsUsed).toEqual({ 0: 1 });
    expect(result.shouldAdvanceIndex).toBe(false);
  });

  test('correct answer always advances, even on the first attempt', () => {
    const result = recordAttemptAndShouldAdvance({}, 0, true, 3);
    expect(result.attemptsUsed).toEqual({ 0: 1 });
    expect(result.shouldAdvanceIndex).toBe(true);
  });

  test('wrong answer that exhausts max attempts advances', () => {
    const result = recordAttemptAndShouldAdvance({ 0: 2 }, 0, false, 3);
    expect(result.attemptsUsed).toEqual({ 0: 3 });
    expect(result.shouldAdvanceIndex).toBe(true);
  });

  test('wrong answer with attempts remaining does not advance', () => {
    const result = recordAttemptAndShouldAdvance({ 0: 1 }, 0, false, 3);
    expect(result.attemptsUsed).toEqual({ 0: 2 });
    expect(result.shouldAdvanceIndex).toBe(false);
  });

  test('does not mutate the input object (pure function)', () => {
    const input = { 0: 1 };
    const result = recordAttemptAndShouldAdvance(input, 0, false, 3);
    expect(input).toEqual({ 0: 1 });
    expect(result.attemptsUsed).not.toBe(input);
  });

  test('tracks multiple positions independently', () => {
    const input = { 0: 3 };
    const result = recordAttemptAndShouldAdvance(input, 1, true, 3);
    expect(result.attemptsUsed).toEqual({ 0: 3, 1: 1 });
  });
});

describe('computeTimeTaken', () => {
  test('normal case (timed): subtracts seconds remaining from the time limit', () => {
    expect(computeTimeTaken(180, 120, 999)).toBe(60);
  });

  test('untimed puzzle (timeLimit null) uses the caller-supplied elapsed wall-clock seconds', () => {
    expect(computeTimeTaken(null, null, 42)).toBe(42);
  });

  test('boundary: secondsLeftAtDone null on a timed puzzle treats it as 0 remaining', () => {
    expect(computeTimeTaken(180, null, 999)).toBe(180);
  });

  test('boundary: clamps to 0 rather than going negative if secondsLeftAtDone exceeds the limit', () => {
    expect(computeTimeTaken(180, 200, 999)).toBe(0);
  });

  test('answered instantly (secondsLeftAtDone equals the limit) yields 0 time taken', () => {
    expect(computeTimeTaken(180, 180, 999)).toBe(0);
  });
});
