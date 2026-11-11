import { parsePgnTree, type MoveNode } from './moveTree';
import { buildQuizPgn, formatMoveSequence, fenMoveContext } from './chessUtils';
import type { HomeworkPuzzleLine } from './types/homework';

/** One position of a both-sides puzzle (homework-puzzle-type-opponent-moves-plan D1–D3). */
export interface PuzzleLine {
  /** A standalone PGN: the game itself for the main line; for a variation, `buildQuizPgn` from the position after the opponent's alternative move. */
  pgn: string;
  /** The opponent's alternative move the line starts after, with its number ("5... Nf6"); null for the main line. */
  branchMove: string | null;
  /** The position the opponent's alternative was played from; null for the main line. */
  branchFen: string | null;
  /** The alternative's bare SAN, for the client's branch-move replay (homework-puzzle-type-split-plan D5/D6); null for the main line. */
  branchSan: string | null;
}

/**
 * The positions of one PGN game as a both-sides puzzle: the game (main line) first, then one
 * standalone line per variation whose alternative move is the opponent's, deepest branch first,
 * ties in PGN order. A solver-ply variation (an alternative solution) is not a line and is not
 * walked. A variation with no move after the alternative is skipped. An unparsable game is one
 * position, as it is today.
 * Each variation line ends on the **solver's** last ply: a trailing opponent reply is dropped, and a
 * variation with no solver ply after the alternative is skipped (D4 — a regular-graded line that ends
 * on an opponent ply never resolves on the client).
 */
export function expandOpponentVariations(gamePgn: string): PuzzleLine[] {
  const root = parsePgnTree(gamePgn);
  if (!root) return [{ pgn: gamePgn, branchMove: null, branchFen: null, branchSan: null }];
  const solver = root.children[0]?.color ?? 'w';
  const lines: Array<PuzzleLine & { depth: number }> = [];

  const visit = (node: MoveNode): void => {
    for (const alt of node.children.slice(1)) {
      if (alt.color === solver) continue;
      const nodes: MoveNode[] = [];
      let n: MoveNode | undefined = alt.children[0];
      while (n) {
        nodes.push(n);
        n = n.children[0];
      }
      let end = nodes.length;
      while (end > 0 && nodes[end - 1].color !== solver) end--;
      const kept = nodes.slice(0, end);
      if (kept.length > 0) {
        const ctx = fenMoveContext(node.fen);
        lines.push({
          pgn: buildQuizPgn(alt.fen, kept.map((k) => k.san)),
          branchMove: formatMoveSequence([alt.san], ctx.color, ctx.fullMove),
          branchFen: node.fen,
          branchSan: alt.san,
          depth: alt.depth,
        });
      }
      visit(alt);
    }
    if (node.children[0]) visit(node.children[0]);
  };

  visit(root);
  lines.sort((a, b) => b.depth - a.depth);
  return [
    { pgn: gamePgn, branchMove: null, branchFen: null, branchSan: null },
    ...lines.map(({ pgn, branchMove, branchFen, branchSan }) => ({ pgn, branchMove, branchFen, branchSan })),
  ];
}

/** Where a position sits in a both-sides puzzle (D16), 1-based: the game it came from among the homework's games, and the line among that game's lines. */
export interface PuzzleLineProgress { game: number; gameCount: number; line: number; lineCount: number }

/**
 * The position counter's numbers for `lines[index]` (homework-puzzle-type-opponent-moves-plan D16): display
 * arithmetic over the server's `lines[].game`. Null when there is no line for the index (no `lines`, or an
 * index past them); the client then shows its plain position counter. Each client words it itself.
 */
export function puzzleLineProgress(lines: readonly HomeworkPuzzleLine[], index: number): PuzzleLineProgress | null {
  const current = lines[index];
  if (!current) return null;
  const inGame = lines.filter((l) => l.game === current.game);
  return {
    game: current.game + 1,
    gameCount: new Set(lines.map((l) => l.game)).size,
    line: inGame.indexOf(current) + 1,
    lineCount: inGame.length,
  };
}

/** Branch-move replay (homework-puzzle-type-split-plan D6/D8): how long the branch position is shown before the opponent's alternative is played. */
export const BRANCH_INTRO_HOLD_MS = 600;
/** …and how long after that move lands before the student may move (covers the board's 200 ms move animation). */
export const BRANCH_INTRO_SETTLE_MS = 500;
