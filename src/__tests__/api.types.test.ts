import type { ApiEnvelope, ApiErrorResponse, ApiSuccessResponse } from '../types/api';

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
