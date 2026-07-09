import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import DeleteButton from "@/components/DeleteButton";
import RazioneForm from "./RazioneForm";
import ApplicaRampeButton from "./ApplicaRampeButton";
import { deleteRazione } from "@/app/actions/razione";
import { formatDate, formatKg, formatNumber } from "@/lib/format";
import { startOfDay, percentualeDaRampa } from "@/lib/razione";

export const dynamic = "force-dynamic";

export default async function RazionePage() {
  const oggi = startOfDay(new Date());

  const [giacenze, linee, gruppi, oggiRazioni, storico] = await Promise.all([
    prisma.giacenza.findMany({
      where: { quantita: { gt: 0 } },
      include: { box: { select: { numero: true } } },
    }),
    prisma.linea.findMany({ orderBy: { ordine: "asc" } }),
    prisma.gruppo.findMany({ orderBy: { ordine: "asc" } }),
    prisma.razioneBox.findMany({
      where: { data: oggi },
      include: { box: { select: { numero: true } } },
      orderBy: { box: { numero: "asc" } },
    }),
    prisma.razioneBox.findMany({
      orderBy: [{ data: "desc" }, { box: { numero: "asc" } }],
      take: 100,
      include: { box: { select: { numero: true } } },
    }),
  ]);

  const boxConRampa = await prisma.box.findMany({
    where: { rampaId: { not: null } },
    orderBy: { numero: "asc" },
    include: {
      rampa: true,
      razioni: { orderBy: { data: "desc" }, take: 1 },
      giacenze: { where: { quantita: { gt: 0 } }, select: { quantita: true } },
    },
  });

  // Box occupati per il select
  const boxCapi = new Map<string, { numero: number; capi: number }>();
  for (const g of giacenze) {
    const cur = boxCapi.get(g.boxId) ?? { numero: g.box.numero, capi: 0 };
    cur.capi += g.quantita;
    boxCapi.set(g.boxId, cur);
  }
  const boxOpts = [...boxCapi.entries()]
    .map(([id, v]) => ({ id, label: `Box ${v.numero} (${v.capi} capi)`, numero: v.numero }))
    .sort((a, b) => a.numero - b.numero)
    .map(({ id, label }) => ({ id, label }));

  const kgOggi = oggiRazioni.reduce((s, r) => s + r.kgTotale, 0);

  return (
    <div>
      <PageHeader
        title="Razione giornaliera"
        subtitle="Percentuale della razione standard, correlata alla curva di accrescimento"
      />

      <RazioneForm
        boxes={boxOpts}
        linee={linee.map((l) => ({ id: l.id, label: l.nome }))}
        gruppi={gruppi.map((g) => ({ id: g.id, label: g.nome }))}
      />

      {/* Rampe attive */}
      <div className="card mb-6 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-800">Rampe automatiche</h3>
          <div className="flex items-center gap-3">
            <ApplicaRampeButton />
            <Link href="/razione/rampe" className="text-sm text-brand-600 hover:underline">
              Gestisci rampe
            </Link>
          </div>
        </div>
        {boxConRampa.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nessun box con rampa assegnata. Assegna una rampa dalla scheda del box.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Box</th>
                  <th className="px-3 py-2">Rampa</th>
                  <th className="px-3 py-2 text-right">Ultima %</th>
                  <th className="px-3 py-2">Del</th>
                  <th className="px-3 py-2 text-right">% prevista oggi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boxConRampa.map((b) => {
                  const ultima = b.razioni[0];
                  const haCapi = b.giacenze.length > 0;
                  const oggiGia =
                    ultima && startOfDay(ultima.data).getTime() >= oggi.getTime();
                  const prevista =
                    ultima && b.rampa
                      ? percentualeDaRampa(ultima.percentuale, ultima.data, b.rampa, oggi)
                      : null;
                  return (
                    <tr key={b.id}>
                      <td className="px-3 py-2 font-medium text-slate-700">Box {b.numero}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {b.rampa?.nome}{" "}
                        <span className="text-xs text-slate-400">
                          ({(b.rampa?.incrementoGiornaliero ?? 0) > 0 ? "+" : ""}
                          {b.rampa?.incrementoGiornaliero}%/gg, max {b.rampa?.percentualeMax}%)
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {ultima ? `${formatNumber(ultima.percentuale, 0)}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {ultima ? formatDate(ultima.data) : "imposta una base"}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-brand-700">
                        {!haCapi
                          ? "box vuoto"
                          : oggiGia
                            ? `${formatNumber(ultima!.percentuale, 0)}% ✓`
                            : prevista != null
                              ? `${formatNumber(prevista, 0)}%`
                              : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Razioni di oggi */}
      <div className="card mb-6 p-5">
        <h3 className="mb-3 font-semibold text-slate-800">
          Oggi · {formatKg(kgOggi)} totali
        </h3>
        {oggiRazioni.length === 0 ? (
          <p className="text-sm text-slate-400">Nessuna razione impostata per oggi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Box</th>
                  <th className="px-3 py-2 text-right">%</th>
                  <th className="px-3 py-2 text-right">Std/capo</th>
                  <th className="px-3 py-2 text-right">Capi</th>
                  <th className="px-3 py-2 text-right">Kg dati</th>
                  <th className="px-3 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {oggiRazioni.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-medium text-slate-700">Box {r.box.numero}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(r.percentuale, 0)}%</td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {formatNumber(r.kgStandardCapo, 2)} kg
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">{r.capi}</td>
                    <td className="px-3 py-2 text-right font-medium text-brand-700">
                      {formatKg(r.kgTotale)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <DeleteButton action={deleteRazione} id={r.id} label="×" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Storico / andamento */}
      <div className="card p-5">
        <h3 className="mb-3 font-semibold text-slate-800">Storico razioni</h3>
        {storico.length === 0 ? (
          <p className="text-sm text-slate-400">Nessuno storico.</p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Box</th>
                  <th className="px-3 py-2 text-right">%</th>
                  <th className="px-3 py-2 text-right">Kg dati</th>
                  <th className="px-3 py-2">Livello</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {storico.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600">{formatDate(r.data)}</td>
                    <td className="px-3 py-2 font-medium text-slate-700">Box {r.box.numero}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(r.percentuale, 0)}%</td>
                    <td className="px-3 py-2 text-right">{formatKg(r.kgTotale)}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {r.livello === "BOX" ? "box" : "linea+gruppo"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
