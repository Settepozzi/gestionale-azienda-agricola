import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import MappaStalle, { type BoxView } from "./MappaStalle";
import {
  pesoPartita,
  capienzaAlPeso,
  PESO_ARRIVO_DEFAULT,
  type FasciaDensita,
} from "@/lib/capienza";

export const dynamic = "force-dynamic";

export default async function StallePage() {
  const [boxes, curva, densita] = await Promise.all([
    prisma.box.findMany({
      orderBy: { numero: "asc" },
      include: {
        stalla: { select: { nome: true } },
        linea: { select: { nome: true } },
        gruppo: { select: { nome: true } },
        giacenze: {
          include: {
            partita: {
              select: {
                pesoMedioManualeKg: true,
                giorniCiclo: true,
                pesoMedioArrivoKg: true,
              },
            },
          },
        },
      },
    }),
    prisma.curvaAccrescimento.findMany({ select: { giorno: true, pesoKg: true } }),
    prisma.curvaDensita.findMany(),
  ]);

  const fasce: FasciaDensita[] = densita.map((d) => ({
    pesoMaxKg: d.pesoMaxKg,
    mqPerCapo: d.mqPerCapo,
    ordine: d.ordine,
  }));

  const view: BoxView[] = boxes.map((b) => {
    const occupazione = b.giacenze.reduce((s, g) => s + g.quantita, 0);
    // peso di riferimento = peso del gruppo più pesante presente nel box
    const pesi = b.giacenze.map((g) => pesoPartita(g.partita, curva));
    const pesoRif = pesi.length > 0 ? Math.max(...pesi) : PESO_ARRIVO_DEFAULT;
    const capienza =
      b.capienzaManuale != null
        ? b.capienzaManuale
        : capienzaAlPeso(b.superficieMq, fasce, pesoRif);
    return {
      id: b.id,
      numero: b.numero,
      tipo: b.tipo,
      posX: b.posX,
      posY: b.posY,
      larghezza: b.larghezza,
      altezza: b.altezza,
      capienza,
      superficieMq: b.superficieMq,
      pesoRif: Math.round(pesoRif),
      occupazione,
      stallaNome: b.stalla.nome,
      lineaNome: b.linea?.nome ?? null,
      gruppoNome: b.gruppo?.nome ?? null,
    };
  });

  const totaleCapi = view.reduce((s, b) => s + b.occupazione, 0);

  return (
    <div>
      <PageHeader
        title="Mappa stalle"
        subtitle={`${view.length} box · ${totaleCapi} capi presenti`}
      />
      {view.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Nessun box configurato. Esegui il caricamento iniziale con{" "}
          <code className="rounded bg-slate-100 px-1">npm run db:seed-suini</code>.
        </div>
      ) : (
        <MappaStalle boxes={view} />
      )}
    </div>
  );
}
