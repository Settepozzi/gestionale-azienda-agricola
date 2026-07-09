import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { addRampa, updateRampa, deleteRampa } from "@/app/actions/rampe";

export const dynamic = "force-dynamic";

export default async function RampePage() {
  const rampe = await prisma.rampaAlimentazione.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { boxes: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Rampe di alimentazione"
        subtitle="Piani automatici: la percentuale cambia da sola ogni giorno"
      />

      <div className="card max-w-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Variazione %/giorno</th>
              <th className="px-4 py-3">Min %</th>
              <th className="px-4 py-3">Max %</th>
              <th className="px-4 py-3 text-right">Box</th>
              <th className="px-4 py-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rampe.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nessuna rampa. Creane una qui sotto (es. &quot;Rampa 1&quot;: +10 al giorno fino a 100%).
                </td>
              </tr>
            )}
            {rampe.map((r) => {
              const action = updateRampa.bind(null, r.id);
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2">
                    <form id={`r-${r.id}`} action={action} className="contents" />
                    <input form={`r-${r.id}`} name="nome" defaultValue={r.nome} required className="input w-36" />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      form={`r-${r.id}`}
                      name="incrementoGiornaliero"
                      type="number"
                      step="0.5"
                      defaultValue={r.incrementoGiornaliero}
                      required
                      className="input w-24"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      form={`r-${r.id}`}
                      name="percentualeMin"
                      type="number"
                      step="1"
                      min={0}
                      defaultValue={r.percentualeMin}
                      className="input w-20"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      form={`r-${r.id}`}
                      name="percentualeMax"
                      type="number"
                      step="1"
                      min={0}
                      defaultValue={r.percentualeMax}
                      className="input w-20"
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600">{r._count.boxes}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-3">
                      <button form={`r-${r.id}`} type="submit" className="btn-primary !py-1.5">
                        Salva
                      </button>
                      <form action={deleteRampa}>
                        <input type="hidden" name="id" value={r.id} />
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

        <form action={addRampa} className="flex flex-wrap items-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
          <div>
            <label className="label" htmlFor="nome">
              Nome
            </label>
            <input id="nome" name="nome" required className="input w-36" placeholder="Rampa 1" />
          </div>
          <div>
            <label className="label" htmlFor="incrementoGiornaliero">
              Variazione %/giorno
            </label>
            <input
              id="incrementoGiornaliero"
              name="incrementoGiornaliero"
              type="number"
              step="0.5"
              required
              className="input w-28"
              placeholder="+10"
            />
          </div>
          <div>
            <label className="label" htmlFor="percentualeMin">
              Min %
            </label>
            <input id="percentualeMin" name="percentualeMin" type="number" defaultValue={0} className="input w-20" />
          </div>
          <div>
            <label className="label" htmlFor="percentualeMax">
              Max %
            </label>
            <input id="percentualeMax" name="percentualeMax" type="number" defaultValue={100} className="input w-20" />
          </div>
          <button type="submit" className="btn-secondary">
            + Crea rampa
          </button>
        </form>
      </div>

      <p className="mt-4 max-w-3xl text-sm text-slate-500">
        Assegna la rampa a un box dalla sua scheda (o dalla pagina{" "}
        <Link href="/razione" className="text-brand-600 underline">
          Razione %
        </Link>
        ). Ogni giorno la percentuale parte dall&apos;ultima registrata e applica la variazione,
        fino al limite. Se imposti una percentuale a mano, quella vince e la rampa riparte da lì.
      </p>
    </div>
  );
}
