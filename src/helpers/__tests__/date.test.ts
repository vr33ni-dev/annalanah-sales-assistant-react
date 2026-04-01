import { describe, it, expect } from "vitest";
import {
  formatDateOnly,
  toDateOnly,
  toYmdLocal,
  extractYmd,
  formatYmdToLocale,
  formatMonthLabel,
  parseIsoToLocal,
} from "../date";

describe("formatDateOnly", () => {
  it("returns '–' for null", () => {
    expect(formatDateOnly(null)).toBe("–");
  });

  it("returns '–' for undefined", () => {
    expect(formatDateOnly(undefined)).toBe("–");
  });

  it("returns '–' for empty string", () => {
    expect(formatDateOnly("")).toBe("–");
  });

  it("formats YYYY-MM-DD as German locale date", () => {
    // 2025-01-15 should produce 15.1.2025 in de-DE
    const result = formatDateOnly("2025-01-15");
    expect(result).toBe("15.1.2025");
  });

  it("formats ISO datetime string using only the date part", () => {
    const result = formatDateOnly("2025-06-20T10:30:00Z");
    expect(result).toBe("20.6.2025");
  });

  it("returns '–' for malformed date string", () => {
    expect(formatDateOnly("not-a-date")).toBe("–");
  });

  it("returns '–' for partially valid string missing day", () => {
    expect(formatDateOnly("2025-01")).toBe("–");
  });
});

describe("toDateOnly", () => {
  it("extracts date part from ISO string", () => {
    expect(toDateOnly("2025-03-10T08:00:00Z")).toBe("2025-03-10");
  });

  it("returns the input unchanged if there is no T separator", () => {
    expect(toDateOnly("2025-03-10")).toBe("2025-03-10");
  });

  it("returns empty string for null", () => {
    expect(toDateOnly(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(toDateOnly(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(toDateOnly("")).toBe("");
  });
});

describe("toYmdLocal", () => {
  it("formats a Date object as YYYY-MM-DD", () => {
    expect(toYmdLocal(new Date(2025, 0, 5))).toBe("2025-01-05");
  });

  it("zero-pads month and day", () => {
    expect(toYmdLocal(new Date(2025, 8, 9))).toBe("2025-09-09");
  });

  it("handles December correctly", () => {
    expect(toYmdLocal(new Date(2024, 11, 31))).toBe("2024-12-31");
  });

  it("handles January 1st correctly", () => {
    expect(toYmdLocal(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("extractYmd", () => {
  it("returns null for null", () => {
    expect(extractYmd(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(extractYmd(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractYmd("")).toBeNull();
  });

  it("extracts YYYY-MM-DD from plain date string", () => {
    expect(extractYmd("2025-07-04")).toBe("2025-07-04");
  });

  it("extracts YYYY-MM-DD from ISO datetime string", () => {
    expect(extractYmd("2025-07-04T12:00:00Z")).toBe("2025-07-04");
  });

  it("returns null for a non-date string", () => {
    expect(extractYmd("hello world")).toBeNull();
  });

  it("returns null for a date with wrong separator", () => {
    expect(extractYmd("2025/07/04")).toBeNull();
  });
});

describe("formatYmdToLocale", () => {
  it("returns '–' for null", () => {
    expect(formatYmdToLocale(null)).toBe("–");
  });

  it("returns '–' for undefined", () => {
    expect(formatYmdToLocale(undefined)).toBe("–");
  });

  it("returns '–' for empty string", () => {
    expect(formatYmdToLocale("")).toBe("–");
  });

  it("formats YYYY-MM-DD as German locale date", () => {
    expect(formatYmdToLocale("2025-03-20")).toBe("20.3.2025");
  });

  it("returns '–' for malformed YYYY-MM-DD", () => {
    expect(formatYmdToLocale("abc-de-fg")).toBe("–");
  });
});

describe("formatMonthLabel", () => {
  it("formats YYYY-MM string to short month + year in de-DE", () => {
    const result = formatMonthLabel("2025-01");
    // German: "Jan. 2025" or "Jan 2025" depending on ICU data
    expect(result).toMatch(/jan/i);
    expect(result).toContain("2025");
  });

  it("formats July in de-DE locale", () => {
    const result = formatMonthLabel("2025-07");
    expect(result).toMatch(/jul/i);
    expect(result).toContain("2025");
  });

  it("accepts a custom locale", () => {
    const result = formatMonthLabel("2025-03", "en-US");
    expect(result).toMatch(/mar/i);
    expect(result).toContain("2025");
  });

  it("defaults to de-DE locale", () => {
    const result = formatMonthLabel("2025-12");
    expect(result).toMatch(/dez|dec/i);
    expect(result).toContain("2025");
  });
});

describe("parseIsoToLocal", () => {
  it("returns null for null", () => {
    expect(parseIsoToLocal(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseIsoToLocal(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseIsoToLocal("")).toBeNull();
  });

  it("parses YYYY-MM-DD to a local Date", () => {
    const result = parseIsoToLocal("2025-06-15");
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getMonth()).toBe(5); // 0-indexed
    expect(result!.getDate()).toBe(15);
  });

  it("parses ISO datetime string using only the date part", () => {
    const result = parseIsoToLocal("2025-12-31T23:59:59Z");
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getMonth()).toBe(11);
    expect(result!.getDate()).toBe(31);
  });

  it("returns null for non-date string", () => {
    expect(parseIsoToLocal("not-a-date")).toBeNull();
  });
});
