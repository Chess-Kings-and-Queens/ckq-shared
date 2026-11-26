import type { PuzzlePlayContent } from '../types/homework';
import type {
  SubmitBoardMoveInput,
  SubmitWorkbookMoveInput,
  SubmitWorkbookPickInput,
  SubmitWorkbookPickResult,
  WorkbookContentChapter,
  WorkbookMoveResult,
} from '../types/workbook';

const content: PuzzlePlayContent = {
  kind: 'choice',
  questions: [{ id: 'q1', prompt: 'Which?', fen: null, choices: [{ id: 'a', text: 'A', fen: null }], squareCount: null }],
  prompts: [],
  games: [],
  lines: [],
  totalPositions: 1,
  nameTheMove: false,
  allowIllegalPosition: false,
  showPuzzleText: false,
};

describe('workbook content contract', () => {
  const chapter: WorkbookContentChapter = {
    ...content,
    title: 'Ch 1',
    materialId: 'm1',
    positionsCompleted: 0,
    nextPositionIndex: 0,
    answers: [{ positionIndex: 0, attempts: [], bestScore: 0, isCorrect: false, isCompleted: false, picks: [{ step: 'square', value: 'e4', isCorrect: true }] }],
  };
  test('a chapter is PuzzlePlayContent plus the workbook fields', () => {
    const asContent: PuzzlePlayContent = chapter;
    expect(asContent.questions).toHaveLength(1);
    expect(chapter.nextPositionIndex).toBe(0);
    expect(chapter.answers[0].picks).toHaveLength(1);
  });
  test('a chapter missing a PuzzlePlayContent field is rejected by the compiler', () => {
    const { showPuzzleText, ...withoutText } = chapter;
    // @ts-expect-error showPuzzleText is required
    const bad: WorkbookContentChapter = withoutText;
    expect(showPuzzleText).toBe(false);
    expect(bad.title).toBe('Ch 1');
  });
  test('a chapter missing nextPositionIndex is rejected by the compiler', () => {
    const { nextPositionIndex, ...without } = chapter;
    // @ts-expect-error nextPositionIndex is required
    const bad: WorkbookContentChapter = without;
    expect(nextPositionIndex).toBe(0);
    expect(bad.materialId).toBe('m1');
  });
});

describe('workbook move and pick contract', () => {
  test('SubmitWorkbookMoveInput takes moves or answer, not both', () => {
    const board: SubmitWorkbookMoveInput = { materialId: 'm1', positionIndex: 0, moves: ['e4'], attemptNumber: 1 };
    const question: SubmitWorkbookMoveInput = { materialId: 'm1', positionIndex: 0, answer: { choiceId: 'a' } };
    // @ts-expect-error exactly one of moves and answer
    const bad: SubmitWorkbookMoveInput = { materialId: 'm1', positionIndex: 0, moves: ['e4'], answer: { choiceId: 'a' } };
    expect(board.moves).toEqual(['e4']);
    expect(question.answer).toEqual({ choiceId: 'a' });
    expect(bad.positionIndex).toBe(0);
  });
  test('SubmitBoardMoveInput takes moves only', () => {
    const ok: SubmitBoardMoveInput = { materialId: 'm1', positionIndex: 0, moves: ['e4'] };
    // @ts-expect-error a board-only move has no answer
    const bad: SubmitBoardMoveInput = { materialId: 'm1', positionIndex: 0, moves: ['e4'], answer: { choiceId: 'a' } };
    expect(ok.moves).toEqual(['e4']);
    expect(bad.materialId).toBe('m1');
  });
  test('SubmitWorkbookPickInput is the homework pick body', () => {
    const input: SubmitWorkbookPickInput = { materialId: 'm1', positionIndex: 0, pick: { square: 'e4' } };
    expect(input.pick).toEqual({ square: 'e4' });
  });
  test('SubmitWorkbookPickResult requires result._id and the pick fields', () => {
    const ok: SubmitWorkbookPickResult = {
      result: { _id: 'r1' },
      pickCorrect: true,
      picks: [{ step: 'square', value: 'e4', isCorrect: true }],
      nextStep: null,
      positionDone: true,
      nextPositionIndex: null,
      reveal: null,
    };
    // @ts-expect-error the pick fields are required
    const bad: SubmitWorkbookPickResult = { result: { _id: 'r1' } };
    expect(ok.result._id).toBe('r1');
    expect(bad.result._id).toBe('r1');
  });
  test('WorkbookMoveResult requires attemptCorrect and reveal', () => {
    const ok: WorkbookMoveResult = { _id: 'r1', positionDone: true, attemptsLeft: 0, nextPositionIndex: null, attemptCorrect: true, reveal: null };
    // @ts-expect-error attemptCorrect and reveal are required
    const bad: WorkbookMoveResult = { _id: 'r1', positionDone: true, attemptsLeft: 0, nextPositionIndex: null };
    expect(ok.attemptCorrect).toBe(true);
    expect(bad._id).toBe('r1');
  });
});
