/**
 * The mission-success rule, previously duplicated 3× in website2.0
 * (`portal/missions/[missionId]/play/page.tsx` ×2, `PlayerVsEngineBoard.tsx` ×1):
 *
 *   - `objective: 'draw'` — reaching a draw *or* winning both count as success
 *     (winning exceeds the requirement).
 *   - `objective: 'win'` — only winning counts.
 *
 * `objective` matches `TrainingConfig['objective']`. `outcome` matches
 * usePlayBoard's `UsePlayBoardResult['outcome']` (nullable — all three call
 * sites invoke this while `outcome` may still be null, in which case the
 * mission is treated as not succeeded).
 */
export function missionSucceeded(
  objective: 'win' | 'draw',
  outcome: 'win' | 'loss' | 'draw' | null,
): boolean {
  return objective === 'draw'
    ? outcome === 'win' || outcome === 'draw'
    : outcome === 'win';
}
