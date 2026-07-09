import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import DeleteButton from "@/components/DeleteButton";
import MortalitaForm from "./MortalitaForm";
import { deleteMortalita } from "@/app/actions/mortalita";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MortalitaPage() {
  const [giacenze, causali, morti] = await Promise.all([
    prisma.giacenza.findMany({
      where: { quantita: { gt: 0 } },
      include: {
        box: { select: { numero: true } },
        partita: { select: { codice: true } },
      },
    }),
    prisma.causaleMortalita.findMany({ where: { attiva: true }, orderBy: { ordine: "asc" } }),
    prisma.mortalita.findMany({
      orderBy: { data: "desc" },
      take: 80,
      include: {
        box: { select: { numero: true } },
        partita: { select: { codice: true } },
        causale: { select: { nome: true } },
      },
    }),
  ]);

  const giacenzeOpts = giacenze
    .sort((a, b) => a.box.numero - b.box.numero)
    .map((g) => ({
      value: `${g.boxId}:${g.partitaId}`,
      label: `Box ${g.box.numero} · ${g.partita.codice} (${g.quantita} capi)`,
    }));

  const totMorti = morti.reduce((s, m) => s + m.quantita, 0);

  return (
    <div>
      <PageHeader
        title="Mortalità"
        subtitle={`Registro decessi · ${totMorti} capi totali`}
        action={{ href: "/anagrafiche/causali", label: "Gestisci causali" }}
      />

      <MortalitaForm giacenze={giacenzeOpts} causali={causali} />

      {morti.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">Nessun decesso registrato.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Box</th>
                <th className="px-4 py-3">Partita</th>
                <th className="px-4 py-3 text-right">Capi</th>
                <th className="px-4 py-3">Causale</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {morti.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(m.data)}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">Box {m.box.numero}</td>
                  <td className="px-4 py-3 text-slate-600">{m.partita?.codice ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-700">{m.quantita}</td>
                  <td className="px-4 py-3 text-slate-600">{m.causale?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{m.note || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DeleteButton
                        action={deleteMortalita}
                        id={m.id}
                        label="Annulla"
                        confirmMessage="Annullare questo decesso? I capi verranno ripristinati nel box."
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Registrando un decesso i capi vengono <b>scaricati automaticamente</b> dalla giacenza del box.
      </p>
    </div>
  );
}
