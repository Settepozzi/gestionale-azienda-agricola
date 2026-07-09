"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";
import { startOfDay } from "@/lib/razione";

export type FormResult = { error?: string; ok?: boolean };

// Trova la partita "principale" (con più capi) presente in un box.
async function partitaPrincipale(boxId: string) {
  const g = await prisma.giacenza.findFirst({
    where: { boxId, quantita: { gt: 0 } },
    orderBy: { quantita: "desc" },
  });
  return g;
}

// --- Segnalazione pasto (+ / - / 0) ---
export async function setSegnalazionePasto(formData: FormData): Promise<void> {
  await requireSession();
  const boxId = String(formData.get("boxId"));
  const segno = String(formData.get("segno"));
  if (!["PIU", "MENO", "ZERO"].includes(segno)) return;
  const data = startOfDay(new Date());
  await prisma.segnalazionePasto.upsert({
    where: { boxId_data: { boxId, data } },
    create: { boxId, data, segno },
    update: { segno },
  });
  revalidatePath("/operatore");
  revalidatePath("/riepilogo");
}

// --- Mortalità rapida ---
export async function mortalitaRapida(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const boxId = String(formData.get("boxId"));
  const quantita = Math.floor(Number(formData.get("quantita")));
  if (!boxId) return { error: "Seleziona un box." };
  if (!quantita || quantita < 1) return { error: "Numero non valido." };

  const g = await partitaPrincipale(boxId);
  if (!g || g.quantita < quantita) {
    return { error: `Nel box ci sono solo ${g?.quantita ?? 0} capi.` };
  }

  await prisma.$transaction(async (tx) => {
    const rim = g.quantita - quantita;
    if (rim <= 0) await tx.giacenza.delete({ where: { id: g.id } });
    else await tx.giacenza.update({ where: { id: g.id }, data: { quantita: rim } });
    await tx.mortalita.create({
      data: { data: startOfDay(new Date()), quantita, boxId, partitaId: g.partitaId },
    });
  });

  revalidatePath("/operatore");
  revalidatePath("/riepilogo");
  revalidatePath("/stalle");
  return { ok: true };
}

// --- Spostamento rapido tra box ---
export async function spostamentoRapido(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const boxDaId = String(formData.get("boxDaId"));
  const boxAId = String(formData.get("boxAId"));
  const quantita = Math.floor(Number(formData.get("quantita")));
  if (!boxDaId || !boxAId) return { error: "Seleziona i box." };
  if (boxDaId === boxAId) return { error: "Box uguali." };
  if (!quantita || quantita < 1) return { error: "Numero non valido." };

  const g = await partitaPrincipale(boxDaId);
  if (!g || g.quantita < quantita) {
    return { error: `Nel box di partenza ci sono solo ${g?.quantita ?? 0} capi.` };
  }
  const partitaId = g.partitaId;

  await prisma.$transaction(async (tx) => {
    const rim = g.quantita - quantita;
    if (rim <= 0) await tx.giacenza.delete({ where: { id: g.id } });
    else await tx.giacenza.update({ where: { id: g.id }, data: { quantita: rim } });
    await tx.giacenza.upsert({
      where: { boxId_partitaId: { boxId: boxAId, partitaId } },
      create: { boxId: boxAId, partitaId, quantita },
      update: { quantita: { increment: quantita } },
    });
    await tx.spostamentoBox.create({
      data: { data: startOfDay(new Date()), quantita, partitaId, boxDaId, boxAId },
    });
  });

  revalidatePath("/operatore");
  revalidatePath("/riepilogo");
  revalidatePath("/stalle");
  return { ok: true };
}
