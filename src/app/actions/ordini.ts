"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";

export type FormResult = { error?: string };

// Estrae righe {mangimeId, quantitaKg, numeroLotto?} da campi ripetuti.
function parseRighe(formData: FormData) {
  const mangimi = formData.getAll("rigaMangime").map(String);
  const qte = formData.getAll("rigaQta").map((v) => Number(String(v).replace(",", ".")));
  const lotti = formData.getAll("rigaLotto").map(String);
  const righe: { mangimeId: string; quantitaKg: number; numeroLotto?: string }[] = [];
  for (let i = 0; i < mangimi.length; i++) {
    const mangimeId = mangimi[i];
    const quantitaKg = qte[i];
    if (!mangimeId || !quantitaKg || quantitaKg <= 0 || isNaN(quantitaKg)) continue;
    righe.push({ mangimeId, quantitaKg, numeroLotto: lotti[i] || undefined });
  }
  return righe;
}

// ---------------- Ordini ----------------
export async function createOrdine(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const numero = String(formData.get("numero") ?? "").trim();
  const data = String(formData.get("data") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!numero) return { error: "Il numero ordine è obbligatorio" };
  if (!data) return { error: "La data è obbligatoria" };

  const righe = parseRighe(formData);
  if (righe.length === 0) return { error: "Aggiungi almeno una riga con mangime e quantità." };

  const clash = await prisma.ordineMangime.findUnique({ where: { numero } });
  if (clash) return { error: `Esiste già un ordine con numero "${numero}".` };

  const ordine = await prisma.ordineMangime.create({
    data: {
      numero,
      data: new Date(data),
      note,
      righe: {
        create: righe.map((r) => ({ mangimeId: r.mangimeId, quantitaKg: r.quantitaKg })),
      },
    },
  });

  revalidatePath("/mangime/ordini");
  redirect(`/mangime/ordini/${ordine.id}`);
}

export async function setStatoOrdine(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id"));
  const stato = String(formData.get("stato"));
  if (!["BOZZA", "INVIATO", "EVASO", "ANNULLATO"].includes(stato)) return;
  await prisma.ordineMangime.update({ where: { id }, data: { stato } });
  revalidatePath("/mangime/ordini");
  revalidatePath(`/mangime/ordini/${id}`);
}

export async function deleteOrdine(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id"));
  await prisma.ordineMangime.delete({ where: { id } });
  revalidatePath("/mangime/ordini");
  redirect("/mangime/ordini");
}

// ---------------- DDT in entrata ----------------
export async function registraDdt(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const ordineId = String(formData.get("ordineId") ?? "") || null;
  const numero = String(formData.get("numero") ?? "").trim();
  const data = String(formData.get("data") ?? "");
  if (!numero) return { error: "Il numero DDT è obbligatorio" };
  if (!data) return { error: "La data è obbligatoria" };

  const righe = parseRighe(formData);
  if (righe.length === 0) return { error: "Inserisci almeno una riga con quantità ricevuta." };

  await prisma.ddtMangime.create({
    data: {
      numero,
      data: new Date(data),
      ordineId,
      carichi: {
        create: righe.map((r) => ({
          mangimeId: r.mangimeId,
          quantitaKg: r.quantitaKg,
          numeroLotto: r.numeroLotto,
          data: new Date(data),
        })),
      },
    },
  });

  // Segna l'ordine come evaso
  if (ordineId) {
    await prisma.ordineMangime.update({ where: { id: ordineId }, data: { stato: "EVASO" } });
    revalidatePath(`/mangime/ordini/${ordineId}`);
  }
  revalidatePath("/mangime/carichi");
  revalidatePath("/mangime");
  return {};
}

export async function deleteDdt(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id"));
  const ddt = await prisma.ddtMangime.findUnique({ where: { id } });
  await prisma.ddtMangime.delete({ where: { id } });
  if (ddt?.ordineId) revalidatePath(`/mangime/ordini/${ddt.ordineId}`);
  revalidatePath("/mangime/carichi");
  revalidatePath("/mangime");
}
