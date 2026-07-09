// Helper di formattazione per date e numeri (formato italiano).

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function toDateInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  // yyyy-mm-dd per gli input type="date"
  return date.toISOString().slice(0, 10);
}

export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatKg(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${formatNumber(n, n % 1 === 0 ? 0 : 1)} kg`;
}

export function formatEuro(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
