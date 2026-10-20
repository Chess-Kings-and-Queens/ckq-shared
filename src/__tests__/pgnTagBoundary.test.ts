import fs from 'fs';
import path from 'path';

// Static guard (pgn-single-source-plan.md D6): a PGN tag is parsed by exactly one file in
// this package, src/chessUtils.ts (parsePgnHeader). Every other module — tests included —
// reads tags through parsePgnHeader and writes them through withPgnTags. The pattern matches
// a regex literal that names a PGN tag, or that has the tag-pair capture shape.

const SRC = path.join(__dirname, '..');
const ALLOWED = ['chessUtils.ts'];
const PGN_TAG_REGEX = /\\\[(?:FEN|SetUp|Event|White|Black|Result)\b|\\\[\(\\w\+\)/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('PGN tag regex boundary', () => {
  const files = walk(SRC);

  test('scans a real file set', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith('chessUtils.ts'))).toBe(true);
  });

  test('only src/chessUtils.ts parses a PGN tag with a regex', () => {
    const offenders = files
      .filter((f) => PGN_TAG_REGEX.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f).split(path.sep).join('/'))
      .filter((rel) => !ALLOWED.includes(rel));
    expect(offenders).toEqual([]);
  });

  test('the allowed file really does match', () => {
    const text = fs.readFileSync(path.join(SRC, 'chessUtils.ts'), 'utf8');
    expect(PGN_TAG_REGEX.test(text)).toBe(true);
  });

  // Fixtures are built by concatenation so this file does not match itself.
  const BS = '\\';
  const OPEN = BS + '[';
  test.each([
    '/' + OPEN + 'FEN' + BS + 's+"([^"]+)"' + BS + ']/',
    '/' + OPEN + 'FEN' + BS + 's/i',
    '/' + OPEN + '(' + BS + 'w+)' + BS + 's+"([^"]*)"' + BS + ']/g',
    '/' + OPEN + 'SetUp "1"' + BS + ']/',
  ])('the pattern catches %s', (sample) => {
    expect(PGN_TAG_REGEX.test(sample)).toBe(true);
  });

  test.each([
    '[FEN "x"]',
    '`[FEN "$' + '{fen}"]`',
    '/fen' + BS + 'w*(' + OPEN + BS + 'w+' + BS + '])?/',
    '/' + OPEN + '([^' + BS + ']]+)' + BS + ']' + BS + '(/',
  ])('the pattern ignores %s', (sample) => {
    expect(PGN_TAG_REGEX.test(sample)).toBe(false);
  });
});
