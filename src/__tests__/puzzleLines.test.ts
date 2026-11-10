import { expandOpponentVariations, puzzleLineProgress } from '../puzzleLines';
import { QuizEvaluator } from '../quizEvaluator';

const VAR_PGN = `[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]
[SetUp "1"]

1. e4 e5 (1... c5 2. Nf3 d6 (2... Nc6 3. d4)) (1... e6 2. d4) 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 *`;

const solution = (pgn: string): string => new QuizEvaluator(pgn, 100).solutionLine;
const startFen = (pgn: string): string => new QuizEvaluator(pgn, 100).startFen;

describe('expandOpponentVariations', () => {
  test('VAR_PGN gives the main line then four variation lines, deepest first, ties in PGN order', () => {
    const lines = expandOpponentVariations(VAR_PGN);
    expect(lines).toHaveLength(5);
    expect(lines.map((l) => l.branchMove)).toEqual([null, '2... Nc6', '2... d6', '1... c5', '1... e6']);
    expect(lines[0].pgn).toBe(VAR_PGN);
  });

  test('each variation pgn starts after the alternative move and carries the continuation', () => {
    const lines = expandOpponentVariations(VAR_PGN);
    expect(solution(lines[1].pgn)).toBe('3. d4');
    expect(solution(lines[2].pgn)).toBe('3. d4');
    expect(solution(lines[3].pgn)).toBe('2. Nf3 d6');
    expect(solution(lines[4].pgn)).toBe('2. d4');
    for (const line of lines.slice(1)) {
      expect(line.pgn).toContain('[FEN');
      expect(line.pgn).toContain('[SetUp "1"]');
    }
    expect(startFen(lines[4].pgn)).toBe('rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
  });

  test('a solver-ply variation is not a line', () => {
    expect(expandOpponentVariations('1. e4 (1. d4 d5) e5 2. Nf3 *')).toHaveLength(1);
  });

  test('a variation with no continuation is skipped', () => {
    expect(expandOpponentVariations('1. e4 e5 (1... c5) 2. Nf3 *')).toHaveLength(1);
  });

  test('a game with no variations is exactly itself', () => {
    expect(expandOpponentVariations('1. e4 e5 2. Nf3 *')).toEqual([{ pgn: '1. e4 e5 2. Nf3 *', branchMove: null }]);
  });

  test('an unparsable string is one position holding itself', () => {
    const bad = '1. e4 e5 (((';
    expect(expandOpponentVariations(bad)).toEqual([{ pgn: bad, branchMove: null }]);
  });

  test('a Black-to-move start treats the other side as the opponent and labels a white move "N."', () => {
    const pgn = '[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"]\n[SetUp "1"]\n\n1... Nf6 2. e5 (2. Nc3 d5) Nd5 *';
    const lines = expandOpponentVariations(pgn);
    expect(lines).toHaveLength(2);
    expect(lines[1].branchMove).toBe('2. Nc3');
    expect(solution(lines[1].pgn)).toBe('2... d5');
  });

  test('equal depths keep PGN order (stable sort)', () => {
    const pgn = '1. e4 e5 (1... c5 2. Nf3) (1... e6 2. d4) (1... c6 2. d4) 2. Nf3 *';
    expect(expandOpponentVariations(pgn).map((l) => l.branchMove)).toEqual([null, '1... c5', '1... e6', '1... c6']);
  });
});

describe('puzzleLineProgress', () => {
  test('five lines of game 0: index 1 is line 2 of 5 of the only game', () => {
    const lines = [0, 1, 2, 3, 4].map(() => ({ game: 0, branchMove: null }));
    expect(puzzleLineProgress(lines, 1)).toEqual({ game: 1, gameCount: 1, line: 2, lineCount: 5 });
  });

  test('lines across two games number games and lines within a game', () => {
    const lines = [
      { game: 0, branchMove: null },
      { game: 0, branchMove: '1... c5' },
      { game: 1, branchMove: null },
    ];
    expect(puzzleLineProgress(lines, 2)).toEqual({ game: 2, gameCount: 2, line: 1, lineCount: 1 });
    expect(puzzleLineProgress(lines, 1)).toEqual({ game: 1, gameCount: 2, line: 2, lineCount: 2 });
  });

  test('no lines, or an index past the end, is null', () => {
    expect(puzzleLineProgress([], 0)).toBeNull();
    expect(puzzleLineProgress([{ game: 0, branchMove: null }], 1)).toBeNull();
  });
});
