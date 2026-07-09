"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";

export async function addCausale(formData: FormData): Promise<void> {
  await requireSession();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  const exists = await prisma.causaleMortalita.findUnique({ where: { nome } });
  if (exists) return;
  const last = await prisma.causaleMortalita.findFirst({ orderBy: { ordine: "desc" } });
  await prisma.causaleMortalita.create({ data: { nome, ordine: (last?.ordine ?? 0) + 1 } });
  revalidatePath("/anagrafiche/causali");
  revalidatePath("/mortalita");
}

export async function updateCausale(id: string, formData: FormData): Promise<void> {
  await requireSession();
  const nome = String(formData.get("nome") ?? "").trim();
  const attiva = formData.get("attiva") != null;
  if (!nome) return;
  const clash = await prisma.causaleMortalita.findFirst({ where: { nome, NOT: { id } } });
  if (clash) return;
  await prisma.causaleMortalita.update({ where: { id }, data: { nome, attiva } });
  revalidatePath("/anagrafiche/causali");
  revalidatePath("/mortalita");
}

export async function deleteCausale(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.causaleMortalita.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/anagrafiche/causali");
  revalidatePath("/mortalita");
}
