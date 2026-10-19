import fs from 'fs';
import path from 'path';

// Static guard (fen-accessors-and-training-position-admin-plan.md D3): a FEN is
// tokenised by exactly one file in this package, src/fen.ts. Every other module —
// tests included — reads FEN fields through fenFields.

const SRC = path.join(__dirname, '..');
const ALLOWED = ['fen.ts'];
const FEN_SPLIT = /fen\w*(\[\w+\])?\??\.(trim\(\)\??\.)?split\(/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('FEN split boundary', () => {
  const files = walk(SRC);

  test('scans a real file set', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith('fen.ts'))).toBe(true);
  });

  test('only src/fen.ts splits a FEN', () => {
    const offenders = files
      .filter((f) => FEN_SPLIT.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f).split(path.sep).join('/'))
      .filter((rel) => !ALLOWED.includes(rel));
    expect(offenders).toEqual([]);
  });

  test('the allowed file really does split', () => {
    const text = fs.readFileSync(path.join(SRC, 'fen.ts'), 'utf8');
    expect(FEN_SPLIT.test(text)).toBe(true);
  });

  // Fixtures are built by concatenation so this file does not match itself.
  const split = '.spl' + 'it(';
  test.each([
    'fen' + split + "' ')",
    'displayFen' + split + "' ')[1]",
    'fenMatch[1]' + split + "' ')",
    'startFen?.trim()' + split + '/\\s+/)',
    'board.displayFen' + split,
  ])('the pattern catches %s', (sample) => {
    expect(FEN_SPLIT.test(sample)).toBe(true);
  });

  test.each(['pgn' + split + "' ')", 'fenFields(fen)'])('the pattern ignores %s', (sample) => {
    expect(FEN_SPLIT.test(sample)).toBe(false);
  });
});
