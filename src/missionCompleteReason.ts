import type { GameResult } from './gameOutcome';
import type { MissionCompleteReason } from './types/missions';

/**
 * Maps a finished mission game to the `reason` the backend grades
 * (`POST /missions/attempts/:id/complete`, `CompleteAttemptInput.reason`).
 * Board-decided endings → 'board'; a clock loss is 'opponent_timeout' when the
 * player won on time, else 'timeout'; resign and agreement → 'resign'.
 */
export function missionCompleteReason(
  result: GameResult,
  playerColor: 'white' | 'black',
): MissionCompleteReason {
  switch (result.reason) {
    case 'checkmate':
    case 'stalemate':
    case 'threefold':
    case 'insufficient':
    case 'fifty-move':
      return 'board';
    case 'timeout':
      return result.winner === playerColor ? 'opponent_timeout' : 'timeout';
    case 'resign':
    case 'agreement':
      return 'resign';
  }
}
