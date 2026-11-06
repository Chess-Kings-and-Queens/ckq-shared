import {
  DEFAULT_TIMEZONE,
  formatDateOnly,
  formatDateTime,
  formatTimeInTZ,
  formatMonthYear,
  isDatePastUTC,
  formatDateOnlyET,
  toFormDateET,
  isDatePastET,
  stepDateStr,
  formatClockTime,
  toFormDateInTz,
  toFormDateUTC,
} from "../dates";

// ---------------------------------------------------------------------------
// DEFAULT_TIMEZONE
// ---------------------------------------------------------------------------

describe("DEFAULT_TIMEZONE", () => {
  it("is America/New_York", () => {
    expect(DEFAULT_TIMEZONE).toBe("America/New_York");
  });
});

// ---------------------------------------------------------------------------
// formatDateOnly
// ---------------------------------------------------------------------------

describe("formatDateOnly", () => {
  it("renders Dec 31 UTC midnight as December 31 — not Dec 30 (regression)", () => {
    // Previously: new Date("2026-12-31T00:00:00.000Z").toLocaleDateString("en-US", {...})
    // in EST (UTC-5) would show Dec 30 because UTC midnight is 7 PM Dec 30 local.
    expect(formatDateOnly("2026-12-31T00:00:00.000Z")).toBe("Dec 31, 2026");
  });

  it("renders April 3 UTC midnight as April 3 — not April 2", () => {
    expect(formatDateOnly("2026-04-03T00:00:00.000Z")).toBe("Apr 3, 2026");
  });

  it("renders Jan 1 correctly", () => {
    expect(formatDateOnly("2026-01-01T00:00:00.000Z")).toBe("Jan 1, 2026");
  });

  it("accepts a Date object", () => {
    expect(formatDateOnly(new Date("2026-06-15T00:00:00.000Z"))).toBe("Jun 15, 2026");
  });

  it("returns — for null", () => {
    expect(formatDateOnly(null)).toBe("—");
  });

  it("returns — for undefined", () => {
    expect(formatDateOnly(undefined)).toBe("—");
  });

  it("returns — for an invalid date string", () => {
    expect(formatDateOnly("not-a-date")).toBe("—");
  });

  it("merges custom opts correctly", () => {
    const result = formatDateOnly("2026-04-03T00:00:00.000Z", { weekday: "short" });
    expect(result).toContain("Apr 3, 2026");
  });
});

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------

describe("formatDateTime", () => {
  it("returns — for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });

  it("includes time component for a datetime string", () => {
    // 2026-04-03T14:00:00.000Z = 10:00 AM ET (UTC-4 in April)
    const result = formatDateTime("2026-04-03T14:00:00.000Z");
    expect(result).toContain("Apr 3, 2026");
    expect(result).toMatch(/10:00 AM/);
  });

  it("accepts an explicit timezone override", () => {
    // 2026-04-03T14:00:00.000Z = 7:00 AM PT (UTC-7 in April)
    const result = formatDateTime("2026-04-03T14:00:00.000Z", "America/Los_Angeles");
    expect(result).toContain("Apr 3, 2026");
    expect(result).toMatch(/7:00 AM/);
  });
});

// ---------------------------------------------------------------------------
// formatTimeInTZ
// ---------------------------------------------------------------------------

describe("formatTimeInTZ", () => {
  it("renders a midday UTC instant as its ET time-of-day, no date/no ET suffix", () => {
    // 2026-04-03T14:00:00.000Z = 10:00 AM ET (UTC-4 in April)
    const result = formatTimeInTZ("2026-04-03T14:00:00.000Z");
    expect(result).toBe("10:00 AM");
  });

  it("renders a boundary instant where the UTC and ET calendar days disagree", () => {
    // 2026-04-03T02:30:00.000Z = 10:30 PM ET Apr 2 (EDT, UTC-4) — the UTC date
    // is Apr 3, the ET date is Apr 2; only the time-of-day is asserted here.
    const result = formatTimeInTZ("2026-04-03T02:30:00.000Z");
    expect(result).toBe("10:30 PM");
  });

  it("accepts an explicit timezone override", () => {
    // 2026-04-03T14:00:00.000Z = 7:00 AM PT (UTC-7 in April)
    const result = formatTimeInTZ("2026-04-03T14:00:00.000Z", "America/Los_Angeles");
    expect(result).toBe("7:00 AM");
  });

  it("accepts a Date object", () => {
    expect(formatTimeInTZ(new Date("2026-04-03T14:00:00.000Z"))).toBe("10:00 AM");
  });

  it("returns — for null", () => {
    expect(formatTimeInTZ(null)).toBe("—");
  });

  it("returns — for undefined", () => {
    expect(formatTimeInTZ(undefined)).toBe("—");
  });

  it("returns — for an invalid date string", () => {
    expect(formatTimeInTZ("not-a-date")).toBe("—");
  });
});

// ---------------------------------------------------------------------------
// isDatePastUTC
// ---------------------------------------------------------------------------

describe("isDatePastUTC", () => {
  it("returns true for a date in the past", () => {
    expect(isDatePastUTC("2020-01-01T00:00:00.000Z")).toBe(true);
  });

  it("returns false for a date far in the future", () => {
    expect(isDatePastUTC("2099-12-31T00:00:00.000Z")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isDatePastUTC(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDatePastUTC(undefined)).toBe(false);
  });

  it("returns false for an invalid string", () => {
    expect(isDatePastUTC("not-a-date")).toBe(false);
  });

  it("compares against UTC midnight — not local midnight (Dec 31 regression)", () => {
    // Dec 31 2099 UTC midnight should always be in the future
    expect(isDatePastUTC("2099-12-31T00:00:00.000Z")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatMonthYear
// ---------------------------------------------------------------------------

describe("formatMonthYear", () => {
  it("returns 'April 2026' for a UTC midnight date in April", () => {
    expect(formatMonthYear("2026-04-03T00:00:00.000Z")).toBe("April 2026");
  });

  it("returns 'December 2026' for Dec 31 UTC midnight", () => {
    expect(formatMonthYear("2026-12-31T00:00:00.000Z")).toBe("December 2026");
  });

  it("returns empty string for null", () => {
    expect(formatMonthYear(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatMonthYear(undefined)).toBe("");
  });

  it("returns empty string for an invalid date string", () => {
    expect(formatMonthYear("not-a-date")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// formatDateOnlyET
// ---------------------------------------------------------------------------

describe("formatDateOnlyET", () => {
  it("renders Apr 3 midnight EDT (T04:00Z) as 'Apr 3, 2026'", () => {
    // startDate stored as ET midnight: Apr 3 00:00 EDT = Apr 3 T04:00Z
    expect(formatDateOnlyET("2026-04-03T04:00:00.000Z")).toBe("Apr 3, 2026");
  });

  it("renders Apr 3 23:59 EDT (T03:59Z next day) as 'Apr 3, 2026' — not Apr 4 (regression)", () => {
    // endDate stored as ET 23:59: Apr 3 23:59 EDT = Apr 4 T03:59Z
    // UTC slice(0,10) = "2026-04-04" — wrong. ET display must show Apr 3.
    expect(formatDateOnlyET("2026-04-04T03:59:00.000Z")).toBe("Apr 3, 2026");
  });

  it("renders Dec 31 midnight EST (T05:00Z) as 'Dec 31, 2026'", () => {
    expect(formatDateOnlyET("2026-12-31T05:00:00.000Z")).toBe("Dec 31, 2026");
  });

  it("accepts a Date object", () => {
    // May 25 midnight EDT = T04:00Z
    expect(formatDateOnlyET(new Date("2026-05-25T04:00:00.000Z"))).toBe("May 25, 2026");
  });

  it("returns '—' for null", () => {
    expect(formatDateOnlyET(null)).toBe("—");
  });

  it("returns '—' for undefined", () => {
    expect(formatDateOnlyET(undefined)).toBe("—");
  });

  it("returns '—' for an invalid date string", () => {
    expect(formatDateOnlyET("not-a-date")).toBe("—");
  });
});

// ---------------------------------------------------------------------------
// toFormDateET
// ---------------------------------------------------------------------------

describe("toFormDateET", () => {
  it("extracts '2026-04-03' from Apr 3 midnight EDT (T04:00Z)", () => {
    expect(toFormDateET("2026-04-03T04:00:00.000Z")).toBe("2026-04-03");
  });

  it("extracts '2026-04-03' from Apr 3 23:59 EDT (T03:59Z next day) — not '2026-04-04' (regression)", () => {
    // ET 23:59 endDate: Apr 3 23:59 EDT = Apr 4 T03:59Z UTC.
    // slice(0,10) gives "2026-04-04" — wrong for <input type="date"> pre-fill.
    expect(toFormDateET("2026-04-04T03:59:00.000Z")).toBe("2026-04-03");
  });

  it("extracts '2026-12-31' from Dec 31 midnight EST (T05:00Z)", () => {
    expect(toFormDateET("2026-12-31T05:00:00.000Z")).toBe("2026-12-31");
  });

  it("accepts a Date object", () => {
    expect(toFormDateET(new Date("2026-05-25T04:00:00.000Z"))).toBe("2026-05-25");
  });

  it("returns '' for null", () => {
    expect(toFormDateET(null)).toBe("");
  });

  it("returns '' for undefined", () => {
    expect(toFormDateET(undefined)).toBe("");
  });

  it("returns '' for an invalid date string", () => {
    expect(toFormDateET("not-a-date")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// isDatePastET
// ---------------------------------------------------------------------------

describe("isDatePastET", () => {
  it("returns true for an ET endDate clearly in the past", () => {
    // Jan 1 2020 midnight EST = T05:00Z
    expect(isDatePastET("2020-01-01T05:00:00.000Z")).toBe(true);
  });

  it("returns false for an ET endDate clearly in the future", () => {
    // Dec 31 2099 midnight EST = T05:00Z
    expect(isDatePastET("2099-12-31T05:00:00.000Z")).toBe(false);
  });

  it("returns false for Apr 3 23:59 ET next-century (T03:59Z Apr 4 UTC) — still future", () => {
    // Verify ET 23:59 endDate stored as next-UTC-day does not confuse the check
    expect(isDatePastET("2099-04-04T03:59:00.000Z")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isDatePastET(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDatePastET(undefined)).toBe(false);
  });

  it("returns false for an invalid string", () => {
    expect(isDatePastET("not-a-date")).toBe(false);
  });
});

describe("stepDateStr", () => {
  it("steps forward by 7 days, landing on the next Monday", () => {
    expect(stepDateStr("2026-08-17", 7)).toBe("2026-08-24");
  });

  it("steps backward by 7 days, landing on the prior Monday", () => {
    expect(stepDateStr("2026-08-17", -7)).toBe("2026-08-10");
  });

  it("rolls over a month boundary correctly", () => {
    expect(stepDateStr("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("rolls over a year boundary correctly", () => {
    expect(stepDateStr("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("is a no-op with delta 0", () => {
    expect(stepDateStr("2026-08-17", 0)).toBe("2026-08-17");
  });

  it("steps a Wednesday start by 7 days either way (weekday-agnostic)", () => {
    expect(stepDateStr("2026-10-28", -7)).toBe("2026-10-21");
    expect(stepDateStr("2026-10-28", 7)).toBe("2026-11-04");
  });
});

describe("formatClockTime", () => {
  it.each([
    ["17:00", "5:00 PM"],
    ["00:05", "12:05 AM"],
    ["12:00", "12:00 PM"],
    ["9:30", "9:30 AM"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatClockTime(input)).toBe(expected);
  });

  it.each([[null], [undefined], [""], ["25:00"], ["abc"]])("returns an em dash for %p", (input) => {
    expect(formatClockTime(input)).toBe("—");
  });
});

describe("toFormDateUTC", () => {
  it("extracts the UTC calendar date of a date-only (UTC-midnight) value", () => {
    expect(toFormDateUTC("2026-03-01T00:00:00Z")).toBe("2026-03-01");
  });

  it("accepts a Date object", () => {
    expect(toFormDateUTC(new Date("2026-12-31T00:00:00.000Z"))).toBe("2026-12-31");
  });

  it("disagrees with the ET helper by one day at 23:30 ET (the day-shift the UTC helper avoids)", () => {
    // 2026-04-03T03:30:00Z = 23:30 EDT on Apr 2.
    expect(toFormDateET("2026-04-03T03:30:00Z")).toBe("2026-04-02");
    expect(toFormDateUTC("2026-04-03T03:30:00Z")).toBe("2026-04-03");
  });

  it("returns '' for an invalid date string", () => {
    expect(toFormDateUTC("not-a-date")).toBe("");
  });
});

describe("toFormDateInTz", () => {
  it("projects the same instant onto a different calendar day per zone", () => {
    // 2026-04-03T05:00:00Z = 01:00 EDT Apr 3 = 22:00 PDT Apr 2.
    expect(toFormDateInTz("2026-04-03T05:00:00Z")).toBe("2026-04-03");
    expect(toFormDateInTz("2026-04-03T05:00:00Z", "America/Los_Angeles")).toBe("2026-04-02");
  });

  it("returns '' for null, undefined and an invalid string", () => {
    expect(toFormDateInTz(null)).toBe("");
    expect(toFormDateInTz(undefined)).toBe("");
    expect(toFormDateInTz("not-a-date")).toBe("");
  });
});
