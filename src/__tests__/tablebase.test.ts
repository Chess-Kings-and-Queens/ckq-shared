import {
  SYZYGY_MAX_PIECES,
  countPieces,
  positionKey,
  tablebaseCategory,
  tablebaseEligibility,
  tablebaseWinner,
} from '../tablebase';
import * as shared from '../index';
import { ChessGame } from '../chessGame';
import type { TablebaseWdl } from '../types/tablebase';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const ADJACENT_KINGS = '8/8/8/8/8/8/1k6/K1Q5 w - - 0 1';
const MOVER_NOT_TO_MOVE_IN_CHECK = '8/8/8/8/8/8/2k5/K1Q5 w - - 0 1';

describe('SYZYGY_MAX_PIECES', () => {
  test('is 7', () => {
    expect(SYZYGY_MAX_PIECES).toBe(7);
  });
});

describe('countPieces', () => {
  test('counts the pieces on the board', () => {
    expect(countPieces(START)).toBe(32);
    expect(countPieces('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1')).toBe(3);
  });

  test.each([[''], ['garbage'], [undefined], [null], [42]])('returns 0 for %p', (value) => {
    expect(countPieces(value as unknown as string)).toBe(0);
  });
});

describe('positionKey', () => {
  test('drops the move clocks', () => {
    expect(positionKey('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1')).toBe(positionKey('4k3/8/8/8/8/8/4P3/4K3 w - - 17 40'));
  });

  test('drops a non-capturable en-passant square', () => {
    const typed = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    expect(positionKey(typed)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -');
  });

  test('keeps a capturable en-passant square', () => {
    expect(positionKey('4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1')).toBe('4k3/8/8/8/3pP3/8/8/4K3 b - e3');
  });

  test('is never null for garbage', () => {
    expect(positionKey('garbage')).toEqual(expect.any(String));
    expect(positionKey(undefined as unknown as string)).toEqual(expect.any(String));
  });

  test('two unreadable FENs differing only in en-passant or clocks share a key', () => {
    expect(positionKey('x/y w - e3 0 1')).toBe(positionKey('x/y w - - 9 9'));
  });
});

describe('tablebaseEligibility', () => {
  test.each([[''], ['garbage']])('rejects %p as invalid-fen', (fen) => {
    const r = tablebaseEligibility(fen);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid-fen');
  });

  test.each([ADJACENT_KINGS, MOVER_NOT_TO_MOVE_IN_CHECK])('rejects illegal position %s that chess.js loads', (fen) => {
    expect(ChessGame.fromFen(fen)).not.toBeNull();
    const r = tablebaseEligibility(fen);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid-fen');
  });

  test('8 pieces is too-many-pieces at the default ceiling', () => {
    const r = tablebaseEligibility('4k3/ppp5/8/8/8/8/PPP5/4K3 w - - 0 1');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('too-many-pieces');
      expect(r.pieces).toBe(8);
    }
  });

  test('the maxPieces argument is respected', () => {
    const fen = '8/8/8/8/8/3k4/8/K1Q5 w - - 0 1';
    expect(tablebaseEligibility(fen).ok).toBe(true);
    const r = tablebaseEligibility(fen, 2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('too-many-pieces');
  });

  test('a possible castling right is castling-rights', () => {
    const r = tablebaseEligibility('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('castling-rights');
  });

  test('impossible castling rights are pruned and the position is ok', () => {
    const r = tablebaseEligibility('4k3/8/8/8/8/8/8/4K3 w KQ - 0 1');
    expect(r.ok).toBe(true);
  });

  test('ok returns a ChessGame and the piece count', () => {
    const r = tablebaseEligibility('8/8/8/8/8/3k4/8/K1Q5 w - - 0 1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.game).toBeInstanceOf(ChessGame);
      expect(r.pieces).toBe(3);
    }
  });
});

describe('tablebaseCategory', () => {
  test.each<[TablebaseWdl, string]>([
    [2, 'win'],
    [1, 'cursed-win'],
    [0, 'draw'],
    [-1, 'blessed-loss'],
    [-2, 'loss'],
  ])('wdl %i is %s', (wdl, category) => {
    expect(tablebaseCategory(wdl)).toBe(category);
  });
});

describe('tablebaseWinner', () => {
  test('a mover win and loss resolve to an absolute side', () => {
    expect(tablebaseWinner(2, 'white')).toBe('white');
    expect(tablebaseWinner(2, 'black')).toBe('black');
    expect(tablebaseWinner(-2, 'white')).toBe('black');
    expect(tablebaseWinner(-2, 'black')).toBe('white');
  });

  test.each<TablebaseWdl>([1, 0, -1])('wdl %i is null', (wdl) => {
    expect(tablebaseWinner(wdl, 'white')).toBeNull();
    expect(tablebaseWinner(wdl, 'black')).toBeNull();
  });
});

describe('index re-exports', () => {
  test.each(['SYZYGY_MAX_PIECES', 'countPieces', 'positionKey', 'tablebaseEligibility', 'tablebaseCategory', 'tablebaseWinner'])(
    '%s is exported',
    (name) => {
      expect((shared as Record<string, unknown>)[name]).toBeDefined();
    },
  );
});
