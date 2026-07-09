"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createManutenzione, type FormResult } from "@/app/actions/manutenzioni";
import type { ManutenzioneEstratta } from "@/lib/manutenzione-parser";
import { toDateInputValue } from "@/lib/format";

type Riga = { key: string; codice: string; descrizione: string; quantita: string };
let seq = 0;
const nk = () => `r${seq++}`;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvataggio…" : "Registra intervento"}
    </button>
  );
}

export default function NuovaManutenzioneClient() {
  const [state, formAction] = useActionState<FormResult, FormData>(createManutenzione, {});
  const [dati, setDati] = useState<(ManutenzioneEstratta & { allegatoId?: string; pdfNome?: string }) | null>(null);
  const [righe, setRighe] = useState<Riga[]>([{ key: nk(), codice: "", descrizione: "", quantita: "" }]);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setErrore(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/manutenzione/parse", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) {
        setErrore(json.error ?? "Errore nella lettura del PDF.");
      } else {
        const d = json.dati as ManutenzioneEstratta;
        setDati({ ...d, allegatoId: json.allegatoId, pdfNome: file.name });
        setRighe(
          d.ricambi.length > 0
            ? d.ricambi.map((r) => ({
                key: nk(),
                codice: r.codice,
                descrizione: r.descrizione,
                quantita: String(r.quantita),
              }))
            : [{ key: nk(), codice: "", descrizione: "", quantita: "" }]
        );
      }
    } catch {
      setErrore("Errore di rete durante il caricamento.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const upd = (key: string, patch: Partial<Riga>) =>
    setRighe((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-5">
      {/* Upload rapporto */}
      <div className="card max-w-3xl p-5">
        <h3 className="mb-1 font-semibold text-slate-800">📄 Carica il rapporto (PDF)</h3>
        <p className="mb-3 text-sm text-slate-500">
          Leggo il rapporto della ditta (es. ETS) e compilo tutto: intervento, ore moto, manodopera
          e ricambi.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFile}
          data-testid="manut-file"
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
        />
        {loading && <p className="mt-3 text-sm text-slate-500">Lettura del PDF in corso…</p>}
        {errore && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errore}</p>}
        {dati && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            ✓ Rapporto letto: OdL {dati.odlNumero ?? "?"} · {dati.tipo ?? ""} ·{" "}
            {dati.ricambi.length} ricambi — controlla e salva.
          </p>
        )}
      </div>

      {/* Form */}
      <form
        key={dati?.allegatoId ?? "vuoto"}
        action={formAction}
        className="card max-w-3xl space-y-5 p-6"
      >
        {dati?.allegatoId && <input type="hidden" name="allegatoId" value={dati.allegatoId} />}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="m-data">
              Data intervento *
            </label>
            <input
              id="m-data"
              name="data"
              type="date"
              required
              className="input"
              defaultValue={dati?.data ?? toDateInputValue(new Date())}
            />
          </div>
          <div>
            <label className="label" htmlFor="m-odl">
              OdL / rapporto n°
            </label>
            <input id="m-odl" name="odlNumero" className="input" defaultValue={dati?.odlNumero ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="m-tipo">
              Tipo (M1, M2…)
            </label>
            <input id="m-tipo" name="tipo" className="input" defaultValue={dati?.tipo ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="m-descr">
              Descrizione
            </label>
            <input id="m-descr" name="descrizione" className="input" defaultValue={dati?.descrizione ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="m-oreMoto">
              Ore motore
            </label>
            <input id="m-oreMoto" name="oreMoto" type="number" min={0} className="input" defaultValue={dati?.oreMoto ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="m-ditta">
              Ditta
            </label>
            <input id="m-ditta" name="ditta" className="input" defaultValue={dati?.ditta ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="m-tecnico">
              Tecnico
            </label>
            <input id="m-tecnico" name="tecnico" className="input" defaultValue={dati?.tecnico ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="m-oreLavoro">
              Ore lavoro
            </label>
            <input id="m-oreLavoro" name="oreLavoro" type="number" step="0.01" min={0} className="input" defaultValue={dati?.oreLavoro ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="m-oreViaggio">
              Ore viaggio
            </label>
            <input id="m-oreViaggio" name="oreViaggio" type="number" step="0.01" min={0} className="input" defaultValue={dati?.oreViaggio ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="m-km">
              Km trasferta
            </label>
            <input id="m-km" name="km" type="number" step="0.1" min={0} className="input" defaultValue={dati?.km ?? ""} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="m-commento">
            Commento del tecnico
          </label>
          <textarea id="m-commento" name="commento" rows={3} className="input" defaultValue={dati?.commento ?? ""} />
        </div>

        {/* Ricambi */}
        <div>
          <div className="label">Ricambi utilizzati</div>
          <div className="space-y-2">
            {righe.map((r) => (
              <div key={r.key} className="flex flex-wrap items-center gap-2">
                <input
                  name="ricCodice"
                  placeholder="codice"
                  value={r.codice}
                  onChange={(e) => upd(r.key, { codice: e.target.value })}
                  className="input w-36"
                />
                <input
                  name="ricDescrizione"
                  placeholder="descrizione"
                  value={r.descrizione}
                  onChange={(e) => upd(r.key, { descrizione: e.target.value })}
                  className="input min-w-[220px] flex-1"
                />
                <input
                  name="ricQta"
                  type="number"
                  step="0.5"
                  min={0}
                  placeholder="q.tà"
                  value={r.quantita}
                  onChange={(e) => upd(r.key, { quantita: e.target.value })}
                  className="input w-20"
                />
                <button
                  type="button"
                  onClick={() => setRighe((rs) => rs.filter((x) => x.key !== r.key))}
                  className="btn-secondary !px-3"
                  aria-label="Rimuovi ricambio"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRighe((rs) => [...rs, { key: nk(), codice: "", descrizione: "", quantita: "" }])}
            className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-800"
          >
            + Aggiungi ricambio
          </button>
        </div>

        <div>
          <label className="label" htmlFor="m-note">
            Note
          </label>
          <input id="m-note" name="note" className="input" />
        </div>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        <div className="flex gap-3">
          <SubmitButton />
          <Link href="/biogas/manutenzioni" className="btn-secondary">
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
