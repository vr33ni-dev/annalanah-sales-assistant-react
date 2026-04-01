import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "../usePagination";

describe("usePagination", () => {
  it("starts on page 1", () => {
    const { result } = renderHook(() => usePagination([1, 2, 3, 4, 5]));
    expect(result.current.page).toBe(1);
  });

  it("calculates totalPages correctly", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination(items, 10));
    expect(result.current.totalPages).toBe(3);
  });

  it("returns totalPages of 1 for an empty array", () => {
    const { result } = renderHook(() => usePagination([], 10));
    expect(result.current.totalPages).toBe(1);
  });

  it("returns totalPages of 1 when items fit in a single page", () => {
    const { result } = renderHook(() => usePagination([1, 2, 3], 10));
    expect(result.current.totalPages).toBe(1);
  });

  it("slices items for the current page", () => {
    const items = [10, 20, 30, 40, 50];
    const { result } = renderHook(() => usePagination(items, 2));
    expect(result.current.paginatedItems).toEqual([10, 20]);
  });

  it("slices items for page 2", () => {
    const items = [10, 20, 30, 40, 50];
    const { result } = renderHook(() => usePagination(items, 2));
    act(() => result.current.setPage(2));
    expect(result.current.paginatedItems).toEqual([30, 40]);
  });

  it("returns the last partial page correctly", () => {
    const items = [1, 2, 3, 4, 5];
    const { result } = renderHook(() => usePagination(items, 2));
    act(() => result.current.setPage(3));
    expect(result.current.paginatedItems).toEqual([5]);
  });

  it("clamps page to totalPages when page exceeds total", () => {
    const items = [1, 2, 3];
    const { result } = renderHook(() => usePagination(items, 10));
    act(() => result.current.setPage(99));
    expect(result.current.page).toBe(1);
  });

  it("exposes totalItems count", () => {
    const items = [1, 2, 3, 4, 5];
    const { result } = renderHook(() => usePagination(items));
    expect(result.current.totalItems).toBe(5);
  });

  it("uses default page size of 10", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination(items));
    expect(result.current.paginatedItems).toHaveLength(10);
    expect(result.current.totalPages).toBe(3);
  });

  it("returns all items on page 1 when count is exactly pageSize", () => {
    const items = [1, 2, 3, 4, 5];
    const { result } = renderHook(() => usePagination(items, 5));
    expect(result.current.paginatedItems).toEqual([1, 2, 3, 4, 5]);
    expect(result.current.totalPages).toBe(1);
  });

  it("page stays valid after items array shrinks", () => {
    let items = Array.from({ length: 30 }, (_, i) => i);
    const { result, rerender } = renderHook(
      ({ list }) => usePagination(list, 10),
      { initialProps: { list: items } }
    );
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    // Shrink to 5 items (only 1 page)
    items = [1, 2, 3, 4, 5];
    rerender({ list: items });
    expect(result.current.page).toBe(1);
  });
});
