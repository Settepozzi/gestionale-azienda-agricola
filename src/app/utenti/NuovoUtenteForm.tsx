"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { creaUtente, type FormResult } from "@/app/actions/utenti";
import { USER_ROLES, USER_ROLE_LABELS } from "@/lib/constants";
import { SEZIONI } from "@/lib/sezioni";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Creazione…" : "+ Crea utente"}
    </button>
  );
}

export default function NuovoUtenteForm() {
  const [state, formAction] = useActionState<FormResult, FormData>(creaUtente, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="nu-email">
            Email *
          </label>
          <input id="nu-email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="nu-nome">
            Nome *
          </label>
          <input id="nu-nome" name="nome" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="nu-password">
            Password *
          </label>
          <input id="nu-password" name="password" type="text" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="nu-role">
            Ruolo *
          </label>
          <select id="nu-role" name="role" className="input" defaultValue="OPERATORE">
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {USER_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <div className="label">Sezioni abilitate</div>
        <div className="flex flex-wrap gap-3">
          {SEZIONI.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                name="sezioni"
                value={s.id}
                defaultChecked={s.id === "SUINI"}
                className="h-4 w-4"
              />
              {s.icona} {s.nome}
            </label>
          ))}
        </div>
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">✓ Utente creato</p>
      )}
      <SubmitButton />
    </form>
  );
}
