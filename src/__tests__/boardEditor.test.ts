import {
  START_PLACEMENT,
  EMPTY_PLACEMENT,
  placementToMap,
  mapToPlacement,
  setPieceAt,
  castlingAvailability,
  pruneCastling,
  enPassantCandidates,
  draftFromFen,
  draftToFen,
  validatePosition,
} from '../boardEditor';
import * as shared from '../index';
import { START_FEN } from '../chessUtils';

describe('placementToMap / mapToPlacement', () => {
  test('round-trips the start placement', () => {
    const map = placementToMap(START_PLACEMENT);
    expect(map).not.toBeNull();
    expect(map?.get('e1')).toBe('K');
    expect(map?.get('d8')).toBe('q');
    expect(mapToPlacement(map as Map<string, string>)).toBe(START_PLACEMENT);
  });

  test('round-trips the empty placement', () => {
    const map = placementToMap(EMPTY_PLACEMENT);
    expect(map?.size).toBe(0);
    expect(mapToPlacement(map as Map<string, string>)).toBe(EMPTY_PLACEMENT);
  });

  test('a malformed row returns null', () => {
    expect(placementToMap('9/8/8/8/8/8/8/8')).toBeNull();
    expect(placementToMap('7/8/8/8/8/8/8/8')).toBeNull();
    expect(placementToMap('8/8/8/8/8/8/8')).toBeNull();
    expect(placementToMap('x7/8/8/8/8/8/8/8')).toBeNull();
  });
});

describe('setPieceAt', () => {
  test('places a piece on an empty square', () => {
    expect(setPieceAt(EMPTY_PLACEMENT, 'e4', 'Q')).toBe('8/8/8/8/4Q3/8/8/8');
  });

  test('replaces an occupant', () => {
    expect(setPieceAt('8/8/8/8/4Q3/8/8/8', 'e4', 'n')).toBe('8/8/8/8/4n3/8/8/8');
  });

  test('clears a square with null', () => {
    expect(setPieceAt('8/8/8/8/4Q3/8/8/8', 'e4', null)).toBe(EMPTY_PLACEMENT);
  });

  test('ignores a malformed placement', () => {
    expect(setPieceAt('bogus', 'e4', 'Q')).toBe('bogus');
  });
});

describe('castlingAvailability', () => {
  test('all sides available at the start', () => {
    expect(castlingAvailability(START_PLACEMENT)).toEqual({ K: true, Q: true, k: true, q: true });
  });

  test('K is false with no rook on h1', () => {
    const placement = setPieceAt(START_PLACEMENT, 'h1', null);
    expect(castlingAvailability(placement)).toEqual({ K: false, Q: true, k: true, q: true });
  });

  test('white sides are all false with the king on d1', () => {
    const placement = setPieceAt(setPieceAt(START_PLACEMENT, 'e1', null), 'd1', 'K');
    const result = castlingAvailability(placement);
    expect(result.K).toBe(false);
    expect(result.Q).toBe(false);
    expect(result.k).toBe(true);
    expect(result.q).toBe(true);
  });
});

describe('pruneCastling', () => {
  test('returns - when no king or rooks remain', () => {
    expect(pruneCastling('KQkq', '4k3/8/8/8/8/8/8/4K3')).toBe('-');
  });

  test('re-orders to KQkq', () => {
    expect(pruneCastling('qK', START_PLACEMENT)).toBe('Kq');
  });
});

describe('enPassantCandidates', () => {
  test('white to move with a black pawn on e5 and e6/e7 empty', () => {
    expect(enPassantCandidates('4k3/8/8/4p3/8/8/8/4K3', 'w')).toEqual(['e6']);
  });

  test('e7 occupied removes the candidate', () => {
    expect(enPassantCandidates('4k3/4n3/8/4p3/8/8/8/4K3', 'w')).toEqual([]);
  });

  test('black to move mirror', () => {
    expect(enPassantCandidates('4k3/8/8/8/4P3/8/8/4K3', 'b')).toEqual(['e3']);
  });
});

describe('draftFromFen / draftToFen', () => {
  test('parses the start FEN', () => {
    expect(draftFromFen(START_FEN)).toEqual({
      placement: START_PLACEMENT,
      turn: 'w',
      castling: 'KQkq',
      enPassant: '-',
    });
  });

  test('parses a 4-field FEN', () => {
    expect(draftFromFen(`${START_PLACEMENT} b KQkq -`)).toEqual({
      placement: START_PLACEMENT,
      turn: 'b',
      castling: 'KQkq',
      enPassant: '-',
    });
  });

  test('keeps an en passant square only when it is a candidate', () => {
    const placement = '4k3/8/8/8/4P3/8/8/4K3';
    expect(draftFromFen(`${placement} b - e3`)?.enPassant).toBe('e3');
    expect(draftFromFen(`${placement} b - d3`)?.enPassant).toBe('-');
  });

  test('returns null for fewer than 4 fields', () => {
    expect(draftFromFen(`${START_PLACEMENT} w KQkq`)).toBeNull();
  });

  test('returns null for an unknown letter', () => {
    expect(draftFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNX w KQkq -')).toBeNull();
  });

  test('returns null for an invalid turn', () => {
    expect(draftFromFen(`${START_PLACEMENT} x KQkq -`)).toBeNull();
  });

  test('draftToFen ends with 0 1', () => {
    const draft = draftFromFen(START_FEN);
    expect(draft).not.toBeNull();
    expect(draftToFen(draft as NonNullable<typeof draft>)).toBe(`${START_PLACEMENT} w KQkq - 0 1`);
  });
});

describe('validatePosition', () => {
  test('start position is ok', () => {
    expect(validatePosition(START_FEN)).toEqual({ ok: true });
  });

  test('a checkmate position is ok', () => {
    // fool's mate, white is checkmated
    expect(validatePosition('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')).toEqual({ ok: true });
  });

  test('missing white king', () => {
    expect(validatePosition('4k3/8/8/8/8/8/8/8 w - - 0 1')).toEqual({ ok: false, reason: 'White needs a king' });
  });

  test('missing black king', () => {
    expect(validatePosition('8/8/8/8/8/8/8/4K3 w - - 0 1')).toEqual({ ok: false, reason: 'Black needs a king' });
  });

  test('two white kings', () => {
    expect(validatePosition('4k3/8/8/8/8/8/8/KK6 w - - 0 1')).toEqual({
      ok: false,
      reason: 'White can only have one king',
    });
  });

  test('two black kings', () => {
    expect(validatePosition('kk6/8/8/8/8/8/8/4K3 w - - 0 1')).toEqual({
      ok: false,
      reason: 'Black can only have one king',
    });
  });

  test('pawn on the edge row', () => {
    expect(validatePosition('P3k3/8/8/8/8/8/8/4K3 w - - 0 1')).toEqual({
      ok: false,
      reason: 'Pawns cannot stand on the first or last rank',
    });
  });

  test('anything else maps to the generic reason', () => {
    expect(validatePosition('4k3/8/8/8/8/8/8/4K3 w - e3 0 1')).toEqual({
      ok: false,
      reason: 'Position is not valid',
    });
  });

  test('black in check on white to move', () => {
    expect(validatePosition('4k2R/8/8/8/8/8/8/4K3 w - - 0 1')).toEqual({
      ok: false,
      reason: "Black is in check but it is White's move",
    });
  });

  test('white in check on black to move', () => {
    expect(validatePosition('4k3/8/8/8/8/8/8/r3K3 b - - 0 1')).toEqual({
      ok: false,
      reason: "White is in check but it is Black's move",
    });
  });

  test('castling rights with no rook are ok', () => {
    expect(validatePosition('4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1')).toEqual({ ok: true });
  });
});

describe('package root exports', () => {
  test('the editor exports are reachable from the package root', () => {
    expect(shared.START_PLACEMENT).toBe(START_PLACEMENT);
    expect(typeof shared.validatePosition).toBe('function');
    expect(typeof shared.draftFromFen).toBe('function');
    expect(typeof shared.enPassantCandidates).toBe('function');
  });
});
