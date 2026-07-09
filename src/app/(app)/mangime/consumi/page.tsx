import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import MangimeTabs from "../MangimeTabs";
import ConsumoForm from "./ConsumoForm";
import DeleteButton from "@/components/DeleteButton";
import { deleteConsumo } from "@/app/actions/mangime";
import { formatDate, formatKg, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ConsumiPage() {
  const [mangimi, linee, gruppi, consumi, boxes] = await Promise.all([
    prisma.mangime.findMany({ orderBy: { codice: "asc" } }),
    prisma.linea.findMany({ orderBy: { ordine: "asc" } }),
    prisma.gruppo.findMany({ orderBy: { ordine: "asc" } }),
    prisma.consumoMangime.findMany({
      orderBy: { data: "desc" },
      take: 60,
      include: {
        mangime: { select: { codice: true } },
        linea: { select: { nome: true } },
        gruppo: { select: { nome: true } },
      },
    }),
    prisma.box.findMany({
      where: { lineaId: { not: null }, gruppoId: { not: null } },
      select: { lineaId: true, gruppoId: true, giacenze: { select: { quantita: true } } },
    }),
  ]);

  // Capi presenti per combinazione Linea+Gruppo (giacenza attuale)
  const capiPerLG = new Map<string, number>();
  for (const b of boxes) {
    const key = `${b.lineaId}:${b.gruppoId}`;
    const capi = b.giacenze.reduce((s, g) => s + g.quantita, 0);
    capiPerLG.set(key, (capiPerLG.get(key) ?? 0) + capi);
  }

  const mancaAnagrafica = mangimi.length === 0 || linee.length === 0 || gruppi.length === 0;

  return (
    <div>
      <PageHeader title="Mangime" subtitle="Prodotti Comazoo, carichi e consumi" />
      <MangimeTabs active="consumi" />

      {mancaAnagrafica ? (
        <div className="card p-8 text-center text-slate-500">
          Servono almeno un <b>mangime</b>, una <b>linea</b> e un <b>gruppo</b> per registrare i consumi.
        </div>
      ) : (
        <>
          <ConsumoForm
            mangimi={mangimi.map((m) => ({ id: m.id, label: `${m.codice} · ${m.nome}` }))}
            linee={linee.map((l) => ({ id: l.id, label: l.nome }))}
            gruppi={gruppi.map((g) => ({ id: g.id, label: g.nome }))}
          />

          <p className="mb-3 text-xs text-slate-500">
            La ripartizione per capo usa i capi <b>attualmente</b> presenti nella combinazione Linea+Gruppo.
          </p>

          {consumi.length === 0 ? (
            <div className="card p-8 text-center text-slate-500">Nessun consumo registrato.</div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Mangime</th>
                    <th className="px-4 py-3">Linea</th>
                    <th className="px-4 py-3">Gruppo</th>
                    <th className="px-4 py-3 text-right">Kg totali</th>
                    <th className="px-4 py-3 text-right">Capi</th>
                    <th className="px-4 py-3 text-right">Kg/capo</th>
                    <th className="px-4 py-3 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consumi.map((c) => {
                    const capi = capiPerLG.get(`${c.lineaId}:${c.gruppoId}`) ?? 0;
                    const kgCapo = capi > 0 ? c.quantitaKg / capi : null;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{formatDate(c.data)}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{c.mangime.codice}</td>
                        <td className="px-4 py-3 text-slate-600">{c.linea?.nome ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{c.gruppo?.nome ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatKg(c.quantitaKg)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{capi}</td>
                        <td className="px-4 py-3 text-right font-medium text-brand-700">
                          {kgCapo != null ? `${formatNumber(kgCapo, 2)} kg` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <DeleteButton action={deleteConsumo} id={c.id} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
