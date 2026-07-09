// Importa i log del PLC nel database:
//  - DB_kWh_Erogati*/DB_kWh_Consumati*  → BiogasGiorno (un valore per giorno)
//  - DB_CH4*/CO2*/O2*/H2S*/Gas*/Livelli*/Temp* → BiogasAnalisiGiorno (medie giornaliere)
//
// Uso:  npx tsx scripts/importa-biogas.ts "C:\percorso\cartella-csv"

import { readdirSync, readFileSync } from "node:fs";
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

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Uso: npx tsx scripts/importa-biogas.ts "<cartella con i CSV del PLC>"');
    process.exit(1);
  }

  const tutti = readdirSync(dir);
  const filesKwh = tutti.filter((f) => /^DB_kWh_(Erogati|Consumati)/i.test(f));
  const filesAnalisi = tutti.filter((f) => /^DB_(CH4|CO2|O2|H2S|Gas|Livelli|Temp)/i.test(f));
  const filesStorico = tutti.filter((f) => /^DB_Storico/i.test(f));

  // --- kWh ---
  const acc = nuovoAccumulatore();
  for (const f of filesKwh) {
    const n = parseCsvPlc(readFileSync(join(dir, f), "latin1"), acc);
    console.log(`✔ ${f}: ${n} campioni kWh`);
  }
  const giorni = risultatiGiornalieri(acc).filter((g) => g.data >= "2024-01-01");
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
  }
  console.log(`✅ kWh: ${giorni.length} giorni.`);

  // --- Analisi sonde ---
  const accA = nuovoAccumulatoreAnalisi();
  let campioni = 0;
  for (const f of filesAnalisi) {
    const n = parseCsvAnalisi(readFileSync(join(dir, f), "latin1"), accA);
    campioni += n;
    if (n > 0) console.log(`✔ ${f}: ${n} campioni sonde`);
  }
  const analisi = risultatiAnalisi(accA);
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
  }
  console.log(`✅ Analisi sonde: ${campioni} campioni → ${analisi.length} giorni.`);

  // --- Allarmi (DB_Storico) ---
  const eventi: EventoAllarme[] = [];
  for (const f of filesStorico) {
    const n = parseCsvStorico(readFileSync(join(dir, f), "latin1"), eventi);
    console.log(`✔ ${f}: ${n} eventi allarme`);
  }
  const allarmi = accoppiaAllarmi(eventi);
  for (const a of allarmi) {
    const inizio = new Date(a.inizio);
    await prisma.biogasAllarme.upsert({
      where: { msgNumber_inizio: { msgNumber: a.msgNumber, inizio } },
      create: { msgNumber: a.msgNumber, inizio, fine: a.fine ? new Date(a.fine) : null },
      update: { fine: a.fine ? new Date(a.fine) : null },
    });
  }
  console.log(`✅ Allarmi: ${eventi.length} eventi → ${allarmi.length} allarmi accoppiati.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
