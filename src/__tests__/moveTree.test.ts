import { createRoot, buildTreeFromPgn, movePieceInFen, parsePgnTree, mainLine, type MoveNode } from '../moveTree';
import { START_FEN } from '../chessUtils';

describe('createRoot', () => {
  test('defaults to the starting FEN', () => {
    const root = createRoot();
    expect(root).toEqual({
      id: 'root', san: '', fen: START_FEN, from: '', to: '', color: 'w', depth: 0, children: [], parent: null,
    });
  });

  test('accepts a custom starting FEN', () => {
    const fen = '8/8/8/8/8/8/8/K6k w - - 0 1';
    const root = createRoot(fen);
    expect(root.fen).toBe(fen);
  });
});

describe('buildTreeFromPgn', () => {
  test('returns an empty root for an empty/whitespace string', () => {
    expect(buildTreeFromPgn('').children).toHaveLength(0);
    expect(buildTreeFromPgn('   ').children).toHaveLength(0);
    expect(buildTreeFromPgn('').fen).toBe(START_FEN);
  });

  test('returns an empty root for garbage input rather than throwing', () => {
    const root = buildTreeFromPgn('not a pgn at all {{{');
    expect(root.id).toBe('root');
    expect(root.children).toHaveLength(0);
  });

  test('builds a linear main-line tree with correct depth/parent/color', () => {
    const root = buildTreeFromPgn('1. e4 e5 2. Nf3 Nc6');
    expect(root.children).toHaveLength(1);

    const e4 = root.children[0];
    expect(e4.san).toBe('e4');
    expect(e4.color).toBe('w');
    expect(e4.depth).toBe(1);
    expect(e4.parent).toBe(root);

    const e5 = e4.children[0];
    expect(e5.san).toBe('e5');
    expect(e5.color).toBe('b');
    expect(e5.depth).toBe(2);
    expect(e5.parent).toBe(e4);

    const nf3 = e5.children[0];
    expect(nf3.san).toBe('Nf3');
    const nc6 = nf3.children[0];
    expect(nc6.san).toBe('Nc6');
    expect(nc6.children).toHaveLength(0);
  });

  test('adds root-level variations as siblings of the main move', () => {
    const root = buildTreeFromPgn('1. g3 (1. Nf3) (1. e4) *');
    expect(root.children).toHaveLength(3);
    expect(root.children.map((c) => c.san)).toEqual(['g3', 'Nf3', 'e4']);
    for (const child of root.children) expect(child.parent).toBe(root);
  });

  test('adds mid-game variation as a sibling of the continuation after the branch point', () => {
    const root = buildTreeFromPgn('1. e4 e5 2. Nf3 (2. Nc3)');
    const e5 = root.children[0].children[0];
    expect(e5.children.map((c) => c.san)).toEqual(['Nf3', 'Nc3']);
    expect(e5.children[0].parent).toBe(e5);
    expect(e5.children[1].parent).toBe(e5);
  });

  test('builds nested sub-variations recursively', () => {
    // Main: e4 d5. Variation off d5: 1...Nf6 2. e5, with a nested variation
    // off e5 (2. d3) — same parent position as e5 (after 1. e4 Nf6), so it
    // must land as e5's sibling (a second child of Nf6), not e5's own child.
    const root = buildTreeFromPgn('1. e4 d5 (1... Nf6 2. e5 (2. d3))');
    const e4 = root.children[0];
    expect(e4.children).toHaveLength(2);

    const d5 = e4.children[0];
    const nf6 = e4.children[1]; // sibling of d5
    expect(nf6.san).toBe('Nf6');
    expect(nf6.parent).toBe(e4);
    expect(d5.children).toHaveLength(0);

    expect(nf6.children.map((c) => c.san)).toEqual(['e5', 'd3']);
    expect(nf6.children[0].parent).toBe(nf6);
    expect(nf6.children[1].parent).toBe(nf6);
  });

  test('respects a [FEN]/[SetUp] header for the starting position', () => {
    const fen = '8/8/8/8/8/8/4P3/4K2k w - - 0 1';
    const root = buildTreeFromPgn(`[FEN "${fen}"]\n[SetUp "1"]\n\n1. e4 *`);
    expect(root.fen).toBe(fen);
    expect(root.children[0].san).toBe('e4');
  });
});

describe('movePieceInFen', () => {
  test('moves a white pawn forward, leaving the source square empty', () => {
    const fen = movePieceInFen(START_FEN, 'e2', 'e4', 'P');
    expect(fen).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
  });

  test('places a promoted piece on the destination square', () => {
    // White pawn about to promote on a8, black king elsewhere.
    const fen = '8/P6k/8/8/8/8/8/4K3 w - - 0 1';
    const promoted = movePieceInFen(fen, 'a7', 'a8', 'Q');
    expect(promoted.split(' ')[0]).toBe('Q7/7k/8/8/8/8/8/4K3');
  });

  test('preserves the non-board FEN fields (turn, castling, ep, clocks)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 3 7';
    const result = movePieceInFen(fen, 'e2', 'e4', 'P');
    expect(result.split(' ').slice(1)).toEqual(['w', 'KQkq', '-', '3', '7']);
  });

  test('returns an unreadable FEN unchanged (D14)', () => {
    expect(movePieceInFen('garbage', 'e2', 'e4', 'P')).toBe('garbage');
  });

  test('a 4-field input comes back with six fields ending 0 1', () => {
    const result = movePieceInFen('4k3/8/8/8/8/8/4P3/4K3 w - -', 'e2', 'e4', 'P');
    expect(result).toBe('4k3/8/8/8/4P3/8/8/4K3 w - - 0 1');
  });
});

describe('parsePgnTree', () => {
  test('a blank PGN gives an empty root, not null', () => {
    const root = parsePgnTree('');
    expect(root).not.toBeNull();
    expect(root?.children).toEqual([]);
    expect(root?.fen).toBe(START_FEN);
  });

  test('an unparseable PGN gives null', () => {
    expect(parsePgnTree('not a pgn at all {{{')).toBeNull();
  });

  test('a two-ply PGN gives a two-node line', () => {
    const root = parsePgnTree('1. e4 e5');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(root.children).toHaveLength(1);
    expect(root.children[0].san).toBe('e4');
    expect(root.children[0].children).toHaveLength(1);
    expect(root.children[0].children[0].san).toBe('e5');
  });
});

describe('parsePgnTree — node ids (pgn-tree-unique-node-ids-plan.md D1)', () => {
  // Two sibling variations open with the same move at two different points.
  const SAME_MOVE_SIBLINGS =
    '1. e4 e5 2. Nf3 (2. Nc3 Nc6 3. f4) (2. Nc3 Nf6 3. Bc4) 2... Nc6 (2... Nf6 3. Nxe5) (2... Nf6 3. Nc3) 3. Bb5 a6 *';

  const allNodes = (node: MoveNode): MoveNode[] => [node, ...node.children.flatMap(allNodes)];

  test('sibling variations that open with the same move get distinct ids', () => {
    const root = parsePgnTree(SAME_MOVE_SIBLINGS);
    expect(root).not.toBeNull();
    if (!root) return;
    const e5 = root.children[0].children[0];
    expect(e5.children.map((c) => c.san)).toEqual(['Nf3', 'Nc3', 'Nc3']);
    expect(e5.children[1].id).not.toBe(e5.children[2].id);
  });

  test('every id in a parsed tree is unique', () => {
    const root = parsePgnTree(SAME_MOVE_SIBLINGS);
    expect(root).not.toBeNull();
    if (!root) return;
    const ids = allNodes(root).map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(root.id).toBe('root');
  });

  test('ids follow the build order: a move, then its variations in full, then the main continuation', () => {
    const root = parsePgnTree('1. e4 e5 2. Nf3 (2. Nc3) Nc6');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(root.id).toBe('root');
    expect(mainLine(root).map((n) => n.id)).toEqual(['pgn-1', 'pgn-2', 'pgn-3', 'pgn-5']);
    const e5 = root.children[0].children[0];
    expect(e5.children.map((n) => n.id)).toEqual(['pgn-3', 'pgn-4']);
  });

  test('the same PGN parses to the same ids every time', () => {
    const first = parsePgnTree(SAME_MOVE_SIBLINGS);
    const second = parsePgnTree(SAME_MOVE_SIBLINGS);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (!first || !second) return;
    expect(allNodes(first).map((n) => n.id)).toEqual(allNodes(second).map((n) => n.id));
  });
});

describe('mainLine', () => {
  test('an empty root has an empty main line', () => {
    expect(mainLine(createRoot())).toEqual([]);
  });

  test('follows the first child at each step and ignores variations', () => {
    const root = parsePgnTree('1. e4 (1. d4) e5 2. Nf3');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(mainLine(root).map((n) => n.san)).toEqual(['e4', 'e5', 'Nf3']);
  });
});
