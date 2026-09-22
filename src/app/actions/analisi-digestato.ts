"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";
import { optionalNumber } from "@/lib/zod";

export type FormResult = { error?: string };

const NUMERICI = [
  "ph", "ce", "agv", "tac", "fosTac", "nh4", "ss", "sso", "cenere",
  "acAcetico", "acPropionico", "acButirrico", "acIsoButirrico",
  "acValerianico", "acIsoValerianico", "acCaproico", "hacEq",
] as const;

const schema = z.object({
  data: z.string().min(1, "La data di campionamento è obbligatoria"),
  luogo: z.string().trim().min(1, "Il punto di campionamento è obbligatorio"),
  rapportoNumero: z.string().trim().optional(),
  laboratorio: z.string().trim().optional(),
  note: z.string().trim().optional(),
  ...Object.fromEntries(NUMERICI.map((k) => [k, optionalNumber()])),
});

export async function createAnalisi(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = schema.safeParse({
    data: formData.get("data"),
    luogo: formData.get("luogo") || "F1",
    rapportoNumero: formData.get("rapportoNumero") || undefined,
    laboratorio: formData.get("laboratorio") || undefined,
    note: formData.get("note") || undefined,
    ...Object.fromEntries(NUMERICI.map((k) => [k, formData.get(k) || ""])),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data as Record<string, unknown> & { data: string; luogo: string };

  const data = new Date(`${d.data}T00:00:00`);

  // PDF del referto (facoltativo): arriva nello stesso form
  let pdfNome: string | null = null;
  let pdfDati: Uint8Array<ArrayBuffer> | null = null;
  const file = formData.get("pdf");
  if (file instanceof File && file.size > 0) {
    if (file.size > 4 * 1024 * 1024) return { error: "PDF troppo grande (max 4 MB)." };
    pdfNome = file.name;
    pdfDati = new Uint8Array(await file.arrayBuffer());
  }

  const doppio = await prisma.analisiDigestato.findFirst({
    where: {
      OR: [
        { data, luogo: d.luogo },
        ...(d.rapportoNumero ? [{ rapportoNumero: d.rapportoNumero as string }] : []),
      ],
    },
  });
  if (doppio) {
    return { error: "Esiste già un'analisi con questa data/luogo (o numero rapporto)." };
  }

  await prisma.analisiDigestato.create({
    data: {
      data,
      luogo: d.luogo,
      rapportoNumero: (d.rapportoNumero as string) || null,
      laboratorio: (d.laboratorio as string) || null,
      note: (d.note as string) || null,
      pdfNome,
      pdfDati,
      ...Object.fromEntries(NUMERICI.map((k) => [k, (d[k] as number | undefined) ?? null])),
    },
  });

  revalidatePath("/biogas/digestato");
  redirect("/biogas/digestato");
}

export async function deleteAnalisi(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.analisiDigestato.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/biogas/digestato");
}
