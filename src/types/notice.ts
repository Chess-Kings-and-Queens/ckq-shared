// ── Notice types ─────────────────────────────────────────────────────────────
//
// Moved verbatim from website2.0's src/app/services/notice.ts. The feed shape of
// GET /notice for a student, parent or coach (backend-2.0 notice.service.js
// PORTAL_FIELDS allowlist). Pure API contract shapes only.

export type NoticeStyle = "popup" | "banner";

export interface NoticeAction {
  label: string;
  /** A website path starting with one "/" (backend noticeSchemas.js INTERNAL_PATH). */
  href: string;
}

export interface PortalNotice {
  _id: string;
  title: string;
  body: string;
  style: NoticeStyle;
  action: NoticeAction | null;
  /** ISO datetime string (UTC instant). */
  startAt: string;
}

/** GET /notice for a student, parent or coach. */
export interface NoticeFeedResponse {
  notices: PortalNotice[];
}
