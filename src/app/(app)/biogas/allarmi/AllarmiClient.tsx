"use client";

import { useMemo, useState } from "react";

export type RigaAllarme = {
  id: string;
  msgNumber: number;
  inizio: number; // epoch ms
  fine: number | null;
  descrizione: string;
  avviso: boolean; // true = AVVISO, false = ALLARME
};

function fmtDataOra(ms: number): string {
  return new Date(ms).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDurata(r: RigaAllarme): string {
  if (r.fine == null) return "—";
  const min = (r.fine - r.inizio) / 60000;
  return min < 90 ? `${Math.round(min)} min` : `${(min / 60).toLocaleString("it-IT", { maximumFractionDigits: 1 })} h`;
}

function Tabella({ titolo, righe, colore }: { titolo: string; righe: RigaAllarme[]; colore: string }) {
  return (
    <div className="card mb-6 overflow-x-auto print:border-0 print:shadow-none">
      <h3 className="flex items-center gap-2 px-4 pt-4 font-semibold text-slate-800">
        <span className={`badge ${colore}`}>{righe.length}</span> {titolo}
      </h3>
      {righe.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-400">Nessuna voce nel periodo.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Inizio</th>
              <th className="px-4 py-3">Rientro</th>
              <th className="px-4 py-3 text-right">Durata</th>
              <th className="px-4 py-3 text-right">Cod.</th>
              <th className="px-4 py-3">Descrizione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {righe.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-700">{fmtDataOra(r.inizio)}</td>
                <td className="px-4 py-2.5">
                  {r.fine != null ? (
                    <span className="text-slate-600">{fmtDataOra(r.fine)}</span>
                  ) : (
                    <span className="badge bg-red-100 text-red-800">non rientrato</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600">{fmtDurata(r)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-700">{r.msgNumber}</td>
                <td className="px-4 py-2.5 text-slate-700">{r.descrizione}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AllarmiClient({ righe }: { righe: RigaAllarme[] }) {
  const [codice, setCodice] = useState<string>("");

  // Opzioni del filtro: codici presenti nel periodo con conteggio
  const opzioni = useMemo(() => {
    const conta = new Map<number, { n: number; descrizione: string }>();
    for (const r of righe) {
      const c = conta.get(r.msgNumber) ?? { n: 0, descrizione: r.descrizione };
      c.n += 1;
      conta.set(r.msgNumber, c);
    }
    return [...conta.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [righe]);

  const filtrate = useMemo(
    () => (codice === "" ? righe : righe.filter((r) => r.msgNumber === Number(codice))),
    [righe, codice]
  );

  // KPI aggiornate in base al filtro
  const allarmi = filtrate.filter((r) => !r.avviso);
  const avvisi = filtrate.filter((r) => r.avviso);
  const oreTotali = filtrate.reduce(
    (s, r) => s + (r.fine != null ? (r.fine - r.inizio) / 3600000 : 0),
    0
  );
  const top = opzioni.length > 0 && codice === "" ? opzioni[0] : null;

  return (
    <div>
      {/* Filtro per codice */}
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4 print:hidden">
        <div className="min-w-[280px] flex-1">
          <label className="label" htmlFor="filtro-codice">
            Filtra per codice allarme
          </label>
          <select
            id="filtro-codice"
            className="input"
            value={codice}
            onChange={(e) => setCodice(e.target.value)}
          >
            <option value="">— Tutti i codici ({righe.length}) —</option>
            {opzioni.map(([cod, info]) => (
              <option key={cod} value={cod}>
                {cod} — {info.descrizione} ({info.n})
              </option>
            ))}
          </select>
        </div>
        {codice !== "" && (
          <button type="button" onClick={() => setCodice("")} className="btn-secondary">
            ✕ Togli filtro
          </button>
        )}
      </div>

      {/* KPI reattive */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Allarmi</div>
          <div className="mt-1 text-2xl font-bold text-red-600">{allarmi.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Avvisi</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{avvisi.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Ore cumulative</div>
          <div className="mt-1 text-2xl font-bold text-slate-800">
            {oreTotali.toLocaleString("it-IT", { maximumFractionDigits: 1 })} h
          </div>
        </div>
        <div className="card p-4">
          {top ? (
            <>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Più frequente · cod. {top[0]}
              </div>
              <div className="mt-1 truncate text-sm font-bold text-slate-800" title={top[1].descrizione}>
                {top[1].descrizione}
              </div>
              <div className="mt-1 text-xs text-slate-400">{top[1].n} volte</div>
            </>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wide text-slate-400">Occorrenze filtro</div>
              <div className="mt-1 text-2xl font-bold text-slate-800">{filtrate.length}</div>
            </>
          )}
        </div>
      </div>

      {/* Tabelle separate */}
      <Tabella titolo="Allarmi" righe={allarmi} colore="bg-red-100 text-red-800" />
      <Tabella titolo="Avvisi" righe={avvisi} colore="bg-amber-100 text-amber-800" />
    </div>
  );
}
