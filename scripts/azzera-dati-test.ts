// Azzera i DATI OPERATIVI (partite, giacenze, movimenti, consumi, trattamenti,
// vendite, razioni, segnalazioni, ordini/DDT/carichi mangime, allegati)
// CONSERVANDO la struttura: utenti, stalle, box (con superfici/posizioni),
// linee, gruppi, rampe, curve di accrescimento/densità, causali, anagrafica mangimi.
//
// USO (irreversibile!):  npx tsx scripts/azzera-dati-test.ts --conferma

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes("--conferma")) {
    console.log("⚠ Questo script CANCELLA tutti i dati operativi (partite, consumi, trattamenti…).");
    console.log("  La struttura (box, curve, anagrafiche, utenti) viene conservata.");
    console.log("  Per procedere: npx tsx scripts/azzera-dati-test.ts --conferma");
    return;
  }

  // Ordine: prima le tabelle dipendenti, poi le principali.
  const passi: [string, () => Promise<{ count: number }>][] = [
    ["Segnalazioni pasto", () => prisma.segnalazionePasto.deleteMany()],
    ["Razioni", () => prisma.razioneBox.deleteMany()],
    ["Mortalità", () => prisma.mortalita.deleteMany()],
    ["Spostamenti", () => prisma.spostamentoBox.deleteMany()],
    ["Vendite", () => prisma.venditaSuini.deleteMany()],
    ["Trattamenti (+ box collegati)", () => prisma.trattamento.deleteMany()],
    ["Allegati ricette", () => prisma.allegatoRicetta.deleteMany()],
    ["Giacenze", () => prisma.giacenza.deleteMany()],
    ["DDT suini", () => prisma.ddtSuini.deleteMany()],
    ["Partite", () => prisma.partita.deleteMany()],
    ["Consumi mangime", () => prisma.consumoMangime.deleteMany()],
    ["Carichi mangime", () => prisma.caricoMangime.deleteMany()],
    ["Cartellini mangime", () => prisma.allegatoCartellino.deleteMany()],
    ["DDT mangime", () => prisma.ddtMangime.deleteMany()],
    ["Ordini mangime (+ righe)", () => prisma.ordineMangime.deleteMany()],
  ];

  for (const [nome, fn] of passi) {
    const r = await fn();
    console.log(`✔ ${nome}: eliminati ${r.count}`);
  }

  console.log("\n✅ Dati operativi azzerati. Struttura conservata (box, curve, anagrafiche, utenti).");
  console.log("   Ora puoi inserire le partite reali.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
