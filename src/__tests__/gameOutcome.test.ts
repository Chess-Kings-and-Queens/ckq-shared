import { ChessGame } from '../chessGame';
import { detectOutcome, collectPgn, buildUci, resumeReplay, toTournamentReason } from '../gameOutcome';
import { START_FEN } from '../chessUtils';
import { createRoot, type MoveNode } from '../moveTree';

const gameFrom = (fen: string | undefined, sans: string[] = []): ChessGame => {
  const g = ChessGame.fromFen(fen);
  if (!g) throw new Error(`bad fixture FEN: ${fen}`);
  for (const san of sans) {
    if (!g.play(san).ok) throw new Error(`illegal fixture move: ${san}`);
  }
  return g;
};

describe('detectOutcome', () => {
  test('returns null while the game is still in progress', () => {
    expect(detectOutcome(gameFrom(undefined, ['e4']))).toBeNull();
  });

  test("detects checkmate — Fool's mate", () => {
    const game = gameFrom(undefined, ['f3', 'e5', 'g4', 'Qh4#']);
    expect(detectOutcome(game)).toEqual({ reason: 'checkmate', winner: 'black' });
  });

  test('checkmate winner is white when black is mated', () => {
    // Scholar's mate
    const game = gameFrom(undefined, ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']);
    expect(detectOutcome(game)).toEqual({ reason: 'checkmate', winner: 'white' });
  });

  test('detects stalemate', () => {
    // A well-known stalemate position (black to move, no legal moves, not in check).
    expect(detectOutcome(gameFrom('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1'))).toEqual({ reason: 'stalemate', winner: null });
  });

  test('detects insufficient material (king vs king)', () => {
    expect(detectOutcome(gameFrom('8/8/8/4k3/8/8/8/4K3 w - - 0 1'))).toEqual({ reason: 'insufficient', winner: null });
  });

  test('detects threefold repetition via a persistent ChessGame', () => {
    // K on a1, k on h8, locked pawns so insufficient material never triggers.
    const game = gameFrom('7k/7p/8/8/8/8/7P/K7 w - - 0 1', ['Kb1', 'Kg8', 'Ka1', 'Kh8', 'Kb1', 'Kg8', 'Ka1', 'Kh8']);
    expect(detectOutcome(game)).toEqual({ reason: 'threefold', winner: null });
  });

  test('a ChessGame built from a bare FEN never reports threefold — history must be persistent', () => {
    // Same final position as the threefold test above, but with no move history.
    expect(detectOutcome(gameFrom('7k/7p/8/8/8/8/7P/K7 w - - 8 5'))).toBeNull();
  });
});

describe('toTournamentReason', () => {
  test.each([
    ['stalemate', 'draw-stalemate'],
    ['threefold', 'draw-repetition'],
    ['insufficient', 'draw-insufficient'],
    ['fifty-move', 'draw-50move'],
    ['agreement', 'draw-agreed'],
  ] as const)('maps %s to %s', (live, stored) => {
    expect(toTournamentReason(live)).toBe(stored);
  });

  test.each(['checkmate', 'resign', 'timeout', 'forfeit', 'aborted'] as const)('passes %s through', (reason) => {
    expect(toTournamentReason(reason)).toBe(reason);
  });
});

describe('collectPgn', () => {
  function child(parent: MoveNode, san: string): MoveNode {
    const node: MoveNode = {
      id: `${parent.depth + 1}`, san, fen: '', from: '', to: '',
      color: parent.color === 'w' ? 'b' : 'w', depth: parent.depth + 1, children: [], parent,
    };
    parent.children.push(node);
    return node;
  }

  test('returns an empty string at the root', () => {
    const root = createRoot();
    expect(collectPgn(root)).toBe('');
  });

  test('collects the main-line SAN history up to the given node', () => {
    const root = createRoot();
    const e4 = child(root, 'e4');
    const e5 = child(e4, 'e5');
    const nf3 = child(e5, 'Nf3');
    expect(collectPgn(nf3)).toBe('e4 e5 Nf3');
  });
});

describe('buildUci', () => {
  test('builds a plain move with no promotion suffix', () => {
    expect(buildUci('e2', 'e4', 'e4')).toBe('e2e4');
  });

  test('appends the lowercase promotion letter for a queen promotion', () => {
    expect(buildUci('a7', 'a8', 'a8=Q')).toBe('a7a8q');
  });

  test('appends the lowercase promotion letter for an under-promotion', () => {
    expect(buildUci('b7', 'a8', 'bxa8=N')).toBe('b7a8n');
  });
});

describe('resumeReplay', () => {
  test('resumes with an even-length history from the standard start FEN — player to move next', () => {
    const result = resumeReplay(START_FEN, ['e4', 'e5'], 'white');
    expect(result.appliedSans).toEqual(['e4', 'e5']);
    expect(result.isOpponentTurnNext).toBe(false);
  });

  test('resumes with an odd-length history — opponent to move next', () => {
    const result = resumeReplay(START_FEN, ['e4'], 'white');
    expect(result.isOpponentTurnNext).toBe(true);
  });

  test('stops the replay at the first illegal SAN rather than throwing', () => {
    const result = resumeReplay(START_FEN, ['e4', 'e5', 'Nz9', 'Nc6'], 'white');
    expect(result.appliedSans).toEqual(['e4', 'e5']);
    expect(result.isOpponentTurnNext).toBe(false);
    expect(result.gameResult).toBeNull();
  });

  test('a history ending in checkmate resumes directly into a resolved gameResult', () => {
    const result = resumeReplay(START_FEN, ['f3', 'e5', 'g4', 'Qh4#'], 'white');
    expect(result.gameResult).toEqual({ reason: 'checkmate', winner: 'black' });
    expect(result.isOpponentTurnNext).toBe(false);
  });

  test('returns a game with accumulated history usable for further threefold detection', () => {
    const startFen = '7k/7p/8/8/8/8/7P/K7 w - - 0 1';
    const result = resumeReplay(startFen, ['Kb1', 'Kg8', 'Ka1', 'Kh8', 'Kb1', 'Kg8'], 'white');
    // Continue the same repetition pattern to reach the third occurrence on the returned instance.
    result.game.play('Ka1');
    result.game.play('Kh8');
    expect(detectOutcome(result.game)).toEqual({ reason: 'threefold', winner: null });
  });
});
