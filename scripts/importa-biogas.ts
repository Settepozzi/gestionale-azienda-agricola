// Importa in blocco i log del PLC nel database (anche migliaia di file):
//  - DB_kWh_Erogati*/DB_kWh_Consumati*  → BiogasGiorno (un valore per giorno)
//  - DB_CH4*/CO2*/O2*/H2S*/Gas*/Livelli*/Temp* → BiogasAnalisiGiorno (medie giornaliere)
//  - DB_Storico* → BiogasAllarme (eventi accoppiati attivo→rientro)
//
// La cartella viene scansionata RICORSIVAMENTE (sottocartelle incluse).
// L'import è idempotente: rilanciare sugli stessi file (o su file che si
// sovrappongono) non crea duplicati.
//
// Uso:  npx tsx scripts/importa-biogas.ts "C:\percorso\cartella-csv"

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  nuovoAccumulatore,
  parseCsvPlc,
  risultatiGiornalieri,
  nuovoAccumulatoreAnalisi,
  parseCsvAnalisi,
  risultatiAnalisi,
  parseCsvStorico,
  accoppiaAllarmi,
  type EventoAllarme,
} from "../src/lib/biogas-plc";

const prisma = new PrismaClient();

// Scansione ricorsiva della cartella
function trovaCsv(dir: string): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    try {
      const st = statSync(p);
      if (st.isDirectory()) out.push(...trovaCsv(p));
      else if (/\.csv$/i.test(nome)) out.push(p);
    } catch {
      // file non leggibile: lo segnaliamo dopo
    }
  }
  return out;
}

function nomeFile(p: string): string {
  return p.split(/[\\/]/).pop() ?? p;
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Uso: npx tsx scripts/importa-biogas.ts "<cartella con i CSV del PLC>"');
    process.exit(1);
  }

  console.log(`🔍 Scansione ricorsiva di: ${dir}`);
  const tuttiCsv = trovaCsv(dir);
  console.log(`   Trovati ${tuttiCsv.length} file .csv\n`);

  const acc = nuovoAccumulatore();
  const accA = nuovoAccumulatoreAnalisi();
  const eventi: EventoAllarme[] = [];

  let nKwh = 0,
    nAnalisi = 0,
    nStorico = 0;
  const ignorati: string[] = [];
  const falliti: string[] = [];
  let processati = 0;

  for (const percorso of tuttiCsv) {
    const f = nomeFile(percorso);
    processati++;
    try {
      const testo = readFileSync(percorso, "latin1");
      if (/^DB_kWh_(Erogati|Consumati)/i.test(f)) {
        nKwh += parseCsvPlc(testo, acc);
      } else if (/^DB_Storico/i.test(f)) {
        nStorico += parseCsvStorico(testo, eventi);
      } else if (/^DB_(CH4|CO2|O2|H2S|Gas|Livelli|Temp)/i.test(f)) {
        nAnalisi += parseCsvAnalisi(testo, accA);
      } else {
        ignorati.push(f);
      }
    } catch {
      falliti.push(f);
    }
    if (processati % 100 === 0 || processati === tuttiCsv.length) {
      console.log(`   … letti ${processati}/${tuttiCsv.length} file`);
    }
  }

  console.log(`\n📖 Campioni letti — kWh: ${nKwh} · sonde: ${nAnalisi} · allarmi: ${nStorico}`);
  if (ignorati.length > 0) {
    const gruppi = [...new Set(ignorati.map((f) => f.replace(/\d+\.csv$/i, "*")))];
    console.log(`⚠ ${ignorati.length} file ignorati (nome non riconosciuto): ${gruppi.slice(0, 10).join(", ")}`);
  }
  if (falliti.length > 0) {
    console.log(`⚠ ${falliti.length} file NON leggibili: ${falliti.slice(0, 10).join(", ")}`);
  }

  // --- Scrittura kWh ---
  const giorni = risultatiGiornalieri(acc).filter((g) => g.data >= "2017-01-01");
  console.log(`\n💾 Scrittura kWh: ${giorni.length} giorni…`);
  let scritti = 0;
  for (const g of giorni) {
    const data = new Date(`${g.data}T00:00:00`);
    await prisma.biogasGiorno.upsert({
      where: { data },
      create: { data, erogatiKWh: g.erogatiKWh ?? null, consumatiKWh: g.consumatiKWh ?? null },
      update: {
        ...(g.erogatiKWh != null ? { erogatiKWh: g.erogatiKWh } : {}),
        ...(g.consumatiKWh != null ? { consumatiKWh: g.consumatiKWh } : {}),
      },
    });
    if (++scritti % 500 === 0) console.log(`   … ${scritti}/${giorni.length}`);
  }

  // --- Scrittura analisi sonde ---
  const analisi = risultatiAnalisi(accA).filter((a) => a.data >= "2017-01-01");
  console.log(`💾 Scrittura analisi sonde: ${analisi.length} giorni…`);
  scritti = 0;
  for (const a of analisi) {
    const data = new Date(`${a.data}T00:00:00`);
    const m = a.medie;
    await prisma.biogasAnalisiGiorno.upsert({
      where: { data },
      create: {
        data,
        ch4Media: m.ch4 ?? null,
        co2Media: m.co2 ?? null,
        o2Media: m.o2 ?? null,
        h2sMedia: m.h2s ?? null,
        h2sMax: a.h2sMax ?? null,
        livGasMedia: m.livGas ?? null,
        livFMedia: m.livF ?? null,
        livPreMedia: m.livPre ?? null,
        tempFMedia: m.tempF ?? null,
        tempRicMedia: m.tempRic ?? null,
      },
      update: {
        ...(m.ch4 != null ? { ch4Media: m.ch4 } : {}),
        ...(m.co2 != null ? { co2Media: m.co2 } : {}),
        ...(m.o2 != null ? { o2Media: m.o2 } : {}),
        ...(m.h2s != null ? { h2sMedia: m.h2s } : {}),
        ...(a.h2sMax != null ? { h2sMax: a.h2sMax } : {}),
        ...(m.livGas != null ? { livGasMedia: m.livGas } : {}),
        ...(m.livF != null ? { livFMedia: m.livF } : {}),
        ...(m.livPre != null ? { livPreMedia: m.livPre } : {}),
        ...(m.tempF != null ? { tempFMedia: m.tempF } : {}),
        ...(m.tempRic != null ? { tempRicMedia: m.tempRic } : {}),
      },
    });
    if (++scritti % 500 === 0) console.log(`   … ${scritti}/${analisi.length}`);
  }

  // --- Scrittura allarmi ---
  const allarmi = accoppiaAllarmi(eventi);
  console.log(`💾 Scrittura allarmi: ${allarmi.length}…`);
  scritti = 0;
  for (const a of allarmi) {
    const inizio = new Date(a.inizio);
    await prisma.biogasAllarme.upsert({
      where: { msgNumber_inizio: { msgNumber: a.msgNumber, inizio } },
      create: { msgNumber: a.msgNumber, inizio, fine: a.fine ? new Date(a.fine) : null },
      update: { fine: a.fine ? new Date(a.fine) : null },
    });
    if (++scritti % 500 === 0) console.log(`   … ${scritti}/${allarmi.length}`);
  }

  // --- Riepilogo finale ---
  const [totG, totA, totAl] = await Promise.all([
    prisma.biogasGiorno.count(),
    prisma.biogasAnalisiGiorno.count(),
    prisma.biogasAllarme.count(),
  ]);
  const [primoG, ultimoG] = await Promise.all([
    prisma.biogasGiorno.findFirst({ orderBy: { data: "asc" } }),
    prisma.biogasGiorno.findFirst({ orderBy: { data: "desc" } }),
  ]);
  const fmt = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "-");

  console.log("\n════════ RIEPILOGO ════════");
  console.log(`File letti: ${tuttiCsv.length} (ignorati: ${ignorati.length}, falliti: ${falliti.length})`);
  console.log(`Questo import — kWh: ${giorni.length} gg · sonde: ${analisi.length} gg · allarmi: ${allarmi.length}`);
  console.log(`ORA NEL DATABASE — produzione: ${totG} gg (${fmt(primoG?.data)} → ${fmt(ultimoG?.data)}) · analisi: ${totA} gg · allarmi: ${totAl}`);
  console.log("═══════════════════════════");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
