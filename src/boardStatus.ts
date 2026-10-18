import type { ChessGame } from './chessGame';

/**
 * The board's one-line status text, from a game that carries its full history
 * (so threefold repetition is reported). Moved verbatim from website2.0's
 * `useChessBoard` status computation; draws other than stalemate (threefold,
 * insufficient material, fifty-move) all read "Draw".
 */
export function boardStatusText(game: ChessGame): string {
  const outcome = game.outcome();
  const turn = game.turn === 'white' ? 'White' : 'Black';
  if (outcome?.reason === 'checkmate') {
    return game.turn === 'white' ? '0-1  Black wins by checkmate' : '1-0  White wins by checkmate';
  }
  if (outcome?.reason === 'stalemate') return '½-½  Stalemate';
  if (outcome) return '½-½  Draw';
  if (game.inCheck()) return `${turn} is in check`;
  return `${turn} to move`;
}
