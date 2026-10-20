"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";
import { optionalNumber } from "@/lib/zod";

export type FormResult = { error?: string };

const NUMERICI = [
  "livelloFreatimetricoM", "temperaturaC", "ph", "conducibilita", "cod",
  "azotoAmmoniacale", "nitriti", "nitrati", "fosforo", "rame", "zinco",
] as const;

const schema = z.object({
  data: z.string().min(1, "La data di campionamento è obbligatoria"),
  punto: z.string().trim().min(1, "Il piezometro è obbligatorio"),
  rapportoNumero: z.string().trim().optional(),
  laboratorio: z.string().trim().optional(),
  aspetto: z.string().trim().optional(),
  note: z.string().trim().optional(),
  ...Object.fromEntries(NUMERICI.map((k) => [k, optionalNumber()])),
});

export async function createAnalisiPiezometro(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = schema.safeParse({
    data: formData.get("data"),
    punto: formData.get("punto") || "Nord",
    rapportoNumero: formData.get("rapportoNumero") || undefined,
    laboratorio: formData.get("laboratorio") || undefined,
    aspetto: formData.get("aspetto") || undefined,
    note: formData.get("note") || undefined,
    ...Object.fromEntries(NUMERICI.map((k) => [k, formData.get(k) || ""])),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data as Record<string, unknown> & { data: string; punto: string };

  const data = new Date(`${d.data}T00:00:00`);
  const doppio = await prisma.analisiAcquaPiezometro.findFirst({
    where: {
      OR: [
        { data, punto: d.punto },
        ...(d.rapportoNumero ? [{ rapportoNumero: d.rapportoNumero as string }] : []),
      ],
    },
  });
  if (doppio) return { error: "Esiste già un'analisi per questo piezometro in questa data." };

  let pdfNome: string | null = null;
  let pdfDati: Uint8Array<ArrayBuffer> | null = null;
  const file = formData.get("pdf");
  if (file instanceof File && file.size > 0) {
    if (file.size > 4 * 1024 * 1024) return { error: "PDF troppo grande (max 4 MB)." };
    pdfNome = file.name;
    pdfDati = new Uint8Array(await file.arrayBuffer());
  }

  await prisma.analisiAcquaPiezometro.create({
    data: {
      data,
      punto: d.punto,
      rapportoNumero: (d.rapportoNumero as string) || null,
      laboratorio: (d.laboratorio as string) || null,
      aspetto: (d.aspetto as string) || null,
      note: (d.note as string) || null,
      pdfNome,
      pdfDati,
      ...Object.fromEntries(NUMERICI.map((k) => [k, (d[k] as number | undefined) ?? null])),
    },
  });

  revalidatePath("/biogas/piezometri");
  redirect("/biogas/piezometri");
}

export async function deleteAnalisiPiezometro(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.analisiAcquaPiezometro.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/biogas/piezometri");
}
