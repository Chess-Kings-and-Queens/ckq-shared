import { PgnReader } from '@mliebelt/pgn-reader';
import { START_FEN, withPgnTags, fenMoveContext, normalisePgnForReading, sanToMove } from './chessUtils';
import { ChessGame } from './chessGame';
import { fenFields, fenFromFields } from './fen';
import { setPieceAt } from './boardEditor';

// ── Move tree ──────────────────────────────────────────────────────────────────
//
// Ported verbatim from website2.0's useChessBoard.ts (the React hook keeps the
// rest — chessground config, promotion UI state, navigation callbacks). This is
// the pure variation-tree model: build it from a PGN, walk it, mutate it.

/**
 * One node of the variation tree. `id` is unique within its tree: consumers use
 * it as the React key of a notation token and as the cursor identity
 * (`node.id === currentNodeId`), so two nodes must never share one
 * (pgn-tree-unique-node-ids-plan.md D1/D2).
 */
export interface MoveNode {
  id: string;
  san: string;
  fen: string;
  from: string;
  to: string;
  color: 'w' | 'b';
  depth: number;
  children: MoveNode[];
  parent: MoveNode | null;
  /** Free text of the PGN comment after this move, trimmed. Absent when there is none. */
  comment?: string;
  /** `[%clk h:mm:ss]` after this move: the mover's remaining time, in whole seconds. */
  clockSec?: number;
  /** `[%eval]` after this move, from White's side as written, in centipawns. Never set together with `evalMate`. */
  evalCp?: number;
  /** `[%eval #N]` after this move: moves to mate, negative when Black mates. */
  evalMate?: number;
  /** Numeric annotation glyphs after this move (`!` is 1, `?` is 2 …), in PGN order. Absent when there are none. */
  nags?: number[];
}

export function createRoot(fen: string = START_FEN): MoveNode {
  return { id: 'root', san: '', fen, from: '', to: '', color: 'w', depth: 0, children: [], parent: null };
}

function parseClock(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d+):([0-5]?\d):([0-5]?\d)(?:\.\d+)?$/.exec(value.trim());
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}

function applyAnnotations(node: MoveNode, move: any): void { // pgn-reader's untyped move object
  const nags = (Array.isArray(move.nag) ? move.nag : [])
    .map((n: unknown) => (typeof n === 'string' ? Number(n.replace(/^\$/, '')) : NaN))
    .filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 255);
  if (nags.length) node.nags = nags;
  const text = typeof move.commentAfter === 'string' ? move.commentAfter.trim() : '';
  if (text) node.comment = text;
  const diag = move.commentDiag ?? {};
  const clock = parseClock(diag.clk);
  if (clock !== null) node.clockSec = clock;
  // pgn-reader gives a number for [%eval 0.15], and a string for [%eval #-3] and for the depth form [%eval 0.15,18]
  const raw = (typeof diag.eval === 'number' ? String(diag.eval) : typeof diag.eval === 'string' ? diag.eval : '').split(',')[0].trim();
  const mate = /^#(-?\d+)$/.exec(raw);
  if (mate) node.evalMate = Number(mate[1]);
  else if (raw !== '' && Number.isFinite(Number(raw))) node.evalCp = Math.round(Number(raw) * 100);
}

/**
 * Parse a PGN string into a MoveNode tree, including all variations.
 * `null` when pgn-reader cannot parse it (or the main line holds a null move); an empty root for blank input.
 * This is the one place in the platform that reads a PGN (pgn-single-source-plan.md D1).
 *
 * Variations are added as siblings of the main move (both children of the
 * same parent node). InlineNotation reads n.parent.children.slice(1) to
 * render them inline — this structure is what it expects.
 */
export function parsePgnTree(pgn: string): MoveNode | null {
  if (!pgn.trim()) return createRoot();
  // Read a normalised copy (pgn-check-single-source-plan.md D13); a null move in the main line stays unreadable.
  const prepared = normalisePgnForReading(pgn);
  if (prepared.mainLineNull) return null;
  try {
    const reader = new PgnReader({ pgn: prepared.pgn, manyGames: false });
    const startFen = reader.setToStart();
    const root = createRoot(startFen);

    // Pre-order counter: ids were `pgn-<depth>-<san>`, so two sibling
    // variations opening with the same move shared an id and the notation
    // panel kept one of them on screen after the next game loaded (D1).
    let seq = 0;
    const buildLine = (parentNode: MoveNode, move: any): void => { // pgn-reader's untyped move object
      if (!move?.fen) return;
      seq += 1;
      const child: MoveNode = {
        id: `pgn-${seq}`,
        san: move.notation?.notation ?? '',
        fen: move.fen,
        from: move.from ?? '',
        to: move.to ?? '',
        color: (move.turn ?? 'w') as 'w' | 'b',
        depth: parentNode.depth + 1,
        children: [],
        parent: parentNode,
      };
      parentNode.children.push(child);
      applyAnnotations(child, move);
      // Variations are alternatives to this move from the same parent position
      // → add as siblings (also children of parentNode)
      for (const varMove of (move.variations ?? [])) {
        buildLine(parentNode, varMove);
      }
      // Continue main line
      if (move.next !== undefined) {
        const next = reader.getMove(move.next) ?? undefined;
        if (next) buildLine(child, next);
      }
    };

    const first = reader.getMove(0) ?? undefined;
    if (first) buildLine(root, first);
    return root;
  } catch {
    return null;
  }
}

/** Parse a PGN into a MoveNode tree; an empty root (never a throw) on invalid PGN. */
export function buildTreeFromPgn(pgn: string): MoveNode {
  return parsePgnTree(pgn) ?? createRoot();
}

/** The main line of a tree: each node's first child, root excluded. */
export function mainLine(root: MoveNode): MoveNode[] {
  const line: MoveNode[] = [];
  let node = root;
  while (node.children.length > 0) {
    node = node.children[0];
    line.push(node);
  }
  return line;
}

// ── PGN writer ─────────────────────────────────────────────────────────────────

function formatClock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** ` $n` tokens for a node's move symbols, or '' when it has none. */
function nagTokens(node: MoveNode): string {
  return node.nags?.map((n) => `$${n}`).join(' ') ?? '';
}

/** `{ [%eval …] [%clk …] text }` for a node, or '' when it carries none of the three. */
function commentToken(node: MoveNode): string {
  const parts: string[] = [];
  if (node.evalMate !== undefined) parts.push(`[%eval #${node.evalMate}]`);
  else if (node.evalCp !== undefined) parts.push(`[%eval ${(node.evalCp / 100).toFixed(2)}]`);
  if (node.clockSec !== undefined) parts.push(`[%clk ${formatClock(node.clockSec)}]`);
  if (node.comment) parts.push(node.comment.replace(/[{}]/g, ''));
  return parts.length ? `{ ${parts.join(' ')} }` : '';
}

/**
 * The move text of `node`'s subtree in PGN order: the node's main continuation, each
 * variation in parentheses after the move it is an alternative to, numbered from the
 * position the subtree starts at. `lineStart` forces a number on the first move
 * (a black move at a line start reads "5... Nf6").
 */
function writeMoves(from: MoveNode, lineStart: boolean, comments: boolean): string {
  const parts: string[] = [];
  let node: MoveNode | undefined = from.children[0];
  let needNumber = lineStart;
  while (node) {
    const parent = node.parent as MoveNode;
    const { color, fullMove } = fenMoveContext(parent.fen);
    const label = color === 'w' ? `${fullMove}.` : needNumber ? `${fullMove}...` : '';
    parts.push(label ? `${label} ${node.san}` : node.san);
    needNumber = false;
    const nagToken = comments ? nagTokens(node) : '';
    if (nagToken) parts.push(nagToken);
    const token = comments ? commentToken(node) : '';
    if (token) { parts.push(token); needNumber = true; }
    for (const alt of parent.children.slice(1)) {
      if (alt === node) continue;
      const altCtx = fenMoveContext(parent.fen);
      const altLabel = altCtx.color === 'w' ? `${altCtx.fullMove}.` : `${altCtx.fullMove}...`;
      const altNag = comments ? nagTokens(alt) : '';
      const altToken = comments ? commentToken(alt) : '';
      const rest = writeMoves(alt, Boolean(altToken), comments);
      parts.push(`(${altLabel} ${alt.san}${altNag ? ` ${altNag}` : ''}${altToken ? ` ${altToken}` : ''}${rest ? ` ${rest}` : ''})`);
      needNumber = true;
    }
    node = node.children[0];
  }
  return parts.join(' ');
}

/**
 * The one PGN writer for a move tree with variations (liveboard-quiz-both-sides-plan D19).
 * Tags come from `withPgnTags`: a FEN tag (and SetUp) when the root is not the standard
 * start, nothing otherwise. Round-trips through `parsePgnTree`. An empty tree writes `*`.
 * With `{ comments: true }` each move's symbols (`$n`), evaluation, clock and comment text are written after it, and the result still round-trips through `parsePgnTree`.
 */
export function treeToPgn(root: MoveNode, opts: { comments?: boolean } = {}): string {
  const moveText = writeMoves(root, true, opts.comments === true);
  const body = moveText ? `${moveText} *` : '*';
  return root.fen === START_FEN ? body : withPgnTags(body, { FEN: root.fen });
}

/** The PGN of the game from `node`'s position onward: `node.fen` as the start, `node.children` as the moves (D17). */
export function subtreePgn(node: MoveNode): string {
  return treeToPgn({ ...createRoot(node.fen), children: node.children });
}

/**
 * Appends `sans`, played from `parent`'s position, as a new line under `parent`: its last child, so a
 * side variation when `parent` already has a main move, the main continuation when it has none.
 * Returns the line's first node, or null (tree untouched) when `sans` is empty or any move is illegal.
 * Never merges: a first move equal to an existing child still becomes its own line.
 */
export function addVariation(parent: MoveNode, sans: readonly string[]): MoveNode | null {
  if (sans.length === 0) return null;
  const slot = parent.children.length;
  const line: MoveNode[] = [];
  let fen = parent.fen;
  for (let i = 0; i < sans.length; i++) {
    const squares = sanToMove(fen, sans[i]);
    const { game, applied } = ChessGame.replay(fen, [sans[i]]);
    if (!squares || applied !== 1) return null;
    const node: MoveNode = {
      id: `${parent.id}-v${slot}-${i}`,
      san: sans[i],
      fen: game.fen,
      from: squares.from,
      to: squares.to,
      color: fenMoveContext(fen).color,
      depth: parent.depth + 1 + i,
      children: [],
      parent: i === 0 ? parent : line[i - 1],
    };
    if (i > 0) line[i - 1].children.push(node);
    line.push(node);
    fen = game.fen;
  }
  parent.children.push(line[0]);
  return line[0];
}

/** True when the node carries any annotation (comment, move symbol, clock or evaluation). */
export function hasAnnotations(node: MoveNode): boolean {
  return Boolean(node.comment) || Boolean(node.nags?.length) || node.clockSec !== undefined
    || node.evalCp !== undefined || node.evalMate !== undefined;
}

/** Remove every annotation from one node; returns whether anything was removed. */
export function clearNodeAnnotations(node: MoveNode): boolean {
  const had = node.comment !== undefined || node.nags !== undefined || node.clockSec !== undefined
    || node.evalCp !== undefined || node.evalMate !== undefined;
  delete node.comment;
  delete node.nags;
  delete node.clockSec;
  delete node.evalCp;
  delete node.evalMate;
  return had;
}

/** Remove every annotation from `root` and all its descendants (variations included); returns the number of nodes changed. */
export function clearAllAnnotations(root: MoveNode): number {
  let changed = clearNodeAnnotations(root) ? 1 : 0;
  for (const child of root.children) changed += clearAllAnnotations(child);
  return changed;
}

const NAG_SYMBOLS: Record<number, string> = {
  1: '!', 2: '?', 3: '!!', 4: '??', 5: '!?', 6: '?!', 7: '□', 10: '=', 13: '∞', 14: '⩲', 15: '⩱',
  16: '±', 17: '∓', 18: '+−', 19: '−+', 22: '⨀', 23: '⨀', 32: '⟳', 33: '⟳', 36: '→', 37: '→',
  40: '↑', 41: '↑', 132: '⇆', 133: '⇆', 138: '⊕', 139: '⊕', 140: '∆', 146: 'N',
};

/** The display symbol of a NAG code, or null when the code has none. */
export function nagSymbol(code: number): string | null {
  return Object.prototype.hasOwnProperty.call(NAG_SYMBOLS, code) ? NAG_SYMBOLS[code] : null;
}

/** Whether a NAG code reads as a good move, a bad move, or neither. */
export function nagKind(code: number): 'good' | 'bad' | 'neutral' {
  if (code === 1 || code === 3 || code === 5) return 'good';
  if (code === 2 || code === 4 || code === 6) return 'bad';
  return 'neutral';
}

/** `h:mm:ss` from one hour up, else `m:ss`; whole seconds, clamped at 0. */
export function formatGameClock(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const ss = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** `+0.35`, `−1.20` (U+2212), `0.00`, `#3`, `#−2`; null when the node has no evaluation. */
export function formatNodeEval(node: MoveNode): string | null {
  if (node.evalMate !== undefined) return `#${node.evalMate < 0 ? '\u2212' : ''}${Math.abs(node.evalMate)}`;
  if (node.evalCp === undefined) return null;
  const abs = (Math.abs(node.evalCp) / 100).toFixed(2);
  if (node.evalCp > 0) return `+${abs}`;
  if (node.evalCp < 0) return `\u2212${abs}`;
  return abs;
}

// ── Promotion visual FEN ──────────────────────────────────────────────────────

/**
 * Returns a FEN with the piece character moved from `from` to `to`.
 * Used to keep the pawn visible at the destination square while the
 * promotion picker is open — without applying the move to the game tree.
 *
 * Exported here (private in the original useChessBoard.ts) so it can be
 * unit-tested directly and reused by ckq-mobile's promotion picker.
 */
export function movePieceInFen(fen: string, from: string, to: string, pieceChar: string): string {
  const f = fenFields(fen);
  if (!f) return fen;
  const cleared = setPieceAt(f.placement, from, null);
  const placed = setPieceAt(cleared, to, pieceChar);
  return fenFromFields({ ...f, placement: placed });
}
