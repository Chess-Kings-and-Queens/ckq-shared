import { PgnReader } from '@mliebelt/pgn-reader';
import { START_FEN, withPgnTags, fenMoveContext } from './chessUtils';
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
}

export function createRoot(fen: string = START_FEN): MoveNode {
  return { id: 'root', san: '', fen, from: '', to: '', color: 'w', depth: 0, children: [], parent: null };
}

/**
 * Parse a PGN string into a MoveNode tree, including all variations.
 * `null` when pgn-reader cannot parse it; an empty root for blank input.
 * This is the one place in the platform that reads a PGN (pgn-single-source-plan.md D1).
 *
 * Variations are added as siblings of the main move (both children of the
 * same parent node). InlineNotation reads n.parent.children.slice(1) to
 * render them inline — this structure is what it expects.
 */
export function parsePgnTree(pgn: string): MoveNode | null {
  if (!pgn.trim()) return createRoot();
  try {
    const reader = new PgnReader({ pgn, manyGames: false });
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

/**
 * The move text of `node`'s subtree in PGN order: the node's main continuation, each
 * variation in parentheses after the move it is an alternative to, numbered from the
 * position the subtree starts at. `lineStart` forces a number on the first move
 * (a black move at a line start reads "5... Nf6").
 */
function writeMoves(from: MoveNode, lineStart: boolean): string {
  const parts: string[] = [];
  let node: MoveNode | undefined = from.children[0];
  let needNumber = lineStart;
  while (node) {
    const parent = node.parent as MoveNode;
    const { color, fullMove } = fenMoveContext(parent.fen);
    const label = color === 'w' ? `${fullMove}.` : needNumber ? `${fullMove}...` : '';
    parts.push(label ? `${label} ${node.san}` : node.san);
    needNumber = false;
    for (const alt of parent.children.slice(1)) {
      if (alt === node) continue;
      const altCtx = fenMoveContext(parent.fen);
      const altLabel = altCtx.color === 'w' ? `${altCtx.fullMove}.` : `${altCtx.fullMove}...`;
      const rest = writeMoves(alt, false);
      parts.push(`(${altLabel} ${alt.san}${rest ? ` ${rest}` : ''})`);
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
 */
export function treeToPgn(root: MoveNode): string {
  const moveText = writeMoves(root, true);
  const body = moveText ? `${moveText} *` : '*';
  return root.fen === START_FEN ? body : withPgnTags(body, { FEN: root.fen });
}

/** The PGN of the game from `node`'s position onward: `node.fen` as the start, `node.children` as the moves (D17). */
export function subtreePgn(node: MoveNode): string {
  return treeToPgn({ ...createRoot(node.fen), children: node.children });
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
