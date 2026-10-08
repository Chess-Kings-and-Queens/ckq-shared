import { Chess, validateFen } from 'chess.js';

export const START_PLACEMENT = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
export const EMPTY_PLACEMENT = '8/8/8/8/8/8/8/8';
export const CASTLING_SIDES = ['K', 'Q', 'k', 'q'] as const;
export type CastlingSide = (typeof CASTLING_SIDES)[number];

export interface PositionDraft {
  placement: string; // FEN field 1
  turn: 'w' | 'b'; // field 2
  castling: string; // field 3: subset of 'KQkq' in that order, or '-'
  enPassant: string; // field 4: a square or '-'
}

export type PositionValidity = { ok: true } | { ok: false; reason: string };

const FILES = 'abcdefgh';
const PIECE_LETTERS = 'kqrbnpKQRBNP';

/** Placement → Map<square, letter>; a malformed placement returns null. */
export function placementToMap(placement: string): Map<string, string> | null {
  const rows = placement.split('/');
  if (rows.length !== 8) return null;
  const pieces = new Map<string, string>();
  for (let r = 0; r < 8; r++) {
    const rank = 8 - r;
    let file = 0;
    for (const ch of rows[r]) {
      if (ch >= '1' && ch <= '8') {
        file += Number(ch);
      } else if (PIECE_LETTERS.includes(ch)) {
        if (file > 7) return null;
        pieces.set(`${FILES[file]}${rank}`, ch);
        file += 1;
      } else {
        return null;
      }
      if (file > 8) return null;
    }
    if (file !== 8) return null;
  }
  return pieces;
}

export function mapToPlacement(pieces: Map<string, string>): string {
  const rows: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const letter = pieces.get(`${FILES[f]}${rank}`);
      if (letter) {
        if (empty > 0) {
          row += String(empty);
          empty = 0;
        }
        row += letter;
      } else {
        empty += 1;
      }
    }
    if (empty > 0) row += String(empty);
    rows.push(row);
  }
  return rows.join('/');
}

/** New placement with `letter` on `square` (null clears it). Malformed input → returned unchanged. */
export function setPieceAt(placement: string, square: string, letter: string | null): string {
  const pieces = placementToMap(placement);
  if (!pieces) return placement;
  if (letter === null) pieces.delete(square);
  else pieces.set(square, letter);
  return mapToPlacement(pieces);
}

/** K: K on e1 + R on h1; Q: K on e1 + R on a1; k: k on e8 + r on h8; q: k on e8 + r on a8. */
export function castlingAvailability(placement: string): Record<CastlingSide, boolean> {
  const pieces = placementToMap(placement);
  if (!pieces) return { K: false, Q: false, k: false, q: false };
  const whiteKing = pieces.get('e1') === 'K';
  const blackKing = pieces.get('e8') === 'k';
  return {
    K: whiteKing && pieces.get('h1') === 'R',
    Q: whiteKing && pieces.get('a1') === 'R',
    k: blackKing && pieces.get('h8') === 'r',
    q: blackKing && pieces.get('a8') === 'r',
  };
}

/** Keeps only available sides, in KQkq order; '-' when none. */
export function pruneCastling(castling: string, placement: string): string {
  const available = castlingAvailability(placement);
  const kept = CASTLING_SIDES.filter((side) => castling.includes(side) && available[side]).join('');
  return kept === '' ? '-' : kept;
}

/** turn 'w': every x6 where a black pawn is on x5 and x6, x7 are empty; turn 'b': every x3 where a white pawn is on x4 and x3, x2 are empty. Files a–h. */
export function enPassantCandidates(placement: string, turn: 'w' | 'b'): string[] {
  const pieces = placementToMap(placement);
  if (!pieces) return [];
  const result: string[] = [];
  for (const file of FILES) {
    if (turn === 'w') {
      if (pieces.get(`${file}5`) === 'p' && !pieces.has(`${file}6`) && !pieces.has(`${file}7`)) {
        result.push(`${file}6`);
      }
    } else if (pieces.get(`${file}4`) === 'P' && !pieces.has(`${file}3`) && !pieces.has(`${file}2`)) {
      result.push(`${file}3`);
    }
  }
  return result;
}

/** First four FEN fields → draft. null when < 4 fields, not 8 rows, a row not summing to 8, an unknown letter, or turn not w/b. Castling pruned; en passant kept only if a candidate; counters discarded (D8). */
export function draftFromFen(fen: string): PositionDraft | null {
  const fields = fen.trim().split(/\s+/);
  if (fields.length < 4) return null;
  const [placement, turn, castling, enPassant] = fields;
  if (placementToMap(placement) === null) return null;
  if (turn !== 'w' && turn !== 'b') return null;
  return {
    placement,
    turn,
    castling: pruneCastling(castling, placement),
    enPassant: enPassantCandidates(placement, turn).includes(enPassant) ? enPassant : '-',
  };
}

/** `${placement} ${turn} ${castling} ${enPassant} 0 1` */
export function draftToFen(draft: PositionDraft): string {
  return `${draft.placement} ${draft.turn} ${draft.castling} ${draft.enPassant} 0 1`;
}

function reasonFor(message: string): string {
  if (message.includes('missing white king')) return 'White needs a king';
  if (message.includes('missing black king')) return 'Black needs a king';
  if (message.includes('too many white')) return 'White can only have one king';
  if (message.includes('too many black')) return 'Black can only have one king';
  if (message.includes('pawns are on the edge')) return 'Pawns cannot stand on the first or last rank';
  return 'Position is not valid';
}

/** chess.js validateFen, then the side-not-to-move-in-check rule (D5). */
export function validatePosition(fen: string): PositionValidity {
  const result = validateFen(fen);
  if (!result.ok) return { ok: false, reason: reasonFor(result.error ?? '') };
  const c = new Chess(fen);
  const other = c.turn() === 'w' ? 'b' : 'w';
  const [kingSq] = c.findPiece({ type: 'k', color: other });
  if (kingSq && c.isAttacked(kingSq, c.turn())) {
    return {
      ok: false,
      reason: other === 'w' ? "White is in check but it is Black's move" : "Black is in check but it is White's move",
    };
  }
  return { ok: true };
}
