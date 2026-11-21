import type { ApiEnvelope, ApiErrorResponse, ApiSuccessResponse } from '../types/api';
import type { OnlineTournamentStatus } from '../types/onlineTournaments';
import type { ResultsListParams, ResultsListRow } from '../types/tournamentResults';

describe('API envelope types', () => {
  test('an ApiSuccessResponse literal compiles and carries its data', () => {
    const ok: ApiSuccessResponse<{ a: 1 }> = { status: 'success', message: 'OK', code: 200, data: { a: 1 } };
    expect(ok.data.a).toBe(1);
  });

  test('ApiEnvelope narrows on status', () => {
    const read = (env: ApiEnvelope<{ a: number }>): number | string => (env.status === 'success' ? env.data.a : env.message);
    const err: ApiErrorResponse = { status: 'error', message: 'Not found', code: 404 };
    expect(read({ status: 'success', message: 'OK', code: 200, data: { a: 7 } })).toBe(7);
    expect(read(err)).toBe('Not found');
  });
});

describe('OnlineTournamentStatus', () => {
  test("accepts 'aborted' alongside the existing statuses", () => {
    const statuses: OnlineTournamentStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled', 'aborted'];
    expect(statuses).toContain('aborted');
  });
});

describe('Tournament results kind', () => {
  test('a class row and online/aborted list params compile', () => {
    const row: ResultsListRow = {
      _id: 's1',
      name: 'Class tournament',
      format: 'tournament',
      kind: 'class',
      status: 'aborted',
      levels: [],
      rounds: 1,
      roundsPlayed: 0,
      startAt: '2026-11-15T12:00:00.000Z',
      endedAt: null,
      currentRound: null,
      nextRoundAt: null,
      joinState: 'done',
      playerCount: 0,
      gameCount: 0,
      leader: null,
      myStanding: null,
    };
    const params: ResultsListParams = { kind: 'online', status: 'aborted' };
    expect(row.kind).toBe('class');
    expect(params.kind).toBe('online');
  });

  test('a kind other than online or class is a type error', () => {
    // @ts-expect-error 'league' is not a TournamentKind
    const params: ResultsListParams = { kind: 'league' };
    expect(params.kind).toBe('league');
  });
});
