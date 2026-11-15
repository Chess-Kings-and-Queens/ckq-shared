import { LIVEBOARD_PROGRAM_ID, isLiveboardProgram } from '../liveboardProgram';

describe('LIVEBOARD_PROGRAM_ID', () => {
  test('is the fixed 24-hex literal (the bytes of "liveboard001")', () => {
    expect(LIVEBOARD_PROGRAM_ID).toBe('6c697665626f617264303031');
    expect(LIVEBOARD_PROGRAM_ID).toMatch(/^[0-9a-f]{24}$/);
  });
});

describe('isLiveboardProgram', () => {
  test('is true for the id string', () => {
    expect(isLiveboardProgram('6c697665626f617264303031')).toBe(true);
  });

  test('is true for an ObjectId-like object whose toString() returns the id', () => {
    expect(isLiveboardProgram({ toString: () => '6c697665626f617264303031' })).toBe(true);
  });

  test.each([[null], [undefined], ['507f1f77bcf86cd799439011'], ['']])('is false for %p', (value) => {
    expect(isLiveboardProgram(value)).toBe(false);
  });
});
