/** The six FEN fields. `halfmove`/`fullmove` default to 0 and 1 when absent. */
export interface FenFields {
  placement: string;
  turn: 'w' | 'b';
  castling: string;
  enPassant: string;
  halfmove: number;
  fullmove: number;
}

/**
 * The one FEN tokeniser in the platform (fen-accessors-and-training-position-admin-plan.md D1).
 * `null` unless `fen` is a string with at least four whitespace-separated fields whose
 * second field is `w` or `b`. Placement is returned as written — `placementToMap`
 * decides whether it is a board. Every consumer reads FEN fields through this; the
 * `fenSplitBoundary` guards fail any `.split(` on a FEN elsewhere.
 */
export function fenFields(fen: unknown): FenFields | null {
  if (typeof fen !== 'string') return null;
  const t = fen.trim().split(/\s+/);
  if (t.length < 4 || (t[1] !== 'w' && t[1] !== 'b')) return null;
  return {
    placement: t[0],
    turn: t[1],
    castling: t[2],
    enPassant: t[3],
    halfmove: parseInt(t[4] ?? '0', 10) || 0,
    fullmove: parseInt(t[5] ?? '1', 10) || 1,
  };
}

/** `fenFields` inverse: the six fields space-joined. */
export function fenFromFields(f: FenFields): string {
  return `${f.placement} ${f.turn} ${f.castling} ${f.enPassant} ${f.halfmove} ${f.fullmove}`;
}
