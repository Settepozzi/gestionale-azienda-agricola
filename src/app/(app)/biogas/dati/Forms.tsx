"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  importaCsvPlc,
  salvaMeseBiogas,
  type FormResult,
} from "@/app/actions/biogas";

function Btn({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ImportCsvForm() {
  const [state, formAction] = useActionState<FormResult, FormData>(importaCsvPlc, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <input
        type="file"
        name="csv"
        accept=".csv,text/csv"
        multiple
        data-testid="biogas-csv"
        className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
      />
      <p className="text-xs text-slate-500">
        Seleziona i file <b>DB_kWh_Erogati*.csv</b> e <b>DB_kWh_Consumati*.csv</b> estratti dal PLC
        (anche tutti insieme). I giorni già presenti vengono aggiornati.
      </p>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ Import completato: {state.giorni} giorni aggiornati
        </p>
      )}
      <Btn label="📥 Importa CSV" pendingLabel="Import in corso…" />
    </form>
  );
}

export function MeseForm() {
  const [state, formAction] = useActionState<FormResult, FormData>(salvaMeseBiogas, {});
  const ref = useRef<HTMLFormElement>(null);
  const oggi = new Date();

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label" htmlFor="bm-anno">
            Anno *
          </label>
          <input
            id="bm-anno"
            name="anno"
            type="number"
            required
            defaultValue={oggi.getFullYear()}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="bm-mese">
            Mese *
          </label>
          <input
            id="bm-mese"
            name="mese"
            type="number"
            min={1}
            max={12}
            required
            defaultValue={oggi.getMonth() === 0 ? 12 : oggi.getMonth()}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="bm-prod">
            Prodotta (kWh) *
          </label>
          <input id="bm-prod" name="enProdKWh" type="number" step="1" min={0} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="bm-ced">
            Ceduta (kWh) *
          </label>
          <input id="bm-ced" name="enCedKWh" type="number" step="1" min={0} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="bm-prezzo">
            Prezzo (€/kWh)
          </label>
          <input
            id="bm-prezzo"
            name="prezzoEuroKWh"
            type="number"
            step="0.0001"
            min={0}
            className="input"
            placeholder="es. 0.2316"
          />
        </div>
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">✓ Mese salvato</p>
      )}
      <Btn label="Salva mese" pendingLabel="Salvataggio…" />
    </form>
  );
}
