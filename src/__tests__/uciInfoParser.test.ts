import { extractInt, uciToSan, parseInfoLine } from '../uciInfoParser';
import { START_FEN } from '../chessUtils';

describe('extractInt', () => {
  test('extracts a positive integer following the keyword', () => {
    expect(extractInt('info depth 12 seldepth 20', 'depth')).toBe(12);
  });

  test('extracts a negative integer', () => {
    expect(extractInt('info score cp -35', 'cp')).toBe(-35);
  });

  test('returns null when the keyword is absent', () => {
    expect(extractInt('info depth 12', 'nps')).toBeNull();
  });
});

describe('uciToSan', () => {
  test('converts a simple opening move', () => {
    expect(uciToSan(START_FEN, ['e2e4'])).toEqual(['e4']);
  });

  test('converts a sequence of moves', () => {
    expect(uciToSan(START_FEN, ['e2e4', 'e7e5', 'g1f3'])).toEqual(['e4', 'e5', 'Nf3']);
  });

  test('converts a promotion move with the promotion letter', () => {
    const fen = '8/P6k/8/8/8/8/8/4K3 w - - 0 1';
    expect(uciToSan(fen, ['a7a8q'])).toEqual(['a8=Q']);
  });

  test('returns an empty array when a later move in the sequence is illegal (chess.js throws, discarding partial progress)', () => {
    // chess.js v1.x throws on an illegal .move() call rather than returning
    // null — the outer try/catch swallows it, so this returns [] rather than
    // the partial ['e4']. This is the exact (if surprising) verbatim behavior
    // ported from useStockfishEngine.ts.
    expect(uciToSan(START_FEN, ['e2e4', 'a1a2'])).toEqual([]);
  });

  test('returns an empty array for an invalid FEN', () => {
    expect(uciToSan('not-a-fen', ['e2e4'])).toEqual([]);
  });
});

describe('parseInfoLine', () => {
  test('returns null for a non-info line', () => {
    expect(parseInfoLine('bestmove e2e4', START_FEN)).toBeNull();
  });

  test('returns null when there is no score', () => {
    expect(parseInfoLine('info depth 10 pv e2e4', START_FEN)).toBeNull();
  });

  test('returns null when there is no pv', () => {
    expect(parseInfoLine('info depth 10 score cp 20', START_FEN)).toBeNull();
  });

  test('parses a cp-score line from the White-to-move start position (no POV flip)', () => {
    const line = 'info depth 15 seldepth 20 multipv 1 score cp 25 nodes 100000 nps 500000 pv e2e4 e7e5';
    const parsed = parseInfoLine(line, START_FEN);
    expect(parsed).not.toBeNull();
    expect(parsed!.rank).toBe(1);
    expect(parsed!.data).toMatchObject({
      scoreCp: 25,
      mateIn: null,
      uciMoves: ['e2e4', 'e7e5'],
      sanMoves: ['e4', 'e5'],
      depth: 15,
      startColor: 'w',
      startFullMove: 1,
    });
  });

  test('flips the cp score to White POV when Black is to move', () => {
    // After 1. e4 — Black to move, engine reports from Black's perspective.
    const fenAfterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const line = 'info depth 12 multipv 1 score cp 30 pv e7e5';
    const parsed = parseInfoLine(line, fenAfterE4);
    expect(parsed!.data.scoreCp).toBe(-30);
    expect(parsed!.data.startColor).toBe('b');
  });

  test('parses a mate score and applies the same POV flip', () => {
    const fenAfterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const line = 'info depth 12 multipv 1 score mate -3 pv e7e5';
    const parsed = parseInfoLine(line, fenAfterE4);
    expect(parsed!.data.mateIn).toBe(3);
    expect(parsed!.data.scoreCp).toBeNull();
  });

  test('defaults multipv to 1 when absent', () => {
    const line = 'info depth 10 score cp 10 pv e2e4';
    const parsed = parseInfoLine(line, START_FEN);
    expect(parsed!.rank).toBe(1);
  });
});
