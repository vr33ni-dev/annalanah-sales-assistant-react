import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("handles conditional objects", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe(
      "text-red-500"
    );
  });

  it("deduplicates Tailwind utility conflicts (tailwind-merge)", () => {
    // tailwind-merge keeps the last conflicting class
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("merges responsive variants correctly", () => {
    expect(cn("text-sm", "md:text-lg")).toBe("text-sm md:text-lg");
  });

  it("handles an empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles a single class", () => {
    expect(cn("only-class")).toBe("only-class");
  });

  it("handles arrays of class names", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles nested conditional objects", () => {
    expect(cn("base", { "extra-a": true, "extra-b": false }, "end")).toBe(
      "base extra-a end"
    );
  });
});
