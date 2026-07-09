"use client";

import { useRef, useState } from "react";
import TrattamentoForm, { type TrattamentoInitial } from "../TrattamentoForm";
import type { RicettaEstratta, TrattamentoEstratto } from "@/lib/ricetta-parser";

type BoxOpt = { id: string; numero: number; stalla: string; capi: number };
type Opt = { id: string; label: string };

function toInitial(
  r: RicettaEstratta,
  t: TrattamentoEstratto,
  pdfNome: string,
  allegatoId: string | null
): TrattamentoInitial {
  return {
    allegatoId: allegatoId ?? undefined,
    farmaco: t.farmaco,
    aic: t.aic,
    viaSomministrazione: t.viaSomministrazione,
    patologia: t.patologia,
    veterinario: r.veterinario,
    dataInizio: r.dataRicetta, // di solito il trattamento parte dalla data ricetta
    durataGiorni: t.durataGiorni,
    giorniSospensione: t.giorniSospensione,
    numeroRicetta: r.numeroRicetta,
    dataRicetta: r.dataRicetta,
    quantitaCapi: t.quantitaCapi,
    note: t.note,
    pdfNome,
  };
}

export default function NuovoTrattamentoClient({
  boxes,
  linee,
  gruppi,
}: {
  boxes: BoxOpt[];
  linee: Opt[];
  gruppi: Opt[];
}) {
  const [ricetta, setRicetta] = useState<RicettaEstratta | null>(null);
  const [pdfNome, setPdfNome] = useState("");
  const [allegatoId, setAllegatoId] = useState<string | null>(null);
  const [sel, setSel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ricetta/parse", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error ?? "Errore nella lettura del PDF.");
        setRicetta(null);
      } else {
        setRicetta(json.dati as RicettaEstratta);
        setPdfNome(file.name);
        setAllegatoId(json.allegatoId ?? null);
        setSel(0);
      }
    } catch {
      setError("Errore di rete durante il caricamento.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const trattSel = ricetta?.trattamenti[sel];
  const initial =
    ricetta && trattSel ? toInitial(ricetta, trattSel, pdfNome, allegatoId) : undefined;

  return (
    <div className="space-y-5">
      {/* Caricamento ricetta */}
      <div className="card max-w-3xl p-5">
        <h3 className="mb-1 font-semibold text-slate-800">📄 Carica la ricetta (PDF)</h3>
        <p className="mb-3 text-sm text-slate-500">
          Leggo la Ricetta Elettronica Veterinaria e compilo i campi da sola: tu scegli solo dove
          l&apos;hai usata.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFile}
          data-testid="ricetta-file"
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
        />
        {loading && <p className="mt-3 text-sm text-slate-500">Lettura del PDF in corso…</p>}
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {ricetta && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-slate-600">
              Ricetta <b>{ricetta.numeroRicetta}</b> del <b>{ricetta.dataRicetta}</b> ·{" "}
              {ricetta.veterinario} — <b>{ricetta.trattamenti.length}</b>{" "}
              {ricetta.trattamenti.length === 1 ? "prescrizione" : "prescrizioni"}:
            </p>
            <div className="flex flex-wrap gap-2">
              {ricetta.trattamenti.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSel(i)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                    i === sel
                      ? "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="block font-semibold">{t.farmaco}</span>
                  <span className="block text-xs text-slate-500">
                    {t.durataGiorni ?? "?"} gg · sosp. {t.giorniSospensione ?? 0} gg ·{" "}
                    {t.quantitaCapi ?? "?"} capi
                    {t.capannone ? ` · Stalla ${t.capannone}` : ""}
                  </span>
                </button>
              ))}
            </div>
            {trattSel?.capannone && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                La ricetta indica <b>CAP. {trattSel.capannone}</b> (Stalla {trattSel.capannone}):
                seleziona qui sotto i box interessati.
              </p>
            )}
          </div>
        )}
      </div>

      <TrattamentoForm
        key={ricetta ? `${ricetta.numeroRicetta}-${sel}` : "vuoto"}
        boxes={boxes}
        linee={linee}
        gruppi={gruppi}
        initial={initial}
      />
    </div>
  );
}
