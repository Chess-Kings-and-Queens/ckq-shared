import {
  clampEngineLevel,
  engineGoCommand,
  engineLevelLabel,
  engineSearchLimits,
  type EngineSearchLimits,
} from '../engineStrength';
import { engineLevelLabel as engineLevelLabelFromIndex } from '../index';

// Literal copy of the plan §5.1 table — never derived from the function under test.
const EXPECTED: ReadonlyArray<readonly [number, number, number | null, number]> = [
  [1, 0, 1, 50],
  [2, 0, 1, 100],
  [3, 1, 2, 100],
  [4, 2, 2, 150],
  [5, 3, 3, 150],
  [6, 4, 3, 200],
  [7, 5, 4, 200],
  [8, 6, 5, 250],
  [9, 7, 5, 300],
  [10, 9, 6, 300],
  [11, 11, 8, 400],
  [12, 12, 9, 400],
  [13, 14, 10, 450],
  [14, 15, 12, 500],
  [15, 16, 13, 500],
  [16, 17, 15, 600],
  [17, 18, 17, 700],
  [18, 19, 19, 800],
  [19, 20, 22, 900],
  [20, 20, null, 1000],
];

describe('engineSearchLimits', () => {
  test.each(EXPECTED)('level %i → skillLevel %i, depth %s, movetime %i', (level, skillLevel, depth, movetime) => {
    expect(engineSearchLimits(level)).toEqual({ skillLevel, depth, movetime });
  });

  test('the table is monotonic from level 1 to 19', () => {
    for (let level = 1; level < 19; level++) {
      const a = engineSearchLimits(level);
      const b = engineSearchLimits(level + 1);
      expect(b.skillLevel).toBeGreaterThanOrEqual(a.skillLevel);
      expect(b.depth as number).toBeGreaterThanOrEqual(a.depth as number);
      expect(b.movetime).toBeGreaterThanOrEqual(a.movetime);
    }
  });

  test('every row is within range; depth is null only at level 20', () => {
    for (let level = 1; level <= 20; level++) {
      const row = engineSearchLimits(level);
      expect(row.skillLevel).toBeGreaterThanOrEqual(0);
      expect(row.skillLevel).toBeLessThanOrEqual(20);
      if (level === 20) {
        expect(row.depth).toBeNull();
      } else {
        expect(row.depth).not.toBeNull();
        expect(row.depth as number).toBeGreaterThanOrEqual(1);
      }
      expect(row.movetime).toBeGreaterThanOrEqual(50);
      expect(row.movetime).toBeLessThanOrEqual(1000);
    }
  });

  test('returns a fresh object each call', () => {
    const first: EngineSearchLimits = engineSearchLimits(10);
    first.skillLevel = 99;
    first.movetime = 1;
    expect(engineSearchLimits(10)).toEqual({ skillLevel: 9, depth: 6, movetime: 300 });
  });

  test('clamps internally: 25 → row 20, 0 → row 1', () => {
    expect(engineSearchLimits(25)).toEqual({ skillLevel: 20, depth: null, movetime: 1000 });
    expect(engineSearchLimits(0)).toEqual({ skillLevel: 0, depth: 1, movetime: 50 });
  });
});

describe('clampEngineLevel', () => {
  test.each([
    [0, 1],
    [25, 20],
    [7.4, 7],
    [7.5, 8],
    [NaN, 20],
    [-Infinity, 20],
    [Infinity, 20],
  ])('%p → %p', (input, expected) => {
    expect(clampEngineLevel(input)).toBe(expected);
  });
});

describe('engineGoCommand', () => {
  test('level 20 is an uncapped 1000 ms search', () => {
    expect(engineGoCommand(20)).toBe('go movetime 1000');
  });

  test('level 1 is depth 1 at 50 ms', () => {
    expect(engineGoCommand(1)).toBe('go depth 1 movetime 50');
  });

  test('25 is clamped to 20', () => {
    expect(engineGoCommand(25)).toBe('go movetime 1000');
  });
});

describe('engineLevelLabel', () => {
  test.each([
    [1, 'Beginner'],
    [4, 'Beginner'],
    [5, 'Casual'],
    [8, 'Casual'],
    [9, 'Club'],
    [12, 'Club'],
    [13, 'Strong'],
    [16, 'Strong'],
    [17, 'Expert'],
    [19, 'Expert'],
    [20, 'Strongest'],
    [0, 'Beginner'],
    [25, 'Strongest'],
  ])('level %i → %s', (level, label) => {
    expect(engineLevelLabel(level)).toBe(label);
  });

  test('is exported from the package index', () => {
    expect(engineLevelLabelFromIndex(20)).toBe('Strongest');
  });
});
