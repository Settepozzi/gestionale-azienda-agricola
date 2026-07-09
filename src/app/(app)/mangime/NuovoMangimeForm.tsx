"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createMangime, type FormResult } from "@/app/actions/mangime";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      + Aggiungi mangime
    </button>
  );
}

export default function NuovoMangimeForm() {
  const [state, formAction] = useActionState<FormResult, FormData>(createMangime, {});
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
      <div>
        <label className="label" htmlFor="codice">
          Codice Comazoo
        </label>
        <input id="codice" name="codice" required className="input w-40" placeholder="es. M-101" />
      </div>
      <div className="flex-1">
        <label className="label" htmlFor="nome">
          Nome mangime
        </label>
        <input id="nome" name="nome" required className="input" placeholder="es. Svezzamento 1" />
      </div>
      <SubmitButton />
      {state.error && (
        <p className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
    </form>
  );
}
