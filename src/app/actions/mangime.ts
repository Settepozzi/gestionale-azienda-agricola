"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";

export type FormResult = { error?: string };

// ---------------- Anagrafica mangimi ----------------
const mangimeSchema = z.object({
  codice: z.string().trim().min(1, "Il codice è obbligatorio"),
  nome: z.string().trim().min(1, "Il nome è obbligatorio"),
});

export async function createMangime(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = mangimeSchema.safeParse({
    codice: formData.get("codice"),
    nome: formData.get("nome"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const exists = await prisma.mangime.findUnique({ where: { codice: parsed.data.codice } });
  if (exists) return { error: `Esiste già un mangime con codice "${parsed.data.codice}".` };

  await prisma.mangime.create({ data: parsed.data });
  revalidatePath("/mangime");
  redirect("/mangime");
}

export async function updateMangime(id: string, formData: FormData): Promise<void> {
  await requireSession();
  const codice = String(formData.get("codice") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!codice || !nome) return;
  const clash = await prisma.mangime.findFirst({ where: { codice, NOT: { id } } });
  if (clash) return; // codice già usato: ignora
  await prisma.mangime.update({ where: { id }, data: { codice, nome } });
  revalidatePath("/mangime");
}

export async function deleteMangime(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.mangime.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/mangime");
}

// ---------------- Carichi mangime ----------------
const caricoSchema = z.object({
  mangimeId: z.string().min(1, "Seleziona il mangime"),
  data: z.string().min(1, "La data è obbligatoria"),
  numeroLotto: z.string().trim().optional(),
  quantitaKg: z.coerce.number().min(0.01, "Quantità non valida"),
});

export async function createCarico(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = caricoSchema.safeParse({
    mangimeId: formData.get("mangimeId"),
    data: formData.get("data"),
    numeroLotto: formData.get("numeroLotto") || undefined,
    quantitaKg: formData.get("quantitaKg") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data;

  // Cartellino del mangime (PDF/immagine) — obbligo di conservazione 5 anni
  let cartellinoId: string | null = null;
  const file = formData.get("cartellino");
  if (file instanceof File && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) return { error: "Cartellino troppo grande (max 10 MB)." };
    const allegato = await prisma.allegatoCartellino.create({
      data: { nome: file.name, dati: Buffer.from(await file.arrayBuffer()) },
    });
    cartellinoId = allegato.id;
  }

  await prisma.caricoMangime.create({
    data: {
      mangimeId: d.mangimeId,
      data: new Date(d.data),
      numeroLotto: d.numeroLotto,
      quantitaKg: d.quantitaKg,
      cartellinoId,
    },
  });
  revalidatePath("/mangime/carichi");
  revalidatePath("/mangime");
  redirect("/mangime/carichi");
}

export async function deleteCarico(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.caricoMangime.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/mangime/carichi");
  revalidatePath("/mangime");
}

// ---------------- Consumi giornalieri (per Linea + Gruppo) ----------------
const consumoSchema = z.object({
  data: z.string().min(1, "La data è obbligatoria"),
  mangimeId: z.string().min(1, "Seleziona il mangime"),
  lineaId: z.string().min(1, "Seleziona la linea"),
  gruppoId: z.string().min(1, "Seleziona il gruppo"),
  quantitaKg: z.coerce.number().min(0.01, "Quantità non valida"),
  note: z.string().trim().optional(),
});

export async function createConsumo(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = consumoSchema.safeParse({
    data: formData.get("data"),
    mangimeId: formData.get("mangimeId"),
    lineaId: formData.get("lineaId"),
    gruppoId: formData.get("gruppoId"),
    quantitaKg: formData.get("quantitaKg") ?? 0,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data;

  await prisma.consumoMangime.create({
    data: {
      data: new Date(d.data),
      mangimeId: d.mangimeId,
      lineaId: d.lineaId,
      gruppoId: d.gruppoId,
      quantitaKg: d.quantitaKg,
      note: d.note,
    },
  });
  revalidatePath("/mangime/consumi");
  redirect("/mangime/consumi");
}

export async function deleteConsumo(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.consumoMangime.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/mangime/consumi");
}
