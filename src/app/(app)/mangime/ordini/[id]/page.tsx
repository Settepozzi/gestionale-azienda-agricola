import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import MangimeTabs from "../../MangimeTabs";
import StatusBadge from "@/components/StatusBadge";
import DeleteButton from "@/components/DeleteButton";
import { setStatoOrdine, deleteOrdine, deleteDdt } from "@/app/actions/ordini";
import { formatDate, formatKg } from "@/lib/format";
import DdtForm from "./DdtForm";

export const dynamic = "force-dynamic";

const STATO_LABEL: Record<string, string> = {
  BOZZA: "Bozza",
  INVIATO: "Inviato",
  EVASO: "Evaso",
  ANNULLATO: "Annullato",
};
const STATO_VAL: Record<string, string> = {
  BOZZA: "CHIUSO",
  INVIATO: "SUINI",
  EVASO: "ATTIVO",
  ANNULLATO: "MORTO",
};

export default async function OrdineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ordine, mangimi] = await Promise.all([
    prisma.ordineMangime.findUnique({
      where: { id },
      include: {
        righe: { include: { mangime: { select: { codice: true, nome: true } } } },
        ddt: {
          orderBy: { data: "desc" },
          include: { carichi: { include: { mangime: { select: { codice: true } } } } },
        },
      },
    }),
    prisma.mangime.findMany({ orderBy: { codice: "asc" } }),
  ]);
  if (!ordine) notFound();

  // Ricevuto per mangime (somma carichi di tutti i DDT dell'ordine)
  const ricevutoPerMangime = new Map<string, number>();
  for (const d of ordine.ddt) {
    for (const c of d.carichi) {
      ricevutoPerMangime.set(c.mangimeId, (ricevutoPerMangime.get(c.mangimeId) ?? 0) + c.quantitaKg);
    }
  }

  const righeInit = ordine.righe.map((r) => ({
    mangimeId: r.mangimeId,
    quantitaKg: String(r.quantitaKg),
  }));

  return (
    <div>
      <PageHeader title={`Ordine ${ordine.numero}`} subtitle={`Del ${formatDate(ordine.data)}`} />
      <MangimeTabs active="ordini" />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge value={STATO_VAL[ordine.stato] ?? "CHIUSO"} label={STATO_LABEL[ordine.stato] ?? ordine.stato} />
        {(["BOZZA", "INVIATO", "EVASO", "ANNULLATO"] as const)
          .filter((s) => s !== ordine.stato)
          .map((s) => (
            <form key={s} action={setStatoOrdine}>
              <input type="hidden" name="id" value={ordine.id} />
              <input type="hidden" name="stato" value={s} />
              <button type="submit" className="btn-secondary !py-1.5 text-xs">
                → {STATO_LABEL[s]}
              </button>
            </form>
          ))}
        <form action={deleteOrdine} className="ml-auto">
          <input type="hidden" name="id" value={ordine.id} />
          <button type="submit" className="btn-danger !py-1.5 text-xs">
            Elimina ordine
          </button>
        </form>
      </div>

      {/* Righe ordine */}
      <div className="card mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Mangime</th>
              <th className="px-4 py-3 text-right">Ordinato</th>
              <th className="px-4 py-3 text-right">Ricevuto</th>
              <th className="px-4 py-3 text-right">Differenza</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ordine.righe.map((r) => {
              const ric = ricevutoPerMangime.get(r.mangimeId) ?? 0;
              const diff = ric - r.quantitaKg;
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {r.mangime.codice}
                    <span className="font-normal text-slate-400"> · {r.mangime.nome}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{formatKg(r.quantitaKg)}</td>
                  <td className="px-4 py-3 text-right">{formatKg(ric)}</td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      diff < 0 ? "text-amber-600" : "text-slate-500"
                    }`}
                  >
                    {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${formatKg(diff)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* DDT registrati */}
      {ordine.ddt.length > 0 && (
        <div className="card mb-6 p-5">
          <h3 className="mb-3 font-semibold text-slate-800">DDT collegati</h3>
          <ul className="divide-y divide-slate-100 text-sm">
            {ordine.ddt.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="font-medium text-slate-700">DDT {d.numero}</span>
                  <span className="text-slate-400"> · {formatDate(d.data)}</span>
                  <span className="text-slate-500">
                    {" "}
                    ·{" "}
                    {d.carichi
                      .map((c) => `${c.mangime.codice} ${formatKg(c.quantitaKg)}`)
                      .join(", ")}
                  </span>
                </div>
                <DeleteButton
                  action={deleteDdt}
                  id={d.id}
                  confirmMessage={`Eliminare il DDT ${d.numero}? Verranno rimossi i relativi carichi.`}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Registra DDT in entrata */}
      <div className="card p-5">
        <h3 className="mb-3 font-semibold text-slate-800">Registra DDT in entrata</h3>
        <DdtForm
          ordineId={ordine.id}
          mangimi={mangimi.map((m) => ({ id: m.id, label: `${m.codice} · ${m.nome}` }))}
          righeOrdine={righeInit}
        />
      </div>
    </div>
  );
}
