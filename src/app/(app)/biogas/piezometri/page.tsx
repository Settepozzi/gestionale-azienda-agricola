import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import DeleteButton from "@/components/DeleteButton";
import LineChart, { type Serie } from "@/components/LineChart";
import { deleteAnalisiPiezometro } from "@/app/actions/piezometri";
import { formatDate, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

// Palette dataviz validata
const C1 = "#2a78d6"; // Nord
const C2 = "#1baf7a"; // Sud

// Concentrazioni soglia di contaminazione (Tab.2 All.5 D.Lgs 152/2006)
const CSC = { nitriti: 0.5, rame: 1000, zinco: 3000 } as const;

type Analisi = {
  id: string; data: Date; punto: string; rapportoNumero: string | null;
  laboratorio: string | null; livelloFreatimetricoM: number | null;
  temperaturaC: number | null; aspetto: string | null; ph: number | null;
  conducibilita: number | null; cod: number | null; azotoAmmoniacale: number | null;
  nitriti: number | null; nitrati: number | null; fosforo: number | null;
  rame: number | null; zinco: number | null; note: string | null; pdfNome: string | null;
};

function superamenti(a: Analisi): string[] {
  const out: string[] = [];
  if (a.nitriti != null && a.nitriti > CSC.nitriti) out.push(`nitriti ${formatNumber(a.nitriti, 2)} > ${CSC.nitriti}`);
  if (a.rame != null && a.rame > CSC.rame) out.push(`rame ${formatNumber(a.rame, 0)} > ${CSC.rame}`);
  if (a.zinco != null && a.zinco > CSC.zinco) out.push(`zinco ${formatNumber(a.zinco, 0)} > ${CSC.zinco}`);
  return out;
}

export default async function PiezometriPage() {
  const analisi: Analisi[] = await prisma.analisiAcquaPiezometro.findMany({
    orderBy: { data: "asc" },
    select: {
      id: true, data: true, punto: true, rapportoNumero: true, laboratorio: true,
      livelloFreatimetricoM: true, temperaturaC: true, aspetto: true, ph: true,
      conducibilita: true, cod: true, azotoAmmoniacale: true, nitriti: true,
      nitrati: true, fosforo: true, rame: true, zinco: true, note: true,
      pdfNome: true, // pdfDati esclusi dalla lista
    },
  });

  const punti = [...new Set(analisi.map((a) => a.punto))].sort();
  const colorePunto = (p: string) => (p === punti[0] ? C1 : C2);
  const ultimaDi = (p: string) => [...analisi].reverse().find((a) => a.punto === p);

  const seriePerPunto = (campo: (a: Analisi) => number | null): Serie[] =>
    punti.map((p) => ({
      nome: `Pz ${p}`,
      colore: colorePunto(p),
      marcatori: true,
      punti: analisi.filter((a) => a.punto === p).map((a) => ({ x: a.data.getTime(), y: campo(a) })),
    }));

  const grafici = [
    {
      titolo: "Livello freatimetrico",
      nota: "Profondità della falda dal piano campagna (m)",
      serie: seriePerPunto((a) => a.livelloFreatimetricoM),
      decimali: 2,
      unita: "m",
    },
    {
      titolo: "Conducibilità a 20 °C",
      nota: "Indicatore del carico salino",
      serie: seriePerPunto((a) => a.conducibilita),
      decimali: 0,
      unita: "µS/cm",
    },
    {
      titolo: "Azoto ammoniacale",
      nota: "mg/L N",
      serie: seriePerPunto((a) => a.azotoAmmoniacale),
      decimali: 2,
      unita: "mg/L",
    },
    {
      titolo: "Nitrati",
      nota: "mg/L NO3",
      serie: seriePerPunto((a) => a.nitrati),
      decimali: 2,
      unita: "mg/L",
    },
  ];

  const fmtOpz = (v: number | null, dec = 2) => (v != null ? formatNumber(v, dec) : "< soglia");

  return (
    <div>
      <PageHeader
        title="💧 Acque piezometri"
        subtitle="Monitoraggio ambientale obbligatorio delle acque sotterranee (CSC Tab.2 All.5 D.Lgs 152/06)"
        action={{ href: "/biogas/piezometri/nuova", label: "Nuova analisi" }}
      />

      {/* Card per piezometro: ultima campagna */}
      {analisi.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {punti.map((p) => {
            const u = ultimaDi(p)!;
            const sup = superamenti(u);
            return (
              <div
                key={p}
                className={`card p-5 ${sup.length > 0 ? "border-red-300 bg-red-50" : "border-green-200 bg-green-50"}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">Piezometro {p}</h3>
                  <span className={`badge ${sup.length > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                    {sup.length > 0 ? "⚠ SUPERAMENTO CSC" : "✓ Conforme"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Ultimo campionamento: {formatDate(u.data)} · {u.aspetto ?? "—"}
                </div>
                {sup.length > 0 && (
                  <p className="mt-2 rounded-lg bg-red-100 px-3 py-1.5 text-sm text-red-800">{sup.join(" · ")}</p>
                )}
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <Mini label="Falda" value={u.livelloFreatimetricoM != null ? `${formatNumber(u.livelloFreatimetricoM, 2)} m` : "—"} />
                  <Mini label="pH" value={fmtOpz(u.ph)} />
                  <Mini label="CE" value={u.conducibilita != null ? `${formatNumber(u.conducibilita, 0)} µS` : "—"} />
                  <Mini label="NH4-N" value={fmtOpz(u.azotoAmmoniacale)} />
                  <Mini label="Nitriti" value={fmtOpz(u.nitriti)} />
                  <Mini label="COD" value={fmtOpz(u.cod, 0)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {analisi.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Nessuna analisi registrata.{" "}
          <Link href="/biogas/piezometri/nuova" className="text-brand-600 underline">
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
            <h3 className="px-4 pt-4 font-semibold text-slate-800">Campionamenti ({analisi.length})</h3>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Punto</th>
                  <th className="px-3 py-3 text-right">Falda m</th>
                  <th className="px-3 py-3 text-right">pH</th>
                  <th className="px-3 py-3 text-right">CE</th>
                  <th className="px-3 py-3 text-right">COD</th>
                  <th className="px-3 py-3 text-right">NH4-N</th>
                  <th className="px-3 py-3 text-right">NO2</th>
                  <th className="px-3 py-3 text-right">NO3</th>
                  <th className="px-3 py-3 text-right">Cu µg/L</th>
                  <th className="px-3 py-3 text-right">Zn µg/L</th>
                  <th className="px-3 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...analisi].reverse().map((a) => {
                  const sup = superamenti(a);
                  return (
                    <tr key={a.id} className={`hover:bg-slate-50 ${sup.length > 0 ? "bg-red-50/60" : ""}`}>
                      <td className="px-3 py-2.5 font-medium text-slate-700">{formatDate(a.data)}</td>
                      <td className="px-3 py-2.5">{a.punto}</td>
                      <td className="px-3 py-2.5 text-right">{a.livelloFreatimetricoM != null ? formatNumber(a.livelloFreatimetricoM, 2) : "—"}</td>
                      <td className="px-3 py-2.5 text-right">{fmtOpz(a.ph)}</td>
                      <td className="px-3 py-2.5 text-right">{a.conducibilita != null ? formatNumber(a.conducibilita, 0) : "—"}</td>
                      <td className="px-3 py-2.5 text-right">{fmtOpz(a.cod, 0)}</td>
                      <td className="px-3 py-2.5 text-right">{fmtOpz(a.azotoAmmoniacale)}</td>
                      <td className={`px-3 py-2.5 text-right ${a.nitriti != null && a.nitriti > CSC.nitriti ? "font-bold text-red-600" : ""}`}>
                        {fmtOpz(a.nitriti)}
                      </td>
                      <td className="px-3 py-2.5 text-right">{fmtOpz(a.nitrati)}</td>
                      <td className={`px-3 py-2.5 text-right ${a.rame != null && a.rame > CSC.rame ? "font-bold text-red-600" : ""}`}>
                        {fmtOpz(a.rame, 1)}
                      </td>
                      <td className={`px-3 py-2.5 text-right ${a.zinco != null && a.zinco > CSC.zinco ? "font-bold text-red-600" : ""}`}>
                        {fmtOpz(a.zinco, 1)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-3">
                          {a.pdfNome && (
                            <a
                              href={`/api/piezometri/pdf/${a.id}`}
                              target="_blank"
                              className="text-sm font-medium text-brand-600 hover:text-brand-800"
                            >
                              PDF
                            </a>
                          )}
                          <DeleteButton action={deleteAnalisiPiezometro} id={a.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="px-4 py-3 text-xs text-slate-400">
              CSC (D.Lgs 152/06): nitriti 0,5 mg/L · rame 1.000 µg/L · zinco 3.000 µg/L. &quot;&lt;
              soglia&quot; = sotto il limite di quantificazione del laboratorio.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-2 py-1.5">
      <div className="text-[10px] uppercase text-slate-400">{label}</div>
      <div className="font-semibold text-slate-800">{value}</div>
    </div>
  );
}
