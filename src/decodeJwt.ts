/** Decode a JWT payload (base64url, unpadded) without verifying the signature. null when malformed. */
export function decodeJwtPayload<T extends object = Record<string, unknown>>(token: string): T | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as T;
  } catch {
    return null;
  }
}

/**
 * Decodes the role claim from a JWT access token payload.
 *
 * IMPORTANT: This only decodes — it does NOT verify the signature.
 * Signature verification happens on the backend for every API call.
 * This function is used purely for client-side routing decisions.
 */
export function decodeJwtRole(token: string): string | null {
  const parsed = decodeJwtPayload<{ role?: string }>(token);
  return parsed?.role ?? null;
}

export type UserRole = "parent" | "student" | "admin" | "coach" | "superadmin";

/** Roles with full admin access. */
export const ADMIN_ROLES: readonly UserRole[] = ["admin", "superadmin"];
/** Roles that work the staff side of the platform (admin, superadmin, coach). */
export const STAFF_ROLES: readonly UserRole[] = ["admin", "superadmin", "coach"];
/** True for admin and superadmin. */
export function isAdminRole(role: string | null | undefined): boolean { return role != null && (ADMIN_ROLES as readonly string[]).includes(role); }
/** True for admin, superadmin and coach. */
export function isStaffRole(role: string | null | undefined): boolean { return role != null && (STAFF_ROLES as readonly string[]).includes(role); }

/**
 * Returns the default redirect path for a given role after login.
 * Coach redirects to /portal/dashboard (the dedicated @coach portal slot,
 * coach-portal-redesign Phase 1) — the portal layout's role switch renders
 * the coach's own slot, not the admin one. Admin/superadmin still redirect
 * to /admin/dashboard because the portal layout handles their role-based
 * rendering via parallel routes.
 */
export function getPostLoginRedirect(role: string | null): string {
  switch (role as UserRole) {
    case "parent":
    case "student":
    case "coach":
      return "/portal/dashboard";
    case "admin":
    case "superadmin":
      return "/admin/dashboard";
    default:
      return "/portal/dashboard";
  }
}
