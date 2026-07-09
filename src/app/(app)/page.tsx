import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatDate, formatKg, formatNumber } from "@/lib/format";
import { startOfDay, giornoCiclo } from "@/lib/razione";
import { pesoPartita } from "@/lib/capienza";
import { allocaMangimePerPartita, icaStimato } from "@/lib/ica";

export const dynamic = "force-dynamic";

const MS_G = 24 * 60 * 60 * 1000;

function StatCard({
  label,
  value,
  href,
  icon,
  alert,
}: {
  label: string;
  value: string | number;
  href: string;
  icon: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card flex items-center gap-4 p-5 transition-shadow hover:shadow-md ${
        alert ? "border-red-200 bg-red-50" : ""
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-2xl">
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`text-2xl font-bold ${alert ? "text-red-700" : "text-slate-800"}`}>
          {value}
        </div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const oggi = startOfDay(new Date());
  const domani = new Date(oggi.getTime() + MS_G);
  const setteGgFa = new Date(oggi.getTime() - 7 * MS_G);

  const [
    capiAgg,
    partite,
    mortiSettimana,
    mangimi,
    sospensioniAttive,
    razioniOggi,
    consumiOggi,
    segnalazioniOggi,
    mortiRecenti,
    curva,
    boxLG,
    consumiTutti,
  ] = await Promise.all([
    prisma.giacenza.aggregate({ _sum: { quantita: true } }),
    prisma.partita.findMany({
      where: { stato: "ATTIVA" },
      include: {
        giacenze: { select: { quantita: true } },
        vendite: { select: { pesoTotaleKg: true, numeroCapi: true } },
        mortalita: { select: { quantita: true } },
      },
    }),
    prisma.mortalita.aggregate({ where: { data: { gte: setteGgFa } }, _sum: { quantita: true } }),
    prisma.mangime.findMany({
      include: { carichi: { select: { quantitaKg: true } }, consumi: { select: { quantitaKg: true } } },
    }),
    prisma.trattamento.count({ where: { dataFineSospensione: { gte: oggi } } }),
    prisma.razioneBox.aggregate({ where: { data: oggi }, _sum: { kgTotale: true } }),
    prisma.consumoMangime.aggregate({
      where: { data: { gte: oggi, lt: domani } },
      _sum: { quantitaKg: true },
    }),
    prisma.segnalazionePasto.findMany({
      where: { data: oggi },
      include: { box: { select: { numero: true } } },
    }),
    prisma.mortalita.findMany({
      orderBy: { data: "desc" },
      take: 5,
      include: { box: { select: { numero: true } }, causale: { select: { nome: true } } },
    }),
    prisma.curvaAccrescimento.findMany({ orderBy: { giorno: "asc" } }),
    prisma.box.findMany({
      where: { lineaId: { not: null }, gruppoId: { not: null } },
      select: {
        lineaId: true,
        gruppoId: true,
        giacenze: { select: { partitaId: true, quantita: true } },
      },
    }),
    prisma.consumoMangime.findMany({ select: { lineaId: true, gruppoId: true, quantitaKg: true } }),
  ]);

  const capiPresenti = capiAgg._sum.quantita ?? 0;
  const scortaMangime = mangimi.reduce(
    (s, m) =>
      s +
      m.carichi.reduce((a, c) => a + c.quantitaKg, 0) -
      m.consumi.reduce((a, c) => a + c.quantitaKg, 0),
    0
  );
  const mangimePerPartita = allocaMangimePerPartita(consumiTutti, boxLG);
  const icaTeoricoAlGiorno = (g: number) => {
    const row = curva.reduce<(typeof curva)[number] | null>(
      (best, r) => (r.giorno <= g && (!best || r.giorno > best.giorno) ? r : best),
      null
    );
    return row?.ica ?? null;
  };

  const segnoLabel: Record<string, string> = { PIU: "+", MENO: "−", ZERO: "0" };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Ciao{session ? `, ${session.name}` : ""} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500 capitalize">
            {oggi.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {!session?.role.startsWith("VETERINARIO") && (
            <Link href="/operatore" className="btn-primary">
              🧤 Inserimento giornata
            </Link>
          )}
          <Link href="/riepilogo" className="btn-secondary">
            📋 Riepilogo
          </Link>
          <Link href="/andamento" className="btn-secondary">
            📊 Andamento
          </Link>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Capi presenti" value={capiPresenti} href="/stalle" icon="🐷" />
        <StatCard label="Partite attive" value={partite.length} href="/partite" icon="🚚" />
        <StatCard
          label="Morti (7 gg)"
          value={mortiSettimana._sum.quantita ?? 0}
          href="/mortalita"
          icon="☠️"
        />
        <StatCard label="Scorta mangime" value={formatKg(scortaMangime)} href="/mangime" icon="🌽" />
        <StatCard
          label="Razione oggi"
          value={formatKg(razioniOggi._sum.kgTotale ?? 0)}
          href="/razione"
          icon="🍽️"
        />
        <StatCard
          label="Sospensioni attive"
          value={sospensioniAttive}
          href="/trattamenti"
          icon="💉"
          alert={sospensioniAttive > 0}
        />
      </div>

      {/* Partite attive: indici */}
      <div className="mt-6 card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Partite attive · indici</h2>
          <Link href="/partite" className="text-sm text-brand-600 hover:underline">
            Tutte
          </Link>
        </div>
        {partite.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Nessuna partita attiva.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Partita</th>
                  <th className="px-3 py-2 text-right">Giorno</th>
                  <th className="px-3 py-2 text-right">Peso medio</th>
                  <th className="px-3 py-2 text-right">Presenti</th>
                  <th className="px-3 py-2 text-right">Mortalità</th>
                  <th className="px-3 py-2 text-right">ICA teorico</th>
                  <th className="px-3 py-2 text-right">ICA stimato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partite.map((p) => {
                  const capi = p.giacenze.reduce((s, g) => s + g.quantita, 0);
                  const morti = p.mortalita.reduce((s, m) => s + m.quantita, 0);
                  const kgVenduti = p.vendite.reduce((s, v) => s + (v.pesoTotaleKg ?? 0), 0);
                  const giorno = p.giorniCiclo ?? giornoCiclo(p.dataArrivo, oggi);
                  const peso = pesoPartita(p, curva);
                  const mortPct =
                    p.numeroCapiArrivati > 0 ? (morti / p.numeroCapiArrivati) * 100 : null;
                  const icaT = icaTeoricoAlGiorno(giorno);
                  const icaS = icaStimato({
                    mangimeKg: p.mangimeTotaleKg ?? mangimePerPartita.get(p.id) ?? null,
                    pesoMedioKg: peso,
                    capiPresenti: capi,
                    kgVenduti,
                    kgRicevuti: p.pesoTotaleArrivoKg,
                  });
                  const peggio = icaS != null && icaT != null && icaS > icaT;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-brand-700">
                        <Link href={`/partite/${p.id}`}>{p.codice}</Link>
                      </td>
                      <td className="px-3 py-2 text-right">{giorno}</td>
                      <td className="px-3 py-2 text-right">{formatKg(Math.round(peso))}</td>
                      <td className="px-3 py-2 text-right">{capi}</td>
                      <td className="px-3 py-2 text-right">
                        {mortPct != null ? (
                          <span className={mortPct > 4 ? "font-bold text-red-700" : ""}>
                            {formatNumber(mortPct, 2)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {icaT != null ? formatNumber(icaT, 3) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {icaS != null ? (
                          <span className={peggio ? "font-bold text-red-700" : "font-medium text-green-700"}>
                            {formatNumber(icaS, 3)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Oggi */}
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-800">Oggi in stalla</h2>
          <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">Razione impostata</div>
              <div className="font-bold text-slate-800">
                {formatKg(razioniOggi._sum.kgTotale ?? 0)}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">Consumo registrato</div>
              <div className="font-bold text-slate-800">
                {formatKg(consumiOggi._sum.quantitaKg ?? 0)}
              </div>
            </div>
          </div>
          {segnalazioniOggi.length === 0 ? (
            <p className="text-sm text-slate-400">Nessuna segnalazione pasto oggi.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {segnalazioniOggi
                .sort((a, b) => a.box.numero - b.box.numero)
                .map((s) => (
                  <span
                    key={s.id}
                    className={`badge ${
                      s.segno === "PIU"
                        ? "bg-green-100 text-green-800"
                        : s.segno === "MENO"
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    Box {s.box.numero}: {segnoLabel[s.segno]}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Ultimi decessi */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Ultimi decessi</h2>
            <Link href="/mortalita" className="text-sm text-brand-600 hover:underline">
              Tutti
            </Link>
          </div>
          {mortiRecenti.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Nessun decesso registrato.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {mortiRecenti.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">Box {m.box.numero}</span>
                    <span className="text-slate-400"> · {m.causale?.nome ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-red-700">{m.quantita} capi</span>
                    <span className="text-slate-400">{formatDate(m.data)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
