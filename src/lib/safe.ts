// src/lib/safe.ts
export const asArray = <T>(x: unknown): T[] =>
  Array.isArray(x) ? (x as T[]) : [];
