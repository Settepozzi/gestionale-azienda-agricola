import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { addCausale, updateCausale, deleteCausale } from "@/app/actions/causali";

export const dynamic = "force-dynamic";

export default async function CausaliPage() {
  const causali = await prisma.causaleMortalita.findMany({ orderBy: { ordine: "asc" } });

  return (
    <div>
      <PageHeader title="Causali di mortalità" subtitle="Elenco delle cause di decesso" />

      <div className="card max-w-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Attiva</th>
              <th className="px-4 py-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {causali.map((c) => {
              const action = updateCausale.bind(null, c.id);
              return (
                <tr key={c.id}>
                  <td className="px-4 py-2">
                    <form id={`c-${c.id}`} action={action} className="contents" />
                    <input
                      form={`c-${c.id}`}
                      name="nome"
                      defaultValue={c.nome}
                      required
                      className="input"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      form={`c-${c.id}`}
                      name="attiva"
                      type="checkbox"
                      defaultChecked={c.attiva}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-3">
                      <button form={`c-${c.id}`} type="submit" className="btn-primary !py-1.5">
                        Salva
                      </button>
                      <form action={deleteCausale}>
                        <input type="hidden" name="id" value={c.id} />
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

        <form action={addCausale} className="flex items-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
          <div className="flex-1">
            <label className="label" htmlFor="nome">
              Nuova causale
            </label>
            <input id="nome" name="nome" required className="input" placeholder="es. Ernia" />
          </div>
          <button type="submit" className="btn-secondary">
            + Aggiungi
          </button>
        </form>
      </div>
    </div>
  );
}
