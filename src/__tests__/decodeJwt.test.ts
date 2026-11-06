import { decodeJwtPayload, decodeJwtRole, getPostLoginRedirect, isAdminRole, isStaffRole } from '../decodeJwt';

/** Builds a syntactically valid (unsigned) JWT string with the given payload. */
function makeToken(payload: unknown, opts?: { omitSignature?: boolean }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const headerPart = encode(header);
  const payloadPart = encode(payload);
  const signature = opts?.omitSignature ? '' : 'fakesignature';
  return `${headerPart}.${payloadPart}.${signature}`;
}

describe('decodeJwtRole', () => {
  test('decodes the role claim from a valid token', () => {
    const token = makeToken({ role: 'student', sub: 'user123' });
    expect(decodeJwtRole(token)).toBe('student');
  });

  test('decodes a role containing base64url-unsafe characters correctly (padding round-trip)', () => {
    const token = makeToken({ role: 'coach', extra: 'a'.repeat(50) });
    expect(decodeJwtRole(token)).toBe('coach');
  });

  test('returns null when the payload has no role claim', () => {
    const token = makeToken({ sub: 'user123' });
    expect(decodeJwtRole(token)).toBeNull();
  });

  test('returns null for a token missing the payload segment', () => {
    expect(decodeJwtRole('onlyheader')).toBeNull();
  });

  test('returns null for a token with an empty payload segment', () => {
    expect(decodeJwtRole('header..signature')).toBeNull();
  });

  test('returns null when the payload segment is not valid base64/JSON', () => {
    expect(decodeJwtRole('header.not-valid-json!!!.signature')).toBeNull();
  });

  test('returns null for a completely malformed token', () => {
    expect(decodeJwtRole('not-a-jwt-at-all')).toBeNull();
  });

  test('returns null for an empty string', () => {
    expect(decodeJwtRole('')).toBeNull();
  });

  test('works even when the signature segment is missing (decode-only, not verify)', () => {
    const token = makeToken({ role: 'admin' }, { omitSignature: true });
    expect(decodeJwtRole(token)).toBe('admin');
  });
});

describe('getPostLoginRedirect', () => {
  test('redirects student to the portal dashboard', () => {
    expect(getPostLoginRedirect('student')).toBe('/portal/dashboard');
  });

  test('redirects parent to the portal dashboard', () => {
    expect(getPostLoginRedirect('parent')).toBe('/portal/dashboard');
  });

  test('redirects coach to the portal dashboard (dedicated @coach slot)', () => {
    expect(getPostLoginRedirect('coach')).toBe('/portal/dashboard');
  });

  test('redirects admin to the admin dashboard', () => {
    expect(getPostLoginRedirect('admin')).toBe('/admin/dashboard');
  });

  test('redirects superadmin to the admin dashboard', () => {
    expect(getPostLoginRedirect('superadmin')).toBe('/admin/dashboard');
  });

  test('defaults unknown roles to the portal dashboard', () => {
    expect(getPostLoginRedirect('unknown-role')).toBe('/portal/dashboard');
  });

  test('defaults null role to the portal dashboard', () => {
    expect(getPostLoginRedirect(null)).toBe('/portal/dashboard');
  });
});

describe('decodeJwtPayload', () => {
  /** Hand-built segment so the test does not depend on Buffer's base64url output. */
  const segment = (json: string): string => Buffer.from(json, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  test('decodes a payload whose base64url contains "-" and "_" and needs padding', () => {
    // ">>>" encodes to "Pj4+" and "???" to "Pz8/" in base64; the 14-byte JSON leaves the unpadded segment 3 mod 4.
    const json = '{"s":">>>???"}';
    const encoded = segment(json);
    expect(encoded).toContain('Pj4-');
    expect(encoded).toContain('Pz8_');
    expect(encoded.length % 4).toBe(3);
    expect(decodeJwtPayload(`h.${encoded}.s`)).toEqual({ s: '>>>???' });
  });

  test('returns the typed object for a plain payload', () => {
    expect(decodeJwtPayload<{ role: string; exp: number }>(makeToken({ role: 'coach', exp: 123 }))).toEqual({ role: 'coach', exp: 123 });
  });

  test('returns null for a malformed token, an empty payload segment and invalid JSON', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('h..s')).toBeNull();
    expect(decodeJwtPayload('h.bm90LWpzb24.s')).toBeNull();
    expect(decodeJwtPayload('')).toBeNull();
  });
});

describe('isAdminRole / isStaffRole', () => {
  test.each([
    ['superadmin', true, true],
    ['admin', true, true],
    ['coach', false, true],
    ['parent', false, false],
    ['student', false, false],
    ['unknown', false, false],
    ['', false, false],
    [null, false, false],
    [undefined, false, false],
  ] as const)('%s -> admin %s, staff %s', (role, admin, staff) => {
    expect(isAdminRole(role)).toBe(admin);
    expect(isStaffRole(role)).toBe(staff);
  });
});
