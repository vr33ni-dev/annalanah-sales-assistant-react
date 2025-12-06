// is for displaying dates to the user:
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Date(iso.split("T")[0]).toLocaleDateString("de-DE");
}

// is for converting ISO date strings to "YYYY-MM-DD" format for date inputs
export function toDateOnly(iso) {
  return iso ? iso.split("T")[0] : "";
}
