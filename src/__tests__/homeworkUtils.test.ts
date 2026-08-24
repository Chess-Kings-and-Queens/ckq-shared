import { scoreColor, formatTime } from '../homeworkUtils';

describe('scoreColor', () => {
  test('returns green for scores >= 80', () => {
    expect(scoreColor(80)).toBe('#2e7d32');
    expect(scoreColor(95)).toBe('#2e7d32');
    expect(scoreColor(100)).toBe('#2e7d32');
  });

  test('returns amber for scores >= 50 and < 80', () => {
    expect(scoreColor(50)).toBe('#f57f17');
    expect(scoreColor(65)).toBe('#f57f17');
    expect(scoreColor(79)).toBe('#f57f17');
  });

  test('returns red for scores below 50', () => {
    expect(scoreColor(49)).toBe('#c62828');
    expect(scoreColor(0)).toBe('#c62828');
    expect(scoreColor(-10)).toBe('#c62828');
  });

  test('boundary: exactly at threshold values', () => {
    // 80 and 50 are inclusive lower bounds for their tiers
    expect(scoreColor(80)).toBe('#2e7d32');
    expect(scoreColor(79.99)).toBe('#f57f17');
    expect(scoreColor(50)).toBe('#f57f17');
    expect(scoreColor(49.99)).toBe('#c62828');
  });
});

describe('formatTime', () => {
  test('returns em dash for null', () => {
    expect(formatTime(null)).toBe('—');
  });

  test('returns em dash for 0 seconds (falsy)', () => {
    expect(formatTime(0)).toBe('—');
  });

  test('formats sub-minute durations as seconds only', () => {
    expect(formatTime(1)).toBe('1 sec');
    expect(formatTime(45)).toBe('45 sec');
    expect(formatTime(59)).toBe('59 sec');
  });

  test('formats exact minutes with no leftover seconds', () => {
    expect(formatTime(60)).toBe('1 mins');
    expect(formatTime(120)).toBe('2 mins');
  });

  test('formats minutes with leftover seconds', () => {
    expect(formatTime(90)).toBe('1 mins 30 sec');
    expect(formatTime(125)).toBe('2 mins 5 sec');
  });

  test('formats durations beyond an hour as minutes (no hour rollover)', () => {
    expect(formatTime(3661)).toBe('61 mins 1 sec');
    expect(formatTime(3600)).toBe('60 mins');
  });

  test('rounds fractional seconds', () => {
    // 61.6s -> 1 min, 1.6s rounds to 2 sec
    expect(formatTime(61.6)).toBe('1 mins 2 sec');
  });
});
