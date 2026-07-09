import Link from "next/link";
import { prisma } from "@/lib/prisma";
import LineChart, { type Serie } from "@/components/LineChart";
import { formatNumber, formatEuro, toDateInputValue } from "@/lib/format";

export const dynamic = "force-dynamic";

// Palette dataviz validata
const C1 = "#2a78d6"; // produzione
const C2 = "#1baf7a"; // autoconsumo biologia
const C3 = "#eda100"; // autoconsumo motore

// Producibilità teorica giornaliera (plateau del totalizzatore PLC)
const EN_TEORICA_GIORNO = 2399;

const MS_G = 24 * 60 * 60 * 1000;
const NOMI_MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function giorniNelMese(anno: number, mese: number): number {
  return new Date(anno, mese, 0).getDate();
}

export default async function BiogasPage({
  searchParams,
}: {
  searchParams: Promise<{ da?: string; a?: string }>;
}) {
  const sp = await searchParams;

  // Periodo: predefinito = ultimi 60 giorni ancorati all'ultimo dato PLC
  const ultimo = await prisma.biogasGiorno.findFirst({
    where: { erogatiKWh: { not: null } },
    orderBy: { data: "desc" },
  });
  const fineDefault = ultimo ? new Date(ultimo.data) : new Date();
  fineDefault.setHours(0, 0, 0, 0);

  const a = sp.a ? new Date(`${sp.a}T00:00:00`) : fineDefault;
  const da = sp.da ? new Date(`${sp.da}T00:00:00`) : new Date(a.getTime() - 59 * MS_G);

  const [giorni, mesi] = await Promise.all([
    prisma.biogasGiorno.findMany({
      where: { data: { gte: da, lte: a } },
      orderBy: { data: "asc" },
    }),
    prisma.biogasMese.findMany({ orderBy: [{ anno: "desc" }, { mese: "desc" }], take: 13 }),
  ]);

  const meseByKey = new Map(mesi.map((m) => [`${m.anno}-${m.mese}`, m]));
  const autMotDi = (g: { data: Date; consumatiKWh: number | null }): number | null => {
    const m = meseByKey.get(`${g.data.getFullYear()}-${g.data.getMonth() + 1}`);
    if (!m || g.consumatiKWh == null) return null;
    const autTotG = (m.enProdKWh - m.enCedKWh) / giorniNelMese(m.anno, m.mese);
    return Math.max(0, Math.round((autTotG - g.consumatiKWh) * 10) / 10);
  };

  // ---- KPI di periodo (stile Data Studio) ----
  const conDato = giorni.filter((g) => g.erogatiKWh != null);
  const produzione = conDato.reduce((s, g) => s + (g.erogatiKWh ?? 0), 0);
  const teorici = conDato.length * EN_TEORICA_GIORNO;
  const mancata = Math.max(0, teorici - produzione);
  const rendimento = teorici > 0 ? (produzione / teorici) * 100 : null;

  // ---- Grafici ----
  const serieProduzione: Serie[] = [
    {
      nome: "Produzione",
      colore: C1,
      marcatori: giorni.length <= 92,
      punti: giorni.map((g) => ({ x: g.data.getTime(), y: g.erogatiKWh })),
    },
  ];
  const soglie = [
    { y: EN_TEORICA_GIORNO, label: "100%" },
    { y: EN_TEORICA_GIORNO * 0.7, label: "70%" },
    { y: EN_TEORICA_GIORNO * 0.5, label: "50%" },
  ];

  const puntiMot = giorni.map((g) => ({ x: g.data.getTime(), y: autMotDi(g) }));
  const haMot = puntiMot.some((p) => p.y != null);
  const serieAutoconsumi: Serie[] = [
    {
      nome: "Autoc. biologia",
      colore: C2,
      punti: giorni.map((g) => ({ x: g.data.getTime(), y: g.consumatiKWh })),
    },
  ];
  if (haMot) serieAutoconsumi.push({ nome: "Autoc. motore", colore: C3, punti: puntiMot });

  // Preset per il selettore
  const preset = (gg: number) =>
    `/biogas?da=${toDateInputValue(new Date(fineDefault.getTime() - (gg - 1) * MS_G))}&a=${toDateInputValue(fineDefault)}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">⚡ Biogas · Andamento Produzione</h1>
          <p className="mt-1 text-sm text-slate-500">
            {ultimo
              ? `Ultimo dato PLC: ${ultimo.data.toLocaleDateString("it-IT")}`
              : "Nessun dato: importa i CSV del PLC"}
          </p>
        </div>
        <Link href="/biogas/dati" className="btn-primary">
          + Dati e import PLC
        </Link>
      </div>

      {/* Selettore periodo */}
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="da">
              Dal
            </label>
            <input id="da" name="da" type="date" defaultValue={toDateInputValue(da)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="a">
              Al
            </label>
            <input id="a" name="a" type="date" defaultValue={toDateInputValue(a)} className="input" />
          </div>
          <button type="submit" className="btn-primary">
            Applica
          </button>
        </form>
        <div className="flex gap-2 text-sm">
          <Link href={preset(30)} className="btn-secondary !py-1.5">
            30 gg
          </Link>
          <Link href={preset(60)} className="btn-secondary !py-1.5">
            60 gg
          </Link>
          <Link href={preset(365)} className="btn-secondary !py-1.5">
            1 anno
          </Link>
        </div>
      </div>

      {/* KPI di periodo (come Data Studio) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="kWh Teorici" value={formatNumber(teorici, 0)} hint={`${conDato.length} giorni × ${EN_TEORICA_GIORNO}`} />
        <Kpi label="kWh Produzione" value={formatNumber(produzione, 0)} accent />
        <Kpi label="kWh Mancata Produzione" value={formatNumber(mancata, 0)} alert={mancata > 0} />
        <Kpi label="Rendimento" value={rendimento != null ? `${formatNumber(rendimento, 0)}%` : "—"} />
      </div>

      {/* Grafico produzione con soglie */}
      <div className="card mb-6 p-5">
        <h3 className="mb-4 font-semibold text-slate-800">Andamento Produzione kWh</h3>
        {giorni.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Nessun dato nel periodo.{" "}
            <Link href="/biogas/dati" className="text-brand-600 underline">
              Importa i CSV del PLC
            </Link>
            .
          </p>
        ) : (
          <LineChart
            serie={serieProduzione}
            soglie={soglie}
            formatoX="data"
            decimaliY={0}
            unitaY="kWh"
            height={320}
          />
        )}
      </div>

      {/* Autoconsumi */}
      <div className="card mb-6 p-5">
        <h3 className="mb-1 font-semibold text-slate-800">Autoconsumi giornalieri</h3>
        <p className="mb-4 text-xs text-slate-500">
          Biologia dal PLC{haMot ? " · motore = autoconsumo mensile − biologia" : " — per il motore inserisci i contatori mensili"}
        </p>
        {giorni.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nessun dato nel periodo.</p>
        ) : (
          <LineChart serie={serieAutoconsumi} formatoX="data" decimaliY={0} unitaY="kWh" height={220} />
        )}
      </div>

      {/* Riepilogo mensile */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Mesi (contatori ufficiali)</h3>
          <Link href="/biogas/dati" className="text-sm text-brand-600 hover:underline">
            Gestisci
          </Link>
        </div>
        {mesi.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nessun dato mensile: inserisci prodotta e ceduta dai contatori per calcolare
            l&apos;autoconsumo del motore e la valorizzazione.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Mese</th>
                  <th className="px-3 py-2 text-right">Prodotta</th>
                  <th className="px-3 py-2 text-right">Ceduta</th>
                  <th className="px-3 py-2 text-right">Autoconsumo</th>
                  <th className="px-3 py-2 text-right">Aut. %</th>
                  <th className="px-3 py-2 text-right">Valore ceduta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mesi.map((m) => {
                  const aut = m.enProdKWh - m.enCedKWh;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-700">
                        {NOMI_MESI[m.mese - 1]} {m.anno}
                      </td>
                      <td className="px-3 py-2 text-right">{formatNumber(m.enProdKWh, 0)} kWh</td>
                      <td className="px-3 py-2 text-right">{formatNumber(m.enCedKWh, 0)} kWh</td>
                      <td className="px-3 py-2 text-right font-medium">{formatNumber(aut, 0)} kWh</td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {m.enProdKWh > 0 ? `${formatNumber((aut / m.enProdKWh) * 100, 1)}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {m.prezzoEuroKWh != null ? formatEuro(m.enCedKWh * m.prezzoEuroKWh) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
  alert,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  alert?: boolean;
}) {
  return (
    <div className={`card p-4 ${accent ? "border-brand-200 bg-brand-50" : ""}`}>
      <div className={`text-xs uppercase tracking-wide ${alert ? "text-red-500" : "text-slate-400"}`}>
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-bold ${
          alert ? "text-red-600" : accent ? "text-brand-700" : "text-slate-800"
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
