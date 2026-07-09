"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createOrdine, type FormResult } from "@/app/actions/ordini";
import { toDateInputValue } from "@/lib/format";
import RigheEditor, { type MangimeOpt } from "./RigheEditor";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Creazione…" : "Crea ordine"}
    </button>
  );
}

export default function OrdineForm({ mangimi }: { mangimi: MangimeOpt[] }) {
  const [state, formAction] = useActionState<FormResult, FormData>(createOrdine, {});

  return (
    <form action={formAction} className="card max-w-2xl space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="numero">
            Numero ordine *
          </label>
          <input id="numero" name="numero" required className="input" placeholder="es. ORD-2026-01" />
        </div>
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
      </div>

      <div>
        <label className="label">Righe (mangime + quantità)</label>
        <RigheEditor mangimi={mangimi} />
      </div>

      <div>
        <label className="label" htmlFor="note">
          Note
        </label>
        <textarea id="note" name="note" rows={2} className="input" />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex gap-3">
        <SubmitButton />
        <Link href="/mangime/ordini" className="btn-secondary">
          Annulla
        </Link>
      </div>
    </form>
  );
}
