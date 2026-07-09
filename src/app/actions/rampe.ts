"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";
import {
  startOfDay,
  percentualeDaRampa,
  calcolaRazioneBox,
  type CurvaMangime,
} from "@/lib/razione";

export type FormResult = { error?: string; ok?: boolean; applicate?: number };

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

// ---------------- CRUD rampe ----------------
export async function addRampa(formData: FormData): Promise<void> {
  await requireSession();
  const nome = String(formData.get("nome") ?? "").trim();
  const inc = num(formData.get("incrementoGiornaliero"));
  const max = num(formData.get("percentualeMax")) ?? 100;
  const min = num(formData.get("percentualeMin")) ?? 0;
  if (!nome || inc == null) return;
  const exists = await prisma.rampaAlimentazione.findUnique({ where: { nome } });
  if (exists) return;
  await prisma.rampaAlimentazione.create({
    data: { nome, incrementoGiornaliero: inc, percentualeMax: max, percentualeMin: min },
  });
  revalidatePath("/razione/rampe");
  revalidatePath("/razione");
}

export async function updateRampa(id: string, formData: FormData): Promise<void> {
  await requireSession();
  const nome = String(formData.get("nome") ?? "").trim();
  const inc = num(formData.get("incrementoGiornaliero"));
  const max = num(formData.get("percentualeMax")) ?? 100;
  const min = num(formData.get("percentualeMin")) ?? 0;
  if (!nome || inc == null) return;
  const clash = await prisma.rampaAlimentazione.findFirst({ where: { nome, NOT: { id } } });
  if (clash) return;
  await prisma.rampaAlimentazione.update({
    where: { id },
    data: { nome, incrementoGiornaliero: inc, percentualeMax: max, percentualeMin: min },
  });
  revalidatePath("/razione/rampe");
  revalidatePath("/razione");
}

export async function deleteRampa(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.rampaAlimentazione.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/razione/rampe");
  revalidatePath("/razione");
}

// ---------------- Applicazione rampe ----------------
// Per ogni box con rampa e capi presenti: se oggi non ha già una razione
// (manuale = override), genera la razione di oggi partendo dall'ultima
// registrata e applicando l'incremento della rampa.
export async function applicaRampeOggi(
  _prev: FormResult,
  _formData: FormData
): Promise<FormResult> {
  await requireSession();
  const oggi = startOfDay(new Date());

  const [boxes, curva] = await Promise.all([
    prisma.box.findMany({
      where: { rampaId: { not: null } },
      include: {
        rampa: true,
        giacenze: {
          where: { quantita: { gt: 0 } },
          include: { partita: { select: { dataArrivo: true } } },
        },
        razioni: { orderBy: { data: "desc" }, take: 1 },
      },
    }),
    prisma.curvaAccrescimento.findMany({ select: { giorno: true, mangimeCapoGg: true } }),
  ]);

  let applicate = 0;
  for (const box of boxes) {
    if (!box.rampa || box.giacenze.length === 0) continue;
    const ultima = box.razioni[0];
    if (!ultima) continue; // serve una base (prima razione impostata a mano)
    if (startOfDay(ultima.data).getTime() >= oggi.getTime()) continue; // già impostata oggi

    const perc = percentualeDaRampa(ultima.percentuale, ultima.data, box.rampa, oggi);
    const r = calcolaRazioneBox(box.giacenze, curva as CurvaMangime[], oggi, perc);
    const principale = [...box.giacenze].sort((a, b) => b.quantita - a.quantita)[0];

    await prisma.razioneBox.upsert({
      where: { boxId_data: { boxId: box.id, data: oggi } },
      create: {
        boxId: box.id,
        data: oggi,
        percentuale: perc,
        kgStandardCapo: r.kgStandardCapo,
        capi: r.capi,
        kgTotale: r.kgTotale,
        livello: "RAMPA",
        partitaId: principale.partitaId ?? null,
      },
      update: {},
    });
    applicate++;
  }

  revalidatePath("/razione");
  revalidatePath("/riepilogo");
  return { ok: true, applicate };
}
