type NameParts = { firstName?: string | null; lastName?: string | null } | null | undefined;

/** "Jane Doe" from optional parts; `fallback` when both are empty. Never prints "undefined". */
export function fullName(person: NameParts, fallback = ''): string {
  const first = String(person?.firstName ?? '').trim();
  const last = String(person?.lastName ?? '').trim();
  return [first, last].filter(Boolean).join(' ') || fallback;
}

/** "Ewan Tian" → "Ewan T."; a first name over 10 characters is cut to 10 plus "…". */
export function shortName(firstName?: string | null, lastName?: string | null): string {
  const first = String(firstName ?? '').trim();
  const last = String(lastName ?? '').trim();
  const fn = first.length > 10 ? `${first.slice(0, 10)}…` : first;
  return last ? `${fn} ${last.charAt(0)}.` : fn;
}

/** Two-letter initials, upper-cased; "?" when both parts are empty. */
export function initials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}
