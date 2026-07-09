import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import DeleteButton from "@/components/DeleteButton";
import { deleteTrattamento } from "@/app/actions/trattamenti";
import { formatDate } from "@/lib/format";
import { startOfDay } from "@/lib/razione";

export const dynamic = "force-dynamic";

function statoTrattamento(dataFine: Date, dataFineSosp: Date | null, oggi: Date) {
  if (oggi <= dataFine) return { txt: "In corso", cls: "bg-blue-100 text-blue-800" };
  if (dataFineSosp && oggi <= dataFineSosp)
    return { txt: "Sospensione", cls: "bg-red-100 text-red-800" };
  return { txt: "Concluso", cls: "bg-slate-200 text-slate-600" };
}

export default async function TrattamentiPage() {
  const oggi = startOfDay(new Date());
  const session = await getSession();
  const solaLettura = session?.role.startsWith("VETERINARIO") ?? false;
  const trattamenti = await prisma.trattamento.findMany({
    orderBy: { dataInizio: "desc" },
    include: {
      linea: { select: { nome: true } },
      gruppo: { select: { nome: true } },
      boxes: { include: { box: { select: { numero: true } } } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Trattamenti"
        subtitle="Registro trattamenti veterinari (da ricetta)"
        action={solaLettura ? undefined : { href: "/trattamenti/nuovo", label: "Nuovo trattamento" }}
      />

      {trattamenti.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Nessun trattamento registrato.{" "}
          <Link href="/trattamenti/nuovo" className="text-brand-600 underline">
            Registra il primo trattamento
          </Link>
          .
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Farmaco</th>
                <th className="px-4 py-3">Dove</th>
                <th className="px-4 py-3">Periodo</th>
                <th className="px-4 py-3">Sospensione fino a</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trattamenti.map((t) => {
                const dove =
                  t.linea && t.gruppo
                    ? `${t.linea.nome} + ${t.gruppo.nome}`
                    : t.boxes.map((b) => b.box.numero).sort((a, b) => a - b).join(", ");
                const st = statoTrattamento(t.dataFine, t.dataFineSospensione, oggi);
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {t.farmaco}
                      {t.patologia && (
                        <span className="block text-xs font-normal text-slate-400">{t.patologia}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.linea && t.gruppo ? dove : `Box ${dove}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(t.dataInizio)} → {formatDate(t.dataFine)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(t.dataFineSospensione)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${st.cls}`}>{st.txt}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        {t.allegatoId && (
                          <a
                            href={`/api/ricetta/pdf/${t.allegatoId}`}
                            target="_blank"
                            className="text-sm font-medium text-brand-600 hover:text-brand-800"
                          >
                            PDF
                          </a>
                        )}
                        {!solaLettura && <DeleteButton action={deleteTrattamento} id={t.id} />}
                      </div>
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
