import fs from 'fs';
import path from 'path';

// Static guard (homework-puzzle-type-split-plan D2): no behaviour is decided by comparing a
// string to a non-regular puzzle type. `puzzleTypeRules` is the rule; the table's keys are not
// comparisons.

const SRC = path.join(__dirname, '..');
const COMPARISON = /[=!]==\s*['"](withOpponentMoves|withVariations)['"]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('puzzle type rule guard', () => {
  const files = walk(SRC);

  test('scans a real file set', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith(path.join('types', 'homework.ts')))).toBe(true);
  });

  test('no file compares a string to a non-regular puzzle type', () => {
    const offenders = files
      .filter((f) => COMPARISON.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f).split(path.sep).join('/'));
    expect(offenders).toEqual([]);
  });

  // Samples are built by concatenation so this file does not match itself.
  const eq = '=' + '==';
  const ne = '!' + '==';
  test.each([`x ${eq} 'withVariations'`, `puzzleType ${ne} "withOpponentMoves"`])('the pattern catches %s', (sample) => {
    expect(COMPARISON.test(sample)).toBe(true);
  });

  test.each([`type ${ne} 'regular'`, '{ withVariations: Object.freeze({}) }'])('the pattern ignores %s', (sample) => {
    expect(COMPARISON.test(sample)).toBe(false);
  });
});
