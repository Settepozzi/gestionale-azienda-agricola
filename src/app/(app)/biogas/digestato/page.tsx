import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import DeleteButton from "@/components/DeleteButton";
import LineChart, { type Serie } from "@/components/LineChart";
import { deleteAnalisi } from "@/app/actions/analisi-digestato";
import { formatDate, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

// Palette dataviz validata
const C1 = "#2a78d6";
const C2 = "#1baf7a";

const SOGLIA_FOSTAC = 0.3; // sotto = biologia stabile (standard del referto)

export default async function DigestatoPage() {
  const tutte = await prisma.analisiDigestato.findMany({
    orderBy: { data: "asc" },
    select: {
      id: true, data: true, luogo: true, tipo: true, rapportoNumero: true, laboratorio: true,
      ph: true, ce: true, agv: true, tac: true, fosTac: true, nh4: true,
      ss: true, sso: true, cenere: true, acAcetico: true, acPropionico: true,
      acButirrico: true, acIsoButirrico: true, acValerianico: true,
      acIsoValerianico: true, acCaproico: true, hacEq: true,
      ssPct: true, ssoPctSS: true, azotoPctSS: true, fosforoPctSS: true,
      salmonella: true, note: true,
      pdfNome: true, // niente pdfDati: i bytes restano fuori dalla lista
    },
  });
  const analisi = tutte.filter((a) => a.tipo === "PROCESSO");
  const altre = tutte.filter((a) => a.tipo !== "PROCESSO");
  const ultima = analisi[analisi.length - 1];

  const serie = (
    nome: string,
    colore: string,
    campo: (a: (typeof analisi)[number]) => number | null
  ): Serie => ({
    nome,
    colore,
    marcatori: true,
    punti: analisi.map((a) => ({ x: a.data.getTime(), y: campo(a) })),
  });

  const grafici = [
    {
      titolo: "FOS/TAC (stabilità biologica)",
      nota: "Sotto 0,30 la biologia è stabile",
      serie: [serie("FOS/TAC", C1, (a) => a.fosTac)],
      soglie: [{ y: SOGLIA_FOSTAC, label: "limite 0,30" }],
      decimali: 2,
      unita: "",
    },
    {
      titolo: "pH",
      nota: "Valore standard: > 7,20",
      serie: [serie("pH", C1, (a) => a.ph)],
      soglie: [],
      decimali: 2,
      unita: "",
    },
    {
      titolo: "FOS e TAC",
      nota: "AGV (g HAceq/l) e alcalinità TAC (g CaCO3/l)",
      serie: [serie("AGV (FOS)", C1, (a) => a.agv), serie("TAC", C2, (a) => a.tac)],
      soglie: [],
      decimali: 1,
      unita: "g/l",
    },
    {
      titolo: "Azoto ammoniacale",
      nota: "NH4+-N",
      serie: [serie("NH4-N", C1, (a) => a.nh4)],
      soglie: [],
      decimali: 2,
      unita: "g/l",
    },
    {
      titolo: "Sostanza secca",
      nota: "SS totale e frazione organica SSo",
      serie: [serie("SS", C1, (a) => a.ss), serie("SSo", C2, (a) => a.sso)],
      soglie: [],
      decimali: 0,
      unita: "g/kg",
    },
  ];

  const fmtOpz = (v: number | null, dec = 2) => (v != null ? formatNumber(v, dec) : "—");

  return (
    <div>
      <PageHeader
        title="🔬 Analisi digestato"
        subtitle="Referti di laboratorio della biologia (ISF / Schaumann)"
        action={{ href: "/biogas/digestato/nuova", label: "Nuova analisi" }}
      />

      {/* KPI ultima analisi */}
      {ultima && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className={`card p-4 ${
              (ultima.fosTac ?? 0) < SOGLIA_FOSTAC
                ? "border-green-200 bg-green-50"
                : "border-red-300 bg-red-50"
            }`}
          >
            <div className="text-xs uppercase tracking-wide text-slate-400">
              FOS/TAC · {formatDate(ultima.data)}
            </div>
            <div
              className={`mt-1 text-2xl font-bold ${
                (ultima.fosTac ?? 0) < SOGLIA_FOSTAC ? "text-green-700" : "text-red-600"
              }`}
            >
              {fmtOpz(ultima.fosTac)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {(ultima.fosTac ?? 0) < SOGLIA_FOSTAC ? "biologia stabile" : "sopra il limite 0,30"}
            </div>
          </div>
          <Kpi label="pH" value={fmtOpz(ultima.ph)} />
          <Kpi label="NH4-N" value={ultima.nh4 != null ? `${formatNumber(ultima.nh4, 2)} g/l` : "—"} />
          <Kpi
            label="Acido propionico"
            value={ultima.acPropionico != null ? `${formatNumber(ultima.acPropionico, 0)} mg/l` : "< soglia"}
          />
        </div>
      )}

      {analisi.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Nessuna analisi registrata.{" "}
          <Link href="/biogas/digestato/nuova" className="text-brand-600 underline">
            Carica il primo referto
          </Link>
          .
        </div>
      ) : (
        <>
          {/* Grafici di trend */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {grafici.map((g) => (
              <div key={g.titolo} className="card p-5">
                <h3 className="mb-1 font-semibold text-slate-800">{g.titolo}</h3>
                <p className="mb-4 text-xs text-slate-500">{g.nota}</p>
                <LineChart
                  serie={g.serie}
                  soglie={g.soglie}
                  formatoX="data"
                  decimaliY={g.decimali}
                  unitaY={g.unita}
                  height={200}
                />
              </div>
            ))}
          </div>

          {/* Tabella completa */}
          <div className="card overflow-x-auto">
            <h3 className="px-4 pt-4 font-semibold text-slate-800">
              Referti ({analisi.length})
            </h3>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Campionam.</th>
                  <th className="px-3 py-3">Luogo</th>
                  <th className="px-3 py-3 text-right">pH</th>
                  <th className="px-3 py-3 text-right">FOS/TAC</th>
                  <th className="px-3 py-3 text-right">AGV</th>
                  <th className="px-3 py-3 text-right">TAC</th>
                  <th className="px-3 py-3 text-right">NH4-N</th>
                  <th className="px-3 py-3 text-right">SS</th>
                  <th className="px-3 py-3 text-right">Ac. acetico</th>
                  <th className="px-3 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...analisi].reverse().map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-700">{formatDate(a.data)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{a.luogo}</td>
                    <td className="px-3 py-2.5 text-right">{fmtOpz(a.ph)}</td>
                    <td
                      className={`px-3 py-2.5 text-right font-medium ${
                        (a.fosTac ?? 0) >= SOGLIA_FOSTAC ? "text-red-600" : "text-slate-700"
                      }`}
                    >
                      {fmtOpz(a.fosTac)}
                    </td>
                    <td className="px-3 py-2.5 text-right">{fmtOpz(a.agv, 2)}</td>
                    <td className="px-3 py-2.5 text-right">{fmtOpz(a.tac, 2)}</td>
                    <td className="px-3 py-2.5 text-right">{fmtOpz(a.nh4)}</td>
                    <td className="px-3 py-2.5 text-right">{fmtOpz(a.ss, 1)}</td>
                    <td className="px-3 py-2.5 text-right">{fmtOpz(a.acAcetico, 0)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-3">
                        {a.pdfNome && (
                          <a
                            href={`/api/analisi-digestato/pdf/${a.id}`}
                            target="_blank"
                            className="text-sm font-medium text-brand-600 hover:text-brand-800"
                          >
                            PDF
                          </a>
                        )}
                        <DeleteButton action={deleteAnalisi} id={a.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-3 text-xs text-slate-400">
              AGV in g HAceq/l · TAC in g CaCO3/l · NH4-N in g/l · SS in g/kg · acidi in mg/l. Gli
              acidi sotto la soglia di quantificazione restano vuoti.
            </p>
          </div>
        </>
      )}

      {/* Caratterizzazione agronomica e igiene (Eurofins) */}
      {altre.length > 0 && (
        <div className="card mt-6 overflow-x-auto">
          <h3 className="px-4 pt-4 font-semibold text-slate-800">
            🌱 Caratterizzazione agronomica e igiene
          </h3>
          <p className="px-4 pt-1 text-xs text-slate-500">
            Referti per l&apos;uso agronomico del digestato (azoto, fosforo) e controlli igienici.
          </p>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3 text-right">SS %</th>
                <th className="px-3 py-3 text-right">SSo % s.s.</th>
                <th className="px-3 py-3 text-right">Azoto % s.s.</th>
                <th className="px-3 py-3 text-right">Fosforo % s.s.</th>
                <th className="px-3 py-3">Salmonella</th>
                <th className="px-3 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...altre].reverse().map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-700">{formatDate(a.data)}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`badge ${
                        a.tipo === "IGIENE" ? "bg-violet-100 text-violet-800" : "bg-green-100 text-green-800"
                      }`}
                    >
                      {a.tipo === "IGIENE" ? "Igiene" : "Agronomica"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">{fmtOpz(a.ssPct, 1)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtOpz(a.ssoPctSS, 0)}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{fmtOpz(a.azotoPctSS, 1)}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{fmtOpz(a.fosforoPctSS, 1)}</td>
                  <td className="px-3 py-2.5">
                    {a.salmonella ? (
                      <span className={a.salmonella.startsWith("assente") ? "text-green-700" : "font-bold text-red-600"}>
                        {a.salmonella}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-3">
                      {a.pdfNome && (
                        <a
                          href={`/api/analisi-digestato/pdf/${a.id}`}
                          target="_blank"
                          className="text-sm font-medium text-brand-600 hover:text-brand-800"
                        >
                          PDF
                        </a>
                      )}
                      <DeleteButton action={deleteAnalisi} id={a.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}
