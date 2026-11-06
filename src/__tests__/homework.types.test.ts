import { HOMEWORK_CONFLICT_CODES, homeworkConflictCode } from '../types/homework';
import type { CreateHomeworkResultInput, PositionSubmissionOutcome } from '../types/homework';
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
