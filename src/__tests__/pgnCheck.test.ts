import {
  checkPgn,
  checkPgnText,
  firstBlockingMessage,
  repairPgnTags,
  repairPgnText,
  splitRatingFromName,
  PGN_ISSUE_CODES,
  PGN_ISSUE_MESSAGES,
} from '../pgnCheck';
import { parsePgnHeader } from '../chessUtils';

const MOVES = '1. e4 { [%eval 0.2] [%clk 1:00:00] } e5 { [%eval 0.1] [%clk 0:59:58] } 2. Nf3 Nc6 1-0';

const CLEAN = `[Event "Club"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

${MOVES}`;

const RATED = `[Event "Round 4"]
[White "1849 Nico Alvarado-Yoshida"]
[Black "1872 Aileen Lou"]
[Result "1-0"]

${MOVES}`;

const codes = (pgn: string): string[] => checkPgn(pgn).issues.map((i) => i.code);

describe('checkPgn', () => {
  test('a clean game is usable with its ply count and no issues', () => {
    const result = checkPgn(CLEAN);
    expect(result.usable).toBe(true);
    expect(result.plies).toBe(4);
    expect(result.issues).toEqual([]);
  });

  test.each(['not a game', '[White "x"]\n\n1. e4 e5 2. Nf3 Qxf7 *', '1. e4 e5 2. Nf3 Qxf7 *'])(
    'an unreadable game reports only unreadable: %s',
    (pgn) => {
      expect(checkPgn(pgn)).toEqual({
        usable: false,
        plies: 0,
        issues: [{ code: 'unreadable', severity: 'blocking' }],
      });
    },
  );

  test('tags with no moves are no-moves and unusable', () => {
    const result = checkPgn('[White "Alice"]\n[Black "Bob"]\n[Result "*"]\n\n*');
    expect(result.usable).toBe(false);
    expect(result.plies).toBe(0);
    expect(result.issues).toEqual([{ code: 'no-moves', severity: 'blocking' }]);
  });

  test('a rating in the name with no Elo tag is rating-in-name for that side', () => {
    const result = checkPgn('[White "1849 Nico Alvarado-Yoshida"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 1-0');
    expect(result.usable).toBe(true);
    expect(result.issues).toEqual([{ code: 'rating-in-name', severity: 'fixable', side: 'white' }]);
  });

  test('a rating in the name with an Elo tag set is not a repair issue', () => {
    const pgn = '[White "1849 Nico"]\n[WhiteElo "1849"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 1-0';
    expect(codes(pgn)).toEqual([]);
  });

  test.each(['""', '"?"', '"0"'])('an empty-like Elo tag %s still allows the repair issue', (elo) => {
    const pgn = `[White "1849 Nico"]\n[WhiteElo ${elo}]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 1-0`;
    expect(codes(pgn)).toEqual(['rating-in-name']);
  });

  test.each(['1849', '99 Name', '3500 Name'])('the name %s is not matched', (name) => {
    const pgn = `[White "${name}"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 1-0`;
    expect(codes(pgn)).not.toContain('rating-in-name');
  });

  test('an empty or ? player is missing-player for that side', () => {
    const result = checkPgn('[White ""]\n[Black "?"]\n[Result "1-0"]\n\n1. e4 e5 1-0');
    expect(result.issues).toEqual([
      { code: 'missing-player', severity: 'advisory', side: 'white' },
      { code: 'missing-player', severity: 'advisory', side: 'black' },
    ]);
    expect(result.usable).toBe(true);
  });

  test.each([
    ['no Result tag', '[White "A"]\n[Black "B"]\n\n1. e4 e5 1-0'],
    ['an invalid Result tag', '[White "A"]\n[Black "B"]\n[Result "2-0"]\n\n1. e4 e5 1-0'],
  ])('%s is missing-result', (_label, pgn) => {
    expect(checkPgn(pgn).issues).toEqual([{ code: 'missing-result', severity: 'advisory' }]);
  });
});

describe('checkPgnText', () => {
  test.each(['', '   \n '])('blank text %j holds no games', (raw) => {
    expect(checkPgnText(raw)).toEqual({ games: 0, checks: [] });
  });

  test('three games where the second is unreadable', () => {
    const bad = '[White "A"]\n[Black "B"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Qxf7 *';
    const result = checkPgnText([CLEAN, bad, CLEAN].join('\n\n'));
    expect(result.games).toBe(3);
    expect(result.checks.map((c) => c.usable)).toEqual([true, false, true]);
  });
});

describe('firstBlockingMessage', () => {
  const ok = checkPgn(CLEAN);
  const unreadable = checkPgn('not a game');
  const noMoves = checkPgn('[White "A"]\n\n*');

  test('unnumbered gives the plain message', () => {
    expect(firstBlockingMessage([ok, unreadable], false)).toBe(PGN_ISSUE_MESSAGES.unreadable);
    expect(firstBlockingMessage([noMoves], false)).toBe('PGN has no moves');
  });

  test('numbered prefixes the 1-based game number', () => {
    expect(firstBlockingMessage([ok, unreadable], true)).toBe('Game 2: PGN could not be read');
  });

  test('null when nothing blocks', () => {
    expect(firstBlockingMessage([ok, ok], true)).toBeNull();
    expect(firstBlockingMessage([], false)).toBeNull();
  });
});

describe('repairPgnTags', () => {
  test('repairs both sides, adds Elo tags and leaves moves and comments byte-identical', () => {
    const result = repairPgnTags(RATED);
    const tags = parsePgnHeader(result.pgn);
    expect(tags.White).toBe('Nico Alvarado-Yoshida');
    expect(tags.WhiteElo).toBe('1849');
    expect(tags.Black).toBe('Aileen Lou');
    expect(tags.BlackElo).toBe('1872');
    expect(tags.Event).toBe('Round 4');
    expect(result.pgn.endsWith(MOVES)).toBe(true);
    expect(result.repairs).toEqual([
      { code: 'rating-in-name', side: 'white', before: '1849 Nico Alvarado-Yoshida', name: 'Nico Alvarado-Yoshida', elo: 1849 },
      { code: 'rating-in-name', side: 'black', before: '1872 Aileen Lou', name: 'Aileen Lou', elo: 1872 },
    ]);
    expect(checkPgn(result.pgn).issues).toEqual([]);
  });

  test('a no-op returns the same string reference', () => {
    const result = repairPgnTags(CLEAN);
    expect(result.pgn).toBe(CLEAN);
    expect(result.repairs).toEqual([]);
  });
});

describe('repairPgnText', () => {
  test('a no-op returns the input reference', () => {
    const raw = `${CLEAN}\n\n${CLEAN}`;
    const result = repairPgnText(raw);
    expect(result.text).toBe(raw);
    expect(result.repairs).toEqual([]);
  });

  test('one game repaired of three, the others unchanged', () => {
    const result = repairPgnText([CLEAN, RATED, CLEAN].join('\n\n'));
    expect(result.repairs.map((r) => r.game)).toEqual([2, 2]);
    expect(result.text.endsWith(MOVES)).toBe(true);
    const games = checkPgnText(result.text);
    expect(games.games).toBe(3);
    expect(games.checks.every((c) => c.issues.length === 0)).toBe(true);
    expect(result.text.startsWith(CLEAN)).toBe(true);
    expect(result.text.endsWith(CLEAN)).toBe(true);
  });
});

describe('splitRatingFromName', () => {
  test('matches a rating followed by a name', () => {
    expect(splitRatingFromName('1849 Nico Alvarado-Yoshida')).toEqual({ name: 'Nico Alvarado-Yoshida', elo: 1849 });
  });

  test.each(['99 Name', '3500 Name', '3001 Name'])('%s is out of range', (value) => {
    expect(splitRatingFromName(value)).toBeNull();
  });

  test.each(['1849', '1849 ', 'Nico'])('%j has no name after a rating', (value) => {
    expect(splitRatingFromName(value)).toBeNull();
  });
});

describe('PGN_ISSUE_CODES', () => {
  test('lists the five codes', () => {
    expect([...PGN_ISSUE_CODES]).toEqual(['unreadable', 'no-moves', 'rating-in-name', 'missing-player', 'missing-result']);
  });
});
