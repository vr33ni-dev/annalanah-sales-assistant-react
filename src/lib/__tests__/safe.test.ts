import { describe, it, expect } from "vitest";
import { asArray } from "../safe";

describe("asArray", () => {
  it("returns an array unchanged", () => {
    const input = [1, 2, 3];
    expect(asArray<number>(input)).toEqual([1, 2, 3]);
  });

  it("returns an empty array for an empty array input", () => {
    expect(asArray<string>([])).toEqual([]);
  });

  it("returns an empty array for null", () => {
    expect(asArray<string>(null)).toEqual([]);
  });

  it("returns an empty array for undefined", () => {
    expect(asArray<string>(undefined)).toEqual([]);
  });

  it("returns an empty array for a string value", () => {
    expect(asArray<string>("hello")).toEqual([]);
  });

  it("returns an empty array for a number value", () => {
    expect(asArray<number>(42)).toEqual([]);
  });

  it("returns an empty array for a plain object", () => {
    expect(asArray<unknown>({ a: 1 })).toEqual([]);
  });

  it("returns array of objects unchanged", () => {
    const input = [{ id: 1 }, { id: 2 }];
    expect(asArray<{ id: number }>(input)).toEqual(input);
  });

  it("preserves reference equality for arrays", () => {
    const input = [1, 2, 3];
    expect(asArray<number>(input)).toBe(input);
  });
});
