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
