import fs from 'fs';
import path from 'path';

// Static guard (pgn-single-source-plan.md D1/D6): `@mliebelt/pgn-reader` (and its sibling
// parser package) is imported by exactly one file in this package, src/moveTree.ts. Every
// other module — tests included — reads a PGN through parsePgnTree / buildTreeFromPgn.
// Covers import/require/dynamic import/jest.mock.

const SRC = path.join(__dirname, '..');
const ALLOWED = ['moveTree.ts'];
const PGN_READER_IMPORT = /(require\(\s*|import\(\s*|jest\.mock\(\s*|from\s+)['"]@mliebelt\/pgn-(reader|parser)['"]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('pgn-reader import boundary', () => {
  const files = walk(SRC);

  test('scans a real file set', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith('moveTree.ts'))).toBe(true);
  });

  test('only src/moveTree.ts imports pgn-reader', () => {
    const offenders = files
      .filter((f) => PGN_READER_IMPORT.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f).split(path.sep).join('/'))
      .filter((rel) => !ALLOWED.includes(rel));
    expect(offenders).toEqual([]);
  });

  test('the allowed file really does import it', () => {
    const text = fs.readFileSync(path.join(SRC, 'moveTree.ts'), 'utf8');
    expect(PGN_READER_IMPORT.test(text)).toBe(true);
  });

  // Fixtures are built by concatenation so this file does not match itself.
  const reader = '@mliebelt/pgn-' + 'reader';
  const parser = '@mliebelt/pgn-' + 'parser';
  test.each([
    "import { PgnReader } from '" + reader + "';",
    'require("' + reader + '")',
    "await import('" + reader + "')",
    "jest.mock('" + reader + "')",
    "import { parse } from '" + parser + "';",
  ])('the pattern catches %s', (sample) => {
    expect(PGN_READER_IMPORT.test(sample)).toBe(true);
  });

  test.each([
    "import { QuizEvaluator } from '@ckq/shared';",
    '// parses with pgn-' + 'reader inside shared',
  ])('the pattern ignores %s', (sample) => {
    expect(PGN_READER_IMPORT.test(sample)).toBe(false);
  });
});
