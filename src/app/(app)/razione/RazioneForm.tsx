"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setRazione, type FormResult } from "@/app/actions/razione";
import { toDateInputValue } from "@/lib/format";

type Opt = { id: string; label: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvataggio…" : "Salva razione"}
    </button>
  );
}

export default function RazioneForm({
  boxes,
  linee,
  gruppi,
}: {
  boxes: Opt[];
  linee: Opt[];
  gruppi: Opt[];
}) {
  const [state, formAction] = useActionState<FormResult, FormData>(setRazione, {});
  const [livello, setLivello] = useState<"BOX" | "LINEA_GRUPPO">("LINEA_GRUPPO");

  return (
    <form action={formAction} className="card mb-6 space-y-4 p-5">
      <input type="hidden" name="livello" value={livello} />
      <div className="flex gap-2">
        {(["LINEA_GRUPPO", "BOX"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLivello(l)}
            className={`btn ${livello === l ? "bg-brand-600 text-white" : "btn-secondary"}`}
          >
            {l === "LINEA_GRUPPO" ? "Linea + Gruppo" : "Singolo box"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {livello === "BOX" ? (
          <div className="sm:col-span-2">
            <label className="label" htmlFor="boxId">
              Box *
            </label>
            <select id="boxId" name="boxId" className="input" defaultValue="">
              <option value="">— Seleziona —</option>
              {boxes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="lineaId">
                Linea *
              </label>
              <select id="lineaId" name="lineaId" className="input" defaultValue="">
                <option value="">—</option>
                {linee.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="gruppoId">
                Gruppo *
              </label>
              <select id="gruppoId" name="gruppoId" className="input" defaultValue="">
                <option value="">—</option>
                {gruppi.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="label" htmlFor="percentuale">
            Razione (%) *
          </label>
          <input
            id="percentuale"
            name="percentuale"
            type="number"
            min={0}
            max={300}
            required
            defaultValue={100}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="data">
            Giorno *
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

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">✓ Razione salvata</p>
      )}
      <SubmitButton />
    </form>
  );
}
