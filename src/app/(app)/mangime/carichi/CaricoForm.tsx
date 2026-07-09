"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createCarico, type FormResult } from "@/app/actions/mangime";
import { toDateInputValue } from "@/lib/format";

type MangimeOpt = { id: string; codice: string; nome: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvataggio…" : "Registra carico"}
    </button>
  );
}

export default function CaricoForm({ mangimi }: { mangimi: MangimeOpt[] }) {
  const [state, formAction] = useActionState<FormResult, FormData>(createCarico, {});

  return (
    <form action={formAction} className="card mb-6 space-y-4 p-5">
      <h3 className="font-semibold text-slate-800">Nuovo carico</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="mangimeId">
            Mangime *
          </label>
          <select id="mangimeId" name="mangimeId" required className="input" defaultValue="">
            <option value="">— Seleziona —</option>
            {mangimi.map((m) => (
              <option key={m.id} value={m.id}>
                {m.codice} · {m.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="numeroLotto">
            Numero lotto
          </label>
          <input id="numeroLotto" name="numeroLotto" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="quantitaKg">
            Quantità (kg) *
          </label>
          <input id="quantitaKg" name="quantitaKg" type="number" step="0.1" min={0} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="data">
            Data arrivo *
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
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="label" htmlFor="cartellino">
            Cartellino mangime (PDF o foto)
          </label>
          <input
            id="cartellino"
            name="cartellino"
            type="file"
            accept="application/pdf,image/*"
            data-testid="cartellino-file"
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-300"
          />
          <p className="mt-1 text-xs text-slate-500">
            Archiviato per 5 anni (obbligo PDC DOP). Verifica la dicitura &quot;Mangime idoneo ai
            fini della produzione DOP&quot;.
          </p>
        </div>
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
