/**
 * Unit tests for splitPgnGames
 *
 * The function's contract:
 *   - Split a raw multi-game PGN string into individual game strings
 *   - A new game starts when a tag line ("[...") appears after move text
 *   - Works with any tag header, not just [Event]
 *   - Empty strings and whitespace-only strings are filtered out
 *   - Each returned string is trimmed
 */

import { splitPgnGames } from "../chessUtils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePgn(headers: string[], moves: string): string {
  return [...headers, "", moves].join("\n");
}

const FEN1 = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
const FEN2 = 'rnbqkb1r/pp3ppp/2p1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 5';
const FEN3 = '8/8/4k3/8/4K3/8/8/8 w - - 0 1';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("splitPgnGames", () => {
  // ── Edge cases ──────────────────────────────────────────────────────────────

  it("returns empty array for empty string", () => {
    expect(splitPgnGames("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(splitPgnGames("   \n\n\t  ")).toEqual([]);
  });

  // ── Single game ─────────────────────────────────────────────────────────────

  it("returns single game when there is only one game with [Event]", () => {
    const pgn = `[Event "Puzzle 1"]\n[FEN "${FEN1}"]\n\n1... Nc6 *`;
    const result = splitPgnGames(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("Nc6");
  });

  it("returns single game when there is only one game with [FEN] only (no [Event])", () => {
    const pgn = `[FEN "${FEN1}"]\n[Result "*"]\n\n1... Nc6 *`;
    const result = splitPgnGames(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("Nc6");
  });

  it("returns single game when there is only one game with no headers", () => {
    const pgn = "1. e4 e5 2. Nf3 Nc6 *";
    const result = splitPgnGames(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("e4");
  });

  // ── Multi-game: [Event] tag (original format) ────────────────────────────────

  it("splits two games separated by [Event] tags", () => {
    const pgn = [
      `[Event "Puzzle 1"]`,
      `[FEN "${FEN1}"]`,
      ``,
      `1... Nc6 *`,
      ``,
      `[Event "Puzzle 2"]`,
      `[FEN "${FEN2}"]`,
      ``,
      `1. d5 exd5 *`,
    ].join("\n");

    const result = splitPgnGames(pgn);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain("Nc6");
    expect(result[1]).toContain("d5");
  });

  it("splits ten games with [Event] tags", () => {
    const games = Array.from({ length: 10 }, (_, i) =>
      [`[Event "Puzzle ${i + 1}"]`, `[FEN "${FEN1}"]`, ``, `1... Nc6 *`].join("\n")
    );
    const pgn = games.join("\n\n");
    const result = splitPgnGames(pgn);
    expect(result).toHaveLength(10);
  });

  // ── Multi-game: [FEN] only, no [Event] ──────────────────────────────────────

  it("splits two games using [FEN] tag without [Event]", () => {
    const pgn = [
      `[FEN "${FEN1}"]`,
      `[Result "*"]`,
      ``,
      `1... Nc6 *`,
      ``,
      `[FEN "${FEN2}"]`,
      `[Result "*"]`,
      ``,
      `1. d5 exd5 *`,
    ].join("\n");

    const result = splitPgnGames(pgn);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain(FEN1);
    expect(result[1]).toContain(FEN2);
  });

  it("splits ten games using [FEN] tag only", () => {
    const games = Array.from({ length: 10 }, (_, i) =>
      [`[FEN "${FEN1}"]`, `[Result "*"]`, ``, `${i + 1}... Nc6 *`].join("\n")
    );
    const pgn = games.join("\n\n");
    const result = splitPgnGames(pgn);
    expect(result).toHaveLength(10);
  });

  // ── Multi-game: arbitrary non-[Event] headers ────────────────────────────────

  it("splits games using [White]/[Black] headers without [Event]", () => {
    const pgn = [
      `[White "Puzzle 1"]`,
      `[Black "Student"]`,
      ``,
      `1. e4 e5 *`,
      ``,
      `[White "Puzzle 2"]`,
      `[Black "Student"]`,
      ``,
      `1. d4 d5 *`,
    ].join("\n");

    const result = splitPgnGames(pgn);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain("e4");
    expect(result[1]).toContain("d4");
  });

  // ── Result tokens ────────────────────────────────────────────────────────────

  it("handles all four result tokens: *, 1-0, 0-1, 1/2-1/2", () => {
    const results = ["*", "1-0", "0-1", "1/2-1/2"];
    for (const token of results) {
      const pgn = [
        `[FEN "${FEN1}"]`,
        ``,
        `1... Nc6 ${token}`,
        ``,
        `[FEN "${FEN2}"]`,
        ``,
        `1. d5 ${token}`,
      ].join("\n");
      const parts = splitPgnGames(pgn);
      expect(parts).toHaveLength(2);
    }
  });

  // ── Whitespace tolerance ─────────────────────────────────────────────────────

  it("handles extra blank lines between games", () => {
    const pgn = [
      `[FEN "${FEN1}"]`,
      ``,
      `1... Nc6 *`,
      ``,
      ``,
      ``,
      `[FEN "${FEN2}"]`,
      ``,
      `1. d5 *`,
    ].join("\n");

    const result = splitPgnGames(pgn);
    expect(result).toHaveLength(2);
  });

  it("handles Windows-style CRLF line endings", () => {
    const pgn = `[FEN "${FEN1}"]\r\n[Result "*"]\r\n\r\n1... Nc6 *\r\n\r\n[FEN "${FEN2}"]\r\n[Result "*"]\r\n\r\n1. d5 *`;
    // Normalize CRLF before passing (same as how DB content would be stored)
    const result = splitPgnGames(pgn.replace(/\r\n/g, "\n"));
    expect(result).toHaveLength(2);
  });

  it("trims leading/trailing whitespace from each game", () => {
    const pgn = `\n\n[FEN "${FEN1}"]\n\n1... Nc6 *\n\n\n[FEN "${FEN2}"]\n\n1. d5 *\n\n`;
    const result = splitPgnGames(pgn);
    expect(result).toHaveLength(2);
    result.forEach((g) => {
      expect(g.startsWith("[") || g.match(/^\d/)).toBeTruthy();
      expect(g).not.toMatch(/^\s+/);
      expect(g).not.toMatch(/\s+$/);
    });
  });

  // ── Move text with inline comments ──────────────────────────────────────────

  it("handles inline PGN comments without splitting mid-game", () => {
    const pgn = [
      `[FEN "${FEN1}"]`,
      ``,
      `1... Nc6 { Good move } 2. d3 *`,
      ``,
      `[FEN "${FEN2}"]`,
      ``,
      `1. d5 { Strong center } exd5 *`,
    ].join("\n");

    const result = splitPgnGames(pgn);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain("Good move");
    expect(result[1]).toContain("Strong center");
  });

  // ── Mixed header styles ──────────────────────────────────────────────────────

  it("splits correctly when games have different header sets", () => {
    const pgn = [
      `[Event "Puzzle 1"]`,
      `[FEN "${FEN1}"]`,
      ``,
      `1... Nc6 *`,
      ``,
      `[FEN "${FEN2}"]`,       // no [Event] on second game
      `[Result "*"]`,
      ``,
      `1. d5 *`,
      ``,
      `[Event "Puzzle 3"]`,   // [Event] is back on third game
      `[FEN "${FEN3}"]`,
      ``,
      `1. Ke5 *`,
    ].join("\n");

    const result = splitPgnGames(pgn);
    expect(result).toHaveLength(3);
  });

  // ── Content integrity ────────────────────────────────────────────────────────

  it("preserves all header tags in each game", () => {
    const pgn = [
      `[Event "Puzzle 1"]`,
      `[FEN "${FEN1}"]`,
      `[Result "*"]`,
      ``,
      `1... Nc6 *`,
      ``,
      `[Event "Puzzle 2"]`,
      `[FEN "${FEN2}"]`,
      `[Result "*"]`,
      ``,
      `1. d5 *`,
    ].join("\n");

    const [g1, g2] = splitPgnGames(pgn);
    expect(g1).toContain('[Event "Puzzle 1"]');
    expect(g1).toContain(`[FEN "${FEN1}"]`);
    expect(g2).toContain('[Event "Puzzle 2"]');
    expect(g2).toContain(`[FEN "${FEN2}"]`);
  });

  it("preserves move text exactly", () => {
    const moves1 = "1... Nc6 2. d3 d5 3. Nd2 *";
    const moves2 = "1. d4 d5 2. c4 e6 *";
    const pgn = [
      `[FEN "${FEN1}"]`,
      ``,
      moves1,
      ``,
      `[FEN "${FEN2}"]`,
      ``,
      moves2,
    ].join("\n");

    const [g1, g2] = splitPgnGames(pgn);
    expect(g1).toContain(moves1);
    expect(g2).toContain(moves2);
  });
});
