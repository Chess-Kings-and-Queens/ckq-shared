import fs from 'fs';
import path from 'path';

/**
 * Static guard: the Release workflow publishes a checked file and never replaces one
 * (chesskq-workspace shared-prebuilt-release-tarball-plan.md D1/D3). Consumers' lockfiles pin
 * each file's hash, so a replaced file would break every install of that version.
 */
const WORKFLOW = path.resolve(__dirname, '..', '..', '.github', 'workflows', 'release.yml');

describe('release workflow', () => {
  const text = fs.readFileSync(WORKFLOW, 'utf8').replace(/\r\n/g, '\n');
  const at = (needle: string): number => {
    const index = text.indexOf(needle);
    expect(index).toBeGreaterThan(-1);
    return index;
  };

  it('runs on a version tag and on a dispatch for an existing tag', () => {
    expect(text).toMatch(/push:\n\s+tags: \['v\*\.\*\.\*'\]/);
    expect(text).toMatch(/workflow_dispatch:\n\s+inputs:\n\s+tag:/);
  });

  it('lints and tests before it packs, and checks the version and the dist files before it publishes', () => {
    const pack = at('FILE=$(npm pack');
    const publish = at('gh release view');
    expect(at('run: npm run lint')).toBeLessThan(pack);
    expect(at('run: npm test')).toBeLessThan(pack);
    expect(at('does not match package.json version')).toBeLessThan(publish);
    expect(at('package/dist/index.js')).toBeLessThan(publish);
  });

  it('never replaces a published file', () => {
    expect(text).not.toMatch(/--clobber/);
    expect(text).toContain('already has $FILE; a published file is never replaced');
  });
});
