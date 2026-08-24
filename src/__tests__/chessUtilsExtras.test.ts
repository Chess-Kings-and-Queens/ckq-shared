/**
 * Tests for the newly extracted utility functions in chessUtils:
 * parsePgnHeader, gameLabel, isFenString, uciMoveToSan
 */

import { parsePgnHeader, gameLabel, isFenString, uciMoveToSan, sanToMove } from '../chessUtils';

// ── parsePgnHeader ──────────────────────────────────────────────────────────────

describe('parsePgnHeader', () => {
  test('parses White and Black tags', () => {
    const pgn = '[White "Kasparov"]\n[Black "Karpov"]\n\n1. e4 e5 *';
    const result = parsePgnHeader(pgn);
    expect(result.White).toBe('Kasparov');
    expect(result.Black).toBe('Karpov');
  });

  test('parses Event, Date, Result tags', () => {
    const pgn = '[Event "World Championship"]\n[Date "1985.11.09"]\n[Result "1-0"]\n\n1. d4 *';
    const result = parsePgnHeader(pgn);
    expect(result.Event).toBe('World Championship');
    expect(result.Date).toBe('1985.11.09');
    expect(result.Result).toBe('1-0');
  });

  test('parses FEN and SetUp tags', () => {
    const pgn = '[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"]\n[SetUp "1"]\n\n1... e5 *';
    const result = parsePgnHeader(pgn);
    expect(result.FEN).toContain('rnbqkbnr');
    expect(result.SetUp).toBe('1');
  });

  test('parses WhiteElo and BlackElo', () => {
    const pgn = '[White "Carlsen"]\n[WhiteElo "2882"]\n[Black "Nepo"]\n[BlackElo "2782"]\n\n1. e4 *';
    const result = parsePgnHeader(pgn);
    expect(result.WhiteElo).toBe('2882');
    expect(result.BlackElo).toBe('2782');
  });

  test('returns empty object for PGN with no headers', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6 *';
    expect(parsePgnHeader(pgn)).toEqual({});
  });

  test('returns empty object for empty string', () => {
    expect(parsePgnHeader('')).toEqual({});
  });
});

// ── gameLabel ───────────────────────────────────────────────────────────────────

describe('gameLabel', () => {
  test('shows players when White and Black are present', () => {
    const pgn = '[White "Kasparov"]\n[Black "Karpov"]\n\n1. e4 *';
    expect(gameLabel(pgn, 0)).toBe('1. Kasparov vs Karpov');
  });

  test('includes event and date when present', () => {
    const pgn = '[White "Carlsen"]\n[Black "Nepo"]\n[Event "WCC 2021"]\n[Date "2021.12.03"]\n\n1. d4 *';
    expect(gameLabel(pgn, 2)).toBe('3. Carlsen vs Nepo — WCC 2021, 2021.12.03');
  });

  test('shows (unknown) when no player tags', () => {
    const pgn = '[FEN "8/8/4k3/8/4K3/8/8/8 w - - 0 1"]\n\n1. Ke5 *';
    expect(gameLabel(pgn, 0)).toBe('1. (unknown)');
  });

  test('shows only event when no players but event present', () => {
    const pgn = '[Event "Puzzle Set"]\n\n1. e4 *';
    expect(gameLabel(pgn, 4)).toBe('5. (unknown) — Puzzle Set');
  });

  test('index is 0-based, label is 1-based', () => {
    const pgn = '[White "A"]\n[Black "B"]\n\n1. e4 *';
    expect(gameLabel(pgn, 0)).toMatch(/^1\./);
    expect(gameLabel(pgn, 9)).toMatch(/^10\./);
  });
});

// ── isFenString ─────────────────────────────────────────────────────────────────

describe('isFenString', () => {
  test('detects standard starting FEN', () => {
    expect(isFenString('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(true);
  });

  test('detects FEN with fewer parts (4 parts minimum)', () => {
    expect(isFenString('8/8/4k3/8/4K3/8/8/8 w - -')).toBe(true);
  });

  test('rejects PGN move text', () => {
    expect(isFenString('1. e4 e5 2. Nf3 Nc6 *')).toBe(false);
  });

  test('rejects PGN with headers', () => {
    expect(isFenString('[Event "Test"]\n\n1. e4 *')).toBe(false);
  });

  test('rejects empty string', () => {
    expect(isFenString('')).toBe(false);
  });

  test('rejects plain text', () => {
    expect(isFenString('hello world')).toBe(false);
  });

  test('handles whitespace around FEN', () => {
    expect(isFenString('  rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1  ')).toBe(true);
  });
});

// ── uciMoveToSan ─────────────────────────────────────────────────────────────────

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

describe('uciMoveToSan', () => {
  test('converts a standard pawn push (e2e4 → e4)', () => {
    expect(uciMoveToSan(START_FEN, 'e2e4')).toBe('e4');
  });

  test('converts a knight move (g1f3 → Nf3)', () => {
    expect(uciMoveToSan(START_FEN, 'g1f3')).toBe('Nf3');
  });

  test('converts a pawn response move (e7e5 → e5 on black to move)', () => {
    expect(uciMoveToSan(AFTER_E4_FEN, 'e7e5')).toBe('e5');
  });

  test('returns null for an illegal move', () => {
    // e2e5 is illegal from starting position
    expect(uciMoveToSan(START_FEN, 'e2e5')).toBeNull();
  });

  test('returns null for an invalid FEN', () => {
    expect(uciMoveToSan('not-a-fen', 'e2e4')).toBeNull();
  });

  test('handles pawn promotion (a7a8q → a8=Q)', () => {
    // White pawn on a7, king positions, black king
    const promoFen = '8/P6k/8/8/8/8/8/4K3 w - - 0 1';
    const result = uciMoveToSan(promoFen, 'a7a8q');
    expect(result).toBe('a8=Q');
  });
});

// ── sanToMove ──────────────────────────────────────────────────────────────────

describe('sanToMove', () => {
  test('returns the origin/destination squares for a legal pawn push (e4 → e2-e4)', () => {
    expect(sanToMove(START_FEN, 'e4')).toEqual({ from: 'e2', to: 'e4' });
  });

  test('returns the origin/destination squares for a legal knight move (Nf3 → g1-f3)', () => {
    expect(sanToMove(START_FEN, 'Nf3')).toEqual({ from: 'g1', to: 'f3' });
  });

  test('returns the origin/destination squares for a response move (e5 on black to move)', () => {
    expect(sanToMove(AFTER_E4_FEN, 'e5')).toEqual({ from: 'e7', to: 'e5' });
  });

  test('returns null for an illegal SAN in that position', () => {
    // e5 is not legal from the starting position (white to move)
    expect(sanToMove(START_FEN, 'e5')).toBeNull();
  });

  test('returns null for an invalid FEN', () => {
    expect(sanToMove('not-a-fen', 'e4')).toBeNull();
  });
});
