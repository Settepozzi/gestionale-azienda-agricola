import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";
import { calcolaDossierBox, type TrattInfo } from "@/lib/trattamenti";
import { formatDate, formatKg } from "@/lib/format";
import { LETTERE_DOP, annoNascitaDaLettera } from "@/lib/lotto";

export const dynamic = "force-dynamic";

// Scheda con i dati da copiare nel portale RIFT per l'AM
// ("Inserimento Attestato per la Macellazione").
export default async function AmPage({
  params,
}: {
  params: Promise<{ id: string; venditaId: string }>;
}) {
  const { id, venditaId } = await params;
  const [partita, vendita, trattamentiRaw, spostamenti] = await Promise.all([
    prisma.partita.findUnique({
      where: { id },
      include: { ddt: { orderBy: { data: "asc" } } },
    }),
    prisma.venditaSuini.findUnique({
      where: { id: venditaId },
      include: { boxes: { include: { box: { select: { numero: true } } } } },
    }),
    prisma.trattamento.findMany({ include: { boxes: { select: { boxId: true } } } }),
    prisma.spostamentoBox.findMany({ select: { boxDaId: true, boxAId: true, data: true } }),
  ]);
  if (!partita || !vendita || vendita.partitaId !== id) notFound();

  const dataVendita = new Date(vendita.data);
  dataVendita.setHours(0, 0, 0, 0);

  // Anno di nascita dalla lettera + data di arrivo
  const annoNascita = partita.lettera
    ? annoNascitaDaLettera(partita.lettera, new Date(partita.dataArrivo))
    : null;
  const nomeLettera = partita.lettera
    ? LETTERE_DOP.find((l) => l.lettera === partita.lettera)?.nomeMese
    : null;

  // AT di ingresso (dai DDT di carico della partita)
  const atList = partita.ddt
    .filter((d) => d.atNumero)
    .map((d) => ({ numero: d.atNumero!, data: d.atData }));

  // Verifica età (9 mesi)
  let etaOk: boolean | null = null;
  let etaLabel = "—";
  if (partita.venditaMese) {
    const [anno, mese] = partita.venditaMese.split("-").map(Number);
    const primoUtile = new Date(anno, (mese ?? 1) - 1, 1);
    etaOk = dataVendita >= primoUtile;
    etaLabel = primoUtile.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  }

  // Verifica sospensioni nei box da cui è avvenuto il carico (o tutti se assenti)
  const tratt: TrattInfo[] = trattamentiRaw.map((t) => ({
    id: t.id,
    farmaco: t.farmaco,
    patologia: t.patologia,
    dataInizio: t.dataInizio,
    dataFine: t.dataFine,
    dataFineSospensione: t.dataFineSospensione,
    giorniSospensione: t.giorniSospensione,
    boxIds: t.boxes.map((b) => b.boxId),
  }));
  const boxProblemi: string[] = [];
  for (const vb of vendita.boxes) {
    const dossier = calcolaDossierBox(vb.boxId, tratt, spostamenti);
    const attivi = [...dossier.diretti, ...dossier.ereditati.map((e) => e.tratt)].filter(
      (t) => t.dataFineSospensione != null && t.dataFineSospensione >= dataVendita
    );
    if (attivi.length > 0)
      boxProblemi.push(`Box ${vb.box.numero}: ${attivi.map((t) => t.farmaco).join(", ")}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/partite/${partita.id}`} className="btn-secondary">
          ← Torna alla partita
        </Link>
        <PrintButton />
      </div>

      <div className="mb-6 border-b-2 border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">
          AM — dati da inserire sul portale RIFT
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          PAVESI COSTANZO — CR189 · Lotto interno {partita.codice} · Stampato il{" "}
          {formatDate(new Date())}
        </p>
      </div>

      {/* Campi del portale, nello stesso ordine della schermata RIFT */}
      <h2 className="mb-2 text-lg font-bold text-slate-800">
        Inserimento Attestato per la Macellazione (AM)
      </h2>
      <table className="mb-6 w-full border-collapse text-sm">
        <tbody>
          <CampoRift
            label="Data di Invio alla Macellazione"
            value={formatDate(vendita.data)}
          />
          <CampoRift
            label="Seleziona il macello destinatario"
            value={vendita.macello ?? "____________________"}
          />
          <CampoRift
            label="Eventuale soccidario per conto di"
            value={partita.fornitore ?? "COMAZOO"}
          />
          <CampoRift
            label="Documento di trasporto o documento equivalente"
            value={vendita.ddtNumero ?? "____________________"}
          />
          <CampoRift
            label="Data del DDT o del documento equivalente"
            value={formatDate(vendita.data)}
          />
        </tbody>
      </table>

      <h2 className="mb-2 text-lg font-bold text-slate-800">
        &ldquo;Si attesta che i tatuaggi apposti sui suini sono così identificabili:&rdquo;
      </h2>
      <table className="mb-2 w-full border-collapse text-sm">
        <tbody>
          <CampoRift label="Numero suini" value={String(vendita.numeroCapi)} bold />
          <CampoRift label="Tatuaggio suini — Codice" value={partita.tatuaggio ?? "—"} bold />
          <CampoRift
            label="Tatuaggio suini — Lettera-Mese"
            value={
              partita.lettera ? `${partita.lettera}${nomeLettera ? ` (${nomeLettera})` : ""}` : "—"
            }
            bold
          />
          <CampoRift
            label="Anno di nascita dei suini"
            value={annoNascita != null ? String(annoNascita) : "—"}
            bold
          />
          <CampoRift
            label="Numero AT ricevuta"
            value={
              atList.length > 0
                ? atList
                    .map((a) => `${a.numero}${a.data ? ` (del ${formatDate(a.data)})` : ""}`)
                    .join(" · ")
                : "—"
            }
            bold
          />
        </tbody>
      </table>
      <p className="mb-6 text-xs text-slate-500">
        ⚠ Il numero di suini deve coincidere con quello del DDT. Se nella consegna ci sono più
        lettere-mese, aggiungere un sub-lotto per ciascuna con &ldquo;AGGIUNGI&rdquo;.
      </p>

      {/* Provenienza dai box */}
      {vendita.boxes.length > 0 && (
        <div className="mb-6 rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="font-medium text-slate-700">Carico effettuato da: </span>
          <span className="text-slate-600">
            {vendita.boxes
              .sort((a, b) => a.box.numero - b.box.numero)
              .map((b) => `Box ${b.box.numero} (${b.quantita} capi)`)
              .join(" · ")}
          </span>
          <span className="text-slate-400"> — peso totale {formatKg(vendita.pesoTotaleKg)}</span>
        </div>
      )}

      {/* Verifiche DOP */}
      <h2 className="mb-2 text-lg font-bold text-slate-800">Verifiche DOP</h2>
      <ul className="mb-6 space-y-2 text-sm">
        <li
          className={`rounded-lg px-3 py-2 ${
            etaOk === false ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"
          }`}
        >
          {etaOk === null
            ? "◻ Età minima: lettera-mese non impostata sul lotto — verificare manualmente."
            : etaOk
              ? `✔ Età minima rispettata: 9 mesi compiuti da ${etaLabel}.`
              : `✘ ETÀ NON RAGGIUNTA: i suini compiono 9 mesi a ${etaLabel}.`}
        </li>
        <li
          className={`rounded-lg px-3 py-2 ${
            boxProblemi.length > 0 ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"
          }`}
        >
          {boxProblemi.length === 0
            ? "✔ Nessun tempo di sospensione farmaci attivo nei box di carico."
            : `✘ SOSPENSIONI ATTIVE — ${boxProblemi.join(" · ")}`}
        </li>
      </ul>

      <div className="mb-6 rounded-xl border-2 border-slate-800 p-4 text-center">
        <p className="text-lg font-bold text-slate-900">
          &ldquo;Suini idonei ai fini della produzione DOP&rdquo;
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Dicitura da riportare sul DDT che accompagna la consegna al macello.
        </p>
      </div>
    </div>
  );
}

function CampoRift({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className="border-b border-slate-200">
      <td className="w-1/2 py-2 pr-4 text-slate-500">{label}</td>
      <td className={`py-2 ${bold ? "text-base font-bold text-slate-900" : "font-medium text-slate-800"}`}>
        {value}
      </td>
    </tr>
  );
}
