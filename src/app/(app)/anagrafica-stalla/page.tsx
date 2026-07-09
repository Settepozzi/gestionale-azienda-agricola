import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import PrintButton from "@/components/PrintButton";
import { LETTERE_DOP } from "@/lib/lotto";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// Riepilogo dell'anagrafica di stalla: capi presenti per box, lotto e lettera.
export default async function AnagraficaStallaPage() {
  const giacenze = await prisma.giacenza.findMany({
    where: { quantita: { gt: 0 } },
    include: {
      box: { include: { stalla: { select: { nome: true, ordine: true } } } },
      partita: {
        select: { id: true, codice: true, lettera: true, tatuaggio: true, dataArrivo: true },
      },
    },
  });

  const totaleCapi = giacenze.reduce((s, g) => s + g.quantita, 0);
  const nomeLettera = (l: string | null) =>
    l ? (LETTERE_DOP.find((x) => x.lettera === l)?.nomeMese ?? "") : "";

  // --- Riepilogo per lotto ---
  type RigaLotto = {
    partitaId: string;
    codice: string;
    lettera: string | null;
    tatuaggio: string | null;
    dataArrivo: Date;
    capi: number;
    boxes: number[];
  };
  const perLotto = new Map<string, RigaLotto>();
  for (const g of giacenze) {
    const r =
      perLotto.get(g.partitaId) ??
      ({
        partitaId: g.partitaId,
        codice: g.partita.codice,
        lettera: g.partita.lettera,
        tatuaggio: g.partita.tatuaggio,
        dataArrivo: g.partita.dataArrivo,
        capi: 0,
        boxes: [],
      } as RigaLotto);
    r.capi += g.quantita;
    r.boxes.push(g.box.numero);
    perLotto.set(g.partitaId, r);
  }
  const lotti = [...perLotto.values()].sort((a, b) => a.codice.localeCompare(b.codice));

  // --- Dettaglio per stalla ---
  const perStalla = new Map<string, { ordine: number; righe: typeof giacenze }>();
  for (const g of giacenze) {
    const nome = g.box.stalla.nome;
    const s = perStalla.get(nome) ?? { ordine: g.box.stalla.ordine, righe: [] as typeof giacenze };
    s.righe.push(g);
    perStalla.set(nome, s);
  }
  const stalle = [...perStalla.entries()].sort((a, b) => a[1].ordine - b[1].ordine);

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Anagrafica stalla"
          subtitle={`${totaleCapi} capi presenti · ${lotti.length} lotti in stalla`}
        />
        <div className="mb-6 flex justify-end">
          <PrintButton />
        </div>
      </div>

      {/* Intestazione stampa */}
      <div className="mb-4 hidden border-b-2 border-slate-800 pb-3 print:block">
        <h1 className="text-xl font-bold text-slate-900">Anagrafica stalla</h1>
        <p className="text-sm text-slate-600">
          Società Agricola Pavesi S.S. · Cod. azienda 056CR016 · Stampato il{" "}
          {formatDate(new Date())} · {totaleCapi} capi presenti
        </p>
      </div>

      {totaleCapi === 0 ? (
        <div className="card p-10 text-center text-slate-500">Nessun capo in stalla.</div>
      ) : (
        <>
          {/* Riepilogo per lotto */}
          <div className="card mb-6 overflow-x-auto print:border-0 print:shadow-none">
            <h3 className="px-4 pt-4 font-semibold text-slate-800">Per lotto</h3>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Lotto</th>
                  <th className="px-4 py-3">Lettera</th>
                  <th className="px-4 py-3">Tatuaggio</th>
                  <th className="px-4 py-3">Arrivo</th>
                  <th className="px-4 py-3 text-right">Capi</th>
                  <th className="px-4 py-3">Box</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lotti.map((l) => (
                  <tr key={l.partitaId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-brand-700">
                      <Link href={`/partite/${l.partitaId}`}>{l.codice}</Link>
                    </td>
                    <td className="px-4 py-3">
                      {l.lettera ? (
                        <span>
                          <b>{l.lettera}</b>
                          <span className="text-slate-400"> ({nomeLettera(l.lettera)})</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.tatuaggio ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(l.dataArrivo)}</td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-slate-800">
                      {l.capi}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {l.boxes.sort((a, b) => a - b).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-bold">
                  <td className="px-4 py-3" colSpan={4}>
                    Totale
                  </td>
                  <td className="px-4 py-3 text-right text-lg text-brand-700">{totaleCapi}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Dettaglio per stalla e box */}
          <div className="grid gap-6 lg:grid-cols-2 print:block">
            {stalle.map(([nome, s]) => {
              const righe = [...s.righe].sort(
                (a, b) => a.box.numero - b.box.numero || a.partita.codice.localeCompare(b.partita.codice)
              );
              const capiStalla = righe.reduce((x, g) => x + g.quantita, 0);
              return (
                <div
                  key={nome}
                  className="card overflow-x-auto print:mb-6 print:border-0 print:shadow-none"
                >
                  <h3 className="px-4 pt-4 font-semibold text-slate-800">
                    {nome} <span className="font-normal text-slate-400">· {capiStalla} capi</span>
                  </h3>
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2">Box</th>
                        <th className="px-4 py-2">Lotto</th>
                        <th className="px-4 py-2">Lettera</th>
                        <th className="px-4 py-2 text-right">Capi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {righe.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-800">
                            <Link href={`/box/${g.boxId}`} className="text-brand-700">
                              Box {g.box.numero}
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-slate-600">{g.partita.codice}</td>
                          <td className="px-4 py-2">
                            {g.partita.lettera ? <b>{g.partita.lettera}</b> : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-medium">{g.quantita}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-300 font-semibold">
                        <td className="px-4 py-2" colSpan={3}>
                          Totale {nome}
                        </td>
                        <td className="px-4 py-2 text-right">{capiStalla}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
