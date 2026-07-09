"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { impostaGiacenza, type FormResult } from "@/app/actions/partite";

export type BoxOpt = {
  id: string;
  numero: number;
  stalla: string;
  corrente: number; // capi di questa partita attualmente nel box
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "…" : "Imposta"}
    </button>
  );
}

export default function GiacenzaEditor({
  partitaId,
  boxes,
}: {
  partitaId: string;
  boxes: BoxOpt[];
}) {
  const [state, formAction] = useActionState<FormResult, FormData>(impostaGiacenza, {});
  const [boxId, setBoxId] = useState("");
  const [quantita, setQuantita] = useState("");

  const onBoxChange = (id: string) => {
    setBoxId(id);
    const b = boxes.find((x) => x.id === id);
    setQuantita(b && b.corrente > 0 ? String(b.corrente) : "");
  };

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="partitaId" value={partitaId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="boxId">
            Box
          </label>
          <select
            id="boxId"
            name="boxId"
            required
            className="input"
            value={boxId}
            onChange={(e) => onBoxChange(e.target.value)}
          >
            <option value="">— Seleziona un box —</option>
            {boxes.map((b) => (
              <option key={b.id} value={b.id}>
                Box {b.numero} ({b.stalla}){b.corrente > 0 ? ` · ${b.corrente} capi` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="quantita">
            Capi nel box
          </label>
          <input
            id="quantita"
            name="quantita"
            type="number"
            min={0}
            className="input"
            value={quantita}
            onChange={(e) => setQuantita(e.target.value)}
            placeholder="0"
          />
        </div>
        <SubmitButton />
      </div>
      <p className="text-xs text-slate-500">
        Imposta il numero <b>esatto</b> di capi di questa partita presenti nel box (0 per svuotarlo).
      </p>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
    </form>
  );
}
