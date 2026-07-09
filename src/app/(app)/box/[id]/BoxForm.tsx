"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormResult } from "@/app/actions/box";

type Option = { id: string; nome: string };
type BoxData = {
  numero: number;
  stallaId: string;
  lineaId: string | null;
  gruppoId: string | null;
  tipo: string;
  superficieMq: number;
  capienzaManuale: number | null;
  rampaId: string | null;
  note: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvataggio…" : "Salva modifiche"}
    </button>
  );
}

export default function BoxForm({
  action,
  initial,
  stalle,
  linee,
  gruppi,
  rampe,
}: {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  initial: BoxData;
  stalle: Option[];
  linee: Option[];
  gruppi: Option[];
  rampe: Option[];
}) {
  const [state, formAction] = useActionState<FormResult, FormData>(action, {});

  return (
    <form action={formAction} className="card max-w-2xl space-y-5 p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="numero">
            Numero box *
          </label>
          <input
            id="numero"
            name="numero"
            type="number"
            required
            className="input"
            defaultValue={initial.numero}
          />
        </div>
        <div>
          <label className="label" htmlFor="tipo">
            Tipo *
          </label>
          <select id="tipo" name="tipo" required className="input" defaultValue={initial.tipo}>
            <option value="DOPPIO">Doppio</option>
            <option value="SINGOLO">Singolo</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="stallaId">
            Stalla *
          </label>
          <select
            id="stallaId"
            name="stallaId"
            required
            className="input"
            defaultValue={initial.stallaId}
          >
            {stalle.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="superficieMq">
            Superficie (m²)
          </label>
          <input
            id="superficieMq"
            name="superficieMq"
            type="number"
            step="0.01"
            min={0}
            className="input"
            defaultValue={initial.superficieMq}
          />
        </div>
        <div>
          <label className="label" htmlFor="capienzaManuale">
            Capienza forzata (facoltativa)
          </label>
          <input
            id="capienzaManuale"
            name="capienzaManuale"
            type="number"
            min={0}
            className="input"
            defaultValue={initial.capienzaManuale ?? ""}
            placeholder="calcolata dal peso"
          />
          <p className="mt-1 text-xs text-slate-500">
            Se vuota, la capienza è calcolata da superficie e peso medio.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="lineaId">
            Linea
          </label>
          <select
            id="lineaId"
            name="lineaId"
            className="input"
            defaultValue={initial.lineaId ?? ""}
          >
            <option value="">— Nessuna —</option>
            {linee.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="gruppoId">
            Gruppo Anagrafico
          </label>
          <select
            id="gruppoId"
            name="gruppoId"
            className="input"
            defaultValue={initial.gruppoId ?? ""}
          >
            <option value="">— Nessuno —</option>
            {gruppi.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="rampaId">
            Rampa di alimentazione
          </label>
          <select
            id="rampaId"
            name="rampaId"
            className="input"
            defaultValue={initial.rampaId ?? ""}
          >
            <option value="">— Nessuna (manuale) —</option>
            {rampe.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            La % di razione cambia da sola ogni giorno secondo la rampa.
          </p>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="note">
          Note
        </label>
        <textarea id="note" name="note" rows={3} className="input" defaultValue={initial.note ?? ""} />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex gap-3">
        <SubmitButton />
        <Link href="/stalle" className="btn-secondary">
          Torna alla mappa
        </Link>
      </div>
    </form>
  );
}
