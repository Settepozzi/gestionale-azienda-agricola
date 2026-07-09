"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";
import { optionalNumber } from "@/lib/zod";

const boxSchema = z.object({
  numero: z.coerce.number().int().min(1, "Numero non valido"),
  stallaId: z.string().min(1, "Seleziona la stalla"),
  lineaId: z.string().optional(),
  gruppoId: z.string().optional(),
  tipo: z.enum(["SINGOLO", "DOPPIO"]),
  superficieMq: z.coerce.number().min(0),
  capienzaManuale: optionalNumber(),
  rampaId: z.string().optional(),
  note: z.string().trim().optional(),
});

export type FormResult = { error?: string };

export async function updateBox(
  id: string,
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = boxSchema.safeParse({
    numero: formData.get("numero"),
    stallaId: formData.get("stallaId"),
    lineaId: formData.get("lineaId") || undefined,
    gruppoId: formData.get("gruppoId") || undefined,
    tipo: formData.get("tipo"),
    superficieMq: formData.get("superficieMq") ?? 0,
    capienzaManuale: formData.get("capienzaManuale") || "",
    rampaId: formData.get("rampaId") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;

  const clash = await prisma.box.findFirst({
    where: { numero: d.numero, NOT: { id } },
  });
  if (clash) return { error: `Esiste già il box numero ${d.numero}.` };

  await prisma.box.update({
    where: { id },
    data: {
      numero: d.numero,
      stallaId: d.stallaId,
      lineaId: d.lineaId && d.lineaId !== "" ? d.lineaId : null,
      gruppoId: d.gruppoId && d.gruppoId !== "" ? d.gruppoId : null,
      tipo: d.tipo,
      superficieMq: d.superficieMq,
      capienzaManuale: d.capienzaManuale ?? null,
      rampaId: d.rampaId && d.rampaId !== "" ? d.rampaId : null,
      note: d.note,
    },
  });

  revalidatePath("/stalle");
  revalidatePath(`/box/${id}`);
  redirect("/stalle");
}

// Aggiorna solo la posizione sulla mappa (usata dal trascinamento).
export async function moveBox(id: string, posX: number, posY: number): Promise<void> {
  await requireSession();
  await prisma.box.update({
    where: { id },
    data: { posX: Math.round(posX), posY: Math.round(posY) },
  });
  revalidatePath("/stalle");
}
