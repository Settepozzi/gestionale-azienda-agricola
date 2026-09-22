"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";
import { optionalNumber } from "@/lib/zod";
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
} from "@/lib/biogas-plc";

export type FormResult = { error?: string; ok?: boolean; giorni?: number };

// --- Import dei CSV del PLC (upload multiplo: kWh e sonde di analisi) ---
export async function importaCsvPlc(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const files = formData.getAll("csv").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Seleziona almeno un file CSV del PLC." };

  const acc = nuovoAccumulatore();
  const accA = nuovoAccumulatoreAnalisi();
  const eventi: EventoAllarme[] = [];
  let campioni = 0;
  for (const f of files) {
    if (f.size > 20 * 1024 * 1024) return { error: `File troppo grande: ${f.name}` };
    const testo = Buffer.from(await f.arrayBuffer()).toString("latin1");
    campioni += parseCsvPlc(testo, acc);
    campioni += parseCsvAnalisi(testo, accA);
    if (/storico/i.test(f.name)) campioni += parseCsvStorico(testo, eventi);
  }
  if (campioni === 0) {
    return {
      error:
        "Nessun campione riconosciuto: servono i file DB_kWh_*, DB_CH4/CO2/O2/H2S/Gas/Livelli/Temp o DB_Storico del PLC.",
    };
  }

  const giorni = risultatiGiornalieri(acc).filter((g) => g.data >= "2017-01-01");
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

  const allarmi = accoppiaAllarmi(eventi);
  for (const al of allarmi) {
    const inizio = new Date(al.inizio);
    await prisma.biogasAllarme.upsert({
      where: { msgNumber_inizio: { msgNumber: al.msgNumber, inizio } },
      create: { msgNumber: al.msgNumber, inizio, fine: al.fine ? new Date(al.fine) : null },
      update: { fine: al.fine ? new Date(al.fine) : null },
    });
  }

  revalidatePath("/biogas");
  revalidatePath("/biogas/dati");
  revalidatePath("/biogas/analisi");
  revalidatePath("/biogas/allarmi");
  return { ok: true, giorni: giorni.length + analisi.length + allarmi.length };
}

// --- Dati mensili dai contatori ufficiali ---
const meseSchema = z.object({
  anno: z.coerce.number().int().min(2000).max(2100),
  mese: z.coerce.number().int().min(1).max(12),
  enProdKWh: z.coerce.number().min(0),
  enCedKWh: z.coerce.number().min(0),
  prezzoEuroKWh: optionalNumber(),
  note: z.string().trim().optional(),
});

export async function salvaMeseBiogas(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = meseSchema.safeParse({
    anno: formData.get("anno"),
    mese: formData.get("mese"),
    enProdKWh: formData.get("enProdKWh") ?? 0,
    enCedKWh: formData.get("enCedKWh") ?? 0,
    prezzoEuroKWh: formData.get("prezzoEuroKWh") || "",
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data;
  if (d.enCedKWh > d.enProdKWh) {
    return { error: "L'energia ceduta non può superare la prodotta." };
  }

  await prisma.biogasMese.upsert({
    where: { anno_mese: { anno: d.anno, mese: d.mese } },
    create: {
      anno: d.anno,
      mese: d.mese,
      enProdKWh: d.enProdKWh,
      enCedKWh: d.enCedKWh,
      prezzoEuroKWh: d.prezzoEuroKWh ?? null,
      note: d.note,
    },
    update: {
      enProdKWh: d.enProdKWh,
      enCedKWh: d.enCedKWh,
      prezzoEuroKWh: d.prezzoEuroKWh ?? null,
      note: d.note,
    },
  });

  revalidatePath("/biogas");
  revalidatePath("/biogas/dati");
  return { ok: true };
}

export async function eliminaMeseBiogas(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.biogasMese.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/biogas");
  revalidatePath("/biogas/dati");
}
