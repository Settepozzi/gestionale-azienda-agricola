import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatKg } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PartitePage() {
  const partite = await prisma.partita.findMany({
    orderBy: [{ stato: "asc" }, { dataArrivo: "desc" }],
    include: { giacenze: { select: { quantita: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Partite"
        subtitle="Consegne di suini da Comazoo (cicli di soccida)"
        action={{ href: "/partite/nuova", label: "Nuova partita" }}
      />

      {partite.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Nessuna partita registrata.{" "}
          <Link href="/partite/nuova" className="text-brand-600 underline">
            Registra la prima partita
          </Link>
          .
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Lotto</th>
                <th className="px-4 py-3">Fornitore</th>
                <th className="px-4 py-3">Arrivo</th>
                <th className="px-4 py-3 text-right">Arrivati</th>
                <th className="px-4 py-3 text-right">Presenti</th>
                <th className="px-4 py-3 text-right">Peso medio</th>
                <th className="px-4 py-3">Lettera</th>
                <th className="px-4 py-3">Vendita da</th>
                <th className="px-4 py-3">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partite.map((p) => {
                const presenti = p.giacenze.reduce((s, g) => s + g.quantita, 0);
                return (
                  <tr key={p.id} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-brand-700">
                      <Link href={`/partite/${p.id}`} className="block">
                        {p.codice}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.fornitore ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <Link href={`/partite/${p.id}`} className="block">
                        {formatDate(p.dataArrivo)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">{p.numeroCapiArrivati}</td>
                    <td className="px-4 py-3 text-right font-medium">{presenti}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatKg(p.pesoMedioArrivoKg)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.lettera ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">
                      {p.venditaMese
                        ? new Date(`${p.venditaMese}-01`).toLocaleDateString("it-IT", {
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        value={p.stato === "ATTIVA" ? "ATTIVO" : "CHIUSO"}
                        label={p.stato === "ATTIVA" ? "Attiva" : "Chiusa"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
