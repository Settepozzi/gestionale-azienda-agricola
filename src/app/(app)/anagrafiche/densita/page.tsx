import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { updateFascia, addFascia, deleteFascia } from "@/app/actions/densita";

export const dynamic = "force-dynamic";

export default async function DensitaPage() {
  const fasce = await prisma.curvaDensita.findMany({ orderBy: { ordine: "asc" } });

  return (
    <div>
      <PageHeader
        title="Curva di densità"
        subtitle="m² minimi per capo in base al peso medio — usata per calcolare la capienza dei box"
      />

      <div className="card max-w-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Fino a peso (kg)</th>
              <th className="px-4 py-3">m² per capo</th>
              <th className="px-4 py-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fasce.map((f) => {
              const action = updateFascia.bind(null, f.id);
              return (
                <tr key={f.id}>
                  <td className="px-4 py-2">
                    <form id={`f-${f.id}`} action={action} className="contents" />
                    <input
                      form={`f-${f.id}`}
                      name="pesoMaxKg"
                      type="number"
                      step="0.1"
                      min={0}
                      defaultValue={f.pesoMaxKg ?? ""}
                      placeholder="oltre (lascia vuoto)"
                      className="input w-40"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      form={`f-${f.id}`}
                      name="mqPerCapo"
                      type="number"
                      step="0.01"
                      min={0}
                      defaultValue={f.mqPerCapo}
                      required
                      className="input w-32"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-3">
                      <button form={`f-${f.id}`} type="submit" className="btn-primary !py-1.5">
                        Salva
                      </button>
                      <form action={deleteFascia}>
                        <input type="hidden" name="id" value={f.id} />
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

        {/* Nuova fascia */}
        <form
          action={addFascia}
          className="flex flex-wrap items-end gap-3 border-t border-slate-200 bg-slate-50 p-4"
        >
          <div>
            <label className="label" htmlFor="pesoMaxKg">
              Fino a peso (kg)
            </label>
            <input
              id="pesoMaxKg"
              name="pesoMaxKg"
              type="number"
              step="0.1"
              min={0}
              placeholder="vuoto = oltre"
              className="input w-40"
            />
          </div>
          <div>
            <label className="label" htmlFor="mqPerCapo">
              m² per capo
            </label>
            <input
              id="mqPerCapo"
              name="mqPerCapo"
              type="number"
              step="0.01"
              min={0}
              required
              className="input w-32"
            />
          </div>
          <button type="submit" className="btn-secondary">
            + Aggiungi fascia
          </button>
        </form>
      </div>

      <p className="mt-4 max-w-3xl text-sm text-slate-500">
        La capienza di ogni box = superficie ÷ m² per capo al peso medio attuale dei suini. Obiettivo
        contrattuale: <b>1,1 m²/capo oltre i 130 kg</b>.
      </p>
    </div>
  );
}
