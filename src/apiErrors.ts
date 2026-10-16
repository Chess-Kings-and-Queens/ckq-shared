// ── API error display ──────────────────────────────────────────────────────────
//
// Moved verbatim from website2.0's src/app/hooks/useLoadState.ts (the React
// hook stays there). Pure message extraction — no axios import; the axios error
// shape is read structurally.

export const GENERIC_LOAD_ERROR_MESSAGE = "Couldn't load this — please try again.";

/**
 * Extracts a display-safe error message.
 * - Only returns the backend-provided `message` string (axios error shape:
 *   `error.response.data.message`) when `error.response.status` is a 4xx
 *   status OTHER than 404 — i.e. 400-499 excluding 404. Those are the
 *   ValidationError/UnauthorizedError/ForbiddenError messages the backend
 *   writes to be user-facing.
 * - For a 404, any 5xx, or a missing/non-numeric status, falls back to the
 *   generic message instead — a 404 message is the raw
 *   `Route <originalUrl>` string from Express's catch-all (backend/src/app.js),
 *   and a 5xx message can be raw `DatabaseError` text; neither is safe to
 *   show a user verbatim. Never render raw error objects, stack traces, or
 *   HTTP status codes.
 */
export function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const maybeAxiosError = err as { response?: { status?: unknown; data?: { message?: unknown } } };
    const status = maybeAxiosError.response?.status;
    const isUserFacing4xx = typeof status === "number" && status >= 400 && status < 500 && status !== 404;
    if (isUserFacing4xx) {
      const backendMessage = maybeAxiosError.response?.data?.message;
      if (typeof backendMessage === "string" && backendMessage.trim().length > 0) {
        return backendMessage;
      }
    }
  }
  return GENERIC_LOAD_ERROR_MESSAGE;
}
