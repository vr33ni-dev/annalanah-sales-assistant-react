// Field-level conflicts
export type FieldConflict<T = string> = {
  existing: T | null;
  incoming: T | null;
};

// Merge Conflicts
export type MergeConflicts = {
  name?: FieldConflict<string>;
  phone?: FieldConflict<string>;
  source?: FieldConflict<string>;
};
