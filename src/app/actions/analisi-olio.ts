"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";
import { optionalNumber } from "@/lib/zod";

export type FormResult = { error?: string };

const NUMERICI = [
  "oreOlio", "oreMotore", "litriRabbocco",
  "ferro", "cromo", "nichel", "alluminio", "rame", "piombo", "stagno",
  "silicio", "sodio", "potassio", "magnesio", "calcio", "fosforo", "zinco",
  "visc40", "visc100", "viscIndex", "tan", "bnD4739", "bnD2896", "iPh",
  "oxidation", "nitration", "zolfoPct",
] as const;

const schema = z.object({
  data: z.string().min(1, "La data di campionamento è obbligatoria"),
  labNumero: z.string().trim().optional(),
  motore: z.string().trim().optional(),
  olio: z.string().trim().optional(),
  commento: z.string().trim().optional(),
  note: z.string().trim().optional(),
  ...Object.fromEntries(NUMERICI.map((k) => [k, optionalNumber()])),
});

export async function createAnalisiOlio(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = schema.safeParse({
    data: formData.get("data"),
    labNumero: formData.get("labNumero") || undefined,
    motore: formData.get("motore") || undefined,
    olio: formData.get("olio") || undefined,
    commento: formData.get("commento") || undefined,
    note: formData.get("note") || undefined,
    ...Object.fromEntries(NUMERICI.map((k) => [k, formData.get(k) || ""])),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data as Record<string, unknown> & { data: string };

  const data = new Date(`${d.data}T00:00:00`);
  const esiste = await prisma.analisiOlio.findFirst({ where: { data } });
  if (esiste) return { error: "Esiste già un'analisi olio con questa data." };

  let pdfNome: string | null = null;
  let pdfDati: Uint8Array<ArrayBuffer> | null = null;
  const file = formData.get("pdf");
  if (file instanceof File && file.size > 0) {
    if (file.size > 4 * 1024 * 1024) return { error: "PDF troppo grande (max 4 MB)." };
    pdfNome = file.name;
    pdfDati = new Uint8Array(await file.arrayBuffer());
  }

  const num = (k: string) => (d[k] as number | undefined) ?? null;

  await prisma.analisiOlio.create({
    data: {
      data,
      labNumero: (d.labNumero as string) || null,
      motore: (d.motore as string) || null,
      olio: (d.olio as string) || null,
      cambioOlio: formData.get("cambioOlio") != null,
      commento: (d.commento as string) || null,
      note: (d.note as string) || null,
      pdfNome,
      pdfDati,
      oreOlio: num("oreOlio") != null ? Math.round(num("oreOlio")!) : null,
      oreMotore: num("oreMotore") != null ? Math.round(num("oreMotore")!) : null,
      ...Object.fromEntries(
        NUMERICI.filter((k) => k !== "oreOlio" && k !== "oreMotore").map((k) => [k, num(k)])
      ),
    },
  });

  revalidatePath("/biogas/olio");
  redirect("/biogas/olio");
}

export async function deleteAnalisiOlio(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.analisiOlio.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/biogas/olio");
}
