import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AccrescimentoPage() {
  const curva = await prisma.curvaAccrescimento.findMany({ orderBy: { giorno: "asc" } });

  return (
    <div>
      <PageHeader
        title="Curva di accrescimento"
        subtitle="Tabella teorica standard (peso e mangime per giorno di ciclo)"
      />

      <div className="card max-w-4xl">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Giorno</th>
                <th className="px-4 py-3 text-right">Peso vivo (kg)</th>
                <th className="px-4 py-3 text-right">Mangime/capo/gg</th>
                <th className="px-4 py-3 text-right">Mangime prog. (kg)</th>
                <th className="px-4 py-3 text-right">ICA prog.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {curva.map((r) => (
                <tr key={r.giorno} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-700">{r.giorno}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(r.pesoKg, 1)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">
                    {formatNumber(r.mangimeCapoGg, 2)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600">
                    {formatNumber(r.mangimeProgKg, 1)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600">
                    {formatNumber(r.ica, 3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        {curva.length} giorni · giorno 1 = arrivo (~30 kg).
      </p>
    </div>
  );
}
