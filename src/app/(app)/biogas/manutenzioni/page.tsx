import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import DeleteButton from "@/components/DeleteButton";
import {
  deleteManutenzione,
  addPiano,
  updatePiano,
  deletePiano,
} from "@/app/actions/manutenzioni";
import { formatDate, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

// Potenza nominale del cogeneratore: converte i kWh prodotti in ore moto
const POTENZA_KW = 99.96; // 2399 kWh / 24 h

export default async function ManutenzioniPage() {
  const [manutenzioni, piani, giorniProduzione] = await Promise.all([
    prisma.manutenzioneBiogas.findMany({
      orderBy: { data: "desc" },
      include: { ricambi: true },
    }),
    prisma.pianoManutenzione.findMany({ orderBy: { tipo: "asc" } }),
    prisma.biogasGiorno.findMany({
      where: { erogatiKWh: { not: null } },
      orderBy: { data: "asc" },
      select: { data: true, erogatiKWh: true },
    }),
  ]);

  const ultima = manutenzioni[0];
  const annoCorrente = new Date().getFullYear();
  const interventiAnno = manutenzioni.filter((m) => m.data.getFullYear() === annoCorrente).length;
  const ultimaConOre = manutenzioni.find((m) => m.oreMoto != null);

  // --- Stima delle ore moto attuali: ultima lettura + kWh prodotti dopo / potenza ---
  let oreMotoStimate: number | null = null;
  if (ultimaConOre?.oreMoto != null) {
    const kwhDopo = giorniProduzione
      .filter((g) => g.data > ultimaConOre.data)
      .reduce((s, g) => s + (g.erogatiKWh ?? 0), 0);
    oreMotoStimate = Math.round(ultimaConOre.oreMoto + kwhDopo / POTENZA_KW);
  }

  // Media ore moto al giorno (ultimi 30 giorni di dati) per stimare le date
  const ultimi30 = giorniProduzione.slice(-30);
  const mediaOreGiorno =
    ultimi30.length > 0
      ? ultimi30.reduce((s, g) => s + (g.erogatiKWh ?? 0) / POTENZA_KW, 0) / ultimi30.length
      : null;

  // --- Scadenze per ogni piano attivo ---
  const scadenze = piani
    .filter((p) => p.attivo)
    .map((p) => {
      const ultimaDelTipo = manutenzioni.find((m) => m.tipo === p.tipo && m.oreMoto != null);
      if (!ultimaDelTipo || oreMotoStimate == null) return { piano: p, ultimaDelTipo, residue: null as number | null, giorni: null as number | null };
      const prossimaOre = ultimaDelTipo.oreMoto! + p.intervalloOre;
      const residue = prossimaOre - oreMotoStimate;
      const giorni =
        mediaOreGiorno && mediaOreGiorno > 0 ? Math.round(residue / mediaOreGiorno) : null;
      return { piano: p, ultimaDelTipo, residue, giorni };
    });

  return (
    <div>
      <PageHeader
        title="🔧 Manutenzioni"
        subtitle="Interventi sul cogeneratore e sull'impianto (rapporti ditta)"
        action={{ href: "/biogas/manutenzioni/nuova", label: "Nuovo intervento" }}
      />

      {/* KPI */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Ultimo intervento</div>
          <div className="mt-1 text-2xl font-bold text-slate-800">
            {ultima ? formatDate(ultima.data) : "—"}
          </div>
          {ultima?.tipo && <div className="mt-1 text-xs text-slate-400">{ultima.tipo}</div>}
        </div>
        <div className="card border-brand-200 bg-brand-50 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Ore motore stimate oggi</div>
          <div className="mt-1 text-2xl font-bold text-brand-700">
            {oreMotoStimate != null ? formatNumber(oreMotoStimate, 0) : "—"}
          </div>
          {ultimaConOre?.oreMoto != null && (
            <div className="mt-1 text-xs text-slate-400">
              lettura {formatNumber(ultimaConOre.oreMoto, 0)} al {formatDate(ultimaConOre.data)} +
              produzione PLC
            </div>
          )}
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Interventi {annoCorrente}
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{interventiAnno}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Interventi totali</div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{manutenzioni.length}</div>
        </div>
      </div>

      {/* Prossime scadenze */}
      <div className="card mb-6 p-5">
        <h3 className="mb-1 font-semibold text-slate-800">⏰ Prossime scadenze</h3>
        <p className="mb-3 text-xs text-slate-500">
          Calcolate dall&apos;ultima manutenzione di ogni tipo + intervallo del piano, rispetto alle
          ore moto stimate{mediaOreGiorno ? ` (media attuale ${formatNumber(mediaOreGiorno, 1)} h moto/giorno)` : ""}.
        </p>
        {scadenze.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nessun piano attivo: aggiungine uno qui sotto (es. M2 ogni 2.000 ore).
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scadenze.map(({ piano, ultimaDelTipo, residue, giorni }) => {
              const stato =
                residue == null
                  ? { cls: "border-slate-200", txt: "—" }
                  : residue <= 0
                    ? { cls: "border-red-300 bg-red-50", txt: "SCADUTA" }
                    : residue < 100
                      ? { cls: "border-red-300 bg-red-50", txt: `tra ${formatNumber(residue, 0)} h` }
                      : residue < 500
                        ? { cls: "border-amber-300 bg-amber-50", txt: `tra ${formatNumber(residue, 0)} h` }
                        : { cls: "border-green-200 bg-green-50", txt: `tra ${formatNumber(residue, 0)} h` };
              return (
                <div key={piano.id} className={`rounded-xl border p-4 ${stato.cls}`}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold text-slate-800">{piano.tipo}</span>
                    <span className="text-xs text-slate-500">ogni {formatNumber(piano.intervalloOre, 0)} h</span>
                  </div>
                  {ultimaDelTipo ? (
                    <>
                      <div className={`mt-1 text-xl font-bold ${residue != null && residue < 100 ? "text-red-700" : "text-slate-800"}`}>
                        {stato.txt}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        ultima: {formatDate(ultimaDelTipo.data)} a{" "}
                        {formatNumber(ultimaDelTipo.oreMoto!, 0)} h
                        {giorni != null && residue != null && residue > 0 && (
                          <span className="block">≈ {giorni} giorni</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm text-slate-400">
                      Nessun intervento {piano.tipo} con ore moto registrato.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {manutenzioni.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Nessun intervento registrato.{" "}
          <Link href="/biogas/manutenzioni/nuova" className="text-brand-600 underline">
            Carica il primo rapporto
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-4">
          {manutenzioni.map((m) => (
            <details key={m.id} className="card overflow-hidden">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4 hover:bg-slate-50">
                <span className="font-bold text-slate-800">{formatDate(m.data)}</span>
                {m.tipo && <span className="badge bg-brand-50 text-brand-700">{m.tipo}</span>}
                <span className="text-sm text-slate-600">{m.descrizione ?? "—"}</span>
                <span className="ml-auto flex items-center gap-3 text-sm text-slate-500">
                  {m.oreMoto != null && <span>⏱ {formatNumber(m.oreMoto, 0)} h moto</span>}
                  {m.ricambi.length > 0 && <span>🔩 {m.ricambi.length} ricambi</span>}
                  {m.odlNumero && <span className="text-slate-400">OdL {m.odlNumero}</span>}
                </span>
              </summary>
              <div className="border-t border-slate-100 p-4">
                <div className="mb-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Info label="Ditta / tecnico" value={[m.ditta, m.tecnico].filter(Boolean).join(" · ") || "—"} />
                  <Info label="Ore lavoro" value={m.oreLavoro != null ? `${formatNumber(m.oreLavoro, 2)} h` : "—"} />
                  <Info label="Ore viaggio" value={m.oreViaggio != null ? `${formatNumber(m.oreViaggio, 2)} h` : "—"} />
                  <Info label="Km trasferta" value={m.km != null ? formatNumber(m.km, 0) : "—"} />
                </div>
                {m.commento && (
                  <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {m.commento}
                  </p>
                )}
                {m.ricambi.length > 0 && (
                  <table className="mb-3 w-full text-sm">
                    <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">Codice</th>
                        <th className="py-2 pr-3">Ricambio</th>
                        <th className="py-2 text-right">Q.tà</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {m.ricambi.map((r) => (
                        <tr key={r.id}>
                          <td className="py-1.5 pr-3 font-medium text-slate-700">{r.codice}</td>
                          <td className="py-1.5 pr-3 text-slate-600">{r.descrizione ?? "—"}</td>
                          <td className="py-1.5 text-right">{formatNumber(r.quantita, r.quantita % 1 ? 1 : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="flex items-center gap-4">
                  {m.allegatoId && (
                    <a
                      href={`/api/manutenzione/pdf/${m.allegatoId}`}
                      target="_blank"
                      className="text-sm font-medium text-brand-600 hover:text-brand-800"
                    >
                      📄 Rapporto PDF
                    </a>
                  )}
                  <DeleteButton
                    action={deleteManutenzione}
                    id={m.id}
                    confirmMessage="Eliminare questo intervento (con i suoi ricambi)?"
                  />
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Piani di manutenzione */}
      <div className="card mt-6 max-w-2xl overflow-hidden">
        <h3 className="px-4 pt-4 font-semibold text-slate-800">Piani di manutenzione</h3>
        <p className="px-4 pt-1 text-xs text-slate-500">
          Imposta gli intervalli del tuo contratto (es. M2 ogni 2.000 ore moto).
        </p>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Intervallo (ore moto)</th>
              <th className="px-4 py-2">Attivo</th>
              <th className="px-4 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {piani.map((p) => {
              const action = updatePiano.bind(null, p.id);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2">
                    <form id={`pm-${p.id}`} action={action} className="contents" />
                    <input form={`pm-${p.id}`} name="tipo" defaultValue={p.tipo} required className="input w-24" />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      form={`pm-${p.id}`}
                      name="intervalloOre"
                      type="number"
                      min={1}
                      defaultValue={p.intervalloOre}
                      required
                      className="input w-32"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      form={`pm-${p.id}`}
                      name="attivo"
                      type="checkbox"
                      defaultChecked={p.attivo}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-3">
                      <button form={`pm-${p.id}`} type="submit" className="btn-primary !py-1.5">
                        Salva
                      </button>
                      <form action={deletePiano}>
                        <input type="hidden" name="id" value={p.id} />
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
        <form action={addPiano} className="flex flex-wrap items-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
          <div>
            <label className="label" htmlFor="pm-tipo">
              Tipo
            </label>
            <input id="pm-tipo" name="tipo" required className="input w-24" placeholder="M4" />
          </div>
          <div>
            <label className="label" htmlFor="pm-intervallo">
              Ogni (ore moto)
            </label>
            <input id="pm-intervallo" name="intervalloOre" type="number" min={1} required className="input w-32" placeholder="4000" />
          </div>
          <button type="submit" className="btn-secondary">
            + Aggiungi piano
          </button>
        </form>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}
