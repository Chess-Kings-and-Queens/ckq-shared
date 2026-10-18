import fs from 'fs';
import path from 'path';

// Static guard (ADR frontend-008): `chess.js` is imported by exactly one file in
// this package, src/chessGame.ts. Every other module — tests included — goes
// through ChessGame. Covers import/require/dynamic import/jest.mock.

const SRC = path.join(__dirname, '..');
const ALLOWED = ['chessGame.ts'];
const CHESS_JS_IMPORT = /(require\(\s*|import\(\s*|jest\.mock\(\s*|from\s+)['"]chess\.js['"]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('chess.js import boundary', () => {
  const files = walk(SRC);

  test('scans a real file set', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith('chessGame.ts'))).toBe(true);
  });

  test('only src/chessGame.ts imports chess.js', () => {
    const offenders = files
      .filter((f) => CHESS_JS_IMPORT.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f).split(path.sep).join('/'))
      .filter((rel) => !ALLOWED.includes(rel));
    expect(offenders).toEqual([]);
  });

  test('the allowed file really does import it', () => {
    const text = fs.readFileSync(path.join(SRC, 'chessGame.ts'), 'utf8');
    expect(CHESS_JS_IMPORT.test(text)).toBe(true);
  });
});
