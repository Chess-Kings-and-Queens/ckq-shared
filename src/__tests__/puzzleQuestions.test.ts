import {
  PIECE_NAMES,
  choiceLetter,
  clickSummary,
  clicksLabel,
  fromToLabel,
  gradeNamingPick,
  gradeQuestionAnswer,
  isQuestionAnswer,
  movesMatchOneMove,
  nameMoveLabel,
  namingStep,
  oneMoveAnswer,
  pickStep,
  questionReveal,
  squaresLeft,
  studentQuestion,
  validatePuzzleMaterial,
  validateQuestions,
} from '../puzzleQuestions';
import type { OneMoveAnswer } from '../puzzleQuestions';
import { START_FEN } from '../chessUtils';
import type { PuzzleQuestion, StoredPick } from '../types/homework';

const KINGS_ONLY = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
const PAWN_ON_E2 = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
const EMPTY_BOARD = '8/8/8/8/8/8/8/8 w - - 0 1';
const SEVEN_RANKS = '8/8/8/8/8/8/8 w - - 0 1';

const noKey = { choiceIds: [] };

const choiceQ: PuzzleQuestion = {
  id: 'q1',
  prompt: 'Which board shows a pinned piece?',
  explanation: 'The second one.',
  fen: null,
  choices: [
    { id: 'a', text: 'The start', fen: null },
    { id: 'b', text: 'Kings only', fen: null },
    { id: 'c', text: 'A pawn', fen: null },
  ],
  answer: { ...noKey, choiceIds: ['b'] },
};

const ok = { ok: true };
const reason = (questions: unknown): string => {
  const result = validateQuestions(questions);
  return result.ok ? 'OK' : result.reason;
};

describe('validateQuestions — valid lists', () => {
  test('a text-only question with text-only choices passes', () => {
    expect(validateQuestions([choiceQ])).toEqual(ok);
  });
  test('a question with a position and text choices passes', () => {
    expect(validateQuestions([{ ...choiceQ, fen: START_FEN }])).toEqual(ok);
  });
  test('choices of text and a position pass', () => {
    const choices = [
      { id: 'a', text: 'The start', fen: START_FEN },
      { id: 'b', text: 'Kings only', fen: KINGS_ONLY },
      { id: 'c', text: 'A pawn', fen: PAWN_ON_E2 },
    ];
    expect(validateQuestions([{ ...choiceQ, choices }])).toEqual(ok);
  });
  test('choices of a position alone (text empty) pass', () => {
    const choices = [
      { id: 'a', text: '', fen: START_FEN },
      { id: 'b', text: '', fen: KINGS_ONLY },
    ];
    expect(validateQuestions([{ ...choiceQ, choices, answer: { choiceIds: ['b'] } }])).toEqual(ok);
  });
  test('a kingless question position and a kingless choice position pass', () => {
    const choices = [
      { id: 'a', text: '', fen: EMPTY_BOARD },
      { id: 'b', text: 'Text', fen: null },
    ];
    expect(validateQuestions([{ ...choiceQ, fen: EMPTY_BOARD, choices, answer: { choiceIds: ['b'] } }])).toEqual(ok);
  });
});

describe('validateQuestions — list and common checks', () => {
  test('an empty list, a non-array and 51 questions fail', () => {
    expect(reason([])).toBe('Add at least one question');
    expect(reason('nope')).toBe('Add at least one question');
    const many = Array.from({ length: 51 }, (_, i) => ({ ...choiceQ, id: `q${i}` }));
    expect(reason(many)).toBe('A material holds at most 50 questions');
  });
  test('50 questions pass', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ ...choiceQ, id: `q${i}` }));
    expect(validateQuestions(many)).toEqual(ok);
  });
  test('a missing or malformed id fails', () => {
    expect(reason([{ ...choiceQ, id: '' }])).toBe('Question 1: needs an id');
    expect(reason([{ ...choiceQ, id: 'Has Caps' }])).toBe('Question 1: needs an id');
  });
  test('duplicate ids fail', () => {
    expect(reason([choiceQ, choiceQ])).toBe('Question ids must be unique');
  });
  test('an empty or too long prompt fails', () => {
    expect(reason([{ ...choiceQ, prompt: '   ' }])).toBe('Question 1: needs a question text');
    expect(reason([{ ...choiceQ, prompt: 'x'.repeat(301) }])).toBe('Question 1: the question text is too long');
  });
  test('a too long explanation fails', () => {
    expect(reason([{ ...choiceQ, explanation: 'x'.repeat(501) }])).toBe('Question 1: the explanation is too long');
  });
  test('the question number is 1-based and names the failing question', () => {
    expect(reason([choiceQ, { ...choiceQ, id: 'q9', prompt: '' }])).toBe('Question 2: needs a question text');
  });
});

describe('validateQuestions — choice', () => {
  test('a question position of 7 ranks, an empty string and a number fail', () => {
    expect(reason([{ ...choiceQ, fen: SEVEN_RANKS }])).toBe('Question 1: the board position is not valid');
    expect(reason([{ ...choiceQ, fen: '' }])).toBe('Question 1: the board position is not valid');
    expect(reason([{ ...choiceQ, fen: 5 }])).toBe('Question 1: the board position is not valid');
  });
  test('1 and 5 choices fail', () => {
    expect(reason([{ ...choiceQ, choices: [choiceQ.choices[0]] }])).toBe('Question 1: needs 2 to 4 choices');
    const five = [...choiceQ.choices, { id: 'd' as const, text: 'D', fen: null }, { id: 'd' as const, text: 'E', fen: null }];
    expect(reason([{ ...choiceQ, choices: five }])).toBe('Question 1: needs 2 to 4 choices');
  });
  test('ids out of order fail', () => {
    const swapped = [choiceQ.choices[1], choiceQ.choices[0]];
    expect(reason([{ ...choiceQ, choices: swapped }])).toBe('Question 1: choices must be lettered a to d in order');
  });
  test('a 201-character text fails and 200 passes', () => {
    const long = [{ ...choiceQ.choices[0], text: 'x'.repeat(201) }, choiceQ.choices[1]];
    expect(reason([{ ...choiceQ, choices: long }])).toBe('Question 1: choice A: the text is too long');
    const edge = [{ ...choiceQ.choices[0], text: 'x'.repeat(200) }, choiceQ.choices[1]];
    expect(validateQuestions([{ ...choiceQ, choices: edge }])).toEqual(ok);
  });
  test('a choice position of 7 ranks fails', () => {
    const choices = [choiceQ.choices[0], { ...choiceQ.choices[1], fen: SEVEN_RANKS }];
    expect(reason([{ ...choiceQ, choices }])).toBe('Question 1: choice B: the board position is not valid');
  });
  test('a choice with blank text and no position fails', () => {
    const choices = [{ id: 'a' as const, text: '  ', fen: null }, choiceQ.choices[1]];
    expect(reason([{ ...choiceQ, choices }])).toBe('Question 1: choice A: needs a text or a board position');
  });
  test('no correct choice, an unknown id and a duplicate id fail', () => {
    expect(reason([{ ...choiceQ, answer: { ...noKey } }])).toBe('Question 1: mark at least one correct choice');
    expect(reason([{ ...choiceQ, answer: { ...noKey, choiceIds: ['d'] } }])).toBe('Question 1: a correct choice does not exist');
    expect(reason([{ ...choiceQ, answer: { ...noKey, choiceIds: ['a', 'a'] } }])).toBe('Question 1: a correct choice does not exist');
  });
  test('every choice marked correct fails', () => {
    expect(reason([{ ...choiceQ, answer: { ...noKey, choiceIds: ['a', 'b', 'c'] } }])).toBe('Question 1: at least one choice must be wrong');
  });
  test('two correct of three pass', () => {
    expect(validateQuestions([{ ...choiceQ, answer: { ...noKey, choiceIds: ['a', 'b'] } }])).toEqual(ok);
  });
  test('a choice question carrying sans fails', () => {
    expect(reason([{ ...choiceQ, answer: { ...choiceQ.answer, sans: ['e4'] } }])).toBe(
      'Question 1: has an answer that does not belong to a choice question',
    );
  });
});

describe('gradeQuestionAnswer', () => {
  test('choice: right and wrong', () => {
    expect(gradeQuestionAnswer(choiceQ, { choiceId: 'b' })).toBe(true);
    expect(gradeQuestionAnswer(choiceQ, { choiceId: 'a' })).toBe(false);
  });
});

describe('isQuestionAnswer', () => {
  test('one choiceId key is accepted', () => {
    expect(isQuestionAnswer({ choiceId: 'a' })).toBe(true);
  });
  test('an extra key, an unknown id, a square and non-objects are rejected', () => {
    expect(isQuestionAnswer({ choiceId: 'a', extra: 1 })).toBe(false);
    expect(isQuestionAnswer({ choiceId: 'e' })).toBe(false);
    expect(isQuestionAnswer({ square: 'e4' })).toBe(false);
    expect(isQuestionAnswer('a')).toBe(false);
    expect(isQuestionAnswer(null)).toBe(false);
    expect(isQuestionAnswer({})).toBe(false);
  });
});

describe('questionReveal', () => {
  test('gives the choice ids and the explanation, no squares and no move', () => {
    expect(questionReveal(choiceQ)).toEqual({ choiceIds: ['b'], squares: [], move: null, explanation: 'The second one.' });
  });
});

describe('studentQuestion', () => {
  test('carries exactly id, prompt, fen, choices and squareCount', () => {
    const q = studentQuestion(choiceQ);
    expect(Object.keys(q).sort()).toEqual(['choices', 'fen', 'id', 'prompt', 'squareCount']);
    expect(q).toEqual({ id: 'q1', prompt: choiceQ.prompt, fen: null, choices: choiceQ.choices, squareCount: null });
  });
  test('carries a question position and choices of exactly id, text and fen', () => {
    const withBoard: PuzzleQuestion = {
      ...choiceQ,
      fen: START_FEN,
      choices: [
        { id: 'a', text: 'Text', fen: KINGS_ONLY },
        { id: 'b', text: '', fen: PAWN_ON_E2 },
      ],
    };
    const q = studentQuestion(withBoard);
    expect(q.fen).toBe(START_FEN);
    expect(q.choices).toEqual([
      { id: 'a', text: 'Text', fen: KINGS_ONLY },
      { id: 'b', text: '', fen: PAWN_ON_E2 },
    ]);
    expect(q.choices.every((c) => Object.keys(c).sort().join() === 'fen,id,text')).toBe(true);
  });
  test('copies the choices instead of sharing them', () => {
    const q = studentQuestion(choiceQ);
    expect(q.choices).not.toBe(choiceQ.choices);
    expect(q.choices[0]).not.toBe(choiceQ.choices[0]);
  });
  test('a choice object carrying more than its three fields does not leak the rest (a database document links to its parent question)', () => {
    const parent = { answer: { choiceIds: ['b'] }, explanation: 'SECRET' };
    const docLike = (c: (typeof choiceQ.choices)[number]) => Object.assign({ $__parent: parent, _doc: { ...c } }, c);
    const q = studentQuestion({ ...choiceQ, choices: choiceQ.choices.map(docLike) });
    expect(q.choices).toEqual(choiceQ.choices.map((c) => ({ id: c.id, text: c.text, fen: c.fen })));
    expect(q.choices.every((c) => Object.keys(c).sort().join() === 'fen,id,text')).toBe(true);
    expect(JSON.stringify(q)).not.toContain('SECRET');
  });
});

describe('choiceLetter, fromToLabel and clicksLabel', () => {
  test('choiceLetter upper-cases the id', () => {
    expect(choiceLetter('b')).toBe('B');
  });
  test('fromToLabel reads a from-to move and drops a promotion letter', () => {
    expect(fromToLabel('d4c6')).toBe('d4–c6');
    expect(fromToLabel('e7e8q')).toBe('e7–e8');
  });
  test('fromToLabel is null for anything else', () => {
    expect(fromToLabel('')).toBeNull();
    expect(fromToLabel('Nf3')).toBeNull();
  });
  test('clicksLabel reads the counts, singular and plural', () => {
    expect(clicksLabel({ total: 2, found: 2, wrong: 0 })).toBe('2 of 2 squares');
    expect(clicksLabel({ total: 2, found: 1, wrong: 3 })).toBe('1 of 2 squares · 3 wrong clicks');
    expect(clicksLabel({ total: 2, found: 1, wrong: 1 })).toBe('1 of 2 squares · 1 wrong click');
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

// ── One-move puzzles, click puzzles and picks ───────────────────────────────────

const setUp = (fen: string, body: string): string => `[SetUp "1"]\n[FEN "${fen}"]\n\n${body}`;
const KNIGHT_D4 = '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1';
const NO_KINGS_KNIGHT_D4 = '8/8/8/8/3N4/8/8/8 w - - 0 1';
const FOUR_BLACK_KINGS = 'kkkk4/8/8/8/8/8/8/8 w - - 0 1';
const NO_KINGS_PAWNS = '8/8/8/8/8/8/2P1P3/8 w - - 0 1';

describe('oneMoveAnswer — legal positions', () => {
  const legal = { allowIllegalPosition: false };
  test('a knight move from a FEN', () => {
    expect(oneMoveAnswer(setUp(KNIGHT_D4, '1. Nc6 *'), legal)).toEqual({ from: 'd4', to: 'c6', piece: 'N' });
  });
  test('a first move from the start position', () => {
    expect(oneMoveAnswer('1. e4 *', legal)).toEqual({ from: 'e2', to: 'e4', piece: 'P' });
  });
  test('Black to move: one king move', () => {
    expect(oneMoveAnswer(setUp('6k1/8/8/8/8/8/8/6K1 b - - 0 1', '1... Kg7 *'), legal)).toEqual({ from: 'g8', to: 'g7', piece: 'K' });
  });
  test('castling is the king from e1 to g1', () => {
    expect(oneMoveAnswer(setUp('4k3/8/8/8/8/8/8/4K2R w K - 0 1', '1. O-O *'), legal)).toEqual({ from: 'e1', to: 'g1', piece: 'K' });
  });
  test('a promotion is a pawn move', () => {
    expect(oneMoveAnswer(setUp('4k3/P7/8/8/8/8/8/4K3 w - - 0 1', '1. a8=Q+ *'), legal)).toEqual({ from: 'a7', to: 'a8', piece: 'P' });
  });
  test('two plies are not a one-move puzzle', () => {
    expect(oneMoveAnswer('1. e4 e5 *', legal)).toBeNull();
  });
  test('a variation on the first move is not a one-move puzzle', () => {
    expect(oneMoveAnswer('1. e4 (1. d4) *', legal)).toBeNull();
  });
  test('no moves and unreadable text give null', () => {
    expect(oneMoveAnswer(setUp(KNIGHT_D4, '*'), legal)).toBeNull();
    expect(oneMoveAnswer('not a pgn at all {{{', legal)).toBeNull();
  });
});

describe('oneMoveAnswer — illegal positions', () => {
  const illegal = { allowIllegalPosition: true };
  test('no kings and one arrow: the piece on the from-square', () => {
    expect(oneMoveAnswer(setUp(NO_KINGS_KNIGHT_D4, '{ Move the knight. [%cal Gd4c6] } *'), illegal)).toEqual({ from: 'd4', to: 'c6', piece: 'N' });
  });
  test('four black kings: the piece on the from-square', () => {
    expect(oneMoveAnswer(setUp(FOUR_BLACK_KINGS, '{ Move a king. [%cal Ga8b7] } *'), illegal)).toEqual({ from: 'a8', to: 'b7', piece: 'K' });
  });
  test('two arrows, no arrow and an arrow from an empty square give null', () => {
    expect(oneMoveAnswer(setUp(NO_KINGS_KNIGHT_D4, '{ Move. [%cal Gd4c6,Gd4e6] } *'), illegal)).toBeNull();
    expect(oneMoveAnswer(setUp(NO_KINGS_KNIGHT_D4, '{ Move. } *'), illegal)).toBeNull();
    expect(oneMoveAnswer(setUp(NO_KINGS_KNIGHT_D4, '{ Move. [%cal Ga1a2] } *'), illegal)).toBeNull();
  });
  test('a game with moves gives null', () => {
    expect(oneMoveAnswer(setUp(KNIGHT_D4, '{ Move. [%cal Gd4c6] } 1. Nc6 *'), illegal)).toBeNull();
  });
});

describe('movesMatchOneMove', () => {
  const answer: OneMoveAnswer = { from: 'd4', to: 'c6', piece: 'N' };
  test('the from-to move, with or without a promotion letter, matches', () => {
    expect(movesMatchOneMove(answer, ['d4c6'])).toBe(true);
    expect(movesMatchOneMove(answer, ['d4c6q'])).toBe(true);
  });
  test('another move, a SAN, two moves and none do not match', () => {
    expect(movesMatchOneMove(answer, ['d4e6'])).toBe(false);
    expect(movesMatchOneMove(answer, ['Nc6'])).toBe(false);
    expect(movesMatchOneMove(answer, ['d4c6', 'd4c6'])).toBe(false);
    expect(movesMatchOneMove(answer, [])).toBe(false);
  });
});

describe('validatePuzzleMaterial', () => {
  const none = { nameTheMove: false, allowIllegalPosition: false };
  const clickGame = (text: string): string => setUp(NO_KINGS_PAWNS, text);
  const valid = (input: Parameters<typeof validatePuzzleMaterial>[0]): string => {
    const result = validatePuzzleMaterial(input);
    return result.ok ? 'OK' : result.reason;
  };

  test('a choice material is valid here', () => {
    expect(valid({ kind: 'choice', pgnContent: '', ...none })).toBe('OK');
  });

  test('square: a good game passes', () => {
    expect(valid({ kind: 'square', pgnContent: clickGame('{ Click the pawns. [%csl Gc2,Ge2] } *'), ...none })).toBe('OK');
  });
  test('square: either add-on fails', () => {
    const pgnContent = clickGame('{ Click. [%csl Gc2] } *');
    const reasonText = 'Name the move and illegal positions are only for board puzzles';
    expect(valid({ kind: 'square', pgnContent, nameTheMove: true, allowIllegalPosition: false })).toBe(reasonText);
    expect(valid({ kind: 'square', pgnContent, nameTheMove: false, allowIllegalPosition: true })).toBe(reasonText);
  });
  test('square: blank content fails', () => {
    expect(valid({ kind: 'square', pgnContent: '  ', ...none })).toBe('Add at least one puzzle');
  });
  test('square: a game with a move or no [FEN] fails', () => {
    expect(valid({ kind: 'square', pgnContent: setUp(KINGS_ONLY, '{ Click. [%csl Ge2] } 1. Ke2 *'), ...none })).toBe(
      'Game 1: must be a position with no moves and a [FEN] tag',
    );
    expect(valid({ kind: 'square', pgnContent: '{ Click. [%csl Ge2] } *', ...none })).toBe('Game 1: must be a position with no moves and a [FEN] tag');
  });
  test('square: no question and no square fail', () => {
    expect(valid({ kind: 'square', pgnContent: clickGame('{[%csl Gc2]} *'), ...none })).toBe('Game 1: needs a question in its comment');
    expect(valid({ kind: 'square', pgnContent: clickGame('{ Click the pawns. } *'), ...none })).toBe(
      'Game 1: needs at least one highlighted square ([%csl])',
    );
  });
  test('square: the failing game is numbered', () => {
    const pgnContent = `${clickGame('{ One. [%csl Gc2] } *')}\n\n${clickGame('{ Two. } *')}`;
    expect(valid({ kind: 'square', pgnContent, ...none })).toBe('Game 2: needs at least one highlighted square ([%csl])');
  });
  test('square: a comment whose marks wrap onto their own line still reads as two games', () => {
    const first = clickGame('{ Click the pawns.\n[%csl Gc2,Ge2] } *');
    const second = clickGame('{ Click one. [%csl Gc2] } *');
    expect(valid({ kind: 'square', pgnContent: `${first}\n\n${second}`, ...none })).toBe('OK');
  });

  test('board with neither add-on is valid whatever the PGN', () => {
    expect(valid({ kind: 'board', pgnContent: '1. e4 e5 *', ...none })).toBe('OK');
  });
  test('board: blank content fails with an add-on', () => {
    expect(valid({ kind: 'board', pgnContent: '', nameTheMove: true, allowIllegalPosition: false })).toBe('Add at least one puzzle');
  });
  test('board nameTheMove: one move passes, two plies fail', () => {
    expect(valid({ kind: 'board', pgnContent: '1. e4 *', nameTheMove: true, allowIllegalPosition: false })).toBe('OK');
    expect(valid({ kind: 'board', pgnContent: '1. e4 e5 *', nameTheMove: true, allowIllegalPosition: false })).toBe(
      'Game 1: must be exactly one move with no variations',
    );
  });
  test('board nameTheMove: the failing game is numbered', () => {
    const pgnContent = '[Event "a"]\n\n1. e4 *\n\n[Event "b"]\n\n1. e4 e5 *';
    expect(valid({ kind: 'board', pgnContent, nameTheMove: true, allowIllegalPosition: false })).toBe(
      'Game 2: must be exactly one move with no variations',
    );
  });
  test('board allowIllegalPosition: an arrow passes, a game without one fails', () => {
    expect(valid({ kind: 'board', pgnContent: setUp(NO_KINGS_KNIGHT_D4, '{ Move. [%cal Gd4c6] } *'), nameTheMove: false, allowIllegalPosition: true })).toBe('OK');
    expect(valid({ kind: 'board', pgnContent: setUp(NO_KINGS_KNIGHT_D4, '{ Move. } *'), nameTheMove: false, allowIllegalPosition: true })).toBe(
      'Game 1: needs a position with no moves and exactly one arrow ([%cal]) on a piece',
    );
  });
});

describe('pickStep', () => {
  test('each step is read from its single key', () => {
    expect(pickStep({ square: 'e4' })).toBe('square');
    expect(pickStep({ piece: 'N' })).toBe('piece');
    expect(pickStep({ file: 'c' })).toBe('file');
    expect(pickStep({ rank: '7' })).toBe('rank');
  });
  test('a bad square, two keys, no key and bad members are null', () => {
    expect(pickStep({ square: 'i9' })).toBeNull();
    expect(pickStep({ piece: 'N', file: 'c' })).toBeNull();
    expect(pickStep({})).toBeNull();
    expect(pickStep({ piece: 'X' })).toBeNull();
    expect(pickStep({ file: 'i' })).toBeNull();
    expect(pickStep({ rank: '9' })).toBeNull();
    expect(pickStep({ square: 5 })).toBeNull();
    expect(pickStep('e4')).toBeNull();
    expect(pickStep(null)).toBeNull();
  });
});

const pick = (step: StoredPick['step'], value: string, isCorrect: boolean): StoredPick => ({ step, value, isCorrect });

describe('namingStep', () => {
  test('piece first, then file, then rank, then nothing', () => {
    expect(namingStep([])).toBe('piece');
    expect(namingStep([pick('piece', 'Q', false)])).toBe('piece');
    expect(namingStep([pick('piece', 'N', true)])).toBe('file');
    expect(namingStep([pick('piece', 'N', true), pick('file', 'c', true)])).toBe('rank');
    expect(namingStep([pick('piece', 'N', true), pick('file', 'c', true), pick('rank', '6', true)])).toBeNull();
  });
});

describe('gradeNamingPick', () => {
  const answer: OneMoveAnswer = { from: 'd4', to: 'c6', piece: 'N' };
  test('piece, file and rank, right and wrong', () => {
    expect(gradeNamingPick(answer, 'piece', 'N')).toBe(true);
    expect(gradeNamingPick(answer, 'piece', 'B')).toBe(false);
    expect(gradeNamingPick(answer, 'file', 'c')).toBe(true);
    expect(gradeNamingPick(answer, 'file', 'd')).toBe(false);
    expect(gradeNamingPick(answer, 'rank', '6')).toBe(true);
    expect(gradeNamingPick(answer, 'rank', '4')).toBe(false);
  });
});

describe('squaresLeft', () => {
  test('keeps the answer order and ignores wrong and repeated picks', () => {
    const picks = [pick('square', 'e2', true), pick('square', 'a1', false), pick('square', 'e2', true)];
    expect(squaresLeft(['c2', 'e2', 'g4'], picks)).toEqual(['c2', 'g4']);
  });
  test('no picks leaves every square', () => {
    expect(squaresLeft(['c2', 'e2'], [])).toEqual(['c2', 'e2']);
  });
});

describe('clickSummary', () => {
  const squares = ['c2', 'e2', 'g4'];
  test('all found with two wrong clicks', () => {
    const picks = [pick('square', 'c2', true), pick('square', 'a1', false), pick('square', 'e2', true), pick('square', 'h8', false), pick('square', 'g4', true)];
    expect(clickSummary(squares, picks)).toEqual({ total: 3, found: 3, wrong: 2 });
  });
  test('no picks', () => {
    expect(clickSummary(squares, [])).toEqual({ total: 3, found: 0, wrong: 0 });
  });
  test('a repeated right click counts once', () => {
    expect(clickSummary(squares, [pick('square', 'c2', true), pick('square', 'c2', true)])).toEqual({ total: 3, found: 1, wrong: 0 });
  });
});
