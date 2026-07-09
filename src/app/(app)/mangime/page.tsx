import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import MangimeTabs from "./MangimeTabs";
import NuovoMangimeForm from "./NuovoMangimeForm";
import { updateMangime, deleteMangime } from "@/app/actions/mangime";
import { formatKg } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MangimePage() {
  const mangimi = await prisma.mangime.findMany({
    orderBy: { codice: "asc" },
    include: {
      carichi: { select: { quantitaKg: true } },
      consumi: { select: { quantitaKg: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Mangime" subtitle="Prodotti Comazoo, carichi e consumi" />
      <MangimeTabs active="prodotti" />

      <div className="card max-w-4xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Codice</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3 text-right">Giacenza</th>
              <th className="px-4 py-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mangimi.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Nessun mangime. Aggiungine uno qui sotto.
                </td>
              </tr>
            )}
            {mangimi.map((m) => {
              const caricato = m.carichi.reduce((s, c) => s + c.quantitaKg, 0);
              const consumato = m.consumi.reduce((s, c) => s + c.quantitaKg, 0);
              const giacenza = caricato - consumato;
              const action = updateMangime.bind(null, m.id);
              return (
                <tr key={m.id}>
                  <td className="px-4 py-2">
                    <form id={`m-${m.id}`} action={action} className="contents" />
                    <input
                      form={`m-${m.id}`}
                      name="codice"
                      defaultValue={m.codice}
                      required
                      className="input w-32"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      form={`m-${m.id}`}
                      name="nome"
                      defaultValue={m.nome}
                      required
                      className="input"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-700">
                    {formatKg(giacenza)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-3">
                      <button form={`m-${m.id}`} type="submit" className="btn-primary !py-1.5">
                        Salva
                      </button>
                      <form action={deleteMangime}>
                        <input type="hidden" name="id" value={m.id} />
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
        <NuovoMangimeForm />
      </div>
    </div>
  );
}
