import {
  formatClockMs,
  formatLabel,
  formatPoints,
  formatTimeControl,
  outcomeLabel,
  playerScore,
  resultPill,
  resultReasonLabel,
  resultSummary,
  scoreLine,
  statusLabel,
  tiebreakLabel,
} from "../tournamentResultLabels";

describe("formatPoints", () => {
  it.each([
    [6.5, "6½"],
    [4, "4"],
    [0.5, "½"],
    [0, "0"],
    [10, "10"],
  ])("%s -> %s", (points, expected) => {
    expect(formatPoints(points)).toBe(expected);
  });
});

describe("scoreLine", () => {
  it("joins formatted points and games", () => {
    expect(scoreLine(4.5, 6)).toBe("4½/6");
    expect(scoreLine(0.5, 1)).toBe("½/1");
    expect(scoreLine(3, 3)).toBe("3/3");
  });
});

describe("outcomeLabel", () => {
  it("maps each outcome and null", () => {
    expect(outcomeLabel("win")).toBe("Win");
    expect(outcomeLabel("loss")).toBe("Loss");
    expect(outcomeLabel("draw")).toBe("Draw");
    expect(outcomeLabel(null)).toBe("—");
  });
});

describe("formatClockMs", () => {
  it("formats minutes and seconds, em dash for null", () => {
    expect(formatClockMs(412000)).toBe("6:52");
    expect(formatClockMs(5000)).toBe("0:05");
    expect(formatClockMs(null)).toBe("—");
  });
});

describe("formatTimeControl", () => {
  it("shows minutes + increment", () => {
    expect(formatTimeControl(600, 5)).toBe("10+5");
  });
});

describe("result helpers", () => {
  it("resultPill covers all four results", () => {
    expect(resultPill("1-0")).toBe("1–0");
    expect(resultPill("0-1")).toBe("0–1");
    expect(resultPill("1/2-1/2")).toBe("½–½");
    expect(resultPill(null)).toBe("—");
  });

  it("playerScore gives each colour its share of every result", () => {
    expect(playerScore("1-0", "white")).toBe("1");
    expect(playerScore("1-0", "black")).toBe("0");
    expect(playerScore("0-1", "white")).toBe("0");
    expect(playerScore("0-1", "black")).toBe("1");
    expect(playerScore("1/2-1/2", "white")).toBe("½");
    expect(playerScore(null, "black")).toBe("—");
  });

  it("resultReasonLabel passes an unknown reason through", () => {
    expect(resultReasonLabel("resign")).toBe("Resignation");
    expect(resultReasonLabel("some-new-reason")).toBe("some-new-reason");
    expect(resultReasonLabel(null)).toBe("—");
  });

  it("resultSummary words a white win by resignation, a black win by checkmate, a draw and no result", () => {
    expect(resultSummary("1-0", "resign", "Ethan P.", "Mia K.")).toBe("Ethan P. won by resignation");
    expect(resultSummary("0-1", "checkmate", "Ethan P.", "Mia K.")).toBe("Mia K. won by checkmate");
    expect(resultSummary("1/2-1/2", "draw-agreed", "Ethan P.", "Mia K.")).toBe("Draw agreed");
    expect(resultSummary("1/2-1/2", null, "Ethan P.", "Mia K.")).toBe("Draw");
    expect(resultSummary("1-0", null, "Ethan P.", "Mia K.")).toBe("Ethan P. won");
    expect(resultSummary(null, null, "Ethan P.", "Mia K.")).toBe("Game over");
  });
});

describe("label maps", () => {
  it("formatLabel, statusLabel, tiebreakLabel", () => {
    expect(formatLabel("league")).toBe("League");
    expect(formatLabel("tournament")).toBe("Tournament");
    expect(statusLabel("in_progress")).toBe("In Progress");
    expect(statusLabel("completed")).toBe("Completed");
    expect(tiebreakLabel("sb")).toBe("Sonneborn-Berger");
    expect(tiebreakLabel("name")).toBe("Name");
  });
});
