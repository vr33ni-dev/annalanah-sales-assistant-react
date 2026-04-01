import { describe, it, expect } from "vitest";
import { isFetchError } from "../apiError";
import type { FetchError } from "../apiError";

describe("isFetchError", () => {
  it("returns true for a valid FetchError shape", () => {
    const err: FetchError = {
      response: { status: 404, data: { error: "not_found" } },
    };
    expect(isFetchError(err)).toBe(true);
  });

  it("returns true when response.data is null", () => {
    const err = { response: { status: 500, data: null } };
    expect(isFetchError(err)).toBe(true);
  });

  it("returns true when response is an empty object", () => {
    const err = { response: {} };
    expect(isFetchError(err)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isFetchError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isFetchError(undefined)).toBe(false);
  });

  it("returns false for a plain Error instance", () => {
    expect(isFetchError(new Error("oops"))).toBe(false);
  });

  it("returns false when response key is missing", () => {
    const err = { message: "network error" };
    expect(isFetchError(err)).toBe(false);
  });

  it("returns false when response is not an object", () => {
    const err = { response: "string-value" };
    expect(isFetchError(err)).toBe(false);
  });

  it("returns false when response is a number", () => {
    const err = { response: 42 };
    expect(isFetchError(err)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isFetchError(42)).toBe(false);
    expect(isFetchError("error")).toBe(false);
    expect(isFetchError(true)).toBe(false);
  });
});
