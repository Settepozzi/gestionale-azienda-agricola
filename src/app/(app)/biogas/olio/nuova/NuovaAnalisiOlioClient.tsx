"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAnalisiOlio, type FormResult } from "@/app/actions/analisi-olio";
import { toDateInputValue } from "@/lib/format";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvataggio…" : "Registra analisi"}
    </button>
  );
}

const GRUPPI: { titolo: string; campi: { name: string; label: string; step?: string }[] }[] = [
  {
    titolo: "Metalli di usura (ppm)",
    campi: [
      { name: "ferro", label: "Ferro" },
      { name: "cromo", label: "Cromo" },
      { name: "nichel", label: "Nichel" },
      { name: "alluminio", label: "Alluminio" },
      { name: "rame", label: "Rame" },
      { name: "piombo", label: "Piombo" },
      { name: "stagno", label: "Stagno" },
      { name: "silicio", label: "Silicio" },
      { name: "sodio", label: "Sodio" },
      { name: "potassio", label: "Potassio" },
    ],
  },
  {
    titolo: "Additivi (ppm)",
    campi: [
      { name: "magnesio", label: "Magnesio" },
      { name: "calcio", label: "Calcio" },
      { name: "fosforo", label: "Fosforo" },
      { name: "zinco", label: "Zinco" },
    ],
  },
  {
    titolo: "Proprietà del fluido",
    campi: [
      { name: "visc40", label: "Viscosità 40°C (cSt)", step: "0.1" },
      { name: "visc100", label: "Viscosità 100°C (cSt)", step: "0.1" },
      { name: "viscIndex", label: "Indice di viscosità" },
      { name: "tan", label: "TAN (mg KOH/g)", step: "0.01" },
      { name: "bnD4739", label: "BN D4739", step: "0.01" },
      { name: "bnD2896", label: "BN D2896", step: "0.01" },
      { name: "iPh", label: "i-pH", step: "0.1" },
      { name: "oxidation", label: "Ossidazione (abs/cm)" },
      { name: "nitration", label: "Nitrazione (abs/0,1mm)" },
      { name: "zolfoPct", label: "Zolfo (% massa)", step: "0.01" },
    ],
  },
];

export default function NuovaAnalisiOlioClient() {
  const [state, formAction] = useActionState<FormResult, FormData>(createAnalisiOlio, {});

  return (
    <form action={formAction} className="card max-w-3xl space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="ao-data">
            Data prelievo *
          </label>
          <input id="ao-data" name="data" type="date" required className="input" defaultValue={toDateInputValue(new Date())} />
        </div>
        <div>
          <label className="label" htmlFor="ao-oreOlio">
            Ore olio
          </label>
          <input id="ao-oreOlio" name="oreOlio" type="number" min={0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ao-oreMotore">
            Ore motore (unit time)
          </label>
          <input id="ao-oreMotore" name="oreMotore" type="number" min={0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ao-litri">
            Litri rabboccati
          </label>
          <input id="ao-litri" name="litriRabbocco" type="number" step="0.5" min={0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ao-lab">
            Lab number
          </label>
          <input id="ao-lab" name="labNumero" className="input" placeholder="Z-…" />
        </div>
        <div>
          <label className="label" htmlFor="ao-motore">
            Motore
          </label>
          <input id="ao-motore" name="motore" className="input" defaultValue="MAN E0836 LE302" />
        </div>
        <div>
          <label className="label" htmlFor="ao-olio">
            Olio
          </label>
          <input id="ao-olio" name="olio" className="input" defaultValue="Petronas GEO BLG SAE 40" />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="cambioOlio" className="h-4 w-4" defaultChecked />
            Olio cambiato al prelievo
          </label>
        </div>
      </div>

      {GRUPPI.map((g) => (
        <div key={g.titolo}>
          <div className="label">{g.titolo}</div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {g.campi.map((c) => (
              <div key={c.name}>
                <label className="text-xs text-slate-500" htmlFor={`ao-${c.name}`}>
                  {c.label}
                </label>
                <input id={`ao-${c.name}`} name={c.name} type="number" step={c.step ?? "1"} className="input" />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div>
        <label className="label" htmlFor="ao-commento">
          Commento del laboratorio
        </label>
        <textarea id="ao-commento" name="commento" rows={2} className="input" />
      </div>

      <div>
        <label className="label" htmlFor="ao-pdf">
          Report PDF (archiviato col record)
        </label>
        <input
          id="ao-pdf"
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
        <Link href="/biogas/olio" className="btn-secondary">
          Annulla
        </Link>
      </div>
    </form>
  );
}
