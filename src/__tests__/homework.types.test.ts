import { HOMEWORK_CONFLICT_CODES, homeworkConflictCode, PUZZLE_TYPES, PUZZLE_TYPE_RULES, puzzleTypeRules } from '../types/homework';
import type { CreateHomeworkResultInput, HomeworkPuzzleLine, HomeworkPuzzlePayload, HomeworkRow, PositionSubmissionOutcome } from '../types/homework';
import type { SubmitWorkbookMoveInput } from '../types/workbook';

describe('homeworkConflictCode', () => {
  test.each([...HOMEWORK_CONFLICT_CODES])('409 + %s returns the code', (code) => {
    expect(homeworkConflictCode(409, code)).toBe(code);
  });
  test('409 + any other message is null', () => {
    expect(homeworkConflictCode(409, 'something-else')).toBeNull();
    expect(homeworkConflictCode(409, 42)).toBeNull();
  });
  test('a non-409 status is null even for a known code', () => {
    expect(homeworkConflictCode(400, 'version-conflict')).toBeNull();
    expect(homeworkConflictCode(null, 'version-conflict')).toBeNull();
    expect(homeworkConflictCode(undefined, 'version-conflict')).toBeNull();
  });
});

describe('contract types', () => {
  test('CreateHomeworkResultInput compiles without totalPositions', () => {
    const input: CreateHomeworkResultInput = { materialCollectionId: 'c1', materials: [{ materialId: 'm1' }] };
    expect(input.materials[0].totalPositions).toBeUndefined();
  });
  test('SubmitWorkbookMoveInput carries attemptNumber', () => {
    const input: SubmitWorkbookMoveInput = { materialId: 'm1', positionIndex: 0, moves: ['e4'], attemptNumber: 2 };
    expect(input.attemptNumber).toBe(2);
  });
  test('PositionSubmissionOutcome keys are all optional', () => {
    const empty: PositionSubmissionOutcome = {};
    const full: PositionSubmissionOutcome = { positionDone: true, attemptsLeft: 1, nextPositionIndex: null };
    expect(empty.positionDone).toBeUndefined();
    expect(full.nextPositionIndex).toBeNull();
  });
});

describe('puzzle type contract', () => {
  const base = {
    title: 't',
    games: ['1. e4 e5', '1. d4'],
    totalPositions: 2,
    timeLimit: 60,
    maxAttempts: 3,
    materialCollectionId: 'c1',
    groupClassSessionId: null,
    homeworkMaterialId: 'm1',
    engineJudge: false,
    isBlocked: false,
    strikesLeft: 3,
    rushThresholdSeconds: null,
  };
  test('PUZZLE_TYPES lists the three types', () => {
    expect([...PUZZLE_TYPES]).toEqual(['regular', 'withOpponentMoves', 'withVariations']);
  });
  test('PUZZLE_TYPE_RULES has a row per type with the D2 matrix', () => {
    expect(Object.keys(PUZZLE_TYPE_RULES)).toEqual([...PUZZLE_TYPES]);
    expect(PUZZLE_TYPE_RULES).toEqual({
      regular: { bothSides: false, expandVariations: false },
      withOpponentMoves: { bothSides: true, expandVariations: false },
      withVariations: { bothSides: false, expandVariations: true },
    });
  });
  test('puzzleTypeRules reads each type and falls back to regular', () => {
    expect(puzzleTypeRules('withVariations')).toEqual({ bothSides: false, expandVariations: true });
    expect(puzzleTypeRules('withOpponentMoves')).toEqual({ bothSides: true, expandVariations: false });
    for (const v of ['regular', undefined, null, 'bogus']) {
      expect(puzzleTypeRules(v)).toEqual({ bothSides: false, expandVariations: false });
    }
  });
  test('the table and its rows are frozen', () => {
    expect(Object.isFrozen(PUZZLE_TYPE_RULES)).toBe(true);
    for (const t of PUZZLE_TYPES) expect(Object.isFrozen(PUZZLE_TYPE_RULES[t])).toBe(true);
  });
  test('a HomeworkPuzzleLine without branchFen/branchSan is rejected by the compiler', () => {
    // @ts-expect-error branchFen and branchSan are required
    const bad: HomeworkPuzzleLine = { game: 0, branchMove: null };
    expect(bad.game).toBe(0);
  });
  test('a payload with puzzleType and lines compiles; lines parallels games', () => {
    const payload: HomeworkPuzzlePayload = {
      ...base,
      puzzleType: 'withOpponentMoves',
      lines: [
        { game: 0, branchMove: null, branchFen: null, branchSan: null },
        { game: 1, branchMove: '1... c5', branchFen: 'f', branchSan: 'c5' },
      ],
    };
    expect(payload.lines).toHaveLength(payload.games.length);
  });
  test('a payload without them is rejected by the compiler', () => {
    // @ts-expect-error puzzleType and lines are required
    const bad: HomeworkPuzzlePayload = { ...base };
    expect(bad.games).toHaveLength(2);
  });
});

describe('HomeworkRow', () => {
  const row = {
    _id: 'hw-1',
    coachName: '',
    noOfGames: 3,
    noOfAnswers: 0,
    completionPercentage: 0,
    scorePct: 0,
    timeSpent: 0,
    status: 'not_started' as const,
    createdAt: '2026-11-13T12:00:00Z',
    isNext: false,
  };
  test('a specialized row with no class compiles and reads back', () => {
    const hw: HomeworkRow = { ...row, isSpecialized: true };
    expect(hw.isSpecialized).toBe(true);
    expect(hw.groupClassName).toBeUndefined();
  });
  test('a row without isSpecialized is rejected by the compiler', () => {
    // @ts-expect-error isSpecialized is required
    const bad: HomeworkRow = { ...row };
    expect(bad._id).toBe('hw-1');
  });
});
