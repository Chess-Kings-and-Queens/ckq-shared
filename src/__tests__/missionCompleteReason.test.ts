import { missionCompleteReason } from '../missionCompleteReason';
import type { GameResult, GameResultReason } from '../gameOutcome';

describe('missionCompleteReason', () => {
  const boardReasons: GameResultReason[] = ['checkmate', 'stalemate', 'threefold', 'insufficient', 'fifty-move'];

  it.each(boardReasons)('%s is decided on the board', (reason) => {
    const result: GameResult = { reason, winner: reason === 'checkmate' ? 'white' : null };
    expect(missionCompleteReason(result, 'white')).toBe('board');
    expect(missionCompleteReason(result, 'black')).toBe('board');
  });

  it('a timeout won by the player is an opponent_timeout', () => {
    expect(missionCompleteReason({ reason: 'timeout', winner: 'white' }, 'white')).toBe('opponent_timeout');
    expect(missionCompleteReason({ reason: 'timeout', winner: 'black' }, 'black')).toBe('opponent_timeout');
  });

  it('a timeout won by the opponent is a timeout', () => {
    expect(missionCompleteReason({ reason: 'timeout', winner: 'black' }, 'white')).toBe('timeout');
    expect(missionCompleteReason({ reason: 'timeout', winner: 'white' }, 'black')).toBe('timeout');
  });

  it('resign and agreement are both resign', () => {
    expect(missionCompleteReason({ reason: 'resign', winner: 'black' }, 'white')).toBe('resign');
    expect(missionCompleteReason({ reason: 'agreement', winner: null }, 'white')).toBe('resign');
  });
});
