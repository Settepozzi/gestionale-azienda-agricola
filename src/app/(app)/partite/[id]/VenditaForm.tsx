"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createVendita, type FormResult } from "@/app/actions/partite";
import { toDateInputValue } from "@/lib/format";

export type BoxVenditaOpt = { boxId: string; numero: number; capi: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvataggio…" : "Registra vendita"}
    </button>
  );
}

let seq = 0;
const nextKey = () => `vb${seq++}`;

export default function VenditaForm({
  partitaId,
  boxes,
}: {
  partitaId: string;
  boxes: BoxVenditaOpt[];
}) {
  const [state, formAction] = useActionState<FormResult, FormData>(createVendita, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [righe, setRighe] = useState<{ key: string; boxId: string; qta: string }[]>([
    { key: nextKey(), boxId: "", qta: "" },
  ]);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setRighe([{ key: nextKey(), boxId: "", qta: "" }]);
    }
  }, [state]);

  const update = (key: string, patch: Partial<{ boxId: string; qta: string }>) =>
    setRighe((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const totale = righe.reduce((s, r) => s + (parseInt(r.qta, 10) || 0), 0);

  if (boxes.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nessun capo di questa partita nei box: non c&apos;è nulla da caricare.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="partitaId" value={partitaId} />

      {/* Da quali box è avvenuto il carico */}
      <div>
        <div className="label">Carico dai box *</div>
        <div className="space-y-2">
          {righe.map((r) => {
            const sel = boxes.find((b) => b.boxId === r.boxId);
            return (
              <div key={r.key} className="flex flex-wrap items-center gap-2">
                <select
                  name="vboxId"
                  value={r.boxId}
                  onChange={(e) => {
                    const boxId = e.target.value;
                    const b = boxes.find((x) => x.boxId === boxId);
                    update(r.key, { boxId, qta: b ? String(b.capi) : r.qta });
                  }}
                  className="input w-52"
                >
                  <option value="">— Box —</option>
                  {boxes.map((b) => (
                    <option key={b.boxId} value={b.boxId}>
                      Box {b.numero} ({b.capi} capi)
                    </option>
                  ))}
                </select>
                <input
                  name="vboxQta"
                  type="number"
                  min={1}
                  max={sel?.capi}
                  placeholder="capi"
                  value={r.qta}
                  onChange={(e) => update(r.key, { qta: e.target.value })}
                  className="input w-28"
                />
                <button
                  type="button"
                  onClick={() => setRighe((rs) => rs.filter((x) => x.key !== r.key))}
                  className="btn-secondary !px-3"
                  aria-label="Rimuovi riga"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setRighe((rs) => [...rs, { key: nextKey(), boxId: "", qta: "" }])}
            className="text-sm font-medium text-brand-600 hover:text-brand-800"
          >
            + Aggiungi box
          </button>
          <span className="text-sm text-slate-500">
            Totale capi: <b className="text-slate-800">{totale}</b>
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label" htmlFor="v-data">
            Data carico *
          </label>
          <input
            id="v-data"
            name="data"
            type="date"
            required
            className="input"
            defaultValue={toDateInputValue(new Date())}
          />
        </div>
        <div>
          <label className="label" htmlFor="v-pesoTotaleKg">
            Peso totale (kg)
          </label>
          <input id="v-pesoTotaleKg" name="pesoTotaleKg" type="number" step="0.1" min={0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="v-prezzo">
            Importo (€)
          </label>
          <input id="v-prezzo" name="prezzo" type="number" step="0.01" min={0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="v-macello">
            Macello / destinazione
          </label>
          <input id="v-macello" name="macello" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="v-ddtNumero">
            DDT consegna n°
          </label>
          <input id="v-ddtNumero" name="ddtNumero" className="input" />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="nonDop" className="h-4 w-4" />
        Vendita <b>NON DOP</b> (salta i controlli su età minima e sospensioni; i capi risultano
        distolti dalla DOP)
      </label>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ Vendita registrata — giacenze dei box aggiornate
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
