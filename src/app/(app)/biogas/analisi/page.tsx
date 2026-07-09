import Link from "next/link";
import { prisma } from "@/lib/prisma";
import LineChart, { type Serie } from "@/components/LineChart";
import { formatNumber, toDateInputValue } from "@/lib/format";

export const dynamic = "force-dynamic";

// Palette dataviz validata (slot fissi)
const C1 = "#2a78d6";
const C2 = "#1baf7a";
const C3 = "#eda100";

const MS_G = 24 * 60 * 60 * 1000;

export default async function BiogasAnalisiPage({
  searchParams,
}: {
  searchParams: Promise<{ da?: string; a?: string }>;
}) {
  const sp = await searchParams;

  const ultimo = await prisma.biogasAnalisiGiorno.findFirst({ orderBy: { data: "desc" } });
  const fineDefault = ultimo ? new Date(ultimo.data) : new Date();
  fineDefault.setHours(0, 0, 0, 0);

  const a = sp.a ? new Date(`${sp.a}T00:00:00`) : fineDefault;
  const da = sp.da ? new Date(`${sp.da}T00:00:00`) : new Date(a.getTime() - 59 * MS_G);

  const giorni = await prisma.biogasAnalisiGiorno.findMany({
    where: { data: { gte: da, lte: a } },
    orderBy: { data: "asc" },
  });

  const serie = (
    nome: string,
    colore: string,
    campo: (g: (typeof giorni)[number]) => number | null
  ): Serie => ({
    nome,
    colore,
    punti: giorni.map((g) => ({ x: g.data.getTime(), y: campo(g) })),
  });

  const grafici: { titolo: string; nota: string; serie: Serie[]; decimali: number; unita: string }[] = [
    {
      titolo: "Sonda gas (Awite)",
      nota: "Medie giornaliere · valori nella scala della sonda",
      serie: [
        serie("CH4", C1, (g) => g.ch4Media),
        serie("CO2", C2, (g) => g.co2Media),
        serie("O2", C3, (g) => g.o2Media),
      ],
      decimali: 2,
      unita: "",
    },
    {
      titolo: "H2S",
      nota: "Media giornaliera e picco",
      serie: [
        serie("H2S media", C1, (g) => g.h2sMedia),
        serie("H2S picco", C2, (g) => g.h2sMax),
      ],
      decimali: 0,
      unita: "ppm",
    },
    {
      titolo: "Temperature",
      nota: "Fermentatore e ricircolo",
      serie: [
        serie("Fermentatore", C1, (g) => g.tempFMedia),
        serie("Ricircolo", C2, (g) => g.tempRicMedia),
      ],
      decimali: 1,
      unita: "°C",
    },
    {
      titolo: "Livello gasometro",
      nota: "Media giornaliera",
      serie: [serie("Gasometro", C1, (g) => g.livGasMedia)],
      decimali: 0,
      unita: "%",
    },
    {
      titolo: "Livelli vasche",
      nota: "Fermentatore e prevasca",
      serie: [
        serie("Fermentatore", C1, (g) => g.livFMedia),
        serie("Prevasca", C2, (g) => g.livPreMedia),
      ],
      decimali: 2,
      unita: "m",
    },
  ];

  const preset = (gg: number) =>
    `/biogas/analisi?da=${toDateInputValue(new Date(fineDefault.getTime() - (gg - 1) * MS_G))}&a=${toDateInputValue(fineDefault)}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🧪 Analisi e sonde</h1>
          <p className="mt-1 text-sm text-slate-500">
            {ultimo
              ? `Ultimo dato sonde: ${ultimo.data.toLocaleDateString("it-IT")}`
              : "Nessun dato: importa i CSV delle sonde (DB_CH4/CO2/O2/H2S/Gas/Livelli/Temp)"}
          </p>
        </div>
        <Link href="/biogas/dati" className="btn-secondary">
          📥 Import PLC
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

      {/* KPI ultimo giorno */}
      {ultimo && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="CH4 (sonda)" value={ultimo.ch4Media != null ? formatNumber(ultimo.ch4Media, 2) : "—"} />
          <Kpi
            label="H2S media / picco"
            value={
              ultimo.h2sMedia != null
                ? `${formatNumber(ultimo.h2sMedia, 0)} / ${formatNumber(ultimo.h2sMax ?? 0, 0)} ppm`
                : "—"
            }
            alert={(ultimo.h2sMax ?? 0) > 500}
          />
          <Kpi
            label="Temp. fermentatore"
            value={ultimo.tempFMedia != null ? `${formatNumber(ultimo.tempFMedia, 1)} °C` : "—"}
          />
          <Kpi
            label="Livello gasometro"
            value={ultimo.livGasMedia != null ? `${formatNumber(ultimo.livGasMedia, 0)} %` : "—"}
          />
        </div>
      )}

      {/* Grafici */}
      {giorni.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">Nessun dato nel periodo.</div>
      ) : (
        grafici.map((g) => (
          <div key={g.titolo} className="card mb-6 p-5">
            <h3 className="mb-1 font-semibold text-slate-800">{g.titolo}</h3>
            <p className="mb-4 text-xs text-slate-500">{g.nota}</p>
            <LineChart serie={g.serie} formatoX="data" decimaliY={g.decimali} unitaY={g.unita} height={200} />
          </div>
        ))
      )}
    </div>
  );
}

function Kpi({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`card p-4 ${alert ? "border-red-200 bg-red-50" : ""}`}>
      <div className={`text-xs uppercase tracking-wide ${alert ? "text-red-500" : "text-slate-400"}`}>
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${alert ? "text-red-600" : "text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}
