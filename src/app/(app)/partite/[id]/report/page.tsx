import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";
import { calcolaDossierBox, type TrattInfo } from "@/lib/trattamenti";
import { formatDate } from "@/lib/format";
import { startOfDay } from "@/lib/razione";

export const dynamic = "force-dynamic";

// Report trattamenti per la vendita: per ogni box con capi della partita,
// l'elenco dei trattamenti (diretti + ereditati dagli spostamenti).
export default async function ReportPartitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [partita, trattamentiRaw, spostamenti, boxNums] = await Promise.all([
    prisma.partita.findUnique({
      where: { id },
      include: {
        giacenze: {
          where: { quantita: { gt: 0 } },
          include: { box: { include: { stalla: { select: { nome: true } } } } },
        },
      },
    }),
    prisma.trattamento.findMany({ include: { boxes: { select: { boxId: true } } } }),
    prisma.spostamentoBox.findMany({ select: { boxDaId: true, boxAId: true, data: true } }),
    prisma.box.findMany({ select: { id: true, numero: true } }),
  ]);
  if (!partita) notFound();

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
  const dettagli = new Map(trattamentiRaw.map((t) => [t.id, t]));
  const numeroByBoxId = new Map(boxNums.map((b) => [b.id, b.numero]));
  const oggi = startOfDay(new Date());

  const boxesOrdinati = [...partita.giacenze].sort((a, b) => a.box.numero - b.box.numero);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Barra azioni (non stampata) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/partite/${partita.id}`} className="btn-secondary">
          ← Torna alla partita
        </Link>
        <PrintButton />
      </div>

      {/* Intestazione report */}
      <div className="mb-6 border-b-2 border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">
          Registro trattamenti — Partita {partita.codice}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Società Agricola Pavesi S.S. · Via Sette Pozzi 3, 26030 Malagnino (CR) · Cod. azienda
          056CR016
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <span className="text-slate-500">Arrivo:</span>{" "}
            <b>{formatDate(partita.dataArrivo)}</b>
          </div>
          <div>
            <span className="text-slate-500">Capi arrivati:</span>{" "}
            <b>{partita.numeroCapiArrivati}</b>
          </div>
          <div>
            <span className="text-slate-500">Capi presenti:</span>{" "}
            <b>{partita.giacenze.reduce((s, g) => s + g.quantita, 0)}</b>
          </div>
          <div>
            <span className="text-slate-500">Stampato il:</span> <b>{formatDate(new Date())}</b>
          </div>
        </div>
      </div>

      {boxesOrdinati.length === 0 ? (
        <p className="text-slate-500">Nessun capo di questa partita attualmente nei box.</p>
      ) : (
        boxesOrdinati.map((g) => {
          const dossier = calcolaDossierBox(g.boxId, trattamenti, spostamenti);
          const righe = [
            ...dossier.diretti.map((t) => ({ t, provenienza: null as number | null })),
            ...dossier.ereditati.map(({ tratt, provenienzaBoxId }) => ({
              t: tratt,
              provenienza: numeroByBoxId.get(provenienzaBoxId) ?? null,
            })),
          ].sort((a, b) => b.t.dataInizio.getTime() - a.t.dataInizio.getTime());

          const inSosp = righe.some(
            (r) => r.t.dataFineSospensione != null && oggi <= r.t.dataFineSospensione
          );

          return (
            <div key={g.id} className="mb-6 break-inside-avoid">
              <div className="mb-2 flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800">
                  Box {g.box.numero}{" "}
                  <span className="font-normal text-slate-500">
                    ({g.box.stalla.nome}) · {g.quantita} capi
                  </span>
                </h2>
                {inSosp && (
                  <span className="rounded-full bg-red-600 px-3 py-0.5 text-xs font-bold text-white">
                    ⚠ SOSPENSIONE IN CORSO — NON MACELLARE
                  </span>
                )}
              </div>
              {righe.length === 0 ? (
                <p className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-500">
                  Nessun trattamento registrato.
                </p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-400 text-left text-xs uppercase text-slate-500">
                      <th className="py-1.5 pr-2">Farmaco</th>
                      <th className="py-1.5 pr-2">Trattamento</th>
                      <th className="py-1.5 pr-2">Sosp. (gg)</th>
                      <th className="py-1.5 pr-2">Fine sospensione</th>
                      <th className="py-1.5">Origine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {righe.map((r, i) => {
                      const attiva =
                        r.t.dataFineSospensione != null && oggi <= r.t.dataFineSospensione;
                      return (
                        <tr key={`${r.t.id}-${i}`} className="border-b border-slate-200">
                          <td className="py-1.5 pr-2 font-medium text-slate-800">
                            {r.t.farmaco}
                            {r.t.patologia && (
                              <span className="block text-xs font-normal text-slate-500">
                                {r.t.patologia}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 pr-2 text-slate-600">
                            {formatDate(r.t.dataInizio)} → {formatDate(r.t.dataFine)}
                          </td>
                          <td className="py-1.5 pr-2 text-slate-600">{r.t.giorniSospensione}</td>
                          <td className={`py-1.5 pr-2 ${attiva ? "font-bold text-red-700" : "text-slate-600"}`}>
                            {formatDate(r.t.dataFineSospensione)}
                            {attiva && " ⚠"}
                          </td>
                          <td className="py-1.5 text-slate-500">
                            {r.provenienza != null ? `da Box ${r.provenienza}` : "diretto"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })
      )}

      <p className="mt-8 border-t border-slate-300 pt-3 text-xs text-slate-500">
        I trattamenti &quot;ereditati&quot; provengono dai box di origine dei capi spostati: i suini
        presenti nel box possono aver ricevuto tali trattamenti prima dello spostamento.
      </p>
    </div>
  );
}
