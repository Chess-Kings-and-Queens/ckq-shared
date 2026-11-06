import { classifyAppendError } from '../missionAppend';
import type { MissionGameState } from '../types/missions';

const state = { _id: 'g1' } as unknown as MissionGameState;

describe('classifyAppendError', () => {
  test('a network failure (null status) is a retry', () => {
    expect(classifyAppendError(null, undefined)).toEqual({ kind: 'retry' });
  });
  test.each([400, 409])('%i with a body is rejected with its code and state', (status) => {
    expect(classifyAppendError(status, { error: 'illegal-move', data: state })).toEqual({ kind: 'rejected', code: 'illegal-move', state });
  });
  test('400 and 409 without a body are rejected with null code and state', () => {
    expect(classifyAppendError(400, null)).toEqual({ kind: 'rejected', code: null, state: null });
    expect(classifyAppendError(409, undefined)).toEqual({ kind: 'rejected', code: null, state: null });
  });
  test.each([500, 503, 429])('%i is a retry', (status) => {
    expect(classifyAppendError(status, null)).toEqual({ kind: 'retry' });
  });
  test.each([401, 404])('%i is a hard failure', (status) => {
    expect(classifyAppendError(status, { error: 'x' })).toEqual({ kind: 'failed' });
  });
});
