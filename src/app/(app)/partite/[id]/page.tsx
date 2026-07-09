import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import DeleteButton from "@/components/DeleteButton";
import { deletePartita, setStatoPartita, deleteVendita } from "@/app/actions/partite";
import { formatDate, formatKg, formatEuro, formatNumber } from "@/lib/format";
import { pesoPartita } from "@/lib/capienza";
import { calcolaMetriche } from "@/lib/bonus";
import GiacenzaEditor, { type BoxOpt } from "./GiacenzaEditor";
import SpostamentoForm from "./SpostamentoForm";
import VenditaForm from "./VenditaForm";
import DdtSuiniForm from "./DdtSuiniForm";
import { deleteDdtSuini } from "@/app/actions/partite";
import { LETTERE_DOP } from "@/lib/lotto";

export const dynamic = "force-dynamic";

export default async function PartitaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [partita, boxes, spostamenti, curva, mortAgg, vendite, consumi, boxLG] =
    await Promise.all([
      prisma.partita.findUnique({
        where: { id },
        include: {
          giacenze: { include: { box: { include: { stalla: { select: { nome: true } } } } } },
          ddt: { orderBy: { data: "asc" } },
        },
      }),
      prisma.box.findMany({
        orderBy: { numero: "asc" },
        include: { stalla: { select: { nome: true } } },
      }),
      prisma.spostamentoBox.findMany({
        where: { partitaId: id },
        orderBy: { data: "desc" },
        take: 15,
        include: { boxDa: { select: { numero: true } }, boxA: { select: { numero: true } } },
      }),
      prisma.curvaAccrescimento.findMany({ select: { giorno: true, pesoKg: true } }),
      prisma.mortalita.aggregate({ where: { partitaId: id }, _sum: { quantita: true } }),
      prisma.venditaSuini.findMany({
        where: { partitaId: id },
        orderBy: { data: "desc" },
        include: { boxes: { include: { box: { select: { numero: true } } } } },
      }),
      prisma.consumoMangime.findMany({ select: { lineaId: true, gruppoId: true, quantitaKg: true } }),
      prisma.box.findMany({
        where: { lineaId: { not: null }, gruppoId: { not: null } },
        select: { lineaId: true, gruppoId: true, giacenze: { select: { partitaId: true, quantita: true } } },
      }),
    ]);
  if (!partita) notFound();

  const presenti = partita.giacenze.reduce((s, g) => s + g.quantita, 0);
  const pesoCorrente = pesoPartita(partita, curva);
  const morti = mortAgg._sum.quantita ?? 0;
  const venduti = vendite.reduce((s, v) => s + v.numeroCapi, 0);
  const kgVenduti = vendite.reduce((s, v) => s + (v.pesoTotaleKg ?? 0), 0) || null;

  // Stima mangime allocato alla partita (proporzionale ai capi per Linea+Gruppo)
  const totLG = new Map<string, number>();
  const partLG = new Map<string, number>();
  for (const b of boxLG) {
    const key = `${b.lineaId}:${b.gruppoId}`;
    for (const g of b.giacenze) {
      totLG.set(key, (totLG.get(key) ?? 0) + g.quantita);
      if (g.partitaId === id) partLG.set(key, (partLG.get(key) ?? 0) + g.quantita);
    }
  }
  let mangimeStimato = 0;
  for (const c of consumi) {
    const key = `${c.lineaId}:${c.gruppoId}`;
    const tot = totLG.get(key) ?? 0;
    const part = partLG.get(key) ?? 0;
    if (tot > 0 && part > 0) mangimeStimato += c.quantitaKg * (part / tot);
  }
  mangimeStimato = Math.round(mangimeStimato);

  const mangimeKg = partita.mangimeTotaleKg ?? (mangimeStimato > 0 ? mangimeStimato : null);

  const m = calcolaMetriche({
    immessi: partita.numeroCapiArrivati,
    morti,
    venduti,
    kgRicevuti: partita.pesoTotaleArrivoKg,
    kgVenduti,
    mangimeKg,
  });

  const correntePerBox = new Map(partita.giacenze.map((g) => [g.boxId, g.quantita]));
  const boxOpts: BoxOpt[] = boxes.map((b) => ({
    id: b.id,
    numero: b.numero,
    stalla: b.stalla.nome,
    corrente: correntePerBox.get(b.id) ?? 0,
  }));
  const boxesConCapi = boxOpts.filter((b) => b.corrente > 0);
  const giacenzeOrdinate = [...partita.giacenze].sort((a, b) => a.box.numero - b.box.numero);

  return (
    <div>
      <PageHeader
        title={`Partita ${partita.codice}`}
        subtitle={`Arrivo ${formatDate(partita.dataArrivo)} · ${partita.numeroCapiArrivati} capi`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="Stato">
          <StatusBadge
            value={partita.stato === "ATTIVA" ? "ATTIVO" : "CHIUSO"}
            label={partita.stato === "ATTIVA" ? "Attiva" : "Chiusa"}
          />
        </Stat>
        <Stat label="Arrivati">{partita.numeroCapiArrivati}</Stat>
        <Stat label="Presenti">{presenti}</Stat>
        <Stat label="Morti">{morti}</Stat>
        <Stat label="Venduti">{venduti}</Stat>
        <Stat label="Peso medio">
          {formatKg(Math.round(pesoCorrente))}
          {partita.giorniCiclo != null && partita.pesoMedioManualeKg == null && (
            <span className="block text-xs font-normal text-slate-400">giorno {partita.giorniCiclo}</span>
          )}
        </Stat>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href={`/partite/${partita.id}/modifica`} className="btn-secondary">
          Modifica dati
        </Link>
        <Link href={`/partite/${partita.id}/report`} className="btn-secondary">
          🖨️ Report macello
        </Link>
        <form action={setStatoPartita}>
          <input type="hidden" name="id" value={partita.id} />
          <input type="hidden" name="stato" value={partita.stato === "ATTIVA" ? "CHIUSA" : "ATTIVA"} />
          <button type="submit" className="btn-secondary">
            {partita.stato === "ATTIVA" ? "Chiudi ciclo" : "Riapri ciclo"}
          </button>
        </form>
        <form action={deletePartita}>
          <input type="hidden" name="id" value={partita.id} />
          <button type="submit" className="btn-danger">
            Elimina partita
          </button>
        </form>
      </div>

      {/* Classificazione DOP */}
      <div className="card mb-6 p-5">
        <h3 className="mb-3 font-semibold text-slate-800">Classificazione lotto</h3>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <Info label="Fornitore" value={partita.fornitore ?? "—"} />
          <Info label="Genetica" value={partita.genetica ?? "—"} />
          <Info label="Tatuaggio" value={partita.tatuaggio ?? "—"} />
          <Info
            label="Lettera (nascita)"
            value={
              partita.lettera
                ? `${partita.lettera} — ${
                    LETTERE_DOP.find((l) => l.lettera === partita.lettera)?.nomeMese ?? ""
                  }`
                : "—"
            }
          />
          <Info
            label="Vendita da (9 mesi)"
            value={
              partita.venditaMese
                ? new Date(`${partita.venditaMese}-01`).toLocaleDateString("it-IT", {
                    month: "long",
                    year: "numeric",
                  })
                : "—"
            }
            accent
          />
        </div>
      </div>

      {/* DDT di carico */}
      <div className="card mb-6 p-5">
        <h3 className="mb-1 font-semibold text-slate-800">DDT di carico</h3>
        <p className="mb-3 text-xs text-slate-500">
          Capi arrivati, peso ricevuto e peso medio della partita si aggiornano automaticamente
          dalla somma dei DDT.
        </p>
        {partita.ddt.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">DDT</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2 text-right">Suini</th>
                  <th className="px-3 py-2 text-right">Peso</th>
                  <th className="px-3 py-2 text-right">Peso medio</th>
                  <th className="px-3 py-2">Modello 4</th>
                  <th className="px-3 py-2">AT</th>
                  <th className="px-3 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partita.ddt.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-700">{d.numero}</td>
                    <td className="px-3 py-2 text-slate-600">{formatDate(d.data)}</td>
                    <td className="px-3 py-2 text-right font-medium">{d.quantita}</td>
                    <td className="px-3 py-2 text-right">{formatKg(d.pesoKg)}</td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {d.pesoKg && d.quantita > 0
                        ? formatKg(Math.round((d.pesoKg / d.quantita) * 10) / 10)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {d.modello4Numero
                        ? `${d.modello4Numero}${d.modello4Data ? ` · ${formatDate(d.modello4Data)}` : ""}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {d.atNumero
                        ? `${d.atNumero}${d.atData ? ` · ${formatDate(d.atData)}` : ""}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <DeleteButton
                        action={deleteDdtSuini}
                        id={d.id}
                        confirmMessage={`Eliminare il DDT ${d.numero}? I totali della partita verranno ricalcolati.`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-100 pt-4">
          <DdtSuiniForm partitaId={partita.id} />
        </div>
      </div>

      {/* Fine ciclo / bonus */}
      <div className="card mb-6 p-5">
        <h3 className="mb-4 font-semibold text-slate-800">Fine ciclo · indici e bonus</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Mortalità"
            value={m.mortalitaPct != null ? `${formatNumber(m.mortalitaPct, 2)} %` : "—"}
            hint={`${morti} / ${partita.numeroCapiArrivati}`}
          />
          <Metric
            label="Resa (venduti)"
            value={m.resaPct != null ? `${formatNumber(m.resaPct, 1)} %` : "—"}
          />
          <Metric
            label="ICA"
            value={m.ica != null ? `1 : ${formatNumber(m.ica, 3)}` : "—"}
            hint={
              mangimeKg != null && kgVenduti != null && partita.pesoTotaleArrivoKg != null
                ? `${formatKg(mangimeKg)} / (${formatKg(kgVenduti)} − ${formatKg(partita.pesoTotaleArrivoKg)})`
                : "servono mangime, kg venduti e kg ricevuti"
            }
          />
          <Metric label="Bonus stimato" value={formatEuro(m.bonusTotale)} accent />
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <BonusRow label="Bonus mortalità" perCapo={m.bonusMortalitaCapo} venduti={venduti} />
          <BonusRow label="Bonus ICA" perCapo={m.bonusIcaCapo} venduti={venduti} />
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="text-xs text-slate-500">Mangime totale</div>
            <div className="font-medium">
              {mangimeKg != null ? formatKg(mangimeKg) : "—"}
              {partita.mangimeTotaleKg == null && mangimeStimato > 0 && (
                <span className="block text-xs font-normal text-slate-400">stimato dai consumi</span>
              )}
            </div>
          </div>
          {m.penale && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
              <div className="text-xs font-medium">⚠ Penale</div>
              <div className="text-xs">Mortalità oltre il 4%: prevista penale contrattuale.</div>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Bonus mortalità: €4/capo se ≤3,5% · €2/capo se ≤4%. Bonus ICA: €1,5 se ≤3,45 · €1,0 se ≤3,5 ·
          €0,8 se ≤3,57. Applicati ai capi venduti.
        </p>
      </div>

      {presenti !== partita.numeroCapiArrivati && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Capi distribuiti nei box ({presenti}) diversi dai capi arrivati ({partita.numeroCapiArrivati}).
        </p>
      )}

      {/* Distribuzione */}
      <div className="card mb-6 p-5">
        <h3 className="mb-3 font-semibold text-slate-800">Distribuzione nei box</h3>
        {giacenzeOrdinate.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">Nessun capo ancora distribuito.</p>
        ) : (
          <div className="mb-4 flex flex-wrap gap-2">
            {giacenzeOrdinate.map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm"
              >
                <span className="font-medium text-slate-700">Box {g.box.numero}</span>
                <span className="text-slate-600">{g.quantita} capi</span>
              </span>
            ))}
          </div>
        )}
        <div className="border-t border-slate-100 pt-4">
          <GiacenzaEditor partitaId={partita.id} boxes={boxOpts} />
        </div>
      </div>

      {/* Spostamenti */}
      <div className="card mb-6 p-5">
        <h3 className="mb-3 font-semibold text-slate-800">Sposta capi tra box</h3>
        <SpostamentoForm partitaId={partita.id} boxesConCapi={boxesConCapi} tuttiBox={boxOpts} />
      </div>

      {/* Vendite */}
      <div className="card mb-6 p-5">
        <h3 className="mb-3 font-semibold text-slate-800">Vendite / uscite al macello</h3>
        <VenditaForm
          partitaId={partita.id}
          boxes={boxesConCapi.map((b) => ({ boxId: b.id, numero: b.numero, capi: b.corrente }))}
        />
        {vendite.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {vendite.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-slate-700">
                  {formatDate(v.data)} · {v.numeroCapi} capi · {formatKg(v.pesoTotaleKg)} ·{" "}
                  {formatEuro(v.prezzo)}
                  {v.macello && <span className="text-slate-400"> · {v.macello}</span>}
                  {v.ddtNumero && <span className="text-slate-400"> · DDT {v.ddtNumero}</span>}
                  {v.boxes.length > 0 && (
                    <span className="block text-xs text-slate-400">
                      da{" "}
                      {v.boxes
                        .sort((a, b) => a.box.numero - b.box.numero)
                        .map((b) => `Box ${b.box.numero} (${b.quantita})`)
                        .join(", ")}
                    </span>
                  )}
                  {!v.dop && (
                    <span className="badge ml-2 bg-amber-100 text-amber-800">NON DOP</span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  {v.dop && (
                    <Link
                      href={`/partite/${partita.id}/am/${v.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-800"
                    >
                      🖨️ AM
                    </Link>
                  )}
                  <DeleteButton action={deleteVendita} id={v.id} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Storico spostamenti */}
      {spostamenti.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-semibold text-slate-800">Ultimi spostamenti</h3>
          <ul className="divide-y divide-slate-100 text-sm">
            {spostamenti.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span className="text-slate-700">
                  {s.quantita} capi · Box {s.boxDa?.numero ?? "?"} → Box {s.boxA?.numero ?? "?"}
                </span>
                <span className="text-slate-400">{formatDate(s.data)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${accent ? "bg-brand-50" : "bg-slate-50"}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`font-medium capitalize ${accent ? "text-brand-700" : "text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-800">{children}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-brand-200 bg-brand-50" : "border-slate-200"}`}>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ? "text-brand-700" : "text-slate-800"}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

function BonusRow({ label, perCapo, venduti }: { label: string; perCapo: number; venduti: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium">
        {formatEuro(perCapo)}/capo{" "}
        <span className="text-xs font-normal text-slate-400">× {venduti} = {formatEuro(perCapo * venduti)}</span>
      </div>
    </div>
  );
}
