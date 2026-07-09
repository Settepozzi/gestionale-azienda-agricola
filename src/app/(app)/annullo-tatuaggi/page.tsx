import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import PrintButton from "@/components/PrintButton";
import { LETTERE_DOP, annoNascitaDaLettera } from "@/lib/lotto";

export const dynamic = "force-dynamic";

// Registro mensile dei suini distolti dalla DOP (annullo tatuaggi), per
// lettera-mese: decessi + vendite NON DOP. Da riportare sul RIFT entro i
// primi 7 giorni del mese successivo.
export default async function AnnulloTatuaggiPage({
  searchParams,
}: {
  searchParams: Promise<{ mese?: string }>;
}) {
  const sp = await searchParams;
  const oggi = new Date();
  // predefinito: mese precedente (quello da dichiarare)
  const base = sp.mese
    ? new Date(`${sp.mese}-01T00:00:00`)
    : new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1);
  const inizio = new Date(base.getFullYear(), base.getMonth(), 1);
  const fine = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const meseStr = `${inizio.getFullYear()}-${String(inizio.getMonth() + 1).padStart(2, "0")}`;
  const mesePrec = new Date(inizio.getFullYear(), inizio.getMonth() - 1, 1);
  const meseSucc = new Date(inizio.getFullYear(), inizio.getMonth() + 1, 1);
  const linkMese = (d: Date) =>
    `/annullo-tatuaggi?mese=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const [morti, venditeNonDop] = await Promise.all([
    prisma.mortalita.findMany({
      where: { data: { gte: inizio, lt: fine } },
      include: {
        partita: {
          select: { id: true, codice: true, lettera: true, tatuaggio: true, dataArrivo: true },
        },
      },
    }),
    prisma.venditaSuini.findMany({
      where: { data: { gte: inizio, lt: fine }, dop: false },
      include: {
        partita: {
          select: { id: true, codice: true, lettera: true, tatuaggio: true, dataArrivo: true },
        },
      },
    }),
  ]);

  // Aggregazione per partita (= lotto con la sua lettera-mese)
  type Riga = {
    partitaId: string | null;
    codice: string;
    lettera: string | null;
    tatuaggio: string | null;
    dataArrivo: Date | null;
    morti: number;
    distoltiVendita: number;
  };
  const righe = new Map<string, Riga>();
  const keyOf = (p: { id: string; codice: string } | null) => p?.id ?? "senza-partita";
  for (const m of morti) {
    const k = keyOf(m.partita);
    const r =
      righe.get(k) ??
      ({
        partitaId: m.partita?.id ?? null,
        codice: m.partita?.codice ?? "(senza lotto)",
        lettera: m.partita?.lettera ?? null,
        tatuaggio: m.partita?.tatuaggio ?? null,
        dataArrivo: m.partita?.dataArrivo ?? null,
        morti: 0,
        distoltiVendita: 0,
      } as Riga);
    r.morti += m.quantita;
    righe.set(k, r);
  }
  for (const v of venditeNonDop) {
    const k = keyOf(v.partita);
    const r =
      righe.get(k) ??
      ({
        partitaId: v.partita?.id ?? null,
        codice: v.partita?.codice ?? "(senza lotto)",
        lettera: v.partita?.lettera ?? null,
        tatuaggio: v.partita?.tatuaggio ?? null,
        dataArrivo: v.partita?.dataArrivo ?? null,
        morti: 0,
        distoltiVendita: 0,
      } as Riga);
    r.distoltiVendita += v.numeroCapi;
    righe.set(k, r);
  }
  const elenco = [...righe.values()].sort((a, b) => a.codice.localeCompare(b.codice));
  const totale = elenco.reduce((s, r) => s + r.morti + r.distoltiVendita, 0);

  const meseLabel = inizio.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const scadenza = new Date(fine.getFullYear(), fine.getMonth(), 7);

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Annullo tatuaggi"
          subtitle="Suini distolti dalla DOP per lettera-mese (decessi + vendite non DOP)"
        />
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href={linkMese(mesePrec)} className="btn-secondary">
            ← Mese prima
          </Link>
          <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium capitalize text-slate-700">
            {meseLabel}
          </div>
          <Link href={linkMese(meseSucc)} className="btn-secondary">
            Mese dopo →
          </Link>
          <div className="ml-auto">
            <PrintButton />
          </div>
        </div>
      </div>

      {/* Intestazione stampa */}
      <div className="mb-4 hidden border-b-2 border-slate-800 pb-3 print:block">
        <h1 className="text-xl font-bold text-slate-900 capitalize">
          Annullo tatuaggi — {meseLabel}
        </h1>
        <p className="text-sm text-slate-600">
          Società Agricola Pavesi S.S. · Cod. azienda 056CR016
        </p>
      </div>

      <p className="mb-2 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 print:bg-transparent print:px-0">
        Da registrare sul <b>RIFT</b> entro il{" "}
        <b>{scadenza.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</b>{" "}
        (primi 7 giorni del mese successivo).
      </p>
      <p className="mb-4 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 print:bg-transparent print:px-0">
        Campi portale — <b>Mese in cui sono stati distolti i suini:</b>{" "}
        <span className="capitalize">
          {inizio.toLocaleDateString("it-IT", { month: "long" })}
        </span>{" "}
        · <b>Anno:</b> {inizio.getFullYear()}. Una riga della tabella = un inserimento
        (&ldquo;AGGIUNGI&rdquo;).
      </p>

      {elenco.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          Nessun suino distolto dalla DOP in {meseLabel}.
        </div>
      ) : (
        <div className="card overflow-x-auto print:border-0 print:shadow-none">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500 print:bg-transparent">
              <tr>
                <th className="px-4 py-3">Lotto</th>
                <th className="px-4 py-3 text-right">N° suini distolti</th>
                <th className="px-4 py-3">Codice tatuaggio</th>
                <th className="px-4 py-3">Lettera-mese nascita</th>
                <th className="px-4 py-3">Anno di nascita</th>
                <th className="px-4 py-3 text-right">di cui decessi</th>
                <th className="px-4 py-3 text-right">di cui vendite non DOP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {elenco.map((r) => {
                const nomeMese = r.lettera
                  ? LETTERE_DOP.find((l) => l.lettera === r.lettera)?.nomeMese
                  : null;
                const annoNascita =
                  r.lettera && r.dataArrivo
                    ? annoNascitaDaLettera(r.lettera, new Date(r.dataArrivo))
                    : null;
                return (
                  <tr key={r.codice} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.partitaId ? (
                        <Link href={`/partite/${r.partitaId}`} className="text-brand-700">
                          {r.codice}
                        </Link>
                      ) : (
                        r.codice
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-red-700">
                      {r.morti + r.distoltiVendita}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.tatuaggio ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.lettera ? (
                        <span>
                          <b>{r.lettera}</b>
                          {nomeMese && <span className="text-slate-400"> ({nomeMese})</span>}
                        </span>
                      ) : (
                        <span className="text-amber-600">da impostare</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {annoNascita ?? <span className="text-amber-600">?</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{r.morti}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{r.distoltiVendita}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-bold">
                <td className="px-4 py-3">Totale</td>
                <td className="px-4 py-3 text-right text-red-700">{totale}</td>
                <td className="px-4 py-3" colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
