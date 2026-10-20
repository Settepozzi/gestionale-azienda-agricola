"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAnalisiPiezometro, type FormResult } from "@/app/actions/piezometri";
import { toDateInputValue } from "@/lib/format";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvataggio…" : "Registra analisi"}
    </button>
  );
}

const CAMPI: { name: string; label: string; step?: string }[] = [
  { name: "livelloFreatimetricoM", label: "Livello falda (m, es. -4.94)", step: "0.01" },
  { name: "temperaturaC", label: "Temperatura (°C)", step: "0.1" },
  { name: "ph", label: "pH", step: "0.01" },
  { name: "conducibilita", label: "Conducibilità 20°C (µS/cm)", step: "1" },
  { name: "cod", label: "COD (mg/L O2)", step: "0.1" },
  { name: "azotoAmmoniacale", label: "Azoto ammoniacale (mg/L N)", step: "0.01" },
  { name: "nitriti", label: "Nitriti (mg/L NO2)", step: "0.01" },
  { name: "nitrati", label: "Nitrati (mg/L NO3)", step: "0.01" },
  { name: "fosforo", label: "Fosforo tot (mg/L P)", step: "0.01" },
  { name: "rame", label: "Rame (µg/L)", step: "0.1" },
  { name: "zinco", label: "Zinco (µg/L)", step: "0.1" },
];

export default function NuovaAnalisiPiezometroClient() {
  const [state, formAction] = useActionState<FormResult, FormData>(createAnalisiPiezometro, {});

  return (
    <form action={formAction} className="card max-w-3xl space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="pz-data">
            Data campionamento *
          </label>
          <input id="pz-data" name="data" type="date" required className="input" defaultValue={toDateInputValue(new Date())} />
        </div>
        <div>
          <label className="label" htmlFor="pz-punto">
            Piezometro *
          </label>
          <select id="pz-punto" name="punto" className="input" defaultValue="Nord">
            <option value="Nord">Nord</option>
            <option value="Sud">Sud</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pz-rapporto">
            Rapporto n°
          </label>
          <input id="pz-rapporto" name="rapportoNumero" className="input" placeholder="AF …" />
        </div>
        <div>
          <label className="label" htmlFor="pz-lab">
            Laboratorio
          </label>
          <input id="pz-lab" name="laboratorio" className="input" defaultValue="L.A.C. srl (Cremona)" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pz-aspetto">
            Aspetto
          </label>
          <input id="pz-aspetto" name="aspetto" className="input" placeholder="es. Limpido / Torbido con sedimento" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {CAMPI.map((c) => (
          <div key={c.name}>
            <label className="text-xs text-slate-500" htmlFor={`pz-${c.name}`}>
              {c.label}
            </label>
            <input id={`pz-${c.name}`} name={c.name} type="number" step={c.step ?? "0.01"} className="input" />
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Lascia vuoti i valori riportati come &quot;&lt; soglia&quot; dal laboratorio.
      </p>

      <div>
        <label className="label" htmlFor="pz-note">
          Note
        </label>
        <input id="pz-note" name="note" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="pz-pdf">
          Rapporto di prova PDF (archiviato col record)
        </label>
        <input
          id="pz-pdf"
          type="file"
          name="pdf"
          accept="application/pdf"
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div className="flex gap-3">
        <SubmitButton />
        <Link href="/biogas/piezometri" className="btn-secondary">
          Annulla
        </Link>
      </div>
    </form>
  );
}
