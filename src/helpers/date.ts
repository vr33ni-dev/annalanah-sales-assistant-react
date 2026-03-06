// is for displaying dates to the user:
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "–";
  // Parse YYYY-MM-DD (ignore time and timezone) and construct a local Date
  const datePart = String(iso).split("T")[0];
  const [y, m, d] = datePart.split("-").map((v) => Number(v));
  if (!y || !m || !d) return "–";
  const local = new Date(y, m - 1, d);
  return local.toLocaleDateString("de-DE");
}

// is for converting ISO date strings to "YYYY-MM-DD" format for date inputs
export function toDateOnly(iso) {
  return iso ? iso.split("T")[0] : "";
}

export function toYmdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function extractYmd(input?: string | null): string | null {
  if (!input) return null;
  return String(input).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

export function formatYmdToLocale(ymd?: string | null): string {
  if (!ymd) return "–";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "–";
  return new Date(y, m - 1, d).toLocaleDateString("de-DE");
}

export function formatMonthLabel(ym: string, locale = "de-DE"): string {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

// Parse YYYY-MM-DD or full ISO string to a local Date (no timezone shift)
export function parseIsoToLocal(iso?: string | null): Date | null {
  const datePart = extractYmd(iso);
  if (!datePart) return null;
  const parts = datePart.split("-").map((v) => Number(v));
  if (parts.length < 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
