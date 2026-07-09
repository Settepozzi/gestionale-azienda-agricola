import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import NuovoTrattamentoClient from "./NuovoTrattamentoClient";

export const dynamic = "force-dynamic";

export default async function NuovoTrattamentoPage() {
  const [boxes, linee, gruppi] = await Promise.all([
    prisma.box.findMany({
      orderBy: { numero: "asc" },
      include: {
        stalla: { select: { nome: true } },
        giacenze: { select: { quantita: true } },
      },
    }),
    prisma.linea.findMany({ orderBy: { ordine: "asc" } }),
    prisma.gruppo.findMany({ orderBy: { ordine: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Nuovo trattamento"
        subtitle="Carica la ricetta PDF oppure compila i campi a mano"
      />
      <NuovoTrattamentoClient
        boxes={boxes.map((b) => ({
          id: b.id,
          numero: b.numero,
          stalla: b.stalla.nome,
          capi: b.giacenze.reduce((s, g) => s + g.quantita, 0),
        }))}
        linee={linee.map((l) => ({ id: l.id, label: l.nome }))}
        gruppi={gruppi.map((g) => ({ id: g.id, label: g.nome }))}
      />
    </div>
  );
}
