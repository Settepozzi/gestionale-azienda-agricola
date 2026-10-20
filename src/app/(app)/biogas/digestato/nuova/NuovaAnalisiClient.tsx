"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAnalisi, type FormResult } from "@/app/actions/analisi-digestato";
import type { AnalisiEstratta } from "@/lib/analisi-digestato-parser";
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
  { name: "ph", label: "pH", step: "0.01" },
  { name: "ce", label: "CE (mS/cm)", step: "0.01" },
  { name: "agv", label: "AGV / FOS (g HAceq/l)", step: "0.01" },
  { name: "tac", label: "TAC (g CaCO3/l)", step: "0.01" },
  { name: "fosTac", label: "FOS/TAC", step: "0.01" },
  { name: "nh4", label: "NH4-N (g/l)", step: "0.01" },
  { name: "ss", label: "SS (g/kg)", step: "0.1" },
  { name: "sso", label: "SSo (g/kg)", step: "0.1" },
  { name: "cenere", label: "Cenere (g/kg SS)", step: "0.1" },
  { name: "acAcetico", label: "Ac. acetico (mg/l)", step: "1" },
  { name: "acPropionico", label: "Ac. propionico (mg/l)", step: "1" },
  { name: "acButirrico", label: "Ac. butirrico (mg/l)", step: "1" },
  { name: "acIsoButirrico", label: "Ac. iso-butirrico (mg/l)", step: "1" },
  { name: "acValerianico", label: "Ac. valerianico (mg/l)", step: "1" },
  { name: "acIsoValerianico", label: "Ac. iso-valerianico (mg/l)", step: "1" },
  { name: "acCaproico", label: "Ac. caproico (mg/l)", step: "1" },
  { name: "hacEq", label: "HAc-EQ (mg HAceq/l)", step: "0.1" },
  { name: "ssPct", label: "SS agronomica (%)", step: "0.1" },
  { name: "ssoPctSS", label: "SSo (% s.s.)", step: "0.1" },
  { name: "azotoPctSS", label: "Azoto (% s.s.)", step: "0.1" },
  { name: "fosforoPctSS", label: "Fosforo (% s.s.)", step: "0.1" },
];

export default function NuovaAnalisiClient() {
  const [state, formAction] = useActionState<FormResult, FormData>(createAnalisi, {});
  const [dati, setDati] = useState<AnalisiEstratta | null>(null);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setErrore(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/analisi-digestato/parse", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) setErrore(json.error ?? "Errore nella lettura del PDF.");
      else setDati(json.dati as AnalisiEstratta);
      // il file resta selezionato nell'input: verrà salvato col form
    } catch {
      setErrore("Errore di rete durante il caricamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={formAction} className="card max-w-3xl space-y-5 p-6">
      {/* Upload referto */}
      <div>
        <label className="label" htmlFor="an-pdf">
          📄 Referto PDF (ISF / Schaumann) — compila i campi da solo
        </label>
        <input
          id="an-pdf"
          ref={fileRef}
          type="file"
          name="pdf"
          accept="application/pdf"
          onChange={handleFile}
          data-testid="analisi-file"
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
        />
        {loading && <p className="mt-2 text-sm text-slate-500">Lettura del referto…</p>}
        {errore && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errore}</p>
        )}
        {dati && (
          <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            ✓ Referto letto: {dati.rapportoNumero ?? "?"} · {dati.luogo ?? "?"} del{" "}
            {dati.data ?? "?"} — controlla e salva (il PDF viene archiviato).
          </p>
        )}
      </div>

      <div key={dati?.rapportoNumero ?? "vuoto"} className="contents">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="an-data">
              Data campionamento *
            </label>
            <input
              id="an-data"
              name="data"
              type="date"
              required
              className="input"
              defaultValue={dati?.data ?? toDateInputValue(new Date())}
            />
          </div>
          <div>
            <label className="label" htmlFor="an-luogo">
              Punto (fermentatore) *
            </label>
            <input id="an-luogo" name="luogo" required className="input" defaultValue={dati?.luogo ?? "F1"} />
          </div>
          <div>
            <label className="label" htmlFor="an-rapporto">
              Rapporto n°
            </label>
            <input id="an-rapporto" name="rapportoNumero" className="input" defaultValue={dati?.rapportoNumero ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="an-lab">
              Laboratorio
            </label>
            <input id="an-lab" name="laboratorio" className="input" defaultValue={dati?.laboratorio ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="an-tipo">
              Tipo analisi *
            </label>
            <select id="an-tipo" name="tipo" className="input" defaultValue={dati?.tipo ?? "PROCESSO"}>
              <option value="PROCESSO">Processo (ISF: pH, FOS/TAC…)</option>
              <option value="AGRONOMICA">Agronomica (N, P, SS)</option>
              <option value="IGIENE">Igiene (Salmonella)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="an-salmonella">
              Salmonella
            </label>
            <input
              id="an-salmonella"
              name="salmonella"
              className="input"
              placeholder="es. assente (5/5)"
              defaultValue={dati?.salmonella ?? ""}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CAMPI.map((c) => (
            <div key={c.name}>
              <label className="label" htmlFor={`an-${c.name}`}>
                {c.label}
              </label>
              <input
                id={`an-${c.name}`}
                name={c.name}
                type="number"
                step={c.step}
                className="input"
                defaultValue={(dati?.[c.name as keyof AnalisiEstratta] as number | undefined) ?? ""}
              />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="label" htmlFor="an-note">
            Note
          </label>
          <input id="an-note" name="note" className="input" />
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div className="flex gap-3">
        <SubmitButton />
        <Link href="/biogas/digestato" className="btn-secondary">
          Annulla
        </Link>
      </div>
    </form>
  );
}
