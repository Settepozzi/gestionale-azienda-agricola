const COLORS: Record<string, string> = {
  // Lotti
  ATTIVO: "bg-green-100 text-green-800",
  CHIUSO: "bg-slate-200 text-slate-600",
  // Animali
  PRESENTE: "bg-green-100 text-green-800",
  VENDUTO: "bg-blue-100 text-blue-800",
  MORTO: "bg-red-100 text-red-800",
  // Specie
  SUINI: "bg-pink-100 text-pink-800",
  AVICOLI: "bg-amber-100 text-amber-800",
  ALTRO: "bg-slate-100 text-slate-700",
};

export default function StatusBadge({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const color = COLORS[value] ?? "bg-slate-100 text-slate-700";
  return <span className={`badge ${color}`}>{label ?? value}</span>;
}
