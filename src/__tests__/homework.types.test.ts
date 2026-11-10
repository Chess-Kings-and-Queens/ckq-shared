import { HOMEWORK_CONFLICT_CODES, homeworkConflictCode, PUZZLE_TYPES } from '../types/homework';
import type { CreateHomeworkResultInput, HomeworkPuzzlePayload, PositionSubmissionOutcome } from '../types/homework';
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
  test('PUZZLE_TYPES lists both types', () => {
    expect([...PUZZLE_TYPES]).toEqual(['regular', 'withOpponentMoves']);
  });
  test('a payload with puzzleType and lines compiles; lines parallels games', () => {
    const payload: HomeworkPuzzlePayload = {
      ...base,
      puzzleType: 'withOpponentMoves',
      lines: [{ game: 0, branchMove: null }, { game: 1, branchMove: '1... c5' }],
    };
    expect(payload.lines).toHaveLength(payload.games.length);
  });
  test('a payload without them is rejected by the compiler', () => {
    // @ts-expect-error puzzleType and lines are required
    const bad: HomeworkPuzzlePayload = { ...base };
    expect(bad.games).toHaveLength(2);
  });
});
