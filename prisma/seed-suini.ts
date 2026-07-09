// Precarica la struttura fisica dell'allevamento suini:
// - 2 stalle
// - box 8..92 con posizione sulla mappa (ricostruita dai PDF) e superficie reale
// - curva di accrescimento (da ICA.xlsx) e curva di densità (m²/capo)
// - alcune linee, gruppi e causali di mortalità
//
// Idempotente. Eseguire con:  npm run db:seed-suini

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

type Superficie = {
  numero: number;
  lunghezza: number;
  larghezza: number;
  moltiplicatore: number;
  superficieMq: number;
  tipo: "SINGOLO" | "DOPPIO";
};
type CurvaRow = {
  giorno: number;
  pesoKg: number;
  mangimeCapoGg: number;
  mangimeProgKg: number;
  resa: number;
  ica: number;
};

const dataDir = join(process.cwd(), "prisma", "data");
const superfici: Superficie[] = JSON.parse(
  readFileSync(join(dataDir, "box-superfici.json"), "utf-8")
);
const accrescimento: CurvaRow[] = JSON.parse(
  readFileSync(join(dataDir, "accrescimento.json"), "utf-8")
);
const superficieByNum = new Map(superfici.map((s) => [s.numero, s]));

// ---------- Posizioni sulla mappa ----------
type BoxPos = { numero: number; stalla: string; x: number; y: number; w: number; h: number };
const positions: BoxPos[] = [];

// STALLA 1 (rettangolo in alto)
{
  const W = 140, H = 26, rowGap = 4, bandGap = 14, originX = 40, originY = 40, colGap = 6, corridor = 50;
  const xA = originX, xB = xA + W + colGap, xC = xB + W + corridor, xD = xC + W + colGap;
  const colA = [57, 55, 53, 51, 49, 47, 45, 43, 41, 39, 37, 35];
  const colB = [58, 56, 54, 52, 50, 48, 46, 44, 42, 40, 38, 36];
  const colC = [70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92];
  const colD = [69, 71, 73, 75, 77, 79, 81, 83, 85, 87, 89, 91];
  const yOf = (i: number) => {
    const band = Math.floor(i / 4), r = i % 4;
    return originY + band * (4 * (H + rowGap) + bandGap) + r * (H + rowGap);
  };
  ([[colA, xA], [colB, xB], [colC, xC], [colD, xD]] as [number[], number][]).forEach(([arr, x]) => {
    arr.forEach((numero, i) => positions.push({ numero, stalla: "Stalla 1", x, y: yOf(i), w: W, h: H }));
  });
}
// STALLA 2 (forma a "L")
{
  const originX = 40, originY = 560, W = 300, H = 30, rowGap = 4, sectionGap = 16;
  const sections: number[][] = [[26, 25, 24], [23, 22, 21, 20], [19, 18, 17], [16, 15, 14], [11, 10, 9, 8]];
  let y = originY;
  sections.forEach((sec, si) => {
    for (const numero of sec) {
      positions.push({ numero, stalla: "Stalla 2", x: originX, y, w: W, h: H });
      y += H + rowGap;
    }
    if (si === 3) {
      const halfW = (W - 8) / 2;
      positions.push({ numero: 13, stalla: "Stalla 2", x: originX, y, w: halfW, h: H });
      positions.push({ numero: 12, stalla: "Stalla 2", x: originX + halfW + 8, y, w: halfW, h: H });
      y += H + rowGap;
    }
    y += sectionGap;
  });
  const sqX = originX + W + 30, sqW = 96, sqH = 46, sqGap = 6;
  [27, 28, 29, 30, 31, 32, 33, 34].forEach((numero, i) => {
    positions.push({ numero, stalla: "Stalla 2", x: sqX, y: originY + i * (sqH + sqGap), w: sqW, h: sqH });
  });
}

// Densità di default (m²/capo per fascia di peso). Modificabile dall'utente.
const densita = [
  { pesoMaxKg: 30, mqPerCapo: 0.3, ordine: 1 },
  { pesoMaxKg: 50, mqPerCapo: 0.4, ordine: 2 },
  { pesoMaxKg: 85, mqPerCapo: 0.55, ordine: 3 },
  { pesoMaxKg: 110, mqPerCapo: 0.65, ordine: 4 },
  { pesoMaxKg: 130, mqPerCapo: 1.0, ordine: 5 },
  { pesoMaxKg: null as number | null, mqPerCapo: 1.1, ordine: 6 }, // oltre 130 kg
];

async function main() {
  const stalla1 = await prisma.stalla.upsert({
    where: { nome: "Stalla 1" }, update: {}, create: { nome: "Stalla 1", ordine: 1 },
  });
  const stalla2 = await prisma.stalla.upsert({
    where: { nome: "Stalla 2" }, update: {}, create: { nome: "Stalla 2", ordine: 2 },
  });
  const stallaId: Record<string, string> = { "Stalla 1": stalla1.id, "Stalla 2": stalla2.id };

  for (const [i, nome] of ["Linea 1", "Linea 2"].entries()) {
    await prisma.linea.upsert({ where: { nome }, update: {}, create: { nome, ordine: i + 1 } });
  }
  for (const [i, nome] of ["Gruppo 1", "Gruppo 2"].entries()) {
    await prisma.gruppo.upsert({ where: { nome }, update: {}, create: { nome, ordine: i + 1 } });
  }
  const causali = ["Malattia", "Schiacciamento", "Problema cardiaco", "Zoppia", "Scarto", "Sconosciuta"];
  for (const [i, nome] of causali.entries()) {
    await prisma.causaleMortalita.upsert({ where: { nome }, update: {}, create: { nome, ordine: i + 1 } });
  }

  // Box: crea se mancanti, e in ogni caso aggiorna superficie/tipo/dimensioni.
  for (const pos of positions) {
    const s = superficieByNum.get(pos.numero);
    const datiFisici = s
      ? {
          tipo: s.tipo,
          superficieMq: s.superficieMq,
          lunghezzaM: s.lunghezza,
          larghezzaM: s.larghezza,
          moltiplicatore: s.moltiplicatore,
        }
      : {};
    await prisma.box.upsert({
      where: { numero: pos.numero },
      update: datiFisici,
      create: {
        numero: pos.numero,
        stallaId: stallaId[pos.stalla],
        posX: pos.x,
        posY: pos.y,
        larghezza: pos.w,
        altezza: pos.h,
        ...datiFisici,
      },
    });
  }
  console.log(`✔ Box aggiornati con superficie reale (${positions.length}).`);

  // Curva di accrescimento
  for (const r of accrescimento) {
    await prisma.curvaAccrescimento.upsert({
      where: { giorno: r.giorno },
      update: { pesoKg: r.pesoKg, mangimeCapoGg: r.mangimeCapoGg, mangimeProgKg: r.mangimeProgKg, resa: r.resa, ica: r.ica },
      create: r,
    });
  }
  console.log(`✔ Curva di accrescimento (${accrescimento.length} giorni).`);

  // Curva di densità (solo se vuota)
  if ((await prisma.curvaDensita.count()) === 0) {
    for (const d of densita) await prisma.curvaDensita.create({ data: d });
    console.log(`✔ Curva di densità di default (${densita.length} fasce).`);
  }

  console.log("✔ Anagrafiche suini pronte.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
