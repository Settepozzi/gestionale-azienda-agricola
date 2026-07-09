"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";
import { optionalNumber } from "@/lib/zod";

export type FormResult = { error?: string; ok?: boolean };

const schema = z.object({
  data: z.string().min(1, "La data è obbligatoria"),
  target: z.string().min(1, "Seleziona il box/partita"), // "boxId:partitaId"
  quantita: z.coerce.number().int().min(1, "Quantità non valida"),
  causaleId: z.string().optional(),
  pesoKg: optionalNumber(),
  note: z.string().trim().optional(),
});

export async function createMortalita(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = schema.safeParse({
    data: formData.get("data"),
    target: formData.get("target"),
    quantita: formData.get("quantita") ?? 0,
    causaleId: formData.get("causaleId") || undefined,
    pesoKg: formData.get("pesoKg") || "",
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data;
  const [boxId, partitaId] = d.target.split(":");
  if (!boxId || !partitaId) return { error: "Selezione non valida." };

  const giacenza = await prisma.giacenza.findUnique({
    where: { boxId_partitaId: { boxId, partitaId } },
  });
  if (!giacenza || giacenza.quantita < d.quantita) {
    return { error: `Nel box ci sono solo ${giacenza?.quantita ?? 0} capi di questa partita.` };
  }

  await prisma.$transaction(async (tx) => {
    const rimanenti = giacenza.quantita - d.quantita;
    if (rimanenti <= 0) {
      await tx.giacenza.delete({ where: { id: giacenza.id } });
    } else {
      await tx.giacenza.update({ where: { id: giacenza.id }, data: { quantita: rimanenti } });
    }
    await tx.mortalita.create({
      data: {
        data: new Date(d.data),
        quantita: d.quantita,
        pesoKg: d.pesoKg ?? null,
        note: d.note,
        boxId,
        partitaId,
        causaleId: d.causaleId && d.causaleId !== "" ? d.causaleId : null,
      },
    });
  });

  revalidatePath("/mortalita");
  revalidatePath("/stalle");
  return { ok: true };
}

// Elimina un record di mortalità e ripristina la giacenza.
export async function deleteMortalita(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id"));
  const m = await prisma.mortalita.findUnique({ where: { id } });
  if (!m) return;
  await prisma.$transaction(async (tx) => {
    if (m.partitaId) {
      await tx.giacenza.upsert({
        where: { boxId_partitaId: { boxId: m.boxId, partitaId: m.partitaId } },
        create: { boxId: m.boxId, partitaId: m.partitaId, quantita: m.quantita },
        update: { quantita: { increment: m.quantita } },
      });
    }
    await tx.mortalita.delete({ where: { id } });
  });
  revalidatePath("/mortalita");
  revalidatePath("/stalle");
}
