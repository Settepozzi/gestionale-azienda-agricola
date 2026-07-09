"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createMortalita, type FormResult } from "@/app/actions/mortalita";
import { toDateInputValue } from "@/lib/format";

type GiacenzaOpt = { value: string; label: string };
type CausaleOpt = { id: string; nome: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Registrazione…" : "Registra mortalità"}
    </button>
  );
}

export default function MortalitaForm({
  giacenze,
  causali,
}: {
  giacenze: GiacenzaOpt[];
  causali: CausaleOpt[];
}) {
  const [state, formAction] = useActionState<FormResult, FormData>(createMortalita, {});

  if (giacenze.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-500">
        Non ci sono capi in stalla. Distribuisci prima i capi di una partita nei box.
      </div>
    );
  }

  return (
    <form action={formAction} className="card mb-6 space-y-4 p-5">
      <h3 className="font-semibold text-slate-800">Registra mortalità</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="lg:col-span-2">
          <label className="label" htmlFor="target">
            Box (partita) *
          </label>
          <select id="target" name="target" required className="input" defaultValue="">
            <option value="">— Seleziona —</option>
            {giacenze.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="quantita">
            N° capi deceduti *
          </label>
          <input id="quantita" name="quantita" type="number" min={1} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="causaleId">
            Causale
          </label>
          <select id="causaleId" name="causaleId" className="input" defaultValue="">
            <option value="">— Non specificata —</option>
            {causali.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pesoKg">
            Peso medio (kg)
          </label>
          <input id="pesoKg" name="pesoKg" type="number" step="0.1" min={0} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="note">
          Note
        </label>
        <input id="note" name="note" className="input" />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
