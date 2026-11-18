import { createRoot, buildTreeFromPgn, movePieceInFen, parsePgnTree, mainLine, treeToPgn, subtreePgn, addVariation, hasAnnotations, clearNodeAnnotations, clearAllAnnotations, nagSymbol, nagKind, formatGameClock, formatNodeEval, type MoveNode } from '../moveTree';
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

describe('parsePgnTree — tolerant reading (pgn-check-single-source-plan.md D13)', () => {
  const FEN_0_0 = '8/p4p1p/k7/8/8/4K3/P4P1P/8 w - - 0 0';
  const STUDY = '[Black "\\[+0133.10g2b8\\]"]\n[Result "*"]\n\n1. e4 e5 *';
  const FEN_GAME = `[SetUp "1"]\n[FEN "${FEN_0_0}"]\n\n1. Kf4 *`;
  const NULL_VARIATION = '1. e4 e5 (1... Z0 2. d4) 2. Nf3 Nc6 *';
  const crlf = (pgn: string): string => pgn.replace(/\n/g, '\r\n');

  test.each([
    ['a study code with escaped brackets in a tag value', STUDY, 2],
    ['a FEN whose fullmove is 0', FEN_GAME, 1],
    ['a variation holding a null move', NULL_VARIATION, 4],
  ])('reads %s', (_label, pgn, plies) => {
    for (const text of [pgn, crlf(pgn)]) {
      const root = parsePgnTree(text);
      expect(root).not.toBeNull();
      if (root) expect(mainLine(root)).toHaveLength(plies);
    }
  });

  test('the null-move variation is absent and the ids stay sequential and unique', () => {
    const root = parsePgnTree(NULL_VARIATION);
    expect(root).not.toBeNull();
    if (!root) return;
    expect(mainLine(root).map((n) => n.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(root.children[0].children[0].children.map((n) => n.san)).toEqual(['Nf3']);
    expect(mainLine(root).map((n) => n.id)).toEqual(['pgn-1', 'pgn-2', 'pgn-3', 'pgn-4']);
  });

  test.each(['1. e4 Z0 2. Nf3 *', '1. e4 e5 2. Nf3 -- 3. d4 *'])('a null move in the main line stays unreadable: %s', (pgn) => {
    expect(parsePgnTree(pgn)).toBeNull();
  });

  test('Z0 and -- inside a comment are not null moves', () => {
    const root = parsePgnTree('1. e4 { white -- black Z0 } e5 *');
    expect(root && mainLine(root)).toHaveLength(2);
  });

  test('a ; comment holding Z0 is not a null move', () => {
    const root = parsePgnTree('1. e4 ; Z0 here\ne5 *');
    expect(root && mainLine(root)).toHaveLength(2);
  });

  test('a set-up FEN with fullmove 0 and no moves is the root position', () => {
    const root = parsePgnTree(`[SetUp "1"]\n[FEN "${FEN_0_0}"]\n\n*`);
    expect(root?.fen).toBe('8/p4p1p/k7/8/8/4K3/P4P1P/8 w - - 0 1');
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

describe('parsePgnTree — move annotations', () => {
  const ANNOTATED =
    '1. d4 { [%eval 0.15] [%clk 1:30:52] } 1... Nf6 { [%eval #-3] [%clk 0:05:07] good move } 2. c4 { plain } *';

  test('reads eval, clock and text after each move', () => {
    const root = parsePgnTree(ANNOTATED);
    expect(root).not.toBeNull();
    if (!root) return;
    const [d4, nf6, c4] = mainLine(root);
    expect(d4.evalCp).toBe(15);
    expect(d4.clockSec).toBe(5452);
    expect(d4).not.toHaveProperty('evalMate');
    expect(d4).not.toHaveProperty('comment');
    expect(nf6.evalMate).toBe(-3);
    expect(nf6.clockSec).toBe(307);
    expect(nf6.comment).toBe('good move');
    expect(nf6).not.toHaveProperty('evalCp');
    expect(c4.comment).toBe('plain');
    expect(c4).not.toHaveProperty('evalCp');
    expect(c4).not.toHaveProperty('evalMate');
    expect(c4).not.toHaveProperty('clockSec');
  });

  test('a move with no comment has none of the five keys', () => {
    const root = parsePgnTree('1. e4 e5 *');
    expect(root).not.toBeNull();
    if (!root) return;
    for (const node of mainLine(root)) {
      for (const key of ['comment', 'nags', 'clockSec', 'evalCp', 'evalMate']) expect(node).not.toHaveProperty(key);
    }
  });

  test('reads move symbols as NAG codes, on variation moves too, and none when absent', () => {
    const root = parsePgnTree('1. e4! e5?! 2. Nf3 $1 $14 Nc6?? (2... d6!?) *');
    expect(root).not.toBeNull();
    if (!root) return;
    const [e4, e5, nf3, nc6] = mainLine(root);
    expect(e4.nags).toEqual([1]);
    expect(e5.nags).toEqual([6]);
    expect(nf3.nags).toEqual([1, 14]);
    expect(nc6.nags).toEqual([4]);
    expect(nf3.children[1].san).toBe('d6');
    expect(nf3.children[1].nags).toEqual([5]);
    const plain = parsePgnTree('1. e4 e5 *');
    expect(plain?.children[0]).not.toHaveProperty('nags');
  });

  test.each([
    ['[%eval -6.59]', -659],
    ['[%eval 0.0]', 0],
    ['[%eval 0.15,18]', 15],
  ])('an evaluation %s is %i centipawns', (tag, cp) => {
    const root = parsePgnTree(`1. e4 { ${tag} } *`);
    expect(root).not.toBeNull();
    if (!root) return;
    expect(root.children[0].evalCp).toBe(cp);
    expect(root.children[0]).not.toHaveProperty('evalMate');
  });

  test('the depth form of a mate evaluation gives evalMate', () => {
    const root = parsePgnTree('1. e4 { [%eval #3,20] } *');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(root.children[0].evalMate).toBe(3);
    expect(root.children[0]).not.toHaveProperty('evalCp');
  });

  test('a clock with tenths is whole seconds', () => {
    const root = parsePgnTree('1. e4 { [%clk 0:00:08.5] } *');
    expect(root?.children[0].clockSec).toBe(8);
  });

  test('a malformed clock leaves clockSec unset', () => {
    const root = parsePgnTree('1. e4 { [%clk 1:75:00] } *');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(root.children[0]).not.toHaveProperty('clockSec');
  });

  test('a comment inside a variation lands on the variation node', () => {
    const root = parsePgnTree('1. e4 e5 (1... c5 { [%eval 0.30] sharp } 2. Nf3) 2. Nf3 *');
    expect(root).not.toBeNull();
    if (!root) return;
    const afterE4 = root.children[0];
    expect(afterE4.children.map((n) => n.san)).toEqual(['e5', 'c5']);
    expect(afterE4.children[0]).not.toHaveProperty('evalCp');
    expect(afterE4.children[1].evalCp).toBe(30);
    expect(afterE4.children[1].comment).toBe('sharp');
  });

  test('a comment on the very first move is read', () => {
    const root = parsePgnTree('1. e4 { opening } e5 *');
    expect(root?.children[0].comment).toBe('opening');
  });

  test('a comment holding Z0 or -- keeps its text', () => {
    const root = parsePgnTree('1. e4 { white -- black Z0 } e5 *');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(root.children[0].comment).toBe('white -- black Z0');
    expect(mainLine(root)).toHaveLength(2);
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

const VAR_PGN = `[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]
[SetUp "1"]

1. e4 e5 (1... c5 2. Nf3 d6 (2... Nc6 3. d4)) (1... e6 2. d4) 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 *`;

type Shape = { san: string; fen: string; children: Shape[] };
const shapeOf = (n: MoveNode): Shape => ({ san: n.san, fen: n.fen, children: n.children.map(shapeOf) });

describe('treeToPgn', () => {
  test('a linear game from the standard start writes move text with no tags', () => {
    const root = parsePgnTree('1. e4 e5 2. Nf3');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(treeToPgn(root)).toBe('1. e4 e5 2. Nf3 *');
  });

  test('a black-to-move start writes SetUp and FEN tags and a numbered black move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const root = parsePgnTree(`[FEN "${fen}"]\n[SetUp "1"]\n\n1... e5 2. Nf3 *`);
    expect(root).not.toBeNull();
    if (!root) return;
    const pgn = treeToPgn(root);
    expect(pgn).toContain('[SetUp "1"]');
    expect(pgn).toContain(`[FEN "${fen}"]`);
    expect(pgn).toContain('1... e5 2. Nf3 *');
  });

  test('the VAR_PGN tree round-trips, including nested and sibling variations', () => {
    const root = parsePgnTree(VAR_PGN);
    expect(root).not.toBeNull();
    if (!root) return;
    const again = parsePgnTree(treeToPgn(root));
    expect(again).not.toBeNull();
    if (!again) return;
    expect(shapeOf(again)).toEqual(shapeOf(root));
    const afterE5 = again.children[0].children[0];
    expect(afterE5.parent?.children.map((n) => n.san)).toEqual(['e5', 'c5', 'e6']);
    expect(afterE5.parent?.children[1].children[0].children.map((n) => n.san)).toEqual(['d6', 'Nc6']);
  });

  test('an empty root writes *', () => {
    expect(treeToPgn(createRoot())).toBe('*');
  });

  test('a variation that starts on a black move is numbered with an ellipsis', () => {
    const root = parsePgnTree('1. e4 e5 (1... c5 2. Nf3) 2. Nf3');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(treeToPgn(root)).toContain('(1... c5 2. Nf3)');
  });

  test('with no second argument an annotated tree writes no comments', () => {
    const root = parsePgnTree('1. d4 $1 { [%eval 0.15] [%clk 1:30:52] } 1... Nf6 { [%eval #-3] good move } 2. c4 { plain } *');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(treeToPgn(root)).toBe('1. d4 Nf6 2. c4 *');
    expect(treeToPgn(root, {})).toBe('1. d4 Nf6 2. c4 *');
    expect(treeToPgn(root, { comments: false })).toBe('1. d4 Nf6 2. c4 *');
  });

  test('comments: true writes eval, clock and text, and numbers the black move after a comment', () => {
    const root = parsePgnTree('1. d4 { [%eval 0.15] [%clk 1:30:52] } 1... Nf6 { [%eval #-3] [%clk 0:05:07] good move } 2. c4 { plain } *');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(treeToPgn(root, { comments: true })).toBe(
      '1. d4 { [%eval 0.15] [%clk 1:30:52] } 1... Nf6 { [%eval #-3] [%clk 0:05:07] good move } 2. c4 { plain } *',
    );
  });

  test("comments: true writes a variation's first-move comment inside the parentheses", () => {
    const root = parsePgnTree('1. e4 e5 (1... c5 { [%clk 0:01:00] sharp } 2. Nf3) 2. Nf3 *');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(treeToPgn(root, { comments: true })).toBe('1. e4 e5 (1... c5 { [%clk 0:01:00] sharp } 2. Nf3) 2. Nf3 *');
    expect(treeToPgn(root)).toBe('1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *');
  });

  test('comments: true writes move symbols as $n after the move, before the comment, and in variations', () => {
    const root = parsePgnTree('1. e4! { [%clk 0:10:00] best } e5?! 2. Nf3 $1 $14 Nc6?? (2... d6!? { odd } 3. d4) *');
    expect(root).not.toBeNull();
    if (!root) return;
    const out = treeToPgn(root, { comments: true });
    expect(out).toContain('1. e4 $1 { [%clk 0:10:00] best }');
    expect(out).toContain('e5 $6');
    expect(out).toContain('2. Nf3 $1 $14');
    expect(out).toContain('(2... d6 $5 { odd } 3. d4)');
    expect(treeToPgn(root)).toBe('1. e4 e5 2. Nf3 Nc6 (2... d6 3. d4) *');
  });

  test('comments: true round-trips move symbols', () => {
    const root = parsePgnTree('1. e4! e5?! 2. Nf3 $1 $14 Nc6?? (2... d6!?) *');
    expect(root).not.toBeNull();
    if (!root) return;
    const again = parsePgnTree(treeToPgn(root, { comments: true }));
    expect(again).not.toBeNull();
    if (!again) return;
    const flat = (n: MoveNode): unknown[] => [[n.san, n.nags], ...n.children.flatMap(flat)];
    expect(flat(again)).toEqual(flat(root));
  });

  test('after clearAllAnnotations the comments writer equals the plain writer', () => {
    const root = parsePgnTree('1. e4! { [%eval 0.3] [%clk 0:10:00] hi } e5 (1... c5 $2 { x }) *');
    expect(root).not.toBeNull();
    if (!root) return;
    clearAllAnnotations(root);
    expect(treeToPgn(root, { comments: true })).toBe(treeToPgn(root));
  });

  test('comments: true strips braces from comment text', () => {
    const root = parsePgnTree('1. e4 *');
    expect(root).not.toBeNull();
    if (!root) return;
    root.children[0].comment = 'a{b}c';
    expect(treeToPgn(root, { comments: true })).toBe('1. e4 { abc } *');
  });

  test('comments: true round-trips through parsePgnTree', () => {
    const root = parsePgnTree(
      '1. e4 $1 { [%eval 0.30] [%clk 1:30:00] } e5 { [%eval -0.25] } (1... c5 $5 { [%eval #2] [%clk 0:59:59] sharp } 2. Nf3 { [%clk 0:10:00] }) 2. Nf3 { fine } *',
    );
    expect(root).not.toBeNull();
    if (!root) return;
    const again = parsePgnTree(treeToPgn(root, { comments: true }));
    expect(again).not.toBeNull();
    if (!again) return;
    const flat = (n: MoveNode): unknown[] => [
      [n.san, n.nags, n.evalCp, n.evalMate, n.clockSec, n.comment],
      ...n.children.flatMap(flat),
    ];
    expect(flat(again)).toEqual(flat(root));
    expect(shapeOf(again)).toEqual(shapeOf(root));
  });
});

describe('subtreePgn', () => {
  test('starts at the node FEN and contains only the continuation and its variations', () => {
    const root = parsePgnTree(VAR_PGN);
    expect(root).not.toBeNull();
    if (!root) return;
    const nf3 = root.children[0].children[0].children[0];
    expect(nf3.san).toBe('Nf3');
    const pgn = subtreePgn(nf3);
    expect(pgn).toContain(`[FEN "${nf3.fen}"]`);
    expect(pgn).toContain('Nc6 (2... d6 3. d4) 3. Bb5');
    expect(pgn).not.toContain('e4');
    expect(pgn).not.toContain('c5');
  });

  test('on a leaf writes the FEN with *', () => {
    const root = parsePgnTree('1. e4 e5');
    expect(root).not.toBeNull();
    if (!root) return;
    const leaf = root.children[0].children[0];
    const pgn = subtreePgn(leaf);
    expect(pgn).toContain(`[FEN "${leaf.fen}"]`);
    expect(pgn.trim().endsWith('*')).toBe(true);
    expect(pgn).not.toMatch(/\d\./);
  });
});

describe('addVariation', () => {
  const AFTER_E4_C5 = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
  const AFTER_E4_C5_NF3 = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';

  test('on a node with a main move the line is a second child, written in parentheses', () => {
    const root = parsePgnTree('1. e4 e5 *');
    expect(root).not.toBeNull();
    if (!root) return;
    const e4 = root.children[0];
    const first = addVariation(e4, ['c5', 'Nf3']);
    expect(first).not.toBeNull();
    if (!first) return;
    expect(e4.children).toHaveLength(2);
    expect(e4.children[1]).toBe(first);
    expect(treeToPgn(root)).toBe('1. e4 e5 (1... c5 2. Nf3) *');
  });

  test('the new nodes carry fen, from, to, color, depth, parent and unique ids', () => {
    const root = parsePgnTree('1. e4 e5 *');
    expect(root).not.toBeNull();
    if (!root) return;
    const e4 = root.children[0];
    const c5 = addVariation(e4, ['c5', 'Nf3']);
    expect(c5).not.toBeNull();
    if (!c5) return;
    const nf3 = c5.children[0];
    expect(c5).toMatchObject({ san: 'c5', fen: AFTER_E4_C5, from: 'c7', to: 'c5', color: 'b', depth: 2, id: 'pgn-1-v1-0' });
    expect(c5.parent).toBe(e4);
    expect(nf3).toMatchObject({ san: 'Nf3', fen: AFTER_E4_C5_NF3, from: 'g1', to: 'f3', color: 'w', depth: 3, id: 'pgn-1-v1-1' });
    expect(nf3.parent).toBe(c5);
    expect(nf3.children).toEqual([]);
  });

  test('on a leaf the line becomes the main continuation', () => {
    const root = parsePgnTree('1. e4 e5 *');
    expect(root).not.toBeNull();
    if (!root) return;
    const e5 = root.children[0].children[0];
    expect(addVariation(e5, ['Nf3'])).toBe(e5.children[0]);
    expect(treeToPgn(root)).toBe('1. e4 e5 2. Nf3 *');
    expect(e5.children[0].id).toBe('pgn-2-v0-0');
  });

  test('an illegal SAN anywhere in the line returns null and leaves children untouched', () => {
    const root = parsePgnTree('1. e4 e5 *');
    expect(root).not.toBeNull();
    if (!root) return;
    const e4 = root.children[0];
    expect(addVariation(e4, ['c5', 'Ke5'])).toBeNull();
    expect(addVariation(e4, ['Qh5'])).toBeNull();
    expect(e4.children.map((n) => n.san)).toEqual(['e5']);
    expect(e4.children[0].children).toEqual([]);
  });

  test('an empty list returns null', () => {
    const root = parsePgnTree('1. e4 e5 *');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(addVariation(root.children[0], [])).toBeNull();
    expect(root.children[0].children).toHaveLength(1);
  });

  test('a first move equal to the existing main move is still added as its own line', () => {
    const root = parsePgnTree('1. e4 e5 *');
    expect(root).not.toBeNull();
    if (!root) return;
    const e4 = root.children[0];
    const dup = addVariation(e4, ['e5']);
    expect(dup).not.toBeNull();
    expect(e4.children).toHaveLength(2);
    expect(e4.children[1]).not.toBe(e4.children[0]);
    expect(treeToPgn(root)).toBe('1. e4 e5 (1... e5) *');
  });

  test('subtreePgn output is unchanged by the comment fields', () => {
    const root = parsePgnTree('1. e4 $1 { [%eval 0.30] hello } e5 2. Nf3 *');
    expect(root).not.toBeNull();
    if (!root) return;
    expect(subtreePgn(root.children[0])).toBe(
      '[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"]\n\n1... e5 2. Nf3 *',
    );
  });
});

describe('annotation helpers', () => {
  const PGN = '1. e4! { [%eval 0.30] [%clk 0:10:00] best } e5 (1... c5 $2 { sharp } 2. Nf3) 2. Nf3 *';
  const parsed = (): MoveNode => {
    const root = parsePgnTree(PGN);
    if (!root) throw new Error('fixture PGN did not parse');
    return root;
  };

  test('hasAnnotations is true for each key alone and false for a clean node or nags: []', () => {
    const node = (extra: Partial<MoveNode>): MoveNode => ({ ...createRoot(), ...extra });
    expect(hasAnnotations(node({}))).toBe(false);
    expect(hasAnnotations(node({ nags: [] }))).toBe(false);
    expect(hasAnnotations(node({ comment: 'x' }))).toBe(true);
    expect(hasAnnotations(node({ nags: [1] }))).toBe(true);
    expect(hasAnnotations(node({ clockSec: 0 }))).toBe(true);
    expect(hasAnnotations(node({ evalCp: 0 }))).toBe(true);
    expect(hasAnnotations(node({ evalMate: 2 }))).toBe(true);
  });

  test('clearNodeAnnotations removes all five keys, returns false on a clean node, leaves children alone', () => {
    const root = parsed();
    const e4 = root.children[0];
    const e5 = e4.children[0];
    e5.comment = 'keep me';
    expect(clearNodeAnnotations(e4)).toBe(true);
    for (const key of ['comment', 'nags', 'clockSec', 'evalCp', 'evalMate']) expect(e4).not.toHaveProperty(key);
    expect(clearNodeAnnotations(e4)).toBe(false);
    expect(e4.children).toHaveLength(2);
    expect(e5.comment).toBe('keep me');
  });

  test('clearAllAnnotations counts changed nodes including variations and keeps the moves', () => {
    const root = parsed();
    expect(clearAllAnnotations(root)).toBe(2);
    expect(clearAllAnnotations(root)).toBe(0);
    expect(treeToPgn(root)).toBe('1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *');
    expect(root.children[0].children[1].san).toBe('c5');
  });

  test.each([[1, '!'], [2, '?'], [3, '!!'], [4, '??'], [5, '!?'], [6, '?!'], [14, '⩲'], [146, 'N']])(
    'nagSymbol(%i) is %s',
    (code, symbol) => expect(nagSymbol(code)).toBe(symbol),
  );

  test('nagSymbol is null for a code with no symbol', () => {
    expect(nagSymbol(0)).toBeNull();
    expect(nagSymbol(99)).toBeNull();
  });

  test('nagKind groups good, bad and neutral codes', () => {
    expect([1, 3, 5].map(nagKind)).toEqual(['good', 'good', 'good']);
    expect([2, 4, 6].map(nagKind)).toEqual(['bad', 'bad', 'bad']);
    expect([7, 14, 99].map(nagKind)).toEqual(['neutral', 'neutral', 'neutral']);
  });

  test.each([[0, '0:00'], [59, '0:59'], [3600, '1:00:00'], [3725, '1:02:05'], [-5, '0:00']])(
    'formatGameClock(%i) is %s',
    (sec, text) => expect(formatGameClock(sec)).toBe(text),
  );

  test('formatNodeEval formats centipawns, mate and none, preferring mate', () => {
    const node = (extra: Partial<MoveNode>): MoveNode => ({ ...createRoot(), ...extra });
    expect(formatNodeEval(node({ evalCp: 35 }))).toBe('+0.35');
    expect(formatNodeEval(node({ evalCp: -120 }))).toBe('−1.20');
    expect(formatNodeEval(node({ evalCp: 0 }))).toBe('0.00');
    expect(formatNodeEval(node({ evalMate: 3 }))).toBe('#3');
    expect(formatNodeEval(node({ evalMate: -2 }))).toBe('#−2');
    expect(formatNodeEval(node({}))).toBeNull();
    expect(formatNodeEval(node({ evalCp: 50, evalMate: 4 }))).toBe('#4');
  });
});
