import { countdownParts, type Countdown } from '../countdown';

const TARGET = '2026-10-15T21:00:00.000Z';
const TARGET_MS = 1792098000000;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
// Literal "now" instants, each chosen for the branch it proves (target minus an offset).
const T = Date.parse(TARGET);

const NO: Countdown = { days: '--', hrs: '--', min: '--' };
const PASSED: Countdown = { days: '00', hrs: '00', min: '00' };

describe('countdownParts', () => {
  test('literal epoch matches the ISO target', () => {
    expect(Date.parse(TARGET)).toBe(TARGET_MS);
  });

  test.each([[null], [undefined], ['']])('no target %p reads --', (target) => {
    expect(countdownParts(target, T)).toEqual(NO);
  });

  test('an unparseable string reads --', () => {
    expect(countdownParts('not a date', T)).toEqual(NO);
  });

  test('NaN and Infinity read --', () => {
    expect(countdownParts(NaN, T)).toEqual(NO);
    expect(countdownParts(Infinity, T)).toEqual(NO);
  });

  test('exactly 24 h before is 1 day with hrs/min --', () => {
    expect(countdownParts(TARGET, T - DAY)).toEqual({ days: '1', hrs: '--', min: '--' });
  });

  test('49 h before is 2 days', () => {
    expect(countdownParts(TARGET, T - 49 * HOUR)).toEqual({ days: '2', hrs: '--', min: '--' });
  });

  test('3 d 5 h before is 3 days', () => {
    expect(countdownParts(TARGET, T - (3 * DAY + 5 * HOUR))).toEqual({ days: '3', hrs: '--', min: '--' });
  });

  test('23 h 59 min before is 00/23/59', () => {
    expect(countdownParts(TARGET, T - (23 * HOUR + 59 * MIN))).toEqual({ days: '00', hrs: '23', min: '59' });
  });

  test('90 min before is 00/01/30', () => {
    expect(countdownParts(TARGET, T - 90 * MIN)).toEqual({ days: '00', hrs: '01', min: '30' });
  });

  test('5 min before is 00/00/05', () => {
    expect(countdownParts(TARGET, T - 5 * MIN)).toEqual({ days: '00', hrs: '00', min: '05' });
  });

  test('59.9 s before floors to 00/00/00', () => {
    expect(countdownParts(TARGET, T - 59_900)).toEqual(PASSED);
  });

  test('at the instant and after reads 00/00/00', () => {
    expect(countdownParts(TARGET, T)).toEqual(PASSED);
    expect(countdownParts(TARGET, T + 5 * MIN)).toEqual(PASSED);
  });

  test.each([
    ['24 h or more', T - 3 * DAY],
    ['under 24 h', T - 90 * MIN],
    ['passed', T + MIN],
  ])('epoch ms equals ISO form (%s)', (_label, now) => {
    expect(countdownParts(TARGET_MS, now)).toEqual(countdownParts(TARGET, now));
  });

  test('epoch 0 is a real instant, not "no target"', () => {
    const result: Countdown = countdownParts(0, T);
    expect(result).toEqual(PASSED);
  });
});
