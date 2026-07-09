"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";

export type FormResult = { error?: string; ok?: boolean };

// --- Attivazioni ---
const attivazioneSchema = z.object({
  inizio: z.string().min(1, "Data e ora di inizio obbligatorie"),
  fine: z.string().optional(),
  causaId: z.string().optional(),
  note: z.string().trim().optional(),
});

export async function createAttivazione(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = attivazioneSchema.safeParse({
    inizio: formData.get("inizio"),
    fine: formData.get("fine") || undefined,
    causaId: formData.get("causaId") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data;

  const inizio = new Date(d.inizio);
  const fine = d.fine ? new Date(d.fine) : null;
  if (isNaN(inizio.getTime())) return { error: "Data di inizio non valida." };
  if (fine && (isNaN(fine.getTime()) || fine <= inizio)) {
    return { error: "La fine deve essere successiva all'inizio." };
  }

  await prisma.attivazioneTorcia.create({
    data: {
      inizio,
      fine,
      causaId: d.causaId && d.causaId !== "" ? d.causaId : null,
      note: d.note,
    },
  });

  revalidatePath("/biogas/torcia");
  return { ok: true };
}

// Chiude un'attivazione ancora in corso.
export async function chiudiAttivazione(id: string, formData: FormData): Promise<void> {
  await requireSession();
  const fineStr = String(formData.get("fine") ?? "");
  const fine = fineStr ? new Date(fineStr) : new Date();
  const att = await prisma.attivazioneTorcia.findUnique({ where: { id } });
  if (!att || isNaN(fine.getTime()) || fine <= att.inizio) return;
  await prisma.attivazioneTorcia.update({ where: { id }, data: { fine } });
  revalidatePath("/biogas/torcia");
}

export async function deleteAttivazione(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.attivazioneTorcia.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/biogas/torcia");
}

// --- Cause di accensione ---
export async function addCausaTorcia(formData: FormData): Promise<void> {
  await requireSession();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  const exists = await prisma.causaTorcia.findUnique({ where: { nome } });
  if (exists) return;
  const last = await prisma.causaTorcia.findFirst({ orderBy: { ordine: "desc" } });
  await prisma.causaTorcia.create({ data: { nome, ordine: (last?.ordine ?? 0) + 1 } });
  revalidatePath("/biogas/torcia");
}

export async function updateCausaTorcia(id: string, formData: FormData): Promise<void> {
  await requireSession();
  const nome = String(formData.get("nome") ?? "").trim();
  const attiva = formData.get("attiva") != null;
  if (!nome) return;
  const clash = await prisma.causaTorcia.findFirst({ where: { nome, NOT: { id } } });
  if (clash) return;
  await prisma.causaTorcia.update({ where: { id }, data: { nome, attiva } });
  revalidatePath("/biogas/torcia");
}

export async function deleteCausaTorcia(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.causaTorcia.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/biogas/torcia");
}
