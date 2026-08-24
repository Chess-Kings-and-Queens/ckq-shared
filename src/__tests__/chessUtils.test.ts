import { Chess } from 'chess.js';
import { toColor, buildQuizPgn, formatMoveSequence, fenMoveContext, START_FEN } from '../chessUtils';

describe('START_FEN', () => {
  test('is the standard starting position', () => {
    const chess = new Chess();
    expect(START_FEN).toBe(chess.fen());
  });
});

describe('toColor', () => {
  test('returns white at the start of the game', () => {
    const chess = new Chess();
    expect(toColor(chess)).toBe('white');
  });

  test('returns black after white plays e4', () => {
    const chess = new Chess();
    chess.move('e4');
    expect(toColor(chess)).toBe('black');
  });
});

describe('fenMoveContext', () => {
  test('starting FEN returns white to move at move 1', () => {
    expect(fenMoveContext(START_FEN)).toEqual({ color: 'w', fullMove: 1 });
  });

  test('extracts black-to-move and correct full-move number', () => {
    // After 1.e4 e5 2.Nf3 — it is black's turn, fullmove = 2
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
    expect(fenMoveContext(fen)).toEqual({ color: 'b', fullMove: 2 });
  });

  test('empty string returns defaults', () => {
    expect(fenMoveContext('')).toEqual({ color: 'w', fullMove: 1 });
  });
});

describe('formatMoveSequence', () => {
  // ── Empty ──────────────────────────────────────────────────────────────────

  test('empty array returns empty string', () => {
    expect(formatMoveSequence([])).toBe('');
  });

  // ── White starts ───────────────────────────────────────────────────────────

  test('white starts: single move', () => {
    expect(formatMoveSequence(['e4'])).toBe('1. e4');
  });

  test('white starts: one full pair', () => {
    expect(formatMoveSequence(['e4', 'e5'])).toBe('1. e4 e5');
  });

  test('white starts: two full pairs', () => {
    expect(formatMoveSequence(['e4', 'e5', 'Nf3', 'Nc6'])).toBe('1. e4 e5 2. Nf3 Nc6');
  });

  test('white starts: odd number of moves (white has last move)', () => {
    expect(formatMoveSequence(['e4', 'e5', 'Nf3'])).toBe('1. e4 e5 2. Nf3');
  });

  test('white starts: custom start move number', () => {
    expect(formatMoveSequence(['Nf3', 'Nc6'], 'w', 5)).toBe('5. Nf3 Nc6');
  });

  // ── Black starts ───────────────────────────────────────────────────────────

  test('black starts: single move uses ellipsis notation', () => {
    expect(formatMoveSequence(['e5'], 'b', 1)).toBe('1... e5');
  });

  test('black starts: black then white — white gets next move number', () => {
    expect(formatMoveSequence(['e5', 'Nf3'], 'b', 1)).toBe('1... e5 2. Nf3');
  });

  test('black starts: three moves — move numbers are correct throughout', () => {
    expect(formatMoveSequence(['e5', 'Nf3', 'Nc6'], 'b', 1)).toBe('1... e5 2. Nf3 Nc6');
  });

  test('black starts: four moves — two full pairs from black', () => {
    expect(formatMoveSequence(['e5', 'Nf3', 'Nc6', 'Bb5'], 'b', 1)).toBe('1... e5 2. Nf3 Nc6 3. Bb5');
  });

  test('black starts: custom start move number', () => {
    expect(formatMoveSequence(['Nc6', 'Bb5'], 'b', 3)).toBe('3... Nc6 4. Bb5');
  });
});

// FEN for position after 1.e4 — it is BLACK's turn (active color = 'b')
const FEN_AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
// FEN for position after 1.e4 e5 — it is WHITE's turn (active color = 'w', fullmove = 2)
const FEN_AFTER_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

describe('buildQuizPgn', () => {
  test('returns empty string when no moves given', () => {
    expect(buildQuizPgn(START_FEN, [])).toBe('');
  });

  test('returns empty string when all SANs are invalid', () => {
    expect(buildQuizPgn(START_FEN, ['zz9', 'invalid'])).toBe('');
  });

  // ── White-to-move starting position ─────────────────────────────────────────

  test('white-to-move: single white move — no FEN tag, standard notation', () => {
    const pgn = buildQuizPgn(START_FEN, ['e4']);
    expect(pgn).toBe('1. e4 *');
    // No FEN tag for starting position
    expect(pgn).not.toContain('[FEN');
  });

  test('white-to-move: two moves (white + black) — move numbers correct', () => {
    const pgn = buildQuizPgn(START_FEN, ['e4', 'e5']);
    expect(pgn).toBe('1. e4 e5 *');
  });

  test('white-to-move: four moves — move numbers advance correctly', () => {
    const pgn = buildQuizPgn(START_FEN, ['e4', 'e5', 'Nf3', 'Nc6']);
    expect(pgn).toBe('1. e4 e5 2. Nf3 Nc6 *');
  });

  test('white-to-move from non-start position: includes FEN tag', () => {
    const pgn = buildQuizPgn(FEN_AFTER_E4_E5, ['Nf3']);
    expect(pgn).toContain('[FEN "' + FEN_AFTER_E4_E5 + '"]');
    expect(pgn).toContain('[SetUp "1"]');
    // First move is white's move 2
    expect(pgn).toContain('2. Nf3');
  });

  // ── Black-to-move starting position ─────────────────────────────────────────

  test('black-to-move: single black move — uses ellipsis notation', () => {
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5']);
    // Must use "1..." not "1." so pgn-reader assigns turn='b' to first move
    expect(pgn).toContain('1... e5');
    expect(pgn).not.toContain('1. e5'); // NOT white notation
    expect(pgn).toContain('[FEN "' + FEN_AFTER_E4 + '"]');
  });

  test('black-to-move: two moves (black + white) — correct notation', () => {
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5', 'Nf3']);
    // Black's first move uses ellipsis, then white gets the next move number
    expect(pgn).toContain('1... e5');
    expect(pgn).toContain('2. Nf3');
    expect(pgn).not.toContain('1. e5');
  });

  test('black-to-move: three moves — move numbers advance correctly', () => {
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5', 'Nf3', 'Nc6']);
    expect(pgn).toContain('1... e5 2. Nf3 Nc6');
  });

  // ── playerColor derivation (integration with QuizEvaluator) ─────────────────

  test('white-to-move pgn: pgn-reader assigns turn=w to first move', () => {
    // Verifies the PGN format is correct for QuizEvaluator to set playerColor='w'
    const pgn = buildQuizPgn(START_FEN, ['e4']);
    // "1. e4" — standard white notation, pgn-reader should read turn='w'
    expect(pgn).toMatch(/^1\. e4/);
  });

  test('black-to-move pgn: pgn-reader assigns turn=b to first move', () => {
    // Verifies the PGN format is correct for QuizEvaluator to set playerColor='b'
    const pgn = buildQuizPgn(FEN_AFTER_E4, ['e5']);
    // "1... e5" — ellipsis notation, pgn-reader should read turn='b'
    expect(pgn).toMatch(/1\.\.\. e5/);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  test('stops at first invalid SAN and uses moves up to that point', () => {
    const pgn = buildQuizPgn(START_FEN, ['e4', 'INVALID', 'd4']);
    // Only 'e4' is valid (Chess.js throws on INVALID, stopping the loop)
    expect(pgn).toBe('1. e4 *');
  });

  test('fullmove counter from FEN is used for move numbering', () => {
    // After 1.e4 e5 2.Nf3 Nc6 it's white's turn, fullmove = 3
    const fenMove3 = new Chess(FEN_AFTER_E4_E5);
    fenMove3.move('Nf3');
    fenMove3.move('Nc6');
    const fen3 = fenMove3.fen(); // fullmove = 2 (after Nc6, next is white's move 2 in this line)
    // Actually FEN_AFTER_E4_E5 has fullmove=2, after Nf3 Nc6 it becomes fullmove=3
    const pgn = buildQuizPgn(fen3, ['Bc4']);
    // Should use the correct move number from FEN, not hardcoded '1.'
    expect(pgn).toMatch(/\d+\. Bc4/);
    expect(pgn).not.toMatch(/^1\. Bc4/); // fullmove should be > 1
  });
});
