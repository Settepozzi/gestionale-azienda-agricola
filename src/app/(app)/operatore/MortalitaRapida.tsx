"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { mortalitaRapida, type FormResult } from "@/app/actions/operatore";

type BoxOpt = { id: string; label: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full py-4 text-lg" disabled={pending}>
      {pending ? "…" : "☠️ Registra morte"}
    </button>
  );
}

export default function MortalitaRapida({ boxes }: { boxes: BoxOpt[] }) {
  const [state, formAction] = useActionState<FormResult, FormData>(mortalitaRapida, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <select name="boxId" required className="input py-3 text-lg" defaultValue="">
        <option value="">— Box —</option>
        {boxes.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
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
        <p className="rounded-lg bg-green-50 px-3 py-2 text-center text-sm text-green-700">✓ Salvato</p>
      )}
      <SubmitButton />
    </form>
  );
}
