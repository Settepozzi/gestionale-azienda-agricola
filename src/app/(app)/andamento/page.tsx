import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import LineChart, { type Serie } from "@/components/LineChart";
import { formatNumber } from "@/lib/format";
import { startOfDay, giornoCiclo } from "@/lib/razione";
import { pesoPartita } from "@/lib/capienza";
import { allocaMangimePerPartita, icaStimato } from "@/lib/ica";

export const dynamic = "force-dynamic";

// Palette categorica validata (dataviz, light mode)
const C1 = "#2a78d6"; // blu
const C2 = "#1baf7a"; // aqua
const C3 = "#eda100"; // giallo (etichette dirette presenti come da regola)

const MS_G = 24 * 60 * 60 * 1000;

export default async function AndamentoPage() {
  const oggi = startOfDay(new Date());
  const da = new Date(oggi.getTime() - 29 * MS_G);

  const [razioni, consumi, curva, partite, boxLG, consumiTutti] = await Promise.all([
    prisma.razioneBox.findMany({ where: { data: { gte: da } } }),
    prisma.consumoMangime.findMany({ where: { data: { gte: da } } }),
    prisma.curvaAccrescimento.findMany({ orderBy: { giorno: "asc" } }),
    prisma.partita.findMany({
      where: { stato: "ATTIVA" },
      include: {
        giacenze: { select: { quantita: true } },
        vendite: { select: { numeroCapi: true, pesoTotaleKg: true } },
      },
    }),
    prisma.box.findMany({
      where: { lineaId: { not: null }, gruppoId: { not: null } },
      select: {
        lineaId: true,
        gruppoId: true,
        giacenze: { select: { partitaId: true, quantita: true } },
      },
    }),
    prisma.consumoMangime.findMany({
      select: { lineaId: true, gruppoId: true, quantitaKg: true },
    }),
  ]);

  // ---- Grafico 1: alimentazione giornaliera (ultimi 30 giorni) ----
  const giorni: number[] = [];
  for (let t = da.getTime(); t <= oggi.getTime(); t += MS_G) giorni.push(t);

  const teorica = new Map<number, number>();
  const pianificata = new Map<number, number>();
  for (const r of razioni) {
    const t = startOfDay(r.data).getTime();
    teorica.set(t, (teorica.get(t) ?? 0) + r.kgStandardCapo * r.capi);
    pianificata.set(t, (pianificata.get(t) ?? 0) + r.kgTotale);
  }
  const reale = new Map<number, number>();
  for (const c of consumi) {
    const t = startOfDay(c.data).getTime();
    reale.set(t, (reale.get(t) ?? 0) + c.quantitaKg);
  }

  const serieAlimentazione: Serie[] = [
    {
      nome: "Teorica 100%",
      colore: C1,
      punti: giorni.map((t) => ({ x: t, y: teorica.get(t) ?? 0 })),
    },
    {
      nome: "Razione impostata",
      colore: C2,
      punti: giorni.map((t) => ({ x: t, y: pianificata.get(t) ?? 0 })),
    },
    {
      nome: "Consumo reale",
      colore: C3,
      punti: giorni.map((t) => ({ x: t, y: reale.get(t) ?? 0 })),
    },
  ];

  // ---- Grafico 2: ICA teorico (curva) vs stimato (partite attive) ----
  const mangimePerPartita = allocaMangimePerPartita(consumiTutti, boxLG);

  const puntiStimato: { x: number; y: number; label: string }[] = [];
  for (const p of partite) {
    const capi = p.giacenze.reduce((s, g) => s + g.quantita, 0);
    const kgVenduti = p.vendite.reduce((s, v) => s + (v.pesoTotaleKg ?? 0), 0);
    const peso = pesoPartita(p, curva);
    const giorno =
      p.giorniCiclo ?? giornoCiclo(p.dataArrivo, oggi);
    const mangime = p.mangimeTotaleKg ?? mangimePerPartita.get(p.id) ?? null;
    const ica = icaStimato({
      mangimeKg: mangime,
      pesoMedioKg: peso,
      capiPresenti: capi,
      kgVenduti,
      kgRicevuti: p.pesoTotaleArrivoKg,
    });
    if (ica != null && giorno >= 1) {
      puntiStimato.push({ x: Math.min(giorno, 210), y: ica, label: p.codice });
    }
  }

  const serieIca: Serie[] = [
    {
      nome: "ICA teorico",
      colore: C1,
      punti: curva.filter((r) => r.giorno >= 2).map((r) => ({ x: r.giorno, y: r.ica })),
    },
    {
      nome: "ICA stimato",
      colore: C2,
      tipo: "punti",
      punti: puntiStimato.map((p) => ({ x: p.x, y: p.y })),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Andamento"
        subtitle="Alimentazione teorica vs reale e indice di conversione"
      />

      <div className="card mb-6 p-5">
        <h3 className="mb-1 font-semibold text-slate-800">
          Alimentazione giornaliera (ultimi 30 giorni)
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          Teorica = curva standard al 100% per i capi presenti · Razione = % impostata ·
          Reale = consumi registrati (computer alimentazione)
        </p>
        <LineChart serie={serieAlimentazione} formatoX="data" decimaliY={0} unitaY="kg" />
      </div>

      <div className="card mb-6 p-5">
        <h3 className="mb-1 font-semibold text-slate-800">ICA · teorico vs stimato</h3>
        <p className="mb-4 text-xs text-slate-500">
          Linea = ICA progressivo teorico per giorno di ciclo · Punti = ICA stimato delle partite
          attive (dal peso medio inserito)
        </p>
        <LineChart serie={serieIca} formatoX="giorno" decimaliY={2} unitaY="ICA" />
        {puntiStimato.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Nessuna stima disponibile: servono peso medio (o giorni di ciclo), kg ricevuti e
            mangime (totale o consumi registrati) sulle partite attive.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-3 text-sm">
            {puntiStimato.map((p) => (
              <li key={p.label} className="rounded-lg bg-slate-50 px-3 py-1.5">
                <b>{p.label}</b>: giorno {p.x} · ICA stimato{" "}
                <b className="text-brand-700">{formatNumber(p.y, 3)}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
