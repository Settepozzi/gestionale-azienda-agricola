"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormResult } from "@/app/actions/partite";
import { toDateInputValue } from "@/lib/format";
import { codiceLotto, venditaMeseDaLettera, LETTERE_DOP } from "@/lib/lotto";

type PartitaData = {
  codice: string;
  dataArrivo: Date | string;
  numeroCapiArrivati: number;
  pesoMedioArrivoKg: number | null;
  pesoTotaleArrivoKg: number | null;
  giorniCiclo: number | null;
  pesoMedioManualeKg: number | null;
  mangimeTotaleKg: number | null;
  fornitore: string | null;
  genetica: string | null;
  tatuaggio: string | null;
  lettera: string | null;
  venditaMese: string | null;
  note: string | null;
};

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvataggio…" : isEdit ? "Salva modifiche" : "Crea partita"}
    </button>
  );
}

export default function PartitaForm({
  action,
  initial,
}: {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  initial?: PartitaData;
}) {
  const [state, formAction] = useActionState<FormResult, FormData>(action, {});
  const isEdit = !!initial;

  const [dataArrivo, setDataArrivo] = useState(
    toDateInputValue(initial?.dataArrivo ?? new Date())
  );
  const [codice, setCodice] = useState(
    initial?.codice ?? codiceLotto(new Date())
  );
  const [lettera, setLettera] = useState(initial?.lettera ?? "");
  const [venditaMese, setVenditaMese] = useState(initial?.venditaMese ?? "");

  // Aggiorna codice lotto (YY.SS.PP) e mese vendita quando cambiano data/lettera.
  function onDataChange(v: string) {
    setDataArrivo(v);
    if (v) {
      const d = new Date(v);
      // rigenera solo se il codice è vuoto o ancora in formato automatico
      if (codice === "" || /^\d{2}\.\d{2}\.\d{2}$/.test(codice)) {
        setCodice(codiceLotto(d));
      }
      if (lettera) {
        const vm = venditaMeseDaLettera(lettera, d);
        if (vm) setVenditaMese(vm);
      }
    }
  }
  function onLetteraChange(v: string) {
    setLettera(v);
    if (v && dataArrivo) {
      const vm = venditaMeseDaLettera(v, new Date(dataArrivo));
      if (vm) setVenditaMese(vm);
    }
  }

  return (
    <form action={formAction} className="card max-w-3xl space-y-5 p-6">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label" htmlFor="dataArrivo">
            Data di arrivo *
          </label>
          <input
            id="dataArrivo"
            name="dataArrivo"
            type="date"
            required
            className="input"
            value={dataArrivo}
            onChange={(e) => onDataChange(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="codice">
            Lotto (YY.SS.PP) *
          </label>
          <input
            id="codice"
            name="codice"
            required
            className="input"
            value={codice}
            onChange={(e) => setCodice(e.target.value)}
            placeholder="es. 26.28.02"
          />
          <p className="mt-1 text-xs text-slate-500">
            Anno.Settimana.Semestre — generato dalla data, modificabile.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="fornitore">
            Fornitore
          </label>
          <input
            id="fornitore"
            name="fornitore"
            className="input"
            defaultValue={initial?.fornitore ?? ""}
            placeholder="es. Comazoo"
          />
        </div>
        <div>
          <label className="label" htmlFor="genetica">
            Genetica
          </label>
          <input
            id="genetica"
            name="genetica"
            className="input"
            defaultValue={initial?.genetica ?? ""}
            placeholder="es. Goland"
          />
        </div>
        <div>
          <label className="label" htmlFor="tatuaggio">
            Tatuaggio
          </label>
          <input
            id="tatuaggio"
            name="tatuaggio"
            className="input"
            defaultValue={initial?.tatuaggio ?? ""}
            placeholder="es. BS 123"
          />
        </div>
        <div>
          <label className="label" htmlFor="lettera">
            Lettera (mese di nascita)
          </label>
          <select
            id="lettera"
            name="lettera"
            className="input"
            value={lettera}
            onChange={(e) => onLetteraChange(e.target.value)}
          >
            <option value="">—</option>
            {LETTERE_DOP.map((l) => (
              <option key={l.lettera} value={l.lettera}>
                {l.lettera} — {l.nomeMese}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="venditaMese">
            Vendita (mese 9 mesi compiuti)
          </label>
          <input
            id="venditaMese"
            name="venditaMese"
            type="month"
            className="input"
            value={venditaMese}
            onChange={(e) => setVenditaMese(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Calcolato dalla lettera (Tab. 1 PDC Parma), modificabile.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="giorniCiclo">
            Giorni di accrescimento
          </label>
          <input
            id="giorniCiclo"
            name="giorniCiclo"
            type="number"
            min={1}
            className="input"
            defaultValue={initial?.giorniCiclo ?? ""}
            placeholder="es. 90"
          />
        </div>
        <div>
          <label className="label" htmlFor="pesoMedioManualeKg">
            Peso medio attuale (kg)
          </label>
          <input
            id="pesoMedioManualeKg"
            name="pesoMedioManualeKg"
            type="number"
            step="0.1"
            min={0}
            className="input"
            defaultValue={initial?.pesoMedioManualeKg ?? ""}
            placeholder="prevale sul teorico"
          />
        </div>
        <div>
          <label className="label" htmlFor="mangimeTotaleKg">
            Mangime totale fornito (kg)
          </label>
          <input
            id="mangimeTotaleKg"
            name="mangimeTotaleKg"
            type="number"
            step="0.1"
            min={0}
            className="input"
            defaultValue={initial?.mangimeTotaleKg ?? ""}
            placeholder="per il calcolo ICA"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 text-xs text-slate-500">
          Capi e pesi di arrivo: se registri i <b>DDT di carico</b> (dalla scheda della partita),
          questi valori vengono calcolati automaticamente dalla loro somma.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="numeroCapiArrivati">
              Capi arrivati
            </label>
            <input
              id="numeroCapiArrivati"
              name="numeroCapiArrivati"
              type="number"
              min={0}
              className="input"
              defaultValue={initial?.numeroCapiArrivati ?? 0}
            />
          </div>
          <div>
            <label className="label" htmlFor="pesoTotaleArrivoKg">
              Peso totale ricevuto (kg)
            </label>
            <input
              id="pesoTotaleArrivoKg"
              name="pesoTotaleArrivoKg"
              type="number"
              step="0.1"
              min={0}
              className="input"
              defaultValue={initial?.pesoTotaleArrivoKg ?? ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="pesoMedioArrivoKg">
              Peso medio all&apos;arrivo (kg)
            </label>
            <input
              id="pesoMedioArrivoKg"
              name="pesoMedioArrivoKg"
              type="number"
              step="0.1"
              min={0}
              className="input"
              defaultValue={initial?.pesoMedioArrivoKg ?? ""}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="note">
          Note
        </label>
        <textarea id="note" name="note" rows={2} className="input" defaultValue={initial?.note ?? ""} />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex gap-3">
        <SubmitButton isEdit={isEdit} />
        <Link href="/partite" className="btn-secondary">
          Annulla
        </Link>
      </div>
    </form>
  );
}
