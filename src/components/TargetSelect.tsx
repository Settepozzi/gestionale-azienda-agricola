import type { TargetOption } from "@/lib/target";

// Selettore "destinatario": raggruppa lotti e animali in un unico menu.
export default function TargetSelect({
  options,
  defaultValue,
  required,
}: {
  options: TargetOption[];
  defaultValue?: string;
  required?: boolean;
}) {
  const lots = options.filter((o) => o.group === "Lotti");
  const animals = options.filter((o) => o.group === "Animali");

  return (
    <select
      id="target"
      name="target"
      className="input"
      defaultValue={defaultValue ?? ""}
      required={required}
    >
      <option value="">— Nessun collegamento —</option>
      {lots.length > 0 && (
        <optgroup label="Lotti">
          {lots.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      )}
      {animals.length > 0 && (
        <optgroup label="Animali">
          {animals.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
