"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTrattamento, type FormResult } from "@/app/actions/trattamenti";
import { toDateInputValue } from "@/lib/format";

type BoxOpt = { id: string; numero: number; stalla: string; capi: number };
type Opt = { id: string; label: string };

export type TrattamentoInitial = {
  farmaco?: string;
  aic?: string;
  viaSomministrazione?: string;
  patologia?: string;
  veterinario?: string;
  dataInizio?: string; // yyyy-mm-dd
  durataGiorni?: number;
  giorniSospensione?: number;
  numeroRicetta?: string;
  dataRicetta?: string; // yyyy-mm-dd
  quantitaCapi?: number;
  note?: string;
  pdfNome?: string;
  allegatoId?: string;
};

const VIE = ["INTRAMUSCOLARE", "ACQUA", "MANGIME", "ORALE", "ALTRO"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvataggio…" : "Registra trattamento"}
    </button>
  );
}

export default function TrattamentoForm({
  boxes,
  linee,
  gruppi,
  initial,
}: {
  boxes: BoxOpt[];
  linee: Opt[];
  gruppi: Opt[];
  initial?: TrattamentoInitial;
}) {
  const [state, formAction] = useActionState<FormResult, FormData>(createTrattamento, {});
  const [livello, setLivello] = useState<"BOX" | "LINEA_GRUPPO">("BOX");

  const perStalla = boxes.reduce<Record<string, BoxOpt[]>>((acc, b) => {
    (acc[b.stalla] ??= []).push(b);
    return acc;
  }, {});

  return (
    <form action={formAction} className="card max-w-3xl space-y-5 p-6">
      <input type="hidden" name="livello" value={livello} />
      {initial?.pdfNome && <input type="hidden" name="pdfNome" value={initial.pdfNome} />}
      {initial?.allegatoId && <input type="hidden" name="allegatoId" value={initial.allegatoId} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label" htmlFor="farmaco">
            Farmaco *
          </label>
          <input
            id="farmaco"
            name="farmaco"
            required
            className="input"
            defaultValue={initial?.farmaco ?? ""}
            placeholder="es. LONGOCILLINA LA"
          />
        </div>
        <div>
          <label className="label" htmlFor="viaSomministrazione">
            Via
          </label>
          <select
            id="viaSomministrazione"
            name="viaSomministrazione"
            className="input"
            defaultValue={initial?.viaSomministrazione ?? ""}
          >
            <option value="">—</option>
            {VIE.map((v) => (
              <option key={v} value={v}>
                {v.charAt(0) + v.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="patologia">
            Patologia
          </label>
          <input
            id="patologia"
            name="patologia"
            className="input"
            defaultValue={initial?.patologia ?? ""}
            placeholder="es. respiratoria"
          />
        </div>
        <div>
          <label className="label" htmlFor="dataInizio">
            Data inizio *
          </label>
          <input
            id="dataInizio"
            name="dataInizio"
            type="date"
            required
            className="input"
            defaultValue={initial?.dataInizio ?? toDateInputValue(new Date())}
          />
        </div>
        <div>
          <label className="label" htmlFor="durataGiorni">
            Durata trattamento (giorni) *
          </label>
          <input
            id="durataGiorni"
            name="durataGiorni"
            type="number"
            min={1}
            required
            defaultValue={initial?.durataGiorni ?? 3}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="giorniSospensione">
            Sospensione (giorni)
          </label>
          <input
            id="giorniSospensione"
            name="giorniSospensione"
            type="number"
            min={0}
            defaultValue={initial?.giorniSospensione ?? 0}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="numeroRicetta">
            Numero ricetta
          </label>
          <input
            id="numeroRicetta"
            name="numeroRicetta"
            className="input"
            defaultValue={initial?.numeroRicetta ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="dataRicetta">
            Data ricetta
          </label>
          <input
            id="dataRicetta"
            name="dataRicetta"
            type="date"
            className="input"
            defaultValue={initial?.dataRicetta ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="veterinario">
            Veterinario
          </label>
          <input
            id="veterinario"
            name="veterinario"
            className="input"
            defaultValue={initial?.veterinario ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="aic">
            AIC
          </label>
          <input id="aic" name="aic" className="input" defaultValue={initial?.aic ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="quantitaCapi">
            N° capi (da ricetta)
          </label>
          <input
            id="quantitaCapi"
            name="quantitaCapi"
            type="number"
            min={0}
            className="input"
            defaultValue={initial?.quantitaCapi ?? ""}
          />
        </div>
      </div>

      {/* Destinatario */}
      <div>
        <div className="mb-2 flex gap-2">
          {(["BOX", "LINEA_GRUPPO"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLivello(l)}
              className={`btn ${livello === l ? "bg-brand-600 text-white" : "btn-secondary"}`}
            >
              {l === "BOX" ? "Box specifici" : "Linea + Gruppo"}
            </button>
          ))}
        </div>

        {livello === "BOX" ? (
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {Object.entries(perStalla).map(([stalla, bs]) => (
              <div key={stalla} className="mb-3">
                <div className="mb-1 text-xs font-semibold uppercase text-slate-400">{stalla}</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {bs.map((b) => (
                    <label
                      key={b.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm hover:bg-slate-50"
                    >
                      <input type="checkbox" name="boxId" value={b.id} className="h-4 w-4" />
                      <span>
                        {b.numero}
                        {b.capi > 0 && <span className="text-xs text-slate-400"> ({b.capi})</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
        )}
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
        <SubmitButton />
        <Link href="/trattamenti" className="btn-secondary">
          Annulla
        </Link>
      </div>
    </form>
  );
}
