"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";
import { startOfDay, calcolaRazioneBox, type CurvaMangime } from "@/lib/razione";

export type FormResult = { error?: string; ok?: boolean };

async function getCurva(): Promise<CurvaMangime[]> {
  return prisma.curvaAccrescimento.findMany({ select: { giorno: true, mangimeCapoGg: true } });
}

// Salva/aggiorna la razione di un box per un giorno.
async function salvaRazioneBox(
  boxId: string,
  data: Date,
  percentuale: number,
  livello: "BOX" | "LINEA_GRUPPO",
  curva: CurvaMangime[]
) {
  const giacenze = await prisma.giacenza.findMany({
    where: { boxId, quantita: { gt: 0 } },
    include: { partita: { select: { dataArrivo: true } } },
  });
  if (giacenze.length === 0) return false;

  const principale = await prisma.giacenza.findFirst({
    where: { boxId, quantita: { gt: 0 } },
    orderBy: { quantita: "desc" },
  });

  const r = calcolaRazioneBox(giacenze, curva, data, percentuale);
  await prisma.razioneBox.upsert({
    where: { boxId_data: { boxId, data } },
    create: {
      boxId,
      data,
      percentuale,
      kgStandardCapo: r.kgStandardCapo,
      capi: r.capi,
      kgTotale: r.kgTotale,
      livello,
      partitaId: principale?.partitaId ?? null,
    },
    update: {
      percentuale,
      kgStandardCapo: r.kgStandardCapo,
      capi: r.capi,
      kgTotale: r.kgTotale,
      livello,
      partitaId: principale?.partitaId ?? null,
    },
  });
  return true;
}

const schema = z.object({
  livello: z.enum(["BOX", "LINEA_GRUPPO"]),
  boxId: z.string().optional(),
  lineaId: z.string().optional(),
  gruppoId: z.string().optional(),
  percentuale: z.coerce.number().min(0).max(300),
  data: z.string().min(1),
});

export async function setRazione(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireSession();
  const parsed = schema.safeParse({
    livello: formData.get("livello"),
    boxId: formData.get("boxId") || undefined,
    lineaId: formData.get("lineaId") || undefined,
    gruppoId: formData.get("gruppoId") || undefined,
    percentuale: formData.get("percentuale") ?? 0,
    data: formData.get("data"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data;
  const data = startOfDay(d.data);
  const curva = await getCurva();

  if (d.livello === "BOX") {
    if (!d.boxId) return { error: "Seleziona un box." };
    const ok = await salvaRazioneBox(d.boxId, data, d.percentuale, "BOX", curva);
    if (!ok) return { error: "Il box non ha capi presenti." };
  } else {
    if (!d.lineaId || !d.gruppoId) return { error: "Seleziona linea e gruppo." };
    const boxes = await prisma.box.findMany({
      where: { lineaId: d.lineaId, gruppoId: d.gruppoId },
      select: { id: true },
    });
    let count = 0;
    for (const b of boxes) {
      const ok = await salvaRazioneBox(b.id, data, d.percentuale, "LINEA_GRUPPO", curva);
      if (ok) count++;
    }
    if (count === 0) return { error: "Nessun box con capi in questa Linea+Gruppo." };
  }

  revalidatePath("/razione");
  revalidatePath("/riepilogo");
  return { ok: true };
}

export async function deleteRazione(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.razioneBox.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/razione");
  revalidatePath("/riepilogo");
}
