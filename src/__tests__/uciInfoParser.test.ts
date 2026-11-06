import { extractInt, uciToSan, parseInfoLine, parseUciInfoRaw, parseBestmove } from '../uciInfoParser';
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

  test('returns the legal prefix when a later move in the sequence is illegal', () => {
    expect(uciToSan(START_FEN, ['e2e4', 'a1a2'])).toEqual(['e4']);
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

describe('parseUciInfoRaw', () => {
  // Ported from chess-engine-api src/__tests__/uciParser.test.js (the parser it replaces).
  test('parses a cp score line with nodes, nps and time', () => {
    expect(parseUciInfoRaw('info depth 25 seldepth 35 multipv 2 score cp 82 nodes 1234567 nps 5906000 time 209 pv e2e4 e7e5 g1f3')).toEqual({
      depth: 25, multipv: 2, scoreCp: 82, mateIn: null,
      uciMoves: ['e2e4', 'e7e5', 'g1f3'], nodes: 1234567, nps: 5906000, time: 209,
    });
  });

  test('parses a positive mate score', () => {
    const parsed = parseUciInfoRaw('info depth 20 multipv 1 score mate 4 nodes 10 pv g1f3 d7d5');
    expect(parsed?.mateIn).toBe(4);
    expect(parsed?.scoreCp).toBeNull();
    expect(parsed?.nodes).toBe(10);
  });

  test('parses a negative mate score', () => {
    const parsed = parseUciInfoRaw('info depth 20 multipv 1 score mate -3 nodes 10 pv g1f3 d7d5');
    expect(parsed?.mateIn).toBe(-3);
    expect(parsed?.scoreCp).toBeNull();
  });

  test('defaults multipv to 1 and leaves absent nodes/nps/time null', () => {
    const parsed = parseUciInfoRaw('info depth 12 score cp 10 pv e2e4');
    expect(parsed?.multipv).toBe(1);
    expect(parsed?.nodes).toBeNull();
    expect(parsed?.nps).toBeNull();
    expect(parsed?.time).toBeNull();
  });

  test('returns null for a line without a pv', () => {
    expect(parseUciInfoRaw('info depth 12 multipv 1 score cp 10 nodes 10')).toBeNull();
  });

  test('returns null for a non-info line', () => {
    expect(parseUciInfoRaw('bestmove e2e4 ponder e7e5')).toBeNull();
  });

  test('is not broken by a wdl token', () => {
    const parsed = parseUciInfoRaw('info depth 18 multipv 1 score cp 30 wdl 355 620 25 nodes 100 nps 1000 time 5 pv e2e4 e7e5');
    expect(parsed?.scoreCp).toBe(30);
    expect(parsed?.uciMoves).toEqual(['e2e4', 'e7e5']);
    expect(parsed?.nps).toBe(1000);
    expect(parsed?.time).toBe(5);
  });

  test('keeps the engine score from the side to move (no White-POV flip)', () => {
    const blackToMove = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    expect(parseUciInfoRaw('info depth 10 score cp 40 pv e7e5')?.scoreCp).toBe(40);
    expect(parseInfoLine('info depth 10 score cp 40 pv e7e5', blackToMove)?.data.scoreCp).toBe(-40);
  });
});

describe('parseBestmove', () => {
  test('returns the move of a bestmove line, ignoring ponder', () => {
    expect(parseBestmove('bestmove e2e4 ponder e7e5')).toBe('e2e4');
    expect(parseBestmove('bestmove a7a8q')).toBe('a7a8q');
  });

  test('returns null for (none), a bare bestmove and a non-bestmove line', () => {
    expect(parseBestmove('bestmove (none)')).toBeNull();
    expect(parseBestmove('bestmove')).toBeNull();
    expect(parseBestmove('info depth 1')).toBeNull();
  });
});
