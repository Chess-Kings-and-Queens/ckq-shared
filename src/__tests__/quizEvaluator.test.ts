import { QuizEvaluator, MoveResult, gradePositionAttempt } from '../quizEvaluator';
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
    const q = new QuizEvaluator(TWO_MOVE_PGN, 100);
    expect(q.playerColor).toBe('w');
  });

  test('loads quizMoves from PGN', () => {
    const q = new QuizEvaluator(TWO_MOVE_PGN, 100);
    expect(q.quizMoves).toHaveLength(2);
  });

  test('loads a single-move PGN', () => {
    const q = new QuizEvaluator(ONE_MOVE_PGN, 100);
    expect(q.quizMoves).toHaveLength(1);
  });

  test('maxScore is stored correctly', () => {
    const q = new QuizEvaluator(ONE_MOVE_PGN, 50);
    expect(q.maxScore).toBe(50);
  });

  test('scorePerMove is maxScore when only one player move', () => {
    const q = new QuizEvaluator(ONE_MOVE_PGN, 100);
    expect(q.scorePerMove).toBe(100);
  });

  test('scorePerMove splits across multiple player moves', () => {
    // e4 e5 Nf3 Nc6 — white makes 2 moves, score = 50 each
    const q = new QuizEvaluator('1. e4 e5 2. Nf3 Nc6', 100);
    expect(q.scorePerMove).toBe(50);
  });

  test('throws on an unparseable PGN', () => {
    expect(() => new QuizEvaluator('garbage not a pgn {{{', 100)).toThrow('Invalid quiz PGN');
  });

  test('an empty PGN has no quiz moves and does not throw', () => {
    const q = new QuizEvaluator('', 100);
    expect(q.quizMoves).toEqual([]);
  });

  test('startFen is the [FEN] tag value when the PGN has one', () => {
    const q = new QuizEvaluator(buildQuizPgn(FEN_AFTER_E4, ['e5']), 100);
    expect(q.startFen).toBe(FEN_AFTER_E4);
  });

  test('startFen is the start position for a tagless PGN', () => {
    const q = new QuizEvaluator('1. e4', 100);
    expect(q.startFen).toBe(START_FEN);
  });

  test('solutionLine numbers a black-to-move quiz from its position', () => {
    const q = new QuizEvaluator(buildQuizPgn(FEN_AFTER_E4, ['e5', 'Nf3']), 100);
    expect(q.solutionLine).toBe('1... e5 2. Nf3');
  });

  test('solutionLine is empty when there are no moves', () => {
    expect(new QuizEvaluator('', 100).solutionLine).toBe('');
  });
});

// ─── evaluate — Pending (empty moves) ────────────────────────────────────────

describe('QuizEvaluator.evaluate — pending state', () => {
  test('returns Pending when no moves played', () => {
    const q = new QuizEvaluator(TWO_MOVE_PGN, 100);
    expect(q.evaluate([])).toMatchObject({ result: MoveResult.Pending, score: 0 });
  });
});

// ─── evaluate — Terminated (no quiz moves) ───────────────────────────────────

describe('QuizEvaluator.evaluate — terminated', () => {
  test('returns Terminated when quiz PGN has no moves (empty game)', () => {
    // PGN with no moves
    const q = new QuizEvaluator('*', 100);
    const moves = ['e4'];
    expect(q.evaluate(moves)).toMatchObject({ result: MoveResult.Terminated, score: 0 });
  });
});

// ─── evaluate — Correct ───────────────────────────────────────────────────────

describe('QuizEvaluator.evaluate — correct', () => {
  test('returns Correct with full score when all moves match', () => {
    const q = new QuizEvaluator(ONE_MOVE_PGN, 100);
    const moves = ['e4'];
    const result = q.evaluate(moves);
    expect(result.result).toBe(MoveResult.Correct);
    expect(result.score).toBe(100);
  });

  test('returns Correct for a 2-move PGN when both moves match', () => {
    const q = new QuizEvaluator(TWO_MOVE_PGN, 100);
    const moves = ['e4', 'e5'];
    const result = q.evaluate(moves);
    expect(result.result).toBe(MoveResult.Correct);
    expect(result.score).toBe(100);
  });
});

// ─── evaluate — Incorrect ─────────────────────────────────────────────────────

describe('QuizEvaluator.evaluate — incorrect', () => {
  test('returns Incorrect with 0 score on first wrong move', () => {
    const q = new QuizEvaluator(ONE_MOVE_PGN, 100); // expects e4
    const wrongMoves = ['d4'];       // played d4
    const result = q.evaluate(wrongMoves);
    expect(result.result).toBe(MoveResult.Incorrect);
    expect(result.score).toBe(0);
  });

  test('returns Incorrect after correct first then wrong second', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6';
    const q = new QuizEvaluator(pgn, 100);
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
    const q = new QuizEvaluator(TWO_MOVE_PGN, 100);
    const firstMove = ['e4'];
    const result = q.evaluate(firstMove);
    expect(result.result).toBe(MoveResult.Pending);
    // nextSan should be the opponent's e5
    expect(result.nextSan).toBe('e5');
  });

  test('does not provide nextSan when the next move is the player\'s own turn', () => {
    // 3-move PGN: e4 e5 Nf3 — after e4+e5 (both correct), next is Nf3 (white = player)
    const pgn = '1. e4 e5 2. Nf3';
    const q = new QuizEvaluator(pgn, 100);
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

  test('white 1-move quiz: correct answer returns Correct + full score', () => {
    const pgn = buildQuizPgn(START_FEN, ['e4']);
    const q = new QuizEvaluator(pgn, 100);
    expect(q.playerColor).toBe('w');
    expect(q.quizMoves).toHaveLength(1);

    const result = q.evaluate(['e4']);
    expect(result.result).toBe(MoveResult.Correct);
    expect(result.score).toBe(100);
  });

  test('white 1-move quiz: wrong answer returns Incorrect', () => {
    const pgn = buildQuizPgn(START_FEN, ['e4']);
    const q = new QuizEvaluator(pgn, 100);

    const result = q.evaluate(['d4']);
    expect(result.result).toBe(MoveResult.Incorrect);
  });

  test('white 2-move quiz (e4 + black e5 response): after white e4, evaluator provides opponent e5', () => {
    // Coach records: white plays e4, black plays e5 (full answer sequence)
    const pgn = buildQuizPgn(START_FEN, ['e4', 'e5']);
    const q = new QuizEvaluator(pgn, 100);
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
    const q = new QuizEvaluator(pgn, 100);
    expect(q.playerColor).toBe('b');
    expect(q.quizMoves).toHaveLength(1);
  });

  test('black 1-move quiz: correct answer returns Correct + full score', () => {
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5']);
    const q = new QuizEvaluator(pgn, 100);

    const result = q.evaluate(['e5']);
    expect(result.result).toBe(MoveResult.Correct);
    expect(result.score).toBe(100);
  });

  test('black 1-move quiz: wrong answer returns Incorrect', () => {
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5']);
    const q = new QuizEvaluator(pgn, 100);

    const result = q.evaluate(['c5']);
    expect(result.result).toBe(MoveResult.Incorrect);
  });

  test('black 2-move quiz (e5 + white Nf3 response): after black e5, evaluator provides opponent Nf3', () => {
    // Coach records: black plays e5, white plays Nf3 (full answer line)
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5', 'Nf3']);
    const q = new QuizEvaluator(pgn, 100);
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
    const q = new QuizEvaluator(pgn, 100);
    expect(q.evaluate(sans).correctPlayerMoves).toBe(3);
  });

  test('Incorrect at player move 2: counts 1', () => {
    const q = new QuizEvaluator(pgn, 100);
    expect(q.evaluate(['e4', 'e5', 'd4']).correctPlayerMoves).toBe(1);
  });

  test('Incorrect at player move 1: counts 0', () => {
    const q = new QuizEvaluator(pgn, 100);
    expect(q.evaluate(['d4']).correctPlayerMoves).toBe(0);
  });

  test('Pending (correct prefix): counts matched player moves', () => {
    const q = new QuizEvaluator(pgn, 100);
    const result = q.evaluate(['e4']);
    expect(result.result).toBe(MoveResult.Pending);
    expect(result.correctPlayerMoves).toBe(1);
  });

  test('Pending (no moves): 0', () => {
    const q = new QuizEvaluator(pgn, 100);
    expect(q.evaluate([]).correctPlayerMoves).toBe(0);
  });

  test('Terminated (empty PGN): 0', () => {
    const q = new QuizEvaluator('*', 100);
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
      score: 100,
      result: MoveResult.Correct,
    });
  });

  test('single-move puzzle, wrong SAN', () => {
    expect(gradePositionAttempt(ONE_MOVE_PGN, ['d4'])).toMatchObject({
      isCorrect: false,
      score: 0,
      result: MoveResult.Incorrect,
    });
  });

  test('variation: main line is correct, the variation move is Incorrect', () => {
    expect(gradePositionAttempt(VARIATION_PGN, ['Qxf7#'])).toMatchObject({
      isCorrect: true,
      score: 100,
      result: MoveResult.Correct,
    });
    expect(gradePositionAttempt(VARIATION_PGN, ['Bxf7+'])).toMatchObject({
      isCorrect: false,
      result: MoveResult.Incorrect,
    });
  });

  test('three-player-move line: all correct is 100', () => {
    const g = gradePositionAttempt(THREE_MOVE_PGN, THREE_MOVE_SANS);
    expect(g.isCorrect).toBe(true);
    expect(g.score).toBe(100);
    expect(g.correctPlayerMoves).toBe(3);
  });

  test('three-player-move line: wrong at player move 2 gives partial credit', () => {
    const g = gradePositionAttempt(THREE_MOVE_PGN, ['e4', 'e5', 'd4']);
    expect(g.isCorrect).toBe(false);
    expect(g.result).toBe(MoveResult.Incorrect);
    expect(g.score).toBeCloseTo(33.33, 1);
    expect(g.correctPlayerMoves).toBe(1);
  });

  test('three-player-move line: wrong at player move 1 scores 0', () => {
    const g = gradePositionAttempt(THREE_MOVE_PGN, ['d4']);
    expect(g.isCorrect).toBe(false);
    expect(g.score).toBe(0);
    expect(g.correctPlayerMoves).toBe(0);
  });

  test('correct prefix only (timeout) is Pending, 0, one player move matched', () => {
    const g = gradePositionAttempt(THREE_MOVE_PGN, ['e4', 'e5']);
    expect(g).toMatchObject({ isCorrect: false, score: 0, result: MoveResult.Pending, correctPlayerMoves: 1 });
  });

  test('no moves is Pending, 0, zero player moves', () => {
    expect(gradePositionAttempt(THREE_MOVE_PGN, [])).toMatchObject({
      isCorrect: false,
      score: 0,
      result: MoveResult.Pending,
      correctPlayerMoves: 0,
    });
  });

  test('empty-movetext PGN is Terminated, 0, zero player moves', () => {
    expect(gradePositionAttempt('*', ['e4'])).toMatchObject({
      isCorrect: false,
      score: 0,
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
      const q = new QuizEvaluator(pgn, 100);
      let last = q.evaluate([]);
      const played: string[] = [];
      for (let i = 0; i < sans.length; i++) {
        played.push(sans[i]);
        last = q.evaluate([...played]);
        if (last.result === MoveResult.Incorrect) break;
      }
      const g = gradePositionAttempt(pgn, sans);
      expect(g.result).toBe(last.result);
      expect(g.score).toBe(last.result === MoveResult.Correct || last.result === MoveResult.Incorrect ? last.score : 0);
      expect(g.correctPlayerMoves).toBe(last.correctPlayerMoves);
    });
  });
});
