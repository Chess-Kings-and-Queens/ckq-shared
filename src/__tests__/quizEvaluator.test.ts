import { QuizEvaluator, MoveResult } from '../quizEvaluator';
import { buildQuizPgn, START_FEN } from '../chessUtils';
import { PgnReader, PgnReaderMove } from '@mliebelt/pgn-reader';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMoves(pgn: string, count: number) {
  const reader = new PgnReader({ pgn });
  const moves = reader.getMoves();
  return moves.slice(0, count);
}

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
    const moves = makeMoves(TWO_MOVE_PGN, 1);
    expect(q.evaluate(moves)).toMatchObject({ result: MoveResult.Terminated, score: 0 });
  });
});

// ─── evaluate — Correct ───────────────────────────────────────────────────────

describe('QuizEvaluator.evaluate — correct', () => {
  test('returns Correct with full score when all moves match', () => {
    const q = new QuizEvaluator(ONE_MOVE_PGN, 100);
    const moves = makeMoves(ONE_MOVE_PGN, 1);
    const result = q.evaluate(moves);
    expect(result.result).toBe(MoveResult.Correct);
    expect(result.score).toBe(100);
  });

  test('returns Correct for a 2-move PGN when both moves match', () => {
    const q = new QuizEvaluator(TWO_MOVE_PGN, 100);
    const moves = makeMoves(TWO_MOVE_PGN, 2);
    const result = q.evaluate(moves);
    expect(result.result).toBe(MoveResult.Correct);
    expect(result.score).toBe(100);
  });
});

// ─── evaluate — Incorrect ─────────────────────────────────────────────────────

describe('QuizEvaluator.evaluate — incorrect', () => {
  test('returns Incorrect with 0 score on first wrong move', () => {
    const q = new QuizEvaluator(ONE_MOVE_PGN, 100); // expects e4
    const wrongMoves = makeMoves('1. d4', 1);       // played d4
    const result = q.evaluate(wrongMoves);
    expect(result.result).toBe(MoveResult.Incorrect);
    expect(result.score).toBe(0);
  });

  test('returns Incorrect after correct first then wrong second', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6';
    const q = new QuizEvaluator(pgn, 100);
    // Build: correct first 3 moves, wrong 4th
    const correct3 = makeMoves(pgn, 3);
    const wrong = makeMoves('1. e4 e5 2. Nf3 d6', 4);
    const result = q.evaluate(wrong);
    expect(result.result).toBe(MoveResult.Incorrect);
  });
});

// ─── evaluate — Pending with nextMove (opponent auto-reply) ──────────────────

describe('QuizEvaluator.evaluate — pending with nextMove', () => {
  test('provides nextMove when correct but opponent still needs to play', () => {
    // 2-move PGN: white plays e4, black plays e5
    // After white plays e4 correctly, result should be Pending with nextMove = e5 (black)
    const q = new QuizEvaluator(TWO_MOVE_PGN, 100);
    const firstMove = makeMoves(TWO_MOVE_PGN, 1);
    const result = q.evaluate(firstMove);
    expect(result.result).toBe(MoveResult.Pending);
    // nextMove should be the opponent's e5
    expect(result.nextMove?.notation.notation).toBe('e5');
  });

  test('does not provide nextMove when the next move is the player\'s own turn', () => {
    // 3-move PGN: e4 e5 Nf3 — after e4+e5 (both correct), next is Nf3 (white = player)
    const pgn = '1. e4 e5 2. Nf3';
    const q = new QuizEvaluator(pgn, 100);
    const twoMoves = makeMoves(pgn, 2);
    const result = q.evaluate(twoMoves);
    expect(result.result).toBe(MoveResult.Pending);
    expect(result.nextMove).toBeUndefined();
  });
});

// ─── Integration: buildQuizPgn → QuizEvaluator → evaluate ────────────────────
// These tests simulate the exact production flow: coach records answer moves,
// buildQuizPgn generates the PGN, QuizEvaluator parses it, and student plays.

const FEN_AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

/**
 * Build a synthetic PgnReaderMove exactly as useQuizEvaluator.onPlayerMove does
 * (same single cast to the library type — see useQuizEvaluator.ts).
 */
function syntheticMove(san: string, turn: string | undefined): PgnReaderMove {
  return { notation: { notation: san }, turn } as PgnReaderMove;
}

describe('buildQuizPgn → QuizEvaluator integration', () => {
  // ── White-to-move quizzes ─────────────────────────────────────────────────

  test('white 1-move quiz: correct answer returns Correct + full score', () => {
    const pgn = buildQuizPgn(START_FEN, ['e4']);
    const q = new QuizEvaluator(pgn, 100);
    expect(q.playerColor).toBe('w');
    expect(q.quizMoves).toHaveLength(1);

    const result = q.evaluate([syntheticMove('e4', q.quizMoves[0].turn)]);
    expect(result.result).toBe(MoveResult.Correct);
    expect(result.score).toBe(100);
  });

  test('white 1-move quiz: wrong answer returns Incorrect', () => {
    const pgn = buildQuizPgn(START_FEN, ['e4']);
    const q = new QuizEvaluator(pgn, 100);

    const result = q.evaluate([syntheticMove('d4', q.quizMoves[0].turn)]);
    expect(result.result).toBe(MoveResult.Incorrect);
  });

  test('white 2-move quiz (e4 + black e5 response): after white e4, evaluator provides opponent e5', () => {
    // Coach records: white plays e4, black plays e5 (full answer sequence)
    const pgn = buildQuizPgn(START_FEN, ['e4', 'e5']);
    const q = new QuizEvaluator(pgn, 100);
    expect(q.playerColor).toBe('w');
    expect(q.quizMoves).toHaveLength(2);

    // Student plays e4 (correct first move)
    const result = q.evaluate([syntheticMove('e4', q.quizMoves[0].turn)]);
    expect(result.result).toBe(MoveResult.Pending);
    // Evaluator should provide e5 for the opponent to auto-play
    expect(result.nextMove?.notation.notation).toBe('e5');
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

    const result = q.evaluate([syntheticMove('e5', q.quizMoves[0].turn)]);
    expect(result.result).toBe(MoveResult.Correct);
    expect(result.score).toBe(100);
  });

  test('black 1-move quiz: wrong answer returns Incorrect', () => {
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5']);
    const q = new QuizEvaluator(pgn, 100);

    const result = q.evaluate([syntheticMove('c5', q.quizMoves[0].turn)]);
    expect(result.result).toBe(MoveResult.Incorrect);
  });

  test('black 2-move quiz (e5 + white Nf3 response): after black e5, evaluator provides opponent Nf3', () => {
    // Coach records: black plays e5, white plays Nf3 (full answer line)
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5', 'Nf3']);
    const q = new QuizEvaluator(pgn, 100);
    expect(q.playerColor).toBe('b');
    expect(q.quizMoves).toHaveLength(2);

    // Student plays e5 (correct first move)
    const result = q.evaluate([syntheticMove('e5', q.quizMoves[0].turn)]);
    expect(result.result).toBe(MoveResult.Pending);
    // Evaluator should provide Nf3 for opponent auto-play
    expect(result.nextMove?.notation.notation).toBe('Nf3');
  });
});
