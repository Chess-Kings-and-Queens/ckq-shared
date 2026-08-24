import { decodeJwtRole, getPostLoginRedirect } from '../decodeJwt';

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
