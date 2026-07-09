"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registraDdt, type FormResult } from "@/app/actions/ordini";
import { toDateInputValue } from "@/lib/format";
import RigheEditor, { type MangimeOpt, type RigaInit } from "../RigheEditor";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Registrazione…" : "Registra DDT"}
    </button>
  );
}

export default function DdtForm({
  ordineId,
  mangimi,
  righeOrdine,
}: {
  ordineId: string;
  mangimi: MangimeOpt[];
  righeOrdine: RigaInit[];
}) {
  const [state, formAction] = useActionState<FormResult, FormData>(registraDdt, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ordineId" value={ordineId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="numero">
            Numero DDT *
          </label>
          <input id="numero" name="numero" required className="input" placeholder="es. DDT-1234" />
        </div>
        <div>
          <label className="label" htmlFor="data">
            Data DDT *
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
      </div>
      <div>
        <label className="label">Quantità ricevute (kg) e lotto</label>
        <RigheEditor mangimi={mangimi} conLotto initial={righeOrdine} />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
