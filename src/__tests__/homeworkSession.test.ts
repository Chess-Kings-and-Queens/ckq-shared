import {
  computeStrikesLeft,
  formatRushThreshold,
  shouldShowExitWarning,
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
