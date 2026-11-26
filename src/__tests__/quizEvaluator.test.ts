import { QuizEvaluator, MoveResult, gradePositionAttempt, firstDeviation } from '../quizEvaluator';
import { gradePositionAttempt as gradePositionAttemptFromBarrel } from '../index';
import { buildQuizPgn, START_FEN } from '../chessUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Simple 2-move PGN: white plays e4, black plays e5
const TWO_MOVE_PGN = '1. e4 e5';
// Single player move: white only
const ONE_MOVE_PGN = '1. e4';

// ─── Constructor ──────────────────────────────────────────────────────────────

describe('QuizEvaluator constructor', () => {
  test('sets playerColor to white for a standard game', () => {
    const q = new QuizEvaluator(TWO_MOVE_PGN);
    expect(q.playerColor).toBe('w');
  });

  test('loads quizMoves from PGN', () => {
    const q = new QuizEvaluator(TWO_MOVE_PGN);
    expect(q.quizMoves).toHaveLength(2);
  });

  test('loads a single-move PGN', () => {
    const q = new QuizEvaluator(ONE_MOVE_PGN);
    expect(q.quizMoves).toHaveLength(1);
  });

  test('throws on an unparseable PGN', () => {
    expect(() => new QuizEvaluator('garbage not a pgn {{{')).toThrow('Invalid quiz PGN');
  });

  test('an empty PGN has no quiz moves and does not throw', () => {
    const q = new QuizEvaluator('');
    expect(q.quizMoves).toEqual([]);
  });

  test('startFen is the [FEN] tag value when the PGN has one', () => {
    const q = new QuizEvaluator(buildQuizPgn(FEN_AFTER_E4, ['e5']));
    expect(q.startFen).toBe(FEN_AFTER_E4);
  });

  test('startFen is the start position for a tagless PGN', () => {
    const q = new QuizEvaluator('1. e4');
    expect(q.startFen).toBe(START_FEN);
  });

  test('solutionLine numbers a black-to-move quiz from its position', () => {
    const q = new QuizEvaluator(buildQuizPgn(FEN_AFTER_E4, ['e5', 'Nf3']));
    expect(q.solutionLine).toBe('1... e5 2. Nf3');
  });

  test('solutionLine is empty when there are no moves', () => {
    expect(new QuizEvaluator('').solutionLine).toBe('');
  });
});

// ─── evaluate — Pending (empty moves) ────────────────────────────────────────

describe('QuizEvaluator.evaluate — pending state', () => {
  test('returns Pending when no moves played', () => {
    const q = new QuizEvaluator(TWO_MOVE_PGN);
    expect(q.evaluate([])).toMatchObject({ result: MoveResult.Pending });
  });
});

// ─── evaluate — Terminated (no quiz moves) ───────────────────────────────────

describe('QuizEvaluator.evaluate — terminated', () => {
  test('returns Terminated when quiz PGN has no moves (empty game)', () => {
    // PGN with no moves
    const q = new QuizEvaluator('*');
    const moves = ['e4'];
    expect(q.evaluate(moves)).toMatchObject({ result: MoveResult.Terminated });
  });
});

// ─── evaluate — Correct ───────────────────────────────────────────────────────

describe('QuizEvaluator.evaluate — correct', () => {
  test('returns Correct when all moves match', () => {
    const q = new QuizEvaluator(ONE_MOVE_PGN);
    const moves = ['e4'];
    const result = q.evaluate(moves);
    expect(result.result).toBe(MoveResult.Correct);
  });

  test('returns Correct for a 2-move PGN when both moves match', () => {
    const q = new QuizEvaluator(TWO_MOVE_PGN);
    const moves = ['e4', 'e5'];
    const result = q.evaluate(moves);
    expect(result.result).toBe(MoveResult.Correct);
  });
});

// ─── evaluate — Incorrect ─────────────────────────────────────────────────────

describe('QuizEvaluator.evaluate — incorrect', () => {
  test('returns Incorrect on first wrong move', () => {
    const q = new QuizEvaluator(ONE_MOVE_PGN); // expects e4
    const wrongMoves = ['d4'];       // played d4
    const result = q.evaluate(wrongMoves);
    expect(result.result).toBe(MoveResult.Incorrect);
  });

  test('returns Incorrect after correct first then wrong second', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6';
    const q = new QuizEvaluator(pgn);
    // Build: correct first 3 moves, wrong 4th
    const correct3 = ['e4', 'e5', 'Nf3'];
    const wrong = ['e4', 'e5', 'Nf3', 'd6'];
    const result = q.evaluate(wrong);
    expect(result.result).toBe(MoveResult.Incorrect);
  });
});

// ─── evaluate — Pending with nextSan (opponent auto-reply) ──────────────────

describe('QuizEvaluator.evaluate — pending with nextSan', () => {
  test('provides nextSan when correct but opponent still needs to play', () => {
    // 2-move PGN: white plays e4, black plays e5
    // After white plays e4 correctly, result should be Pending with nextSan = e5 (black)
    const q = new QuizEvaluator(TWO_MOVE_PGN);
    const firstMove = ['e4'];
    const result = q.evaluate(firstMove);
    expect(result.result).toBe(MoveResult.Pending);
    // nextSan should be the opponent's e5
    expect(result.nextSan).toBe('e5');
  });

  test('does not provide nextSan when the next move is the player\'s own turn', () => {
    // 3-move PGN: e4 e5 Nf3 — after e4+e5 (both correct), next is Nf3 (white = player)
    const pgn = '1. e4 e5 2. Nf3';
    const q = new QuizEvaluator(pgn);
    const twoMoves = ['e4', 'e5'];
    const result = q.evaluate(twoMoves);
    expect(result.result).toBe(MoveResult.Pending);
    expect(result.nextSan).toBeUndefined();
  });
});

// ─── Integration: buildQuizPgn → QuizEvaluator → evaluate ────────────────────
// These tests simulate the exact production flow: coach records answer moves,
// buildQuizPgn generates the PGN, QuizEvaluator parses it, and student plays.

const FEN_AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('buildQuizPgn → QuizEvaluator integration', () => {
  // ── White-to-move quizzes ─────────────────────────────────────────────────

  test('white 1-move quiz: correct answer returns Correct', () => {
    const pgn = buildQuizPgn(START_FEN, ['e4']);
    const q = new QuizEvaluator(pgn);
    expect(q.playerColor).toBe('w');
    expect(q.quizMoves).toHaveLength(1);

    const result = q.evaluate(['e4']);
    expect(result.result).toBe(MoveResult.Correct);
  });

  test('white 1-move quiz: wrong answer returns Incorrect', () => {
    const pgn = buildQuizPgn(START_FEN, ['e4']);
    const q = new QuizEvaluator(pgn);

    const result = q.evaluate(['d4']);
    expect(result.result).toBe(MoveResult.Incorrect);
  });

  test('white 2-move quiz (e4 + black e5 response): after white e4, evaluator provides opponent e5', () => {
    // Coach records: white plays e4, black plays e5 (full answer sequence)
    const pgn = buildQuizPgn(START_FEN, ['e4', 'e5']);
    const q = new QuizEvaluator(pgn);
    expect(q.playerColor).toBe('w');
    expect(q.quizMoves).toHaveLength(2);

    // Student plays e4 (correct first move)
    const result = q.evaluate(['e4']);
    expect(result.result).toBe(MoveResult.Pending);
    // Evaluator should provide e5 for the opponent to auto-play
    expect(result.nextSan).toBe('e5');
  });

  // ── Black-to-move quizzes ─────────────────────────────────────────────────

  test('black 1-move quiz: playerColor is b', () => {
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5']);
    const q = new QuizEvaluator(pgn);
    expect(q.playerColor).toBe('b');
    expect(q.quizMoves).toHaveLength(1);
  });

  test('black 1-move quiz: correct answer returns Correct', () => {
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5']);
    const q = new QuizEvaluator(pgn);

    const result = q.evaluate(['e5']);
    expect(result.result).toBe(MoveResult.Correct);
  });

  test('black 1-move quiz: wrong answer returns Incorrect', () => {
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5']);
    const q = new QuizEvaluator(pgn);

    const result = q.evaluate(['c5']);
    expect(result.result).toBe(MoveResult.Incorrect);
  });

  test('black 2-move quiz (e5 + white Nf3 response): after black e5, evaluator provides opponent Nf3', () => {
    // Coach records: black plays e5, white plays Nf3 (full answer line)
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5', 'Nf3']);
    const q = new QuizEvaluator(pgn);
    expect(q.playerColor).toBe('b');
    expect(q.quizMoves).toHaveLength(2);

    // Student plays e5 (correct first move)
    const result = q.evaluate(['e5']);
    expect(result.result).toBe(MoveResult.Pending);
    // Evaluator should provide Nf3 for opponent auto-play
    expect(result.nextSan).toBe('Nf3');
  });
});

// ─── evaluate — correctPlayerMoves (additive field) ──────────────────────────

describe('QuizEvaluator.evaluate — correctPlayerMoves', () => {
  const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6';
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'];
  test('Correct: counts every player move', () => {
    const q = new QuizEvaluator(pgn);
    expect(q.evaluate(sans).correctPlayerMoves).toBe(3);
  });

  test('Incorrect at player move 2: counts 1', () => {
    const q = new QuizEvaluator(pgn);
    expect(q.evaluate(['e4', 'e5', 'd4']).correctPlayerMoves).toBe(1);
  });

  test('Incorrect at player move 1: counts 0', () => {
    const q = new QuizEvaluator(pgn);
    expect(q.evaluate(['d4']).correctPlayerMoves).toBe(0);
  });

  test('Pending (correct prefix): counts matched player moves', () => {
    const q = new QuizEvaluator(pgn);
    const result = q.evaluate(['e4']);
    expect(result.result).toBe(MoveResult.Pending);
    expect(result.correctPlayerMoves).toBe(1);
  });

  test('Pending (no moves): 0', () => {
    const q = new QuizEvaluator(pgn);
    expect(q.evaluate([]).correctPlayerMoves).toBe(0);
  });

  test('Terminated (empty PGN): 0', () => {
    const q = new QuizEvaluator('*');
    expect(q.evaluate(['e4']).correctPlayerMoves).toBe(0);
  });
});

// ─── gradePositionAttempt ─────────────────────────────────────────────────────

describe('gradePositionAttempt', () => {
  const VARIATION_PGN =
    '[FEN "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"]\n[SetUp "1"]\n\n4. Qxf7# (4. Bxf7+ Ke7 5. Qxe5+) 1-0';
  const THREE_MOVE_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6';
  const THREE_MOVE_SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'];

  test('barrel export resolves', () => {
    expect(typeof gradePositionAttemptFromBarrel).toBe('function');
    expect(gradePositionAttemptFromBarrel).toBe(gradePositionAttempt);
  });

  test('single-move puzzle, correct SAN', () => {
    expect(gradePositionAttempt(ONE_MOVE_PGN, ['e4'])).toMatchObject({
      isCorrect: true,
      result: MoveResult.Correct,
    });
  });

  test('single-move puzzle, wrong SAN', () => {
    expect(gradePositionAttempt(ONE_MOVE_PGN, ['d4'])).toMatchObject({
      isCorrect: false,
      result: MoveResult.Incorrect,
    });
  });

  test('variation: main line is correct, the variation move is Incorrect', () => {
    expect(gradePositionAttempt(VARIATION_PGN, ['Qxf7#'])).toMatchObject({
      isCorrect: true,
      result: MoveResult.Correct,
    });
    expect(gradePositionAttempt(VARIATION_PGN, ['Bxf7+'])).toMatchObject({
      isCorrect: false,
      result: MoveResult.Incorrect,
    });
  });

  test('a solution with a null-move variation grades its main line', () => {
    const pgn = '1. e4 e5 (1... c5 Z0) 2. Nf3 Nc6 *';
    expect(gradePositionAttempt(pgn, ['e4', 'e5', 'Nf3', 'Nc6'])).toMatchObject({
      isCorrect: true,
      result: MoveResult.Correct,
    });
  });

  test('three-player-move line: all correct', () => {
    const g = gradePositionAttempt(THREE_MOVE_PGN, THREE_MOVE_SANS);
    expect(g.isCorrect).toBe(true);
    expect(g.correctPlayerMoves).toBe(3);
  });

  test('three-player-move line: wrong at player move 2 is Incorrect with one player move matched', () => {
    const g = gradePositionAttempt(THREE_MOVE_PGN, ['e4', 'e5', 'd4']);
    expect(g.isCorrect).toBe(false);
    expect(g.result).toBe(MoveResult.Incorrect);
    expect(g.correctPlayerMoves).toBe(1);
  });

  test('three-player-move line: wrong at player move 1 matches no player move', () => {
    const g = gradePositionAttempt(THREE_MOVE_PGN, ['d4']);
    expect(g.isCorrect).toBe(false);
    expect(g.correctPlayerMoves).toBe(0);
  });

  test('correct prefix only (timeout) is Pending, one player move matched', () => {
    const g = gradePositionAttempt(THREE_MOVE_PGN, ['e4', 'e5']);
    expect(g).toMatchObject({ isCorrect: false, result: MoveResult.Pending, correctPlayerMoves: 1 });
  });

  test('no moves is Pending, zero player moves', () => {
    expect(gradePositionAttempt(THREE_MOVE_PGN, [])).toMatchObject({
      isCorrect: false,
      result: MoveResult.Pending,
      correctPlayerMoves: 0,
    });
  });

  test('empty-movetext PGN is Terminated, zero player moves', () => {
    expect(gradePositionAttempt('*', ['e4'])).toMatchObject({
      isCorrect: false,
      result: MoveResult.Terminated,
      correctPlayerMoves: 0,
    });
  });

  test('moves after the end of the solution line are ignored', () => {
    const g = gradePositionAttempt(TWO_MOVE_PGN, ['e4', 'e5', 'Nf3', 'Nc6']);
    expect(g.result).toBe(MoveResult.Correct);
    expect(g.isCorrect).toBe(true);
  });

  describe('parity with stepping QuizEvaluator.evaluate move by move', () => {
    const cases: Array<[string, string[]]> = [
      [THREE_MOVE_PGN, THREE_MOVE_SANS],
      [THREE_MOVE_PGN, ['e4', 'e5', 'd4']],
      [THREE_MOVE_PGN, ['e4', 'e5']],
      [VARIATION_PGN, ['Bxf7+']],
    ];
    test.each(cases)('pgn %#', (pgn, sans) => {
      const q = new QuizEvaluator(pgn);
      let last = q.evaluate([]);
      const played: string[] = [];
      for (let i = 0; i < sans.length; i++) {
        played.push(sans[i]);
        last = q.evaluate([...played]);
        if (last.result === MoveResult.Incorrect) break;
      }
      const g = gradePositionAttempt(pgn, sans);
      expect(g.result).toBe(last.result);
      expect(g.correctPlayerMoves).toBe(last.correctPlayerMoves);
    });
  });
});

// ─── firstDeviation ───────────────────────────────────────────────────────────

describe('firstDeviation', () => {
  const THREE_PLY_PGN = '1. e4 e5 2. Nf3';
  const FEN_AFTER_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
  const TAGGED_PGN = buildQuizPgn(FEN_AFTER_E4, ['e5', 'Nf3', 'Nc6']);

  test('first-move deviation returns ply 0 with the start FEN (no [FEN] tag)', () => {
    expect(firstDeviation(THREE_PLY_PGN, ['d4'])).toEqual({
      ply: 0,
      fenBefore: START_FEN,
      givenSan: 'e4',
      studentSan: 'd4',
      side: 'player',
    });
  });

  test('first-move deviation returns the [FEN] tag position', () => {
    expect(firstDeviation(TAGGED_PGN, ['c5'])).toEqual({
      ply: 0,
      fenBefore: FEN_AFTER_E4,
      givenSan: 'e5',
      studentSan: 'c5',
      side: 'player',
    });
  });

  test('second player move deviation returns ply 2 with the FEN after ply 1', () => {
    expect(firstDeviation(THREE_PLY_PGN, ['e4', 'e5', 'Nc3'])).toEqual({
      ply: 2,
      fenBefore: FEN_AFTER_E4_E5,
      givenSan: 'Nf3',
      studentSan: 'Nc3',
      side: 'player',
    });
  });

  test('a black-to-move puzzle: the player is black and ply 2 is judged', () => {
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5', 'Nf3', 'Nc6']);
    const dev = firstDeviation(pgn, ['e5', 'Nf3', 'Nf6']);
    expect(dev).not.toBeNull();
    expect(dev?.ply).toBe(2);
    expect(dev?.givenSan).toBe('Nc6');
    expect(dev?.studentSan).toBe('Nf6');
    expect(firstDeviation(pgn, ['c5'])?.fenBefore).toBe(FEN_AFTER_E4);
  });

  test('a full match returns null', () => {
    expect(firstDeviation(THREE_PLY_PGN, ['e4', 'e5', 'Nf3'])).toBeNull();
  });

  test('empty moves return null', () => {
    expect(firstDeviation(THREE_PLY_PGN, [])).toBeNull();
  });

  test('a matching prefix shorter than the solution returns null', () => {
    expect(firstDeviation(THREE_PLY_PGN, ['e4', 'e5'])).toBeNull();
  });

  test('a mismatch on an opponent ply returns null', () => {
    expect(firstDeviation(THREE_PLY_PGN, ['e4', 'c5'])).toBeNull();
  });

  test('invalid PGN throws', () => {
    expect(() => firstDeviation('garbage not a pgn {{{', ['e4'])).toThrow('Invalid quiz PGN');
  });

  describe('parity with gradePositionAttempt', () => {
    // onPlayerPly: the first mismatch (if any) falls on a player ply.
    const cases: Array<{ sans: string[]; onPlayerPly: boolean }> = [
      { sans: [], onPlayerPly: false },
      { sans: ['e4'], onPlayerPly: false },
      { sans: ['e4', 'e5'], onPlayerPly: false },
      { sans: ['e4', 'e5', 'Nf3'], onPlayerPly: false },
      { sans: ['d4'], onPlayerPly: true },
      { sans: ['d4', 'e5', 'Nf3'], onPlayerPly: true },
      { sans: ['e4', 'e5', 'Nc3'], onPlayerPly: true },
      { sans: ['e4', 'c5'], onPlayerPly: false },
      { sans: ['e4', 'c5', 'Nf3'], onPlayerPly: false },
      { sans: ['e4', 'e5', 'Nf3', 'Nc6'], onPlayerPly: false },
    ];

    test.each(cases)('%j', ({ sans, onPlayerPly }) => {
      const graded = gradePositionAttempt(THREE_PLY_PGN, sans);
      const deviation = firstDeviation(THREE_PLY_PGN, sans);
      expect(deviation !== null).toBe(graded.result === MoveResult.Incorrect && onPlayerPly);
    });
  });
});

// ─── bothSides option (homework-puzzle-type-opponent-moves-plan D6, D15) ─────

describe('bothSides', () => {
  const PGN = '1. e4 e5 2. Nf3';
  const both = { bothSides: true };

  test('playerColor is still the first mover', () => {
    expect(new QuizEvaluator(PGN, both).playerColor).toBe('w');
  });

  test('a correct prefix is Pending with no nextSan (nothing is auto-played)', () => {
    const q = new QuizEvaluator(PGN, both);
    const res = q.evaluate(['e4']);
    expect(res.result).toBe(MoveResult.Pending);
    expect(res.nextSan).toBeUndefined();
    expect(new QuizEvaluator(PGN).evaluate(['e4']).nextSan).toBe('e5');
  });

  test('the full line is Correct', () => {
    const res = new QuizEvaluator(PGN, both).evaluate(['e4', 'e5', 'Nf3']);
    expect(res.result).toBe(MoveResult.Correct);
  });

  test('a wrong opponent-side ply is Incorrect with credit for the plies before it', () => {
    const res = new QuizEvaluator(PGN, both).evaluate(['e4', 'd5']);
    expect(res.result).toBe(MoveResult.Incorrect);
    expect(res.correctPlayerMoves).toBe(1);
  });

  test('gradePositionAttempt with bothSides matches the stepping evaluator', () => {
    const q = new QuizEvaluator(PGN, both);
    for (const sans of [['e4'], ['e4', 'e5'], ['e4', 'd5'], ['d4'], ['e4', 'e5', 'Nf3']]) {
      const graded = gradePositionAttempt(PGN, sans, both);
      const stepped = q.evaluate(sans);
      expect(graded.result).toBe(stepped.result);
      expect(graded.correctPlayerMoves).toBe(stepped.correctPlayerMoves);
    }
  });

  test('firstDeviation reports an opponent-ply miss only under bothSides', () => {
    expect(firstDeviation(PGN, ['e4', 'd5'], both)).toEqual({
      ply: 1,
      fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      givenSan: 'e5',
      studentSan: 'd5',
      side: 'opponent',
    });
    expect(firstDeviation(PGN, ['e4', 'd5'])).toBeNull();
  });

  test('firstDeviation on a player ply is side player in both modes', () => {
    expect(firstDeviation(PGN, ['d4'])?.side).toBe('player');
    expect(firstDeviation(PGN, ['d4'], both)?.side).toBe('player');
  });
});

// ─── matchedPrefix and playerUnits (puzzle-attempts plan 5.1.1) ──────────────

describe('matchedPrefix and playerUnits', () => {
  const LINE_R = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 *';
  const LINE_B = '1. e4 e5 2. Nf3 Nc6 3. Bc4 *';
  const FULL = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4'];

  test('a full match covers all 9 plies and 5 units', () => {
    expect(new QuizEvaluator(LINE_R).matchedPrefix(FULL)).toEqual({ plies: 9, playerUnits: 5 });
  });

  test('a miss at ply 0 matches nothing', () => {
    expect(new QuizEvaluator(LINE_R).matchedPrefix(['d4', 'e5'])).toEqual({ plies: 0, playerUnits: 0 });
  });

  test('a miss at ply 6 keeps the 6 plies and 3 units before it', () => {
    expect(new QuizEvaluator(LINE_R).matchedPrefix(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Qh5'])).toEqual({ plies: 6, playerUnits: 3 });
  });

  test('an over-long list stops at the end of the solution', () => {
    expect(new QuizEvaluator(LINE_R).matchedPrefix([...FULL, 'a6', 'a5'])).toEqual({ plies: 9, playerUnits: 5 });
  });

  test('both sides counts every ply as a unit', () => {
    expect(new QuizEvaluator(LINE_B, { bothSides: true }).matchedPrefix(['e4', 'e5', 'Nf3', 'd6'])).toEqual({ plies: 3, playerUnits: 3 });
  });

  test('playerUnits is 5 for a regular line and 5 for the both-sides line', () => {
    expect(new QuizEvaluator(LINE_R).playerUnits).toBe(5);
    expect(new QuizEvaluator(LINE_B, { bothSides: true }).playerUnits).toBe(5);
  });
});
