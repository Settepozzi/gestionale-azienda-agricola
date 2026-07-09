"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createConsumo, type FormResult } from "@/app/actions/mangime";
import { toDateInputValue } from "@/lib/format";

type Opt = { id: string; label: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvataggio…" : "Registra consumo"}
    </button>
  );
}

export default function ConsumoForm({
  mangimi,
  linee,
  gruppi,
}: {
  mangimi: Opt[];
  linee: Opt[];
  gruppi: Opt[];
}) {
  const [state, formAction] = useActionState<FormResult, FormData>(createConsumo, {});

  return (
    <form action={formAction} className="card mb-6 space-y-4 p-5">
      <h3 className="font-semibold text-slate-800">Consumo giornaliero (per Linea + Gruppo)</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label" htmlFor="data">
            Data *
          </label>
          <input
            id="data"
            name="data"
            type="date"
            required
            className="input"
            defaultValue={toDateInputValue(new Date())}
          />
        </div>
        <div>
          <label className="label" htmlFor="mangimeId">
            Mangime *
          </label>
          <select id="mangimeId" name="mangimeId" required className="input" defaultValue="">
            <option value="">—</option>
            {mangimi.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lineaId">
            Linea *
          </label>
          <select id="lineaId" name="lineaId" required className="input" defaultValue="">
            <option value="">—</option>
            {linee.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="gruppoId">
            Gruppo *
          </label>
          <select id="gruppoId" name="gruppoId" required className="input" defaultValue="">
            <option value="">—</option>
            {gruppi.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="quantitaKg">
            Quantità (kg) *
          </label>
          <input id="quantitaKg" name="quantitaKg" type="number" step="0.1" min={0} required className="input" />
        </div>
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
