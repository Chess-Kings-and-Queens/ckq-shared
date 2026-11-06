import { fullName, initials, shortName } from '../names';

describe('fullName', () => {
  test('joins both parts', () => {
    expect(fullName({ firstName: 'Jane', lastName: 'Doe' })).toBe('Jane Doe');
  });
  test('first only', () => {
    expect(fullName({ firstName: 'Jane' })).toBe('Jane');
  });
  test('last only', () => {
    expect(fullName({ lastName: 'Doe' })).toBe('Doe');
  });
  test('both empty returns the fallback (default empty string)', () => {
    expect(fullName({ firstName: '', lastName: '' })).toBe('');
    expect(fullName({ firstName: null, lastName: undefined }, 'Unknown')).toBe('Unknown');
  });
  test('a null or undefined person returns the fallback', () => {
    expect(fullName(null, 'Unknown')).toBe('Unknown');
    expect(fullName(undefined)).toBe('');
  });
  test('whitespace-only parts count as empty and parts are trimmed', () => {
    expect(fullName({ firstName: '  ', lastName: ' ' }, 'X')).toBe('X');
    expect(fullName({ firstName: ' Jane ', lastName: ' Doe ' })).toBe('Jane Doe');
  });
  test('never prints "undefined"', () => {
    expect(fullName({ firstName: undefined, lastName: 'Doe' })).not.toContain('undefined');
  });
});

describe('shortName', () => {
  test('first name plus last initial', () => {
    expect(shortName('Ewan', 'Tian')).toBe('Ewan T.');
  });
  test('no last name returns the first name only', () => {
    expect(shortName('Ewan', '')).toBe('Ewan');
    expect(shortName('Ewan', null)).toBe('Ewan');
  });
  test('a first name over 10 characters is cut to 10 plus an ellipsis', () => {
    expect(shortName('Maximilianus', 'Tian')).toBe('Maximilian… T.');
  });
  test('exactly 10 characters is not cut', () => {
    expect(shortName('Maximilian', 'Tian')).toBe('Maximilian T.');
  });
  test('missing parts yield an empty string', () => {
    expect(shortName(undefined, undefined)).toBe('');
  });
});

describe('initials', () => {
  test('two upper-cased letters', () => {
    expect(initials('jane', 'doe')).toBe('JD');
  });
  test('one part only', () => {
    expect(initials('jane', null)).toBe('J');
  });
  test('both empty returns "?"', () => {
    expect(initials('', '')).toBe('?');
    expect(initials(undefined, undefined)).toBe('?');
  });
});
