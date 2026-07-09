import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import BoxForm from "./BoxForm";
import { updateBox } from "@/app/actions/box";
import { prisma } from "@/lib/prisma";
import { capienzaAlPeso, type FasciaDensita } from "@/lib/capienza";
import { calcolaDossierBox, type TrattInfo } from "@/lib/trattamenti";
import { formatDate } from "@/lib/format";
import { startOfDay } from "@/lib/razione";

export const dynamic = "force-dynamic";

const PESI_RIFERIMENTO = [30, 50, 85, 110, 130, 150, 180];

export default async function BoxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [box, stalle, linee, gruppi, densita, trattamentiRaw, spostamenti, rampe] =
    await Promise.all([
      prisma.box.findUnique({
        where: { id },
        include: {
          giacenze: {
            include: { partita: { select: { codice: true } } },
            orderBy: { quantita: "desc" },
          },
        },
      }),
      prisma.stalla.findMany({ orderBy: { ordine: "asc" }, select: { id: true, nome: true } }),
      prisma.linea.findMany({ orderBy: { ordine: "asc" }, select: { id: true, nome: true } }),
      prisma.gruppo.findMany({ orderBy: { ordine: "asc" }, select: { id: true, nome: true } }),
      prisma.curvaDensita.findMany(),
      prisma.trattamento.findMany({ include: { boxes: { select: { boxId: true } } } }),
      prisma.spostamentoBox.findMany({ select: { boxDaId: true, boxAId: true, data: true } }),
      prisma.rampaAlimentazione.findMany({
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      }),
    ]);
  if (!box) notFound();

  const action = updateBox.bind(null, id);
  const presenti = box.giacenze.reduce((s, g) => s + g.quantita, 0);
  const fasce: FasciaDensita[] = densita.map((d) => ({
    pesoMaxKg: d.pesoMaxKg,
    mqPerCapo: d.mqPerCapo,
    ordine: d.ordine,
  }));

  const trattamenti: TrattInfo[] = trattamentiRaw.map((t) => ({
    id: t.id,
    farmaco: t.farmaco,
    patologia: t.patologia,
    dataInizio: t.dataInizio,
    dataFine: t.dataFine,
    dataFineSospensione: t.dataFineSospensione,
    giorniSospensione: t.giorniSospensione,
    boxIds: t.boxes.map((b) => b.boxId),
  }));
  const dossier = calcolaDossierBox(id, trattamenti, spostamenti);
  const numeroByBoxId = new Map<string, number>();
  // numeri box per la provenienza (carico leggero)
  const boxNums = await prisma.box.findMany({ select: { id: true, numero: true } });
  boxNums.forEach((b) => numeroByBoxId.set(b.id, b.numero));
  const oggi = startOfDay(new Date());
  const inSospensione = (t: TrattInfo) => t.dataFineSospensione != null && oggi <= t.dataFineSospensione;

  return (
    <div>
      <PageHeader title={`Box ${box.numero}`} subtitle="Dettaglio e configurazione del box" />

      {box.giacenze.length > 0 && (
        <div className="card mb-6 p-5">
          <h3 className="mb-3 font-semibold text-slate-800">
            Giacenza attuale · {presenti} capi
          </h3>
          <ul className="divide-y divide-slate-100 text-sm">
            {box.giacenze.map((g) => (
              <li key={g.id} className="flex justify-between py-2">
                <span className="text-slate-600">Partita {g.partita.codice}</span>
                <span className="font-medium">{g.quantita} capi</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dossier trattamenti (diretti + ereditati dagli spostamenti) */}
      <div className="card mb-6 p-5">
        <h3 className="mb-1 font-semibold text-slate-800">Storico trattamenti</h3>
        <p className="mb-3 text-xs text-slate-500">
          Trattamenti effettuati su questo box e quelli ereditati dai box di provenienza (spostamenti).
        </p>
        {dossier.diretti.length === 0 && dossier.ereditati.length === 0 ? (
          <p className="text-sm text-slate-400">Nessun trattamento.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {dossier.diretti.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium text-slate-800">{t.farmaco}</span>
                  <span className="text-slate-400">
                    {" "}
                    · {formatDate(t.dataInizio)} → {formatDate(t.dataFine)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {t.giorniSospensione > 0 && (
                    <span
                      className={`badge ${
                        inSospensione(t) ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      sosp. fino {formatDate(t.dataFineSospensione)}
                    </span>
                  )}
                </span>
              </li>
            ))}
            {dossier.ereditati.map(({ tratt: t, provenienzaBoxId }) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 opacity-80"
              >
                <span>
                  <span className="font-medium text-slate-700">{t.farmaco}</span>
                  <span className="text-slate-400">
                    {" "}
                    · {formatDate(t.dataInizio)} → {formatDate(t.dataFine)}
                  </span>
                  <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                    da Box {numeroByBoxId.get(provenienzaBoxId) ?? "?"}
                  </span>
                </span>
                {t.giorniSospensione > 0 && (
                  <span
                    className={`badge ${
                      inSospensione(t) ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    sosp. fino {formatDate(t.dataFineSospensione)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Capienza dinamica in base al peso medio */}
      {box.capienzaManuale == null && box.superficieMq > 0 && (
        <div className="card mb-6 p-5">
          <h3 className="mb-1 font-semibold text-slate-800">
            Capienza calcolata ({box.superficieMq} m²)
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            Numero massimo di capi al variare del peso medio (da curva di densità).
          </p>
          <div className="flex flex-wrap gap-2">
            {PESI_RIFERIMENTO.map((peso) => (
              <div
                key={peso}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center"
              >
                <div className="text-xs text-slate-500">{peso} kg</div>
                <div className="text-lg font-bold text-slate-800">
                  {capienzaAlPeso(box.superficieMq, fasce, peso)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <BoxForm
        action={action}
        stalle={stalle}
        linee={linee}
        gruppi={gruppi}
        rampe={rampe}
        initial={{
          numero: box.numero,
          stallaId: box.stallaId,
          lineaId: box.lineaId,
          gruppoId: box.gruppoId,
          tipo: box.tipo,
          superficieMq: box.superficieMq,
          capienzaManuale: box.capienzaManuale,
          rampaId: box.rampaId,
          note: box.note,
        }}
      />
    </div>
  );
}
