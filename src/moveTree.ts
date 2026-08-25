import { PgnReader } from '@mliebelt/pgn-reader';
import { START_FEN } from './chessUtils';

// ── Move tree ──────────────────────────────────────────────────────────────────
//
// Ported verbatim from website2.0's useChessBoard.ts (the React hook keeps the
// rest — chessground config, promotion UI state, navigation callbacks). This is
// the pure variation-tree model: build it from a PGN, walk it, mutate it.

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
 * Returns an empty root on invalid PGN — does not throw.
 *
 * Variations are added as siblings of the main move (both children of the
 * same parent node). InlineNotation reads n.parent.children.slice(1) to
 * render them inline — this structure is what it expects.
 */
export function buildTreeFromPgn(pgn: string): MoveNode {
  if (!pgn.trim()) return createRoot();
  try {
    const reader = new PgnReader({ pgn, manyGames: false });
    const startFen = reader.setToStart();
    const root = createRoot(startFen);

    const buildLine = (parentNode: MoveNode, move: any): void => {
      if (!move?.fen) return;
      const child: MoveNode = {
        id: `pgn-${parentNode.depth}-${move.notation?.notation ?? move.index ?? parentNode.depth}`,
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
    return createRoot();
  }
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
  const [board, ...rest] = fen.split(' ');
  const grid = board.split('/').map((rank) => {
    const row: string[] = [];
    for (const ch of rank) {
      if (ch >= '1' && ch <= '8') for (let i = 0; i < parseInt(ch); i++) row.push('.');
      else row.push(ch);
    }
    return row;
  });
  const col = (file: string) => file.charCodeAt(0) - 97;
  const row = (rank: string) => 8 - parseInt(rank);
  grid[row(from[1])][col(from[0])] = '.';
  grid[row(to[1])][col(to[0])] = pieceChar;
  const newBoard = grid
    .map((r) => r.reduce((s, ch) => {
      if (ch === '.') {
        const last = s[s.length - 1];
        return last >= '1' && last <= '8' ? s.slice(0, -1) + (parseInt(last) + 1) : s + '1';
      }
      return s + ch;
    }, ''))
    .join('/');
  return [newBoard, ...rest].join(' ');
}
