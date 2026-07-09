"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createDdtSuini, type FormResult } from "@/app/actions/partite";
import { toDateInputValue } from "@/lib/format";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvataggio…" : "Registra DDT"}
    </button>
  );
}

export default function DdtSuiniForm({ partitaId }: { partitaId: string }) {
  const [state, formAction] = useActionState<FormResult, FormData>(createDdtSuini, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="partitaId" value={partitaId} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="ddt-numero">
            Numero DDT *
          </label>
          <input id="ddt-numero" name="numero" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ddt-data">
            Data DDT *
          </label>
          <input
            id="ddt-data"
            name="data"
            type="date"
            required
            className="input"
            defaultValue={toDateInputValue(new Date())}
          />
        </div>
        <div>
          <label className="label" htmlFor="ddt-quantita">
            Suini nel DDT *
          </label>
          <input id="ddt-quantita" name="quantita" type="number" min={1} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ddt-pesoKg">
            Peso complessivo (kg)
          </label>
          <input id="ddt-pesoKg" name="pesoKg" type="number" step="0.1" min={0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ddt-m4n">
            Modello 4 — numero
          </label>
          <input id="ddt-m4n" name="modello4Numero" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ddt-m4d">
            Modello 4 — data
          </label>
          <input id="ddt-m4d" name="modello4Data" type="date" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ddt-atn">
            AT — numero
          </label>
          <input id="ddt-atn" name="atNumero" className="input" />
          <p className="mt-1 text-xs text-slate-500">Attestato di Trasferimento (RIFT)</p>
        </div>
        <div>
          <label className="label" htmlFor="ddt-atd">
            AT — data
          </label>
          <input id="ddt-atd" name="atData" type="date" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ddt-note">
          Note
        </label>
        <input id="ddt-note" name="note" className="input" />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ DDT registrato — totali partita aggiornati
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
