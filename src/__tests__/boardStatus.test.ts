import { ChessGame } from '../chessGame';
import { boardStatusText } from '../boardStatus';

function game(fen?: string, sans: string[] = []): ChessGame {
  const g = ChessGame.fromFen(fen);
  if (!g) throw new Error(`bad fixture FEN: ${fen}`);
  for (const san of sans) {
    if (!g.play(san).ok) throw new Error(`illegal fixture move: ${san}`);
  }
  return g;
}

describe('boardStatusText', () => {
  test('white to move / black to move', () => {
    expect(boardStatusText(game())).toBe('White to move');
    expect(boardStatusText(game(undefined, ['e4']))).toBe('Black to move');
  });

  test('check names the side in check', () => {
    expect(boardStatusText(game('4k3/8/8/8/8/8/8/r3K3 w - - 0 1'))).toBe('White is in check');
    expect(boardStatusText(game('4k2R/8/8/8/8/8/8/4K3 b - - 0 1'))).toBe('Black is in check');
  });

  test('checkmate for each side', () => {
    expect(boardStatusText(game(undefined, ['f3', 'e5', 'g4', 'Qh4#']))).toBe('0-1  Black wins by checkmate');
    expect(boardStatusText(game(undefined, ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']))).toBe(
      '1-0  White wins by checkmate',
    );
  });

  test('stalemate', () => {
    expect(boardStatusText(game('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1'))).toBe('½-½  Stalemate');
  });

  test('insufficient material and fifty-move read as a draw', () => {
    expect(boardStatusText(game('8/8/8/4k3/8/8/8/4K3 w - - 0 1'))).toBe('½-½  Draw');
    expect(boardStatusText(game('4k3/8/8/8/8/8/4P3/4K3 w - - 100 80'))).toBe('½-½  Draw');
  });

  test('threefold repetition is reported when the game carries its history', () => {
    const g = game('7k/7p/8/8/8/8/7P/K7 w - - 0 1', ['Kb1', 'Kg8', 'Ka1', 'Kh8', 'Kb1', 'Kg8', 'Ka1', 'Kh8']);
    expect(boardStatusText(g)).toBe('½-½  Draw');
  });
});
