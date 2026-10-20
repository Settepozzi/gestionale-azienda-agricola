import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import DeleteButton from "@/components/DeleteButton";
import LineChart, { type Serie } from "@/components/LineChart";
import { deleteAnalisiOlio } from "@/app/actions/analisi-olio";
import { formatDate, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

// Palette dataviz validata
const C1 = "#2a78d6";
const C2 = "#1baf7a";
const C3 = "#eda100";

export default async function AnalisiOlioPage() {
  const analisi = await prisma.analisiOlio.findMany({
    orderBy: { data: "asc" },
    select: {
      id: true, data: true, labNumero: true, motore: true, olio: true,
      oreOlio: true, oreMotore: true, cambioOlio: true, litriRabbocco: true,
      ferro: true, cromo: true, nichel: true, alluminio: true, rame: true,
      piombo: true, stagno: true, silicio: true, sodio: true, potassio: true,
      magnesio: true, calcio: true, fosforo: true, zinco: true,
      visc40: true, visc100: true, viscIndex: true, tan: true,
      bnD4739: true, bnD2896: true, iPh: true, oxidation: true,
      nitration: true, zolfoPct: true, commento: true, note: true,
      pdfNome: true, // niente pdfDati in lista
    },
  });
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
      titolo: "Metalli di usura",
      nota: "Ferro, rame e alluminio (ppm)",
      serie: [
        serie("Ferro", C1, (a) => a.ferro),
        serie("Rame", C2, (a) => a.rame),
        serie("Alluminio", C3, (a) => a.alluminio),
      ],
      decimali: 0,
      unita: "ppm",
    },
    {
      titolo: "Acidità e riserva alcalina",
      nota: "TAN (acid number) e BN D2896, mg KOH/g",
      serie: [serie("TAN", C1, (a) => a.tan), serie("BN D2896", C2, (a) => a.bnD2896)],
      decimali: 2,
      unita: "",
    },
    {
      titolo: "Ossidazione e nitrazione",
      nota: "Ossidazione (abs/cm) e nitrazione (abs/0,1mm)",
      serie: [
        serie("Ossidazione", C1, (a) => a.oxidation),
        serie("Nitrazione", C2, (a) => a.nitration),
      ],
      decimali: 0,
      unita: "",
    },
    {
      titolo: "Viscosità a 40 °C",
      nota: "cSt — olio SAE 40",
      serie: [serie("Viscosità 40°C", C1, (a) => a.visc40)],
      decimali: 0,
      unita: "cSt",
    },
  ];

  const fmtOpz = (v: number | null, dec = 1) => (v != null ? formatNumber(v, dec) : "—");

  return (
    <div>
      <PageHeader
        title="🛢️ Analisi olio motore"
        subtitle={`Report di laboratorio del lubrificante${ultima?.motore ? ` · ${ultima.motore}` : ""}${ultima?.olio ? ` · ${ultima.olio}` : ""}`}
        action={{ href: "/biogas/olio/nuova", label: "Nuova analisi" }}
      />

      {/* KPI ultima analisi */}
      {ultima && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label={`Ferro · ${formatDate(ultima.data)}`}
            value={ultima.ferro != null ? `${formatNumber(ultima.ferro, 0)} ppm` : "—"}
            alert={(ultima.ferro ?? 0) > 30}
          />
          <Kpi label="TAN" value={ultima.tan != null ? `${formatNumber(ultima.tan, 2)} mg KOH/g` : "—"} alert={(ultima.tan ?? 0) > 3.5} />
          <Kpi label="Ossidazione" value={ultima.oxidation != null ? formatNumber(ultima.oxidation, 0) : "—"} alert={(ultima.oxidation ?? 0) > 20} />
          <Kpi
            label="Ore olio / motore"
            value={`${ultima.oreOlio ?? "—"} h${ultima.cambioOlio ? " · cambiato" : ""}`}
          />
        </div>
      )}

      {ultima?.commento && (
        <p className="card mb-6 border-brand-200 bg-brand-50 p-4 text-sm text-slate-700">
          💬 <b>Laboratorio:</b> {ultima.commento}
        </p>
      )}

      {analisi.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Nessuna analisi registrata.{" "}
          <Link href="/biogas/olio/nuova" className="text-brand-600 underline">
            Registra la prima
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {grafici.map((g) => (
              <div key={g.titolo} className="card p-5">
                <h3 className="mb-1 font-semibold text-slate-800">{g.titolo}</h3>
                <p className="mb-4 text-xs text-slate-500">{g.nota}</p>
                <LineChart serie={g.serie} formatoX="data" decimaliY={g.decimali} unitaY={g.unita} height={200} />
              </div>
            ))}
          </div>

          <div className="card overflow-x-auto">
            <h3 className="px-4 pt-4 font-semibold text-slate-800">Analisi ({analisi.length})</h3>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Prelievo</th>
                  <th className="px-3 py-3 text-right">Ore olio</th>
                  <th className="px-3 py-3 text-right">Fe</th>
                  <th className="px-3 py-3 text-right">Cu</th>
                  <th className="px-3 py-3 text-right">Al</th>
                  <th className="px-3 py-3 text-right">Visc.40</th>
                  <th className="px-3 py-3 text-right">Visc.100</th>
                  <th className="px-3 py-3 text-right">TAN</th>
                  <th className="px-3 py-3 text-right">BN</th>
                  <th className="px-3 py-3 text-right">i-pH</th>
                  <th className="px-3 py-3 text-right">Ossid.</th>
                  <th className="px-3 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...analisi].reverse().map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-700">{formatDate(a.data)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {a.oreOlio ?? "—"}
                      {a.cambioOlio && <span className="text-xs text-slate-400"> ↺</span>}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-medium ${(a.ferro ?? 0) > 30 ? "text-red-600" : ""}`}>
                      {fmtOpz(a.ferro, 0)}
                    </td>
                    <td className="px-3 py-2.5 text-right">{fmtOpz(a.rame, 0)}</td>
                    <td className="px-3 py-2.5 text-right">{fmtOpz(a.alluminio, 0)}</td>
                    <td className="px-3 py-2.5 text-right">{fmtOpz(a.visc40, 0)}</td>
                    <td className="px-3 py-2.5 text-right">{fmtOpz(a.visc100, 1)}</td>
                    <td className={`px-3 py-2.5 text-right ${(a.tan ?? 0) > 3.5 ? "font-medium text-red-600" : ""}`}>
                      {fmtOpz(a.tan, 2)}
                    </td>
                    <td className="px-3 py-2.5 text-right">{fmtOpz(a.bnD2896, 1)}</td>
                    <td className="px-3 py-2.5 text-right">{fmtOpz(a.iPh, 1)}</td>
                    <td className={`px-3 py-2.5 text-right ${(a.oxidation ?? 0) > 20 ? "font-medium text-red-600" : ""}`}>
                      {fmtOpz(a.oxidation, 0)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-3">
                        {a.pdfNome && (
                          <a
                            href={`/api/analisi-olio/pdf/${a.id}`}
                            target="_blank"
                            className="text-sm font-medium text-brand-600 hover:text-brand-800"
                          >
                            PDF
                          </a>
                        )}
                        <DeleteButton action={deleteAnalisiOlio} id={a.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-3 text-xs text-slate-400">
              Metalli in ppm · viscosità in cSt · TAN/BN in mg KOH/g · ↺ = olio cambiato al
              prelievo. Soglie indicative di attenzione: Fe &gt; 30 ppm, TAN &gt; 3,5, ossidazione
              &gt; 20.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`card p-4 ${alert ? "border-red-300 bg-red-50" : ""}`}>
      <div className={`text-xs uppercase tracking-wide ${alert ? "text-red-500" : "text-slate-400"}`}>
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold ${alert ? "text-red-600" : "text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}
