import { missionSucceeded } from '../missionSucceeded';

describe('missionSucceeded', () => {
  describe("objective: 'win'", () => {
    test('winning succeeds', () => {
      expect(missionSucceeded('win', 'win')).toBe(true);
    });

    test('drawing does not succeed', () => {
      expect(missionSucceeded('win', 'draw')).toBe(false);
    });

    test('losing does not succeed', () => {
      expect(missionSucceeded('win', 'loss')).toBe(false);
    });

    test('null outcome (game not finished) does not succeed', () => {
      expect(missionSucceeded('win', null)).toBe(false);
    });
  });

  describe("objective: 'draw'", () => {
    test('drawing succeeds', () => {
      expect(missionSucceeded('draw', 'draw')).toBe(true);
    });

    test('winning also succeeds (exceeds the requirement)', () => {
      expect(missionSucceeded('draw', 'win')).toBe(true);
    });

    test('losing does not succeed', () => {
      expect(missionSucceeded('draw', 'loss')).toBe(false);
    });

    test('null outcome (game not finished) does not succeed', () => {
      expect(missionSucceeded('draw', null)).toBe(false);
    });
  });
});
