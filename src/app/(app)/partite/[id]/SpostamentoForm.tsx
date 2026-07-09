"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { spostaCapi, type FormResult } from "@/app/actions/partite";
import { toDateInputValue } from "@/lib/format";

type BoxOpt = { id: string; numero: number; stalla: string; corrente: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Spostamento…" : "Sposta capi"}
    </button>
  );
}

export default function SpostamentoForm({
  partitaId,
  boxesConCapi,
  tuttiBox,
}: {
  partitaId: string;
  boxesConCapi: BoxOpt[]; // box con giacenza > 0 per questa partita
  tuttiBox: BoxOpt[];
}) {
  const [state, formAction] = useActionState<FormResult, FormData>(spostaCapi, {});

  if (boxesConCapi.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Distribuisci prima dei capi nei box per poterli spostare.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="partitaId" value={partitaId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="boxDaId">
            Da box *
          </label>
          <select id="boxDaId" name="boxDaId" required className="input" defaultValue="">
            <option value="">— Seleziona —</option>
            {boxesConCapi.map((b) => (
              <option key={b.id} value={b.id}>
                Box {b.numero} ({b.stalla}) · {b.corrente} capi
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="boxAId">
            A box *
          </label>
          <select id="boxAId" name="boxAId" required className="input" defaultValue="">
            <option value="">— Seleziona —</option>
            {tuttiBox.map((b) => (
              <option key={b.id} value={b.id}>
                Box {b.numero} ({b.stalla})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sp-quantita">
            Numero di capi *
          </label>
          <input id="sp-quantita" name="quantita" type="number" min={1} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sp-data">
            Data *
          </label>
          <input
            id="sp-data"
            name="data"
            type="date"
            required
            className="input"
            defaultValue={toDateInputValue(new Date())}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="sp-note">
          Note
        </label>
        <input id="sp-note" name="note" className="input" />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
