"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { spostamentoRapido, type FormResult } from "@/app/actions/operatore";

type BoxOpt = { id: string; label: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full py-4 text-lg" disabled={pending}>
      {pending ? "…" : "🔁 Sposta"}
    </button>
  );
}

export default function SpostamentoRapido({
  boxesDa,
  boxes,
}: {
  boxesDa: BoxOpt[];
  boxes: BoxOpt[];
}) {
  const [state, formAction] = useActionState<FormResult, FormData>(spostamentoRapido, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <div className="mb-1 text-sm font-medium text-slate-500">Da box</div>
        <select name="boxDaId" required className="input py-3 text-lg" defaultValue="">
          <option value="">— Da —</option>
          {boxesDa.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className="mb-1 text-sm font-medium text-slate-500">A box</div>
        <select name="boxAId" required className="input py-3 text-lg" defaultValue="">
          <option value="">— A —</option>
          {boxes.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      <input
        name="quantita"
        type="number"
        inputMode="numeric"
        min={1}
        required
        placeholder="Quanti?"
        className="input py-3 text-center text-2xl"
      />
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-center text-sm text-green-700">✓ Spostato</p>
      )}
      <SubmitButton />
    </form>
  );
}
