import {
  formatThinkSeconds,
  shouldShowExitWarning,
  computeTimeTaken,
} from '../homeworkSession';

describe('formatThinkSeconds', () => {
  test('normal case: sub-minute seconds format as "N sec"', () => {
    expect(formatThinkSeconds(6)).toBe('6 sec');
    expect(formatThinkSeconds(36)).toBe('36 sec');
  });

  test('boundary: zero seconds', () => {
    expect(formatThinkSeconds(0)).toBe('0 sec');
  });

  test('boundary: just under a minute still formats as seconds', () => {
    expect(formatThinkSeconds(59)).toBe('59 sec');
  });

  test('boundary: exactly 60 seconds formats as whole minutes with no leftover', () => {
    expect(formatThinkSeconds(60)).toBe('1 min');
    expect(formatThinkSeconds(120)).toBe('2 min');
  });

  test('minute-and-seconds case formats as "Mm Ss"', () => {
    expect(formatThinkSeconds(90)).toBe('1m 30s');
    expect(formatThinkSeconds(150)).toBe('2m 30s');
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
