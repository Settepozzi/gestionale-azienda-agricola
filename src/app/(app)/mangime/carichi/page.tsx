import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import MangimeTabs from "../MangimeTabs";
import CaricoForm from "./CaricoForm";
import DeleteButton from "@/components/DeleteButton";
import { deleteCarico } from "@/app/actions/mangime";
import { formatDate, formatKg } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CarichiPage() {
  const [mangimi, carichi] = await Promise.all([
    prisma.mangime.findMany({ orderBy: { codice: "asc" }, select: { id: true, codice: true, nome: true } }),
    prisma.caricoMangime.findMany({
      orderBy: { data: "desc" },
      include: { mangime: { select: { codice: true, nome: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Mangime" subtitle="Prodotti Comazoo, carichi e consumi" />
      <MangimeTabs active="carichi" />

      {mangimi.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          Prima aggiungi almeno un mangime nella scheda <b>Prodotti</b>.
        </div>
      ) : (
        <>
          <CaricoForm mangimi={mangimi} />

          {carichi.length === 0 ? (
            <div className="card p-8 text-center text-slate-500">Nessun carico registrato.</div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Mangime</th>
                    <th className="px-4 py-3">Lotto</th>
                    <th className="px-4 py-3 text-right">Quantità</th>
                    <th className="px-4 py-3">Cartellino</th>
                    <th className="px-4 py-3 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carichi.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{formatDate(c.data)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {c.mangime.codice}
                        <span className="font-normal text-slate-400"> · {c.mangime.nome}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.numeroLotto || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatKg(c.quantitaKg)}</td>
                      <td className="px-4 py-3">
                        {c.cartellinoId ? (
                          <a
                            href={`/api/cartellino/${c.cartellinoId}`}
                            target="_blank"
                            className="text-sm font-medium text-brand-600 hover:text-brand-800"
                          >
                            📎 Apri
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <DeleteButton action={deleteCarico} id={c.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
