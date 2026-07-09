"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

export async function updateFascia(id: string, formData: FormData): Promise<void> {
  await requireSession();
  const pesoMaxKg = num(formData.get("pesoMaxKg")); // null = fascia "oltre"
  const mqPerCapo = num(formData.get("mqPerCapo"));
  if (mqPerCapo == null || mqPerCapo <= 0) return;
  await prisma.curvaDensita.update({
    where: { id },
    data: { pesoMaxKg, mqPerCapo },
  });
  revalidatePath("/anagrafiche/densita");
  revalidatePath("/stalle");
}

export async function addFascia(formData: FormData): Promise<void> {
  await requireSession();
  const pesoMaxKg = num(formData.get("pesoMaxKg"));
  const mqPerCapo = num(formData.get("mqPerCapo"));
  if (mqPerCapo == null || mqPerCapo <= 0) return;
  const last = await prisma.curvaDensita.findFirst({ orderBy: { ordine: "desc" } });
  await prisma.curvaDensita.create({
    data: { pesoMaxKg, mqPerCapo, ordine: (last?.ordine ?? 0) + 1 },
  });
  revalidatePath("/anagrafiche/densita");
  revalidatePath("/stalle");
}

export async function deleteFascia(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id"));
  await prisma.curvaDensita.delete({ where: { id } });
  revalidatePath("/anagrafiche/densita");
  revalidatePath("/stalle");
}
