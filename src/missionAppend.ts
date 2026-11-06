import type { MissionGameState } from './types/missions';

/** Outcome of appending a move to a mission game on the server. */
export type AppendMissionMoveResult =
  | { kind: 'ok'; state: MissionGameState }
  | { kind: 'rejected'; code: string | null; state: MissionGameState | null }
  | { kind: 'retry' }
  | { kind: 'failed' };

/** The body the server sends with a rejected append. */
export interface MissionGameErrorBody { error?: string; data?: MissionGameState | null }

/** How a failed append is classified (website services/missions.ts and ckq-mobile lib/missions.ts, once). */
export function classifyAppendError(status: number | null, body: MissionGameErrorBody | null | undefined): AppendMissionMoveResult {
  if (status === null) return { kind: 'retry' };
  if (status === 400 || status === 409) return { kind: 'rejected', code: body?.error ?? null, state: body?.data ?? null };
  if (status >= 500 || status === 429) return { kind: 'retry' };
  return { kind: 'failed' };
}
