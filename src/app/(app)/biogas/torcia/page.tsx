import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import DeleteButton from "@/components/DeleteButton";
import PrintButton from "@/components/PrintButton";
import {
  chiudiAttivazione,
  deleteAttivazione,
  addCausaTorcia,
  updateCausaTorcia,
  deleteCausaTorcia,
} from "@/app/actions/torcia";
import { formatNumber } from "@/lib/format";
import AttivazioneForm from "./AttivazioneForm";

export const dynamic = "force-dynamic";

function fmtDataOra(d: Date): string {
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Durata in ore (1 decimale); per attivazioni in corso usa "adesso".
function durataOre(inizio: Date, fine: Date | null): number {
  const f = fine ?? new Date();
  return Math.max(0, (f.getTime() - inizio.getTime()) / 3600000);
}

export default async function TorciaPage() {
  const [attivazioni, cause] = await Promise.all([
    prisma.attivazioneTorcia.findMany({
      orderBy: { inizio: "desc" },
      include: { causa: { select: { nome: true } } },
    }),
    prisma.causaTorcia.findMany({ orderBy: { ordine: "asc" } }),
  ]);

  const annoCorrente = new Date().getFullYear();

  // Totali per anno (l'attivazione conta nell'anno in cui inizia)
  const perAnno = new Map<number, { ore: number; n: number; inCorso: number }>();
  for (const a of attivazioni) {
    const anno = a.inizio.getFullYear();
    const r = perAnno.get(anno) ?? { ore: 0, n: 0, inCorso: 0 };
    r.ore += durataOre(a.inizio, a.fine);
    r.n += 1;
    if (!a.fine) r.inCorso += 1;
    perAnno.set(anno, r);
  }
  const anni = [...perAnno.entries()].sort((a, b) => b[0] - a[0]);
  const corrente = perAnno.get(annoCorrente);
  const accesaOra = attivazioni.some((a) => !a.fine);

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="🔥 Registro torcia"
          subtitle="Attivazioni della torcia di combustione (biogas in eccesso bruciato per abbattere gli inquinanti)"
        />
      </div>

      {/* Intestazione stampa */}
      <div className="mb-4 hidden border-b-2 border-slate-800 pb-3 print:block">
        <h1 className="text-xl font-bold text-slate-900">Registro attivazioni torcia</h1>
        <p className="text-sm text-slate-600">
          Azienda Agricola Pavesi — Divisione Biogas · Stampato il{" "}
          {new Date().toLocaleDateString("it-IT")}
        </p>
      </div>

      {/* Riepilogo per anno */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`card p-4 ${accesaOra ? "border-red-300 bg-red-50" : "border-brand-200 bg-brand-50"}`}>
          <div className="text-xs uppercase tracking-wide text-slate-400">Stato torcia</div>
          <div className={`mt-1 text-2xl font-bold ${accesaOra ? "text-red-600" : "text-brand-700"}`}>
            {accesaOra ? "🔥 ACCESA" : "Spenta"}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Ore torcia {annoCorrente}
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-800">
            {formatNumber(corrente?.ore ?? 0, 1)} h
          </div>
          <div className="mt-1 text-xs text-slate-400">{corrente?.n ?? 0} attivazioni</div>
        </div>
        {anni
          .filter(([anno]) => anno !== annoCorrente)
          .slice(0, 2)
          .map(([anno, r]) => (
            <div key={anno} className="card p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Ore torcia {anno}</div>
              <div className="mt-1 text-2xl font-bold text-slate-800">{formatNumber(r.ore, 1)} h</div>
              <div className="mt-1 text-xs text-slate-400">{r.n} attivazioni</div>
            </div>
          ))}
      </div>

      {/* Nuova attivazione */}
      <div className="card mb-6 p-5 print:hidden">
        <h3 className="mb-3 font-semibold text-slate-800">Nuova attivazione</h3>
        <AttivazioneForm cause={cause.filter((c) => c.attiva)} />
      </div>

      {/* Registro */}
      <div className="card mb-6 overflow-x-auto print:border-0 print:shadow-none">
        <div className="flex items-center justify-between px-4 pt-4 print:hidden">
          <h3 className="font-semibold text-slate-800">Registro attivazioni</h3>
          <PrintButton />
        </div>
        {attivazioni.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Nessuna attivazione registrata.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Inizio</th>
                <th className="px-4 py-3">Fine</th>
                <th className="px-4 py-3 text-right">Durata</th>
                <th className="px-4 py-3">Causa</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right print:hidden">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attivazioni.map((a) => {
                const inCorso = !a.fine;
                return (
                  <tr key={a.id} className={`hover:bg-slate-50 ${inCorso ? "bg-red-50/50" : ""}`}>
                    <td className="px-4 py-3 text-slate-700">{fmtDataOra(a.inizio)}</td>
                    <td className="px-4 py-3">
                      {a.fine ? (
                        <span className="text-slate-700">{fmtDataOra(a.fine)}</span>
                      ) : (
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="badge bg-red-100 text-red-800">🔥 in corso</span>
                          <form
                            action={chiudiAttivazione.bind(null, a.id)}
                            className="flex items-center gap-1 print:hidden"
                          >
                            <input
                              name="fine"
                              type="datetime-local"
                              className="input !w-auto !py-1 text-xs"
                            />
                            <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                              Chiudi
                            </button>
                          </form>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatNumber(durataOre(a.inizio, a.fine), 1)} h
                      {inCorso && <span className="text-xs text-slate-400"> (finora)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.causa?.nome ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{a.note || "—"}</td>
                    <td className="px-4 py-3 print:hidden">
                      <div className="flex justify-end">
                        <DeleteButton action={deleteAttivazione} id={a.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Cause di accensione */}
      <div className="card max-w-2xl overflow-hidden print:hidden">
        <h3 className="px-4 pt-4 font-semibold text-slate-800">Cause di accensione</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Attiva</th>
              <th className="px-4 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cause.map((c) => {
              const action = updateCausaTorcia.bind(null, c.id);
              return (
                <tr key={c.id}>
                  <td className="px-4 py-2">
                    <form id={`ct-${c.id}`} action={action} className="contents" />
                    <input form={`ct-${c.id}`} name="nome" defaultValue={c.nome} required className="input" />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      form={`ct-${c.id}`}
                      name="attiva"
                      type="checkbox"
                      defaultChecked={c.attiva}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-3">
                      <button form={`ct-${c.id}`} type="submit" className="btn-primary !py-1.5">
                        Salva
                      </button>
                      <form action={deleteCausaTorcia}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-sm text-red-600 hover:text-red-800">
                          Elimina
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <form action={addCausaTorcia} className="flex items-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
          <div className="flex-1">
            <label className="label" htmlFor="ct-nome">
              Nuova causa
            </label>
            <input id="ct-nome" name="nome" required className="input" placeholder="es. Sovrapressione gasometro" />
          </div>
          <button type="submit" className="btn-secondary">
            + Aggiungi
          </button>
        </form>
      </div>
    </div>
  );
}
