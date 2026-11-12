/**
 * The notice message format (portal-notices D6): a blank line starts a new paragraph,
 * a block whose every line starts "- " is a bullet list, **text** is bold. Returns data,
 * never markup — each client renders it with its own text elements.
 */

export interface NoticeInline {
  text: string;
  bold: boolean;
}

export type NoticeBlock =
  | { kind: "paragraph"; lines: NoticeInline[][] }
  | { kind: "list"; items: NoticeInline[][] };

/** One line's text split into plain and bold pieces; empty pieces are dropped. */
export function parseNoticeInline(text: string): NoticeInline[] {
  return text
    .split(/\*\*(.+?)\*\*/)
    .map((piece, i) => ({ text: piece, bold: i % 2 === 1 }))
    .filter((piece) => piece.text.length > 0);
}

export function parseNoticeBody(body: string): NoticeBlock[] {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block): NoticeBlock => {
      const lines = block.split("\n");
      if (lines.every((line) => line.startsWith("- "))) {
        return { kind: "list", items: lines.map((line) => parseNoticeInline(line.slice(2))) };
      }
      return { kind: "paragraph", lines: lines.map(parseNoticeInline) };
    });
}
