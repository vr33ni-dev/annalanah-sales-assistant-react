export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Date(iso.split("T")[0]).toLocaleDateString("de-DE");
}
