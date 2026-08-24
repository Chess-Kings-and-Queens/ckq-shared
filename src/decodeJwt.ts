/**
 * Decodes the role claim from a JWT access token payload.
 *
 * IMPORTANT: This only decodes — it does NOT verify the signature.
 * Signature verification happens on the backend for every API call.
 * This function is used purely for client-side routing decisions.
 */
export function decodeJwtRole(token: string): string | null {
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;

    // base64url → base64 (replace URL-safe chars, add padding)
    const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    const decoded = atob(padded);
    const parsed = JSON.parse(decoded);

    return parsed.role ?? null;
  } catch {
    return null;
  }
}

type UserRole = "parent" | "student" | "admin" | "coach" | "superadmin";

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
