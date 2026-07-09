"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { applicaRampeOggi, type FormResult } from "@/app/actions/rampe";

function Inner() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Applicazione…" : "⚡ Applica rampe di oggi"}
    </button>
  );
}

export default function ApplicaRampeButton() {
  const [state, formAction] = useActionState<FormResult, FormData>(applicaRampeOggi, {});
  return (
    <form action={formAction} className="flex items-center gap-3">
      <Inner />
      {state.ok && (
        <span className="text-sm text-green-700">
          ✓ {state.applicate ?? 0} razioni generate
        </span>
      )}
    </form>
  );
}
