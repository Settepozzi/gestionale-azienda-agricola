"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createAttivazione, type FormResult } from "@/app/actions/torcia";

type CausaOpt = { id: string; nome: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvataggio…" : "🔥 Registra attivazione"}
    </button>
  );
}

// datetime-local vuole "YYYY-MM-DDTHH:mm" in ora locale
function adessoLocale(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AttivazioneForm({ cause }: { cause: CausaOpt[] }) {
  const [state, formAction] = useActionState<FormResult, FormData>(createAttivazione, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="t-inizio">
            Inizio (data e ora) *
          </label>
          <input
            id="t-inizio"
            name="inizio"
            type="datetime-local"
            required
            className="input"
            defaultValue={adessoLocale()}
          />
        </div>
        <div>
          <label className="label" htmlFor="t-fine">
            Fine (data e ora)
          </label>
          <input id="t-fine" name="fine" type="datetime-local" className="input" />
          <p className="mt-1 text-xs text-slate-500">Vuota = torcia ancora accesa.</p>
        </div>
        <div>
          <label className="label" htmlFor="t-causa">
            Causa accensione
          </label>
          <select id="t-causa" name="causaId" className="input" defaultValue="">
            <option value="">— Seleziona —</option>
            {cause.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="t-note">
            Note
          </label>
          <input id="t-note" name="note" className="input" />
        </div>
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ Attivazione registrata
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
