import { validateAppend } from '../missionReplay';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const sans = (...list: string[]) => list.map((san) => ({ san }));

describe('validateAppend', () => {
  describe('legal append', () => {
    test('first move by the player (white) returns server FEN, uci and normalized SAN', () => {
      const r = validateAppend(START, [], { ply: 0, san: 'e4', by: 'player' }, 'white');
      expect(r).toEqual({
        ok: true,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        uci: 'e2e4',
        san: 'e4',
        outcome: null,
      });
    });

    test('engine reply on the engine turn is accepted', () => {
      const r = validateAppend(START, sans('e4'), { ply: 1, san: 'e5', by: 'engine' }, 'white');
      expect(r.ok).toBe(true);
    });

    test('the engine moves first when the player is black', () => {
      const r = validateAppend(START, [], { ply: 0, san: 'd4', by: 'engine' }, 'black');
      expect(r.ok).toBe(true);
      const bad = validateAppend(START, [], { ply: 0, san: 'd4', by: 'player' }, 'black');
      expect(bad).toEqual({ ok: false, error: 'out-of-turn' });
    });

    test('normalizes SAN (a check symbol is added) and builds a promotion uci', () => {
      const check = validateAppend(
        '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
        [],
        { ply: 0, san: 'Ra8', by: 'player' },
        'white',
      );
      expect(check).toMatchObject({ ok: true, san: 'Ra8+' });

      const promo = validateAppend(
        '8/P6k/8/8/8/8/8/K7 w - - 0 1',
        [],
        { ply: 0, san: 'a8=Q', by: 'player' },
        'white',
      );
      expect(promo).toMatchObject({ ok: true, uci: 'a7a8q' });
    });

    test('does not mutate the stored move list', () => {
      const stored = sans('e4', 'e5');
      validateAppend(START, stored, { ply: 2, san: 'Nf3', by: 'player' }, 'white');
      expect(stored).toEqual(sans('e4', 'e5'));
    });
  });

  describe('illegal SAN', () => {
    test('a move that is not legal on the board', () => {
      expect(validateAppend(START, [], { ply: 0, san: 'e5', by: 'player' }, 'white')).toEqual({
        ok: false,
        error: 'illegal-move',
      });
    });

    test('garbage text', () => {
      expect(validateAppend(START, [], { ply: 0, san: 'zzz', by: 'player' }, 'white')).toEqual({
        ok: false,
        error: 'illegal-move',
      });
    });

    test('a stored move list that does not replay is reported as illegal-move', () => {
      expect(
        validateAppend(START, sans('e4', 'e4'), { ply: 2, san: 'Nf3', by: 'player' }, 'white'),
      ).toEqual({ ok: false, error: 'illegal-move' });
    });

    test('a move after the game is already over is illegal', () => {
      const mated = sans('f3', 'e5', 'g4', 'Qh4#');
      expect(validateAppend(START, mated, { ply: 4, san: 'a3', by: 'engine' }, 'black')).toEqual({
        ok: false,
        error: 'illegal-move',
      });
    });
  });

  describe('wrong side (by)', () => {
    test('player claims a move on the engine turn', () => {
      expect(
        validateAppend(START, sans('e4'), { ply: 1, san: 'e5', by: 'player' }, 'white'),
      ).toEqual({ ok: false, error: 'out-of-turn' });
    });

    test('engine claims a move on the player turn', () => {
      expect(validateAppend(START, [], { ply: 0, san: 'e4', by: 'engine' }, 'white')).toEqual({
        ok: false,
        error: 'out-of-turn',
      });
    });

    test('turn is checked before legality', () => {
      expect(validateAppend(START, [], { ply: 0, san: 'e5', by: 'engine' }, 'white')).toEqual({
        ok: false,
        error: 'out-of-turn',
      });
    });
  });

  describe('ply', () => {
    test('behind the stored count is the idempotent-resend signal', () => {
      expect(
        validateAppend(START, sans('e4', 'e5'), { ply: 1, san: 'e5', by: 'engine' }, 'white'),
      ).toEqual({ ok: false, error: 'ply-behind' });
    });

    test('equal to the stored count with an empty list is accepted (ply 0)', () => {
      expect(validateAppend(START, [], { ply: 0, san: 'e4', by: 'player' }, 'white').ok).toBe(true);
    });

    test('ahead of the stored count is a gap', () => {
      expect(
        validateAppend(START, sans('e4'), { ply: 3, san: 'Nf3', by: 'player' }, 'white'),
      ).toEqual({ ok: false, error: 'ply-gap' });
    });

    test('ply is checked before turn and legality', () => {
      expect(validateAppend(START, [], { ply: 5, san: 'zzz', by: 'engine' }, 'white')).toEqual({
        ok: false,
        error: 'ply-gap',
      });
    });
  });

  describe('outcome detection on the full-history replay', () => {
    test('threefold repetition is detected from the stored history', () => {
      const history = sans('Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1');
      const r = validateAppend(START, history, { ply: 7, san: 'Ng8', by: 'engine' }, 'white');
      expect(r).toMatchObject({ ok: true, outcome: { reason: 'threefold', winner: null } });
    });

    test('the same position the second time is not yet a draw', () => {
      const history = sans('Nf3', 'Nf6', 'Ng1');
      const r = validateAppend(START, history, { ply: 3, san: 'Ng8', by: 'engine' }, 'white');
      expect(r).toMatchObject({ ok: true, outcome: null });
    });

    test('checkmate (fool mate, player is black)', () => {
      const r = validateAppend(
        START,
        sans('f3', 'e5', 'g4'),
        { ply: 3, san: 'Qh4#', by: 'player' },
        'black',
      );
      expect(r).toMatchObject({
        ok: true,
        san: 'Qh4#',
        outcome: { reason: 'checkmate', winner: 'black' },
      });
    });

    test('stalemate', () => {
      const r = validateAppend(
        '7k/5K2/8/6Q1/8/8/8/8 w - - 0 1',
        [],
        { ply: 0, san: 'Qg6', by: 'player' },
        'white',
      );
      expect(r).toMatchObject({ ok: true, outcome: { reason: 'stalemate', winner: null } });
    });

    test('insufficient material', () => {
      const r = validateAppend(
        '7k/8/8/8/8/8/1n6/K7 w - - 0 1',
        [],
        { ply: 0, san: 'Kxb2', by: 'player' },
        'white',
      );
      expect(r).toMatchObject({ ok: true, outcome: { reason: 'insufficient', winner: null } });
    });

    test('fifty-move rule', () => {
      const r = validateAppend(
        '4k3/8/8/8/8/8/R7/4K3 w - - 99 80',
        [],
        { ply: 0, san: 'Ra3', by: 'player' },
        'white',
      );
      expect(r).toMatchObject({ ok: true, outcome: { reason: 'fifty-move', winner: null } });
    });
  });
});
