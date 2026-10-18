import { ChessGame } from '../chessGame';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const REPETITION_START = '7k/7p/8/8/8/8/7P/K7 w - - 0 1';
const REPETITION_SANS = ['Kb1', 'Kg8', 'Ka1', 'Kh8', 'Kb1', 'Kg8', 'Ka1', 'Kh8'];
const PROMOTION_FEN = '8/P6k/8/8/8/8/8/4K3 w - - 0 1';
// Black to move, no legal move, not in check, and K+B v K is also insufficient material.
const STALEMATE_INSUFFICIENT = 'k7/B7/1K6/8/8/8/8/8 b - - 0 1';

// The tag block chess.js's pgn() writes when no headers were set (literal, captured from chess.js 1.4.0).
const CHESSJS_DEFAULT_HEADERS =
  '[Event "?"]\n[Site "?"]\n[Date "????.??.??"]\n[Round "?"]\n[White "?"]\n[Black "?"]\n[Result "*"]\n';

function game(fen?: string): ChessGame {
  const g = ChessGame.fromFen(fen);
  if (!g) throw new Error(`bad fixture FEN: ${fen}`);
  return g;
}

describe('ChessGame.fromFen', () => {
  test('defaults to the standard start position', () => {
    const g = game();
    expect(g.fen).toBe(START);
    expect(g.startFen).toBe(START);
    expect(g.turn).toBe('white');
    expect(g.ply).toBe(0);
  });

  test('returns null for an invalid FEN and never throws', () => {
    expect(ChessGame.fromFen('not-a-fen')).toBeNull();
    expect(ChessGame.fromFen('8/8/8/8/8/8/8/8 w - - 0 1')).toBeNull();
  });

  test('accepts a four-field FEN', () => {
    expect(ChessGame.fromFen('4k3/8/8/8/8/8/8/4K3 w - -')).not.toBeNull();
  });
});

describe('ChessGame.replay', () => {
  test('applies every legal SAN', () => {
    const { game: g, applied } = ChessGame.replay(START, ['e4', 'e5', 'Nf3']);
    expect(applied).toBe(3);
    expect(g.sans).toEqual(['e4', 'e5', 'Nf3']);
  });

  test('stops at the first illegal SAN', () => {
    const { game: g, applied } = ChessGame.replay(START, ['e4', 'e5', 'Nz9', 'Nc6']);
    expect(applied).toBe(2);
    expect(g.sans).toEqual(['e4', 'e5']);
  });

  test('keeps history so threefold repetition is detected', () => {
    const { game: g } = ChessGame.replay(REPETITION_START, REPETITION_SANS);
    expect(g.outcome()).toEqual({ reason: 'threefold', winner: null });
  });
});

describe('ChessGame.fromPgn', () => {
  test('reads the main line from the standard start', () => {
    const g = ChessGame.fromPgn('1. e4 e5 2. Nf3 *');
    expect(g?.sans).toEqual(['e4', 'e5', 'Nf3']);
    expect(g?.startFen).toBe(START);
  });

  test('honours a [FEN] header', () => {
    const g = ChessGame.fromPgn(`[SetUp "1"]\n[FEN "${AFTER_E4}"]\n\n1... e5 2. Nf3 *`);
    expect(g?.startFen).toBe(AFTER_E4);
    expect(g?.sans).toEqual(['e5', 'Nf3']);
    expect(g?.moves[0].fenBefore).toBe(AFTER_E4);
  });

  test('returns null when unparseable', () => {
    expect(ChessGame.fromPgn('1. e4 e5 2. Qxz9 *')).toBeNull();
  });
});

describe('ChessGame.play', () => {
  test('plays a SAN and describes the move', () => {
    const g = game();
    const r = g.play('e4');
    expect(r).toEqual({
      ok: true,
      move: {
        ply: 0,
        san: 'e4',
        uci: 'e2e4',
        from: 'e2',
        to: 'e4',
        color: 'white',
        fenBefore: START,
        fenAfter: AFTER_E4,
      },
    });
    expect(g.fen).toBe(AFTER_E4);
    expect(g.turn).toBe('black');
    expect(g.ply).toBe(1);
  });

  test('plays a from/to move', () => {
    const r = game().play({ from: 'g1', to: 'f3' });
    expect(r.ok && r.move.san).toBe('Nf3');
  });

  test('plays a promotion and reports it', () => {
    const r = game(PROMOTION_FEN).play({ from: 'a7', to: 'a8', promotion: 'q' });
    expect(r.ok && r.move.san).toBe('a8=Q');
    expect(r.ok && r.move.uci).toBe('a7a8q');
    expect(r.ok && r.move.promotion).toBe('q');
  });

  test('an illegal move returns ok:false without throwing and leaves the game alone', () => {
    const g = game();
    expect(g.play('e5')).toEqual({ ok: false, error: 'illegal-move' });
    expect(g.play({ from: 'a1', to: 'a5' })).toEqual({ ok: false, error: 'illegal-move' });
    expect(g.play('garbage')).toEqual({ ok: false, error: 'illegal-move' });
    expect(g.fen).toBe(START);
  });

  test('moves lists every played move with its ply and fens', () => {
    const g = game();
    g.play('e4');
    g.play('e5');
    expect(g.moves.map((m) => [m.ply, m.san, m.color])).toEqual([
      [0, 'e4', 'white'],
      [1, 'e5', 'black'],
    ]);
    expect(g.moves[1].fenBefore).toBe(AFTER_E4);
  });
});

describe('ChessGame.peek', () => {
  test('returns the move without mutating the game', () => {
    const g = game();
    const m = g.peek('e4');
    expect(m?.fenAfter).toBe(AFTER_E4);
    expect(g.fen).toBe(START);
    expect(g.ply).toBe(0);
  });

  test('returns null for an illegal move', () => {
    expect(game().peek('e5')).toBeNull();
  });
});

describe('ChessGame legal destinations', () => {
  test('legalDests covers every from-square of the side to move', () => {
    const dests = game().legalDests();
    expect(dests.size).toBe(10); // 8 pawns + 2 knights
    expect(dests.get('e2')).toEqual(['e3', 'e4']);
    expect(dests.get('g1')?.sort()).toEqual(['f3', 'h3']);
  });

  test('legalDestsFrom lists one square, and is empty for an empty or invalid square', () => {
    const g = game();
    expect(g.legalDestsFrom('e2')).toEqual(['e3', 'e4']);
    expect(g.legalDestsFrom('e4')).toEqual([]);
    expect(g.legalDestsFrom('z9')).toEqual([]);
  });

  test('a promotion square is listed once', () => {
    expect(game(PROMOTION_FEN).legalDestsFrom('a7')).toEqual(['a8']);
  });
});

describe('ChessGame.needsPromotion', () => {
  test('true for a pawn reaching the last rank', () => {
    expect(game(PROMOTION_FEN).needsPromotion('a7', 'a8')).toBe(true);
  });

  test('false for an ordinary move and for an illegal pair', () => {
    const g = game();
    expect(g.needsPromotion('e2', 'e4')).toBe(false);
    expect(g.needsPromotion('a1', 'a8')).toBe(false);
    expect(g.needsPromotion('z9', 'a8')).toBe(false);
  });
});

describe('ChessGame.pieceAt / inCheck', () => {
  test('pieceAt reads a piece, an empty square and an invalid square', () => {
    const g = game();
    expect(g.pieceAt('e1')).toEqual({ type: 'k', color: 'white' });
    expect(g.pieceAt('d8')).toEqual({ type: 'q', color: 'black' });
    expect(g.pieceAt('e4')).toBeNull();
    expect(g.pieceAt('z9')).toBeNull();
  });

  test('inCheck', () => {
    expect(game().inCheck()).toBe(false);
    expect(game('4k2R/8/8/8/8/8/8/4K3 b - - 0 1').inCheck()).toBe(true);
  });
});

describe('ChessGame.outcome', () => {
  test('null while in progress', () => {
    expect(game().outcome()).toBeNull();
  });

  test('checkmate, winner is the side that moved last', () => {
    const { game: g } = ChessGame.replay(START, ['f3', 'e5', 'g4', 'Qh4#']);
    expect(g.outcome()).toEqual({ reason: 'checkmate', winner: 'black' });
  });

  test('stalemate', () => {
    expect(game('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1').outcome()).toEqual({ reason: 'stalemate', winner: null });
  });

  test('insufficient material', () => {
    expect(game('8/8/8/4k3/8/8/8/4K3 w - - 0 1').outcome()).toEqual({ reason: 'insufficient', winner: null });
  });

  test('threefold repetition needs history', () => {
    const { game: g } = ChessGame.replay(REPETITION_START, REPETITION_SANS);
    expect(g.outcome()).toEqual({ reason: 'threefold', winner: null });
    expect(game('7k/7p/8/8/8/8/7P/K7 w - - 8 5').outcome()).toBeNull();
  });

  test('fifty-move rule', () => {
    expect(game('4k3/8/8/8/8/8/4P3/4K3 w - - 100 80').outcome()).toEqual({ reason: 'fifty-move', winner: null });
  });

  test('D4 precedence: stalemate wins over insufficient material', () => {
    expect(game(STALEMATE_INSUFFICIENT).outcome()).toEqual({ reason: 'stalemate', winner: null });
  });
});

describe('ChessGame.pgn', () => {
  test("'ckq' style (default) is empty with no moves", () => {
    expect(game().pgn()).toBe('');
  });

  test("'ckq' style from the standard start", () => {
    const { game: g } = ChessGame.replay(START, ['e4', 'e5', 'Nf3']);
    expect(g.pgn()).toBe('1. e4 e5 2. Nf3 *');
    expect(g.pgn({ style: 'ckq' })).toBe('1. e4 e5 2. Nf3 *');
  });

  test("'ckq' style from a black-to-move custom start adds the FEN header and an ellipsis", () => {
    const { game: g } = ChessGame.replay(AFTER_E4, ['e5', 'Nf3']);
    expect(g.pgn()).toBe(`[FEN "${AFTER_E4}"]\n[SetUp "1"]\n\n1... e5 2. Nf3 *`);
  });

  test("'chessjs' style is chess.js's pgn() verbatim", () => {
    const { game: g } = ChessGame.replay(START, ['e4', 'e5', 'Nf3']);
    expect(g.pgn({ style: 'chessjs' })).toBe(`${CHESSJS_DEFAULT_HEADERS}\n1. e4 e5 2. Nf3 *`);
  });

  test("'chessjs' style keeps the [SetUp]/[FEN] headers for a custom start", () => {
    const { game: g } = ChessGame.replay(AFTER_E4, ['e5', 'Nf3']);
    expect(g.pgn({ style: 'chessjs' })).toBe(
      `${CHESSJS_DEFAULT_HEADERS}[SetUp "1"]\n[FEN "${AFTER_E4}"]\n\n1. ... e5 2. Nf3 *`,
    );
  });
});

describe('ChessGame.clone', () => {
  test('is independent and keeps history', () => {
    const { game: g } = ChessGame.replay(REPETITION_START, REPETITION_SANS.slice(0, 6));
    const c = g.clone();
    expect(c.sans).toEqual(g.sans);
    c.play('Ka1');
    c.play('Kh8');
    expect(c.outcome()).toEqual({ reason: 'threefold', winner: null });
    expect(g.outcome()).toBeNull();
    expect(g.ply).toBe(6);
  });
});
