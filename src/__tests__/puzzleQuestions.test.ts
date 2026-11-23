import {
  PIECE_NAMES,
  answerMatchesKind,
  gradeQuestionAnswer,
  nameMoveLabel,
  nameMoveTargets,
  questionReveal,
  studentQuestion,
  validateQuestions,
} from '../puzzleQuestions';
import { START_FEN } from '../chessUtils';
import type { PuzzleQuestion, QuestionKind } from '../types/homework';

const KINGS_ONLY = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
const PAWN_ON_E2 = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
const KNIGHT_A6 = '6k1/8/N7/8/8/8/8/4K3 w - - 0 1';
const KNIGHT_A6_PAWN_C7_KING_E8 = '4k3/2p5/N7/8/8/8/8/4K3 w - - 0 1';
const ROOK_CASTLE = '4k3/8/8/8/8/8/8/4K2R w K - 0 1';
const EMPTY_BOARD = '8/8/8/8/8/8/8/8 w - - 0 1';

const noKey = { choiceIds: [], squares: [], sans: [] };

const choiceQ: PuzzleQuestion = {
  id: 'q1',
  prompt: 'Which board shows a pinned piece?',
  explanation: 'The second one.',
  fen: null,
  choices: [
    { id: 'a', fen: START_FEN, alt: 'The start' },
    { id: 'b', fen: KINGS_ONLY, alt: '' },
    { id: 'c', fen: PAWN_ON_E2, alt: '' },
  ],
  answer: { ...noKey, choiceIds: ['b'] },
};
const squareQ: PuzzleQuestion = {
  id: 'q2',
  prompt: 'Click a square the king can reach.',
  explanation: 'Any adjacent square.',
  fen: KINGS_ONLY,
  choices: [],
  answer: { ...noKey, squares: ['e2', 'd1'] },
};
const nameQ: PuzzleQuestion = {
  id: 'q3',
  prompt: 'Name the move that wins the pawn.',
  explanation: 'Knight takes.',
  fen: KNIGHT_A6_PAWN_C7_KING_E8,
  choices: [],
  answer: { ...noKey, sans: ['Nxc7+'] },
};

const ok = { ok: true };
const reason = (kind: QuestionKind, questions: unknown): string => {
  const result = validateQuestions(kind, questions);
  return result.ok ? 'OK' : result.reason;
};

describe('validateQuestions — valid lists', () => {
  test('a valid list per kind passes', () => {
    expect(validateQuestions('choice', [choiceQ])).toEqual(ok);
    expect(validateQuestions('square', [squareQ])).toEqual(ok);
    expect(validateQuestions('nameMove', [nameQ])).toEqual(ok);
  });
});

describe('validateQuestions — list and common checks', () => {
  test('an empty list, a non-array and 51 questions fail', () => {
    expect(reason('choice', [])).toBe('Add at least one question');
    expect(reason('choice', 'nope')).toBe('Add at least one question');
    const many = Array.from({ length: 51 }, (_, i) => ({ ...choiceQ, id: `q${i}` }));
    expect(reason('choice', many)).toBe('A material holds at most 50 questions');
  });
  test('50 questions pass', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ ...choiceQ, id: `q${i}` }));
    expect(validateQuestions('choice', many)).toEqual(ok);
  });
  test('a missing or malformed id fails', () => {
    expect(reason('choice', [{ ...choiceQ, id: '' }])).toBe('Question 1: needs an id');
    expect(reason('choice', [{ ...choiceQ, id: 'Has Caps' }])).toBe('Question 1: needs an id');
  });
  test('duplicate ids fail', () => {
    expect(reason('choice', [choiceQ, choiceQ])).toBe('Question ids must be unique');
  });
  test('an empty or too long prompt fails', () => {
    expect(reason('choice', [{ ...choiceQ, prompt: '   ' }])).toBe('Question 1: needs a question text');
    expect(reason('choice', [{ ...choiceQ, prompt: 'x'.repeat(301) }])).toBe('Question 1: the question text is too long');
  });
  test('a too long explanation fails', () => {
    expect(reason('choice', [{ ...choiceQ, explanation: 'x'.repeat(501) }])).toBe('Question 1: the explanation is too long');
  });
  test('the question number is 1-based and names the failing question', () => {
    expect(reason('choice', [choiceQ, { ...choiceQ, id: 'q9', prompt: '' }])).toBe('Question 2: needs a question text');
  });
});

describe('validateQuestions — choice', () => {
  test('a board position fails', () => {
    expect(reason('choice', [{ ...choiceQ, fen: START_FEN }])).toBe('Question 1: must not have a board position');
  });
  test('1 and 5 choices fail', () => {
    expect(reason('choice', [{ ...choiceQ, choices: [choiceQ.choices[0]] }])).toBe('Question 1: needs 2 to 4 choices');
    const five = [...choiceQ.choices, { id: 'd' as const, fen: START_FEN, alt: '' }, { id: 'd' as const, fen: START_FEN, alt: '' }];
    expect(reason('choice', [{ ...choiceQ, choices: five }])).toBe('Question 1: needs 2 to 4 choices');
  });
  test('ids out of order fail', () => {
    const swapped = [choiceQ.choices[1], choiceQ.choices[0]];
    expect(reason('choice', [{ ...choiceQ, choices: swapped }])).toBe('Question 1: choices must be lettered a to d in order');
  });
  test('a too long description fails', () => {
    const choices = [{ ...choiceQ.choices[0], alt: 'x'.repeat(201) }, choiceQ.choices[1]];
    expect(reason('choice', [{ ...choiceQ, choices }])).toBe('Question 1: choice A: the description is too long');
  });
  test('an illegal choice position fails with the position reason', () => {
    const choices = [choiceQ.choices[0], { ...choiceQ.choices[1], fen: EMPTY_BOARD }];
    expect(reason('choice', [{ ...choiceQ, choices }])).toBe('Question 1: choice B: White needs a king');
  });
  test('no correct choice, an unknown id and a duplicate id fail', () => {
    expect(reason('choice', [{ ...choiceQ, answer: { ...noKey } }])).toBe('Question 1: mark at least one correct choice');
    expect(reason('choice', [{ ...choiceQ, answer: { ...noKey, choiceIds: ['d'] } }])).toBe('Question 1: a correct choice does not exist');
    expect(reason('choice', [{ ...choiceQ, answer: { ...noKey, choiceIds: ['a', 'a'] } }])).toBe('Question 1: a correct choice does not exist');
  });
  test('every choice marked correct fails', () => {
    expect(reason('choice', [{ ...choiceQ, answer: { ...noKey, choiceIds: ['a', 'b', 'c'] } }])).toBe('Question 1: at least one choice must be wrong');
  });
  test('two correct of three pass', () => {
    expect(validateQuestions('choice', [{ ...choiceQ, answer: { ...noKey, choiceIds: ['a', 'b'] } }])).toEqual(ok);
  });
  test('a choice question carrying sans fails', () => {
    expect(reason('choice', [{ ...choiceQ, answer: { ...choiceQ.answer, sans: ['e4'] } }])).toBe(
      'Question 1: has an answer that does not belong to this kind',
    );
  });
});

describe('validateQuestions — square', () => {
  test('choices fail', () => {
    expect(reason('square', [{ ...squareQ, choices: choiceQ.choices }])).toBe('Question 1: must not have choices');
  });
  test('an illegal position fails with the position reason', () => {
    expect(reason('square', [{ ...squareQ, fen: EMPTY_BOARD }])).toBe('Question 1: White needs a king');
  });
  test('no squares fails', () => {
    expect(reason('square', [{ ...squareQ, answer: { ...noKey } }])).toBe('Question 1: mark at least one correct square');
  });
  test('z9 is not a square', () => {
    expect(reason('square', [{ ...squareQ, answer: { ...noKey, squares: ['e2', 'z9'] } }])).toBe('Question 1: z9 is not a square');
  });
});

describe('validateQuestions — nameMove', () => {
  test('choices fail', () => {
    expect(reason('nameMove', [{ ...nameQ, choices: choiceQ.choices }])).toBe('Question 1: must not have choices');
  });
  test('an illegal position fails with the position reason', () => {
    expect(reason('nameMove', [{ ...nameQ, fen: EMPTY_BOARD }])).toBe('Question 1: White needs a king');
  });
  test('no SANs and nine SANs fail', () => {
    expect(reason('nameMove', [{ ...nameQ, answer: { ...noKey } }])).toBe('Question 1: add at least one correct move');
    expect(reason('nameMove', [{ ...nameQ, answer: { ...noKey, sans: Array(9).fill('Nxc7+') } }])).toBe('Question 1: add at least one correct move');
  });
  test('an illegal SAN fails and names it', () => {
    expect(reason('nameMove', [{ ...nameQ, answer: { ...noKey, sans: ['Nxc7+', 'Qh5'] } }])).toBe(
      'Question 1: Qh5 is not a legal move in this position',
    );
  });
});

describe('nameMoveTargets', () => {
  test('a quiet knight move names its piece and destination', () => {
    expect(nameMoveTargets(KNIGHT_A6, ['Nc7'])).toEqual([{ piece: 'N', file: 'c', rank: '7', san: 'Nc7' }]);
  });
  test('a capture with a missing check sign gives the normalised SAN and the same target', () => {
    expect(nameMoveTargets(KNIGHT_A6_PAWN_C7_KING_E8, ['Nxc7'])).toEqual([{ piece: 'N', file: 'c', rank: '7', san: 'Nxc7+' }]);
  });
  test('a pawn move is a P', () => {
    expect(nameMoveTargets(START_FEN, ['e4'])).toEqual([{ piece: 'P', file: 'e', rank: '4', san: 'e4' }]);
  });
  test('castling is the king to g1', () => {
    expect(nameMoveTargets(ROOK_CASTLE, ['O-O'])).toEqual([{ piece: 'K', file: 'g', rank: '1', san: 'O-O' }]);
  });
  test('an illegal SAN is skipped and the rest are kept', () => {
    expect(nameMoveTargets(START_FEN, ['Qh5', 'd4'])).toEqual([{ piece: 'P', file: 'd', rank: '4', san: 'd4' }]);
  });
  test('an unreadable FEN gives no targets', () => {
    expect(nameMoveTargets('not a fen', ['e4'])).toEqual([]);
  });
});

describe('gradeQuestionAnswer', () => {
  test('choice: right and wrong', () => {
    expect(gradeQuestionAnswer('choice', choiceQ, { choiceId: 'b' })).toBe(true);
    expect(gradeQuestionAnswer('choice', choiceQ, { choiceId: 'a' })).toBe(false);
  });
  test('square: right, a second accepted square, and wrong', () => {
    expect(gradeQuestionAnswer('square', squareQ, { square: 'e2' })).toBe(true);
    expect(gradeQuestionAnswer('square', squareQ, { square: 'd1' })).toBe(true);
    expect(gradeQuestionAnswer('square', squareQ, { square: 'a8' })).toBe(false);
  });
  test('nameMove: a pick matching a capture SAN is right; another piece or square is wrong', () => {
    expect(gradeQuestionAnswer('nameMove', nameQ, { piece: 'N', file: 'c', rank: '7' })).toBe(true);
    expect(gradeQuestionAnswer('nameMove', nameQ, { piece: 'Q', file: 'c', rank: '7' })).toBe(false);
    expect(gradeQuestionAnswer('nameMove', nameQ, { piece: 'N', file: 'b', rank: '8' })).toBe(false);
  });
  test('nameMove: a second accepted answer is right', () => {
    const two: PuzzleQuestion = { ...nameQ, fen: START_FEN, answer: { ...noKey, sans: ['e4', 'Nf3'] } };
    expect(gradeQuestionAnswer('nameMove', two, { piece: 'N', file: 'f', rank: '3' })).toBe(true);
    expect(gradeQuestionAnswer('nameMove', two, { piece: 'P', file: 'e', rank: '4' })).toBe(true);
    expect(gradeQuestionAnswer('nameMove', two, { piece: 'P', file: 'd', rank: '4' })).toBe(false);
  });
  test('an answer of another kind shape is false', () => {
    expect(gradeQuestionAnswer('choice', choiceQ, { square: 'e2' })).toBe(false);
    expect(gradeQuestionAnswer('square', squareQ, { choiceId: 'a' })).toBe(false);
    expect(gradeQuestionAnswer('nameMove', nameQ, { square: 'c7' })).toBe(false);
  });
});

describe('answerMatchesKind', () => {
  test('the right shape per kind is accepted', () => {
    expect(answerMatchesKind('choice', { choiceId: 'a' })).toBe(true);
    expect(answerMatchesKind('square', { square: 'e4' })).toBe(true);
    expect(answerMatchesKind('nameMove', { piece: 'N', file: 'c', rank: '7' })).toBe(true);
  });
  test('an extra key is rejected', () => {
    expect(answerMatchesKind('choice', { choiceId: 'a', square: 'e4' })).toBe(false);
    expect(answerMatchesKind('square', { square: 'e4', extra: 1 })).toBe(false);
    expect(answerMatchesKind('nameMove', { piece: 'N', file: 'c', rank: '7', extra: 1 })).toBe(false);
  });
  test('a wrong member is rejected', () => {
    expect(answerMatchesKind('choice', { choiceId: 'e' })).toBe(false);
    expect(answerMatchesKind('square', { square: 'i9' })).toBe(false);
    expect(answerMatchesKind('nameMove', { piece: 'X', file: 'c', rank: '7' })).toBe(false);
    expect(answerMatchesKind('nameMove', { piece: 'N', file: 'z', rank: '7' })).toBe(false);
    expect(answerMatchesKind('nameMove', { piece: 'N', file: 'c', rank: '9' })).toBe(false);
  });
  test('another kind shape and non-objects are rejected', () => {
    expect(answerMatchesKind('choice', { square: 'e4' })).toBe(false);
    expect(answerMatchesKind('square', 'e4')).toBe(false);
    expect(answerMatchesKind('square', null)).toBe(false);
    expect(answerMatchesKind('nameMove', {})).toBe(false);
  });
});

describe('questionReveal', () => {
  test('choice gives the choice ids and the explanation', () => {
    expect(questionReveal('choice', choiceQ)).toEqual({ choiceIds: ['b'], squares: [], moves: [], explanation: 'The second one.' });
  });
  test('square gives the squares', () => {
    expect(questionReveal('square', squareQ)).toEqual({ choiceIds: [], squares: ['e2', 'd1'], moves: [], explanation: 'Any adjacent square.' });
  });
  test('nameMove gives the derived targets', () => {
    expect(questionReveal('nameMove', nameQ)).toEqual({
      choiceIds: [],
      squares: [],
      moves: [{ piece: 'N', file: 'c', rank: '7', san: 'Nxc7+' }],
      explanation: 'Knight takes.',
    });
  });
});

describe('studentQuestion', () => {
  test('carries exactly id, prompt, fen and choices', () => {
    const q = studentQuestion(choiceQ);
    expect(Object.keys(q).sort()).toEqual(['choices', 'fen', 'id', 'prompt']);
    expect(q).toEqual({ id: 'q1', prompt: choiceQ.prompt, fen: null, choices: choiceQ.choices });
  });
  test('copies the choices instead of sharing them', () => {
    const q = studentQuestion(choiceQ);
    expect(q.choices).not.toBe(choiceQ.choices);
    expect(q.choices[0]).not.toBe(choiceQ.choices[0]);
  });
});

describe('nameMoveLabel and PIECE_NAMES', () => {
  test('a knight and a pawn read as literals', () => {
    expect(nameMoveLabel({ piece: 'N', file: 'c', rank: '7' })).toBe('Nc7 · Knight to c7');
    expect(nameMoveLabel({ piece: 'P', file: 'c', rank: '7' })).toBe('c7 · Pawn to c7');
  });
  test('the piece-name table is frozen and complete', () => {
    expect(PIECE_NAMES).toEqual({ K: 'King', Q: 'Queen', R: 'Rook', N: 'Knight', B: 'Bishop', P: 'Pawn' });
    expect(Object.isFrozen(PIECE_NAMES)).toBe(true);
  });
});
