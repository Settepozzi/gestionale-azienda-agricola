"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";
import { startOfDay } from "@/lib/razione";
import { optionalNumber } from "@/lib/zod";

export type FormResult = { error?: string };

function addDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}

const schema = z.object({
  numeroRicetta: z.string().trim().optional(),
  dataRicetta: z.string().optional(),
  farmaco: z.string().trim().min(1, "Il farmaco è obbligatorio"),
  aic: z.string().trim().optional(),
  viaSomministrazione: z.string().trim().optional(),
  patologia: z.string().trim().optional(),
  veterinario: z.string().trim().optional(),
  dataInizio: z.string().min(1, "La data di inizio è obbligatoria"),
  durataGiorni: z.coerce.number().int().min(1, "Durata non valida"),
  giorniSospensione: z.coerce.number().int().min(0),
  quantitaCapi: optionalNumber(),
  note: z.string().trim().optional(),
  pdfNome: z.string().trim().optional(),
  allegatoId: z.string().trim().optional(),
  livello: z.enum(["BOX", "LINEA_GRUPPO"]),
  lineaId: z.string().optional(),
  gruppoId: z.string().optional(),
});

export async function createTrattamento(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = schema.safeParse({
    numeroRicetta: formData.get("numeroRicetta") || undefined,
    dataRicetta: formData.get("dataRicetta") || undefined,
    farmaco: formData.get("farmaco"),
    aic: formData.get("aic") || undefined,
    viaSomministrazione: formData.get("viaSomministrazione") || undefined,
    patologia: formData.get("patologia") || undefined,
    veterinario: formData.get("veterinario") || undefined,
    dataInizio: formData.get("dataInizio"),
    durataGiorni: formData.get("durataGiorni") ?? 1,
    giorniSospensione: formData.get("giorniSospensione") ?? 0,
    quantitaCapi: formData.get("quantitaCapi") || "",
    note: formData.get("note") || undefined,
    pdfNome: formData.get("pdfNome") || undefined,
    allegatoId: formData.get("allegatoId") || undefined,
    livello: formData.get("livello"),
    lineaId: formData.get("lineaId") || undefined,
    gruppoId: formData.get("gruppoId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data;

  // Risoluzione dei box destinatari
  let boxIds: string[] = [];
  let lineaId: string | null = null;
  let gruppoId: string | null = null;
  if (d.livello === "LINEA_GRUPPO") {
    if (!d.lineaId || !d.gruppoId) return { error: "Seleziona linea e gruppo." };
    lineaId = d.lineaId;
    gruppoId = d.gruppoId;
    const boxes = await prisma.box.findMany({
      where: { lineaId: d.lineaId, gruppoId: d.gruppoId },
      select: { id: true },
    });
    boxIds = boxes.map((b) => b.id);
    if (boxIds.length === 0) return { error: "Nessun box in questa Linea+Gruppo." };
  } else {
    boxIds = formData.getAll("boxId").map(String).filter(Boolean);
    if (boxIds.length === 0) return { error: "Seleziona almeno un box." };
  }

  const dataInizio = startOfDay(d.dataInizio);
  const dataFine = addDays(dataInizio, d.durataGiorni - 1);
  const dataFineSospensione = d.giorniSospensione > 0 ? addDays(dataFine, d.giorniSospensione) : dataFine;

  await prisma.trattamento.create({
    data: {
      numeroRicetta: d.numeroRicetta,
      dataRicetta: d.dataRicetta ? startOfDay(d.dataRicetta) : null,
      farmaco: d.farmaco,
      aic: d.aic,
      viaSomministrazione: d.viaSomministrazione,
      patologia: d.patologia,
      veterinario: d.veterinario,
      dataInizio,
      durataGiorni: d.durataGiorni,
      dataFine,
      giorniSospensione: d.giorniSospensione,
      dataFineSospensione,
      quantitaCapi: d.quantitaCapi != null ? Math.round(d.quantitaCapi) : null,
      note: d.note,
      pdfNome: d.pdfNome,
      allegatoId: d.allegatoId ?? null,
      lineaId,
      gruppoId,
      boxes: { create: boxIds.map((boxId) => ({ boxId })) },
    },
  });

  revalidatePath("/trattamenti");
  revalidatePath("/stalle");
  redirect("/trattamenti");
}

export async function deleteTrattamento(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.trattamento.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/trattamenti");
  revalidatePath("/stalle");
}
