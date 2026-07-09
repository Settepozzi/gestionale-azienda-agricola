"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";
import { optionalNumber } from "@/lib/zod";

export type FormResult = { error?: string };

const schema = z.object({
  odlNumero: z.string().trim().optional(),
  data: z.string().min(1, "La data è obbligatoria"),
  tipo: z.string().trim().optional(),
  descrizione: z.string().trim().optional(),
  ditta: z.string().trim().optional(),
  tecnico: z.string().trim().optional(),
  oreMoto: optionalNumber(),
  oreLavoro: optionalNumber(),
  oreViaggio: optionalNumber(),
  km: optionalNumber(),
  commento: z.string().trim().optional(),
  note: z.string().trim().optional(),
  allegatoId: z.string().trim().optional(),
});

export async function createManutenzione(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = schema.safeParse({
    odlNumero: formData.get("odlNumero") || undefined,
    data: formData.get("data"),
    tipo: formData.get("tipo") || undefined,
    descrizione: formData.get("descrizione") || undefined,
    ditta: formData.get("ditta") || undefined,
    tecnico: formData.get("tecnico") || undefined,
    oreMoto: formData.get("oreMoto") || "",
    oreLavoro: formData.get("oreLavoro") || "",
    oreViaggio: formData.get("oreViaggio") || "",
    km: formData.get("km") || "",
    commento: formData.get("commento") || undefined,
    note: formData.get("note") || undefined,
    allegatoId: formData.get("allegatoId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data;

  // Righe ricambi
  const codici = formData.getAll("ricCodice").map(String);
  const descr = formData.getAll("ricDescrizione").map(String);
  const qte = formData.getAll("ricQta").map((v) => Number(String(v).replace(",", ".")));
  const ricambi: { codice: string; descrizione: string | null; quantita: number }[] = [];
  for (let i = 0; i < codici.length; i++) {
    if (!codici[i].trim()) continue;
    ricambi.push({
      codice: codici[i].trim(),
      descrizione: descr[i]?.trim() || null,
      quantita: qte[i] > 0 && !isNaN(qte[i]) ? qte[i] : 1,
    });
  }

  await prisma.manutenzioneBiogas.create({
    data: {
      odlNumero: d.odlNumero,
      data: new Date(d.data),
      tipo: d.tipo,
      descrizione: d.descrizione,
      ditta: d.ditta,
      tecnico: d.tecnico,
      oreMoto: d.oreMoto != null ? Math.round(d.oreMoto) : null,
      oreLavoro: d.oreLavoro ?? null,
      oreViaggio: d.oreViaggio ?? null,
      km: d.km ?? null,
      commento: d.commento,
      note: d.note,
      allegatoId: d.allegatoId || null,
      ricambi: { create: ricambi },
    },
  });

  revalidatePath("/biogas/manutenzioni");
  redirect("/biogas/manutenzioni");
}

export async function deleteManutenzione(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.manutenzioneBiogas.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/biogas/manutenzioni");
}

// --- Piani di manutenzione programmata ---
export async function addPiano(formData: FormData): Promise<void> {
  await requireSession();
  const tipo = String(formData.get("tipo") ?? "").trim().toUpperCase();
  const intervallo = Math.round(Number(formData.get("intervalloOre")));
  if (!tipo || !intervallo || intervallo < 1) return;
  const exists = await prisma.pianoManutenzione.findUnique({ where: { tipo } });
  if (exists) return;
  await prisma.pianoManutenzione.create({ data: { tipo, intervalloOre: intervallo } });
  revalidatePath("/biogas/manutenzioni");
}

export async function updatePiano(id: string, formData: FormData): Promise<void> {
  await requireSession();
  const tipo = String(formData.get("tipo") ?? "").trim().toUpperCase();
  const intervallo = Math.round(Number(formData.get("intervalloOre")));
  const attivo = formData.get("attivo") != null;
  if (!tipo || !intervallo || intervallo < 1) return;
  const clash = await prisma.pianoManutenzione.findFirst({ where: { tipo, NOT: { id } } });
  if (clash) return;
  await prisma.pianoManutenzione.update({
    where: { id },
    data: { tipo, intervalloOre: intervallo, attivo },
  });
  revalidatePath("/biogas/manutenzioni");
}

export async function deletePiano(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.pianoManutenzione.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/biogas/manutenzioni");
}
