import { fenFields, fenFromFields } from '../fen';
import * as shared from '../index';
import { START_FEN } from '../chessUtils';

describe('fenFields', () => {
  test('start FEN gives six fields', () => {
    expect(fenFields(START_FEN)).toEqual({
      placement: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
      turn: 'w',
      castling: 'KQkq',
      enPassant: '-',
      halfmove: 0,
      fullmove: 1,
    });
  });

  test('a 4-field FEN defaults halfmove 0 and fullmove 1', () => {
    expect(fenFields('8/8/4k3/8/4K3/8/8/8 b - -')).toMatchObject({ turn: 'b', halfmove: 0, fullmove: 1 });
  });

  test.each([
    ['empty string', ''],
    ['undefined', undefined],
    ['a number', 42],
    ['turn field not w/b', 'not a fen at all'],
    ['three tokens', '8/8/8/8/8/8/8/8 w -'],
  ])('null for %s', (_label, value) => {
    expect(fenFields(value)).toBeNull();
  });

  test('placement is returned as written', () => {
    expect(fenFields('x/y w - - 0 1')?.placement).toBe('x/y');
  });

  test('leading and trailing whitespace is trimmed', () => {
    expect(fenFields(`  ${START_FEN}  `)?.turn).toBe('w');
  });
});

describe('fenFromFields', () => {
  test('round-trips the start FEN', () => {
    const f = fenFields(START_FEN);
    expect(f).not.toBeNull();
    expect(fenFromFields(f!)).toBe(START_FEN);
  });
});

describe('package index', () => {
  test.each(['fenFields', 'fenFromFields'])('%s is exported', (name) => {
    expect(typeof (shared as Record<string, unknown>)[name]).toBe('function');
  });
});
