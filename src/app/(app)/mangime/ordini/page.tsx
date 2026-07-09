import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import MangimeTabs from "../MangimeTabs";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

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

export default async function OrdiniPage() {
  const ordini = await prisma.ordineMangime.findMany({
    orderBy: { data: "desc" },
    include: { righe: true, ddt: { select: { id: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Mangime"
        subtitle="Prodotti Comazoo, carichi e consumi"
        action={{ href: "/mangime/ordini/nuovo", label: "Nuovo ordine" }}
      />
      <MangimeTabs active="ordini" />

      {ordini.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Nessun ordine.{" "}
          <Link href="/mangime/ordini/nuovo" className="text-brand-600 underline">
            Crea il primo ordine
          </Link>
          .
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Numero</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Righe</th>
                <th className="px-4 py-3 text-right">DDT</th>
                <th className="px-4 py-3">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordini.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-brand-700">
                    <Link href={`/mangime/ordini/${o.id}`} className="block">
                      {o.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(o.data)}</td>
                  <td className="px-4 py-3 text-right">{o.righe.length}</td>
                  <td className="px-4 py-3 text-right">{o.ddt.length}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={STATO_VAL[o.stato] ?? "CHIUSO"} label={STATO_LABEL[o.stato] ?? o.stato} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
