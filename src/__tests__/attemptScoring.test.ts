import {
  ATTEMPT_PERCENT_SLOTS,
  DEFAULT_ATTEMPT_SCORING,
  attemptPercent,
  attemptScoringError,
  creditOfVerdict,
  pointsOf,
  resolveAttemptScoring,
  scoreAnswerAttempts,
  scoreLineAttempts,
} from '../attemptScoring';
import type { AttemptCredit, AttemptScoring, LineAttempt } from '../attemptScoring';
import { QuizEvaluator } from '../quizEvaluator';
import { JUDGE_VERDICTS } from '../engineJudge';

// Expected values are the plan's section 5.6 worked examples, hand-computed (never produced by the code under test).

// Line R: white, 5 units, 9 plies. Line B: both sides, 5 units, 5 plies.
const LINE_R_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 *';
const LINE_B_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bc4 *';
// A 3-unit regular line (W13).
const LINE_3_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bc4 *';

const R = new QuizEvaluator(LINE_R_PGN);
const B = new QuizEvaluator(LINE_B_PGN, { bothSides: true });
const R3 = new QuizEvaluator(LINE_3_PGN);

const PREFIX_6 = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];
const MISS_AT_6 = [...PREFIX_6, 'Qh5'];
const FULL_LINE = [...PREFIX_6, 'c3', 'Nf6', 'd4'];

const att = (moves: string[], credit: AttemptCredit = 'none'): LineAttempt => ({ moves, credit });

const CUSTOM: AttemptScoring = { attemptPercents: [100, 60, 30], acceptablePercent: 40 };

/** The stored per-attempt scores: differences of the rounded running totals (positionResult.applyAttempt). */
function storedScores(attemptEarned: number[]): number[] {
  const out: number[] = [];
  let before = 0;
  let sum = 0;
  for (const e of attemptEarned) {
    sum += e;
    const after = pointsOf(sum, 100);
    out.push(after - before);
    before = after;
  }
  return out;
}

interface LineCase {
  name: string;
  evaluator: QuizEvaluator;
  attempts: LineAttempt[];
  allOrNothing?: boolean;
  scoring?: AttemptScoring;
  earned: number;
  attemptEarned: number[];
  stored: number[];
  resumeMoves: string[];
  solved: boolean;
}

const LINE_CASES: LineCase[] = [
  { name: 'W1 miss at ply 6', evaluator: R, attempts: [att(MISS_AT_6)], earned: 0.6, attemptEarned: [0.6], stored: [60], resumeMoves: PREFIX_6, solved: false },
  { name: 'W2 W1 then the full line', evaluator: R, attempts: [att(MISS_AT_6), att(FULL_LINE)], earned: 0.8, attemptEarned: [0.6, 0.2], stored: [60, 20], resumeMoves: [], solved: true },
  {
    name: 'W3 W1, a repeat miss, then the full line',
    evaluator: R,
    attempts: [att(MISS_AT_6), att(MISS_AT_6), att(FULL_LINE)],
    earned: 0.7,
    attemptEarned: [0.6, 0, 0.1],
    stored: [60, 0, 10],
    resumeMoves: [],
    solved: true,
  },
  { name: 'W4 acceptable on attempt 1', evaluator: R, attempts: [att([...PREFIX_6, 'Qb3'], 'acceptable')], earned: 0.8, attemptEarned: [0.8], stored: [80], resumeMoves: [], solved: true },
  {
    name: 'W5 W1 then acceptable on attempt 2',
    evaluator: R,
    attempts: [att(MISS_AT_6), att([...PREFIX_6, 'Qb3'], 'acceptable')],
    earned: 0.7,
    attemptEarned: [0.6, 0.1],
    stored: [60, 10],
    resumeMoves: [],
    solved: true,
  },
  { name: 'W6 a better move on attempt 1', evaluator: R, attempts: [att([...PREFIX_6, 'd4'], 'full')], earned: 1.0, attemptEarned: [1.0], stored: [100], resumeMoves: [], solved: true },
  { name: 'W7 time-out with no miss', evaluator: R, attempts: [att(['e4', 'e5', 'Nf3', 'Nc6'])], earned: 0.4, attemptEarned: [0.4], stored: [40], resumeMoves: ['e4', 'e5', 'Nf3', 'Nc6'], solved: false },
  { name: 'W8 three wrong first moves', evaluator: R, attempts: [att(['d4']), att(['d4']), att(['d4'])], earned: 0, attemptEarned: [0, 0, 0], stored: [0, 0, 0], resumeMoves: [], solved: false },
  {
    name: 'W9a all-or-nothing: W1 then the full line',
    evaluator: R,
    attempts: [att(MISS_AT_6), att(FULL_LINE)],
    allOrNothing: true,
    earned: 0.5,
    attemptEarned: [0, 0.5],
    stored: [0, 50],
    resumeMoves: [],
    solved: true,
  },
  {
    name: 'W9b all-or-nothing: three misses at ply 6',
    evaluator: R,
    attempts: [att(MISS_AT_6), att(MISS_AT_6), att(MISS_AT_6)],
    allOrNothing: true,
    earned: 0,
    attemptEarned: [0, 0, 0],
    stored: [0, 0, 0],
    resumeMoves: PREFIX_6,
    solved: false,
  },
  { name: 'W10 old data: W1 then a restart', evaluator: R, attempts: [att(MISS_AT_6), att(['d4'])], earned: 0.6, attemptEarned: [0.6, 0], stored: [60, 0], resumeMoves: PREFIX_6, solved: false },
  { name: 'W11 both sides, miss at ply 4', evaluator: B, attempts: [att(['e4', 'e5', 'Nf3', 'd6'])], earned: 0.6, attemptEarned: [0.6], stored: [60], resumeMoves: ['e4', 'e5', 'Nf3'], solved: false },
  {
    name: 'W12 time-out after a student move (reply added)',
    evaluator: R,
    attempts: [att(['e4', 'e5', 'Nf3'])],
    earned: 0.4,
    attemptEarned: [0.4],
    stored: [40],
    resumeMoves: ['e4', 'e5', 'Nf3', 'Nc6'],
    solved: false,
  },
  {
    name: 'W13 rounding on a 3-unit line',
    evaluator: R3,
    attempts: [att(['e4', 'e5', 'd4']), att(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])],
    earned: 0.6667,
    attemptEarned: [0.3333, 0.3333],
    stored: [33, 34],
    resumeMoves: [],
    solved: true,
  },
  {
    name: 'W14 custom settings, acceptable on attempt 2',
    evaluator: R,
    attempts: [att(MISS_AT_6), att([...PREFIX_6, 'Qb3'], 'acceptable')],
    scoring: CUSTOM,
    earned: 0.696,
    attemptEarned: [0.6, 0.096],
    stored: [60, 10],
    resumeMoves: [],
    solved: true,
  },
  {
    name: 'W15 attempt 2 times out with no new move',
    evaluator: R,
    attempts: [att(MISS_AT_6), att(PREFIX_6)],
    earned: 0.6,
    attemptEarned: [0.6, 0],
    stored: [60, 0],
    resumeMoves: PREFIX_6,
    solved: false,
  },
];

describe('scoreLineAttempts — worked examples', () => {
  test.each(LINE_CASES)('$name', ({ evaluator, attempts, allOrNothing, scoring, earned, attemptEarned, stored, resumeMoves, solved }) => {
    const line = scoreLineAttempts(evaluator, attempts, { scoring: scoring ?? DEFAULT_ATTEMPT_SCORING, allOrNothing });
    expect(line.earned).toBeCloseTo(earned, 4);
    expect(line.attemptEarned).toHaveLength(attemptEarned.length);
    attemptEarned.forEach((e, i) => expect(line.attemptEarned[i]).toBeCloseTo(e, 4));
    expect(storedScores(line.attemptEarned)).toEqual(stored);
    expect(line.resumeMoves).toEqual(resumeMoves);
    expect(line.solved).toBe(solved);
  });

  test("the owner's example: W2 on a 10-point position is 8 points", () => {
    const line = scoreLineAttempts(R, [att(MISS_AT_6), att(FULL_LINE)], { scoring: DEFAULT_ATTEMPT_SCORING });
    expect(pointsOf(line.earned, 10)).toBe(8);
  });

  test('a line with no student plies earns nothing and resumes nowhere', () => {
    const empty = new QuizEvaluator('*');
    expect(scoreLineAttempts(empty, [att(['e4']), att([])], { scoring: DEFAULT_ATTEMPT_SCORING })).toEqual({
      earned: 0,
      attemptEarned: [0, 0],
      solved: false,
      resumeMoves: [],
    });
  });

  test('no attempts: nothing earned, resume at the line start', () => {
    expect(scoreLineAttempts(R, [], { scoring: DEFAULT_ATTEMPT_SCORING })).toEqual({ earned: 0, attemptEarned: [], solved: false, resumeMoves: [] });
  });
});

describe('scoreAnswerAttempts — single answer', () => {
  test('a wrong then a correct attempt earns the second attempt percent (0.5)', () => {
    const line = scoreAnswerAttempts([{ isCorrect: false }, { isCorrect: true }], { scoring: DEFAULT_ATTEMPT_SCORING });
    expect(line.earned).toBe(0.5);
    expect(line.attemptEarned).toEqual([0, 0.5]);
    expect(line.resumeMoves).toEqual([]);
  });

  test('a correct first attempt earns 1', () => {
    expect(scoreAnswerAttempts([{ isCorrect: true }], { scoring: DEFAULT_ATTEMPT_SCORING }).earned).toBe(1);
  });

  test('three wrong attempts earn 0', () => {
    const line = scoreAnswerAttempts([{ isCorrect: false }, { isCorrect: false }, { isCorrect: false }], { scoring: DEFAULT_ATTEMPT_SCORING });
    expect(line.earned).toBe(0);
    expect(line.solved).toBe(false);
  });

  test('attempts after the first correct one earn nothing', () => {
    const line = scoreAnswerAttempts([{ isCorrect: true }, { isCorrect: true }], { scoring: DEFAULT_ATTEMPT_SCORING });
    expect(line.attemptEarned).toEqual([1, 0]);
  });
});

describe('attemptScoringError', () => {
  const ok = { attemptPercents: [100, 50, 25], acceptablePercent: 50 };

  test('accepts the defaults and the boundary values', () => {
    expect(attemptScoringError(ok)).toBeNull();
    expect(attemptScoringError({ attemptPercents: [100, 100, 100], acceptablePercent: 100 })).toBeNull();
    expect(attemptScoringError({ attemptPercents: [100, 0, 0], acceptablePercent: 0 })).toBeNull();
  });

  test.each([null, 5, 'x', []])('%p is not an object', (value) => {
    expect(attemptScoringError(value)).toBe('scoring must be an object');
  });

  test.each([
    [[100, 50]],
    [[100, 50, 25, 10]],
    [[100, 50.5, 25]],
    [[100, '50', 25]],
    [undefined],
  ])('attemptPercents %p is not 3 whole numbers', (attemptPercents) => {
    expect(attemptScoringError({ ...ok, attemptPercents })).toBe('attemptPercents must be 3 whole numbers');
  });

  test('the first attempt must be 100 (99 and 101 both fail)', () => {
    expect(attemptScoringError({ ...ok, attemptPercents: [99, 50, 25] })).toBe('The first attempt is always 100%');
    expect(attemptScoringError({ ...ok, attemptPercents: [101, 50, 25] })).toBe('The first attempt is always 100%');
  });

  test('an entry outside 0-100 fails (101 and -1)', () => {
    expect(attemptScoringError({ ...ok, attemptPercents: [100, 101, 25] })).toBe('Each attempt percent must be 0–100');
    expect(attemptScoringError({ ...ok, attemptPercents: [100, 50, -1] })).toBe('Each attempt percent must be 0–100');
  });

  test('a later attempt worth more than an earlier one fails (50 then 60)', () => {
    expect(attemptScoringError({ ...ok, attemptPercents: [100, 50, 60] })).toBe('A later attempt cannot be worth more than an earlier one');
  });

  test.each([101, -1, 50.5, '50', undefined])('acceptablePercent %p fails', (acceptablePercent) => {
    expect(attemptScoringError({ attemptPercents: [100, 50, 25], acceptablePercent })).toBe('acceptablePercent must be a whole number 0–100');
  });

  test('the first failing message wins', () => {
    expect(attemptScoringError({ attemptPercents: [99, 50, 60], acceptablePercent: 101 })).toBe('The first attempt is always 100%');
  });
});

describe('resolveAttemptScoring', () => {
  test('returns a valid value as given', () => {
    expect(resolveAttemptScoring(CUSTOM)).toBe(CUSTOM);
  });

  test('falls back to the defaults on an invalid value', () => {
    expect(resolveAttemptScoring({ attemptPercents: [100, 60, 70], acceptablePercent: 50 })).toBe(DEFAULT_ATTEMPT_SCORING);
    expect(resolveAttemptScoring(undefined)).toBe(DEFAULT_ATTEMPT_SCORING);
  });
});

describe('attemptPercent', () => {
  test('uses the table by attempt number, the first below 1 and the last above the table', () => {
    expect(attemptPercent(DEFAULT_ATTEMPT_SCORING, 0)).toBe(100);
    expect(attemptPercent(DEFAULT_ATTEMPT_SCORING, 1)).toBe(100);
    expect(attemptPercent(DEFAULT_ATTEMPT_SCORING, 2)).toBe(50);
    expect(attemptPercent(DEFAULT_ATTEMPT_SCORING, 3)).toBe(25);
    expect(attemptPercent(DEFAULT_ATTEMPT_SCORING, 9)).toBe(25);
  });
});

describe('creditOfVerdict', () => {
  const EXPECTED: Record<string, [AttemptCredit, AttemptCredit]> = {
    // verdict: [default, allOrNothing]
    exact: ['full', 'full'],
    better: ['full', 'full'],
    equivalent: ['full', 'full'],
    acceptable: ['acceptable', 'none'],
    wrong: ['none', 'none'],
    illegal: ['none', 'none'],
  };

  test.each(Object.entries(EXPECTED))('%s', (verdict, [normal, allOrNothing]) => {
    expect(creditOfVerdict(verdict)).toBe(normal);
    expect(creditOfVerdict(verdict, { allOrNothing: false })).toBe(normal);
    expect(creditOfVerdict(verdict, { allOrNothing: true })).toBe(allOrNothing);
  });

  test('the table covers every judge verdict', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...JUDGE_VERDICTS].sort());
  });

  test.each(['foo', '', null, undefined])('%p is not credited', (verdict) => {
    expect(creditOfVerdict(verdict)).toBe('none');
  });
});

describe('pointsOf', () => {
  test('rounds to the nearest whole point', () => {
    expect(pointsOf(0.6667, 100)).toBe(67);
    expect(pointsOf(0.696, 100)).toBe(70);
    expect(pointsOf(0.8, 10)).toBe(8);
    expect(pointsOf(0, 10)).toBe(0);
  });
});

describe('DEFAULT_ATTEMPT_SCORING', () => {
  test('is 100/50/25 with acceptable at 50, in 3 slots', () => {
    expect([...DEFAULT_ATTEMPT_SCORING.attemptPercents]).toEqual([100, 50, 25]);
    expect(DEFAULT_ATTEMPT_SCORING.acceptablePercent).toBe(50);
    expect(ATTEMPT_PERCENT_SLOTS).toBe(3);
  });

  test('is frozen, including its table', () => {
    expect(Object.isFrozen(DEFAULT_ATTEMPT_SCORING)).toBe(true);
    expect(Object.isFrozen(DEFAULT_ATTEMPT_SCORING.attemptPercents)).toBe(true);
  });
});
