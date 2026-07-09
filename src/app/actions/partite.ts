"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-guard";
import { optionalNumber } from "@/lib/zod";

export type FormResult = { error?: string; ok?: boolean };

const partitaSchema = z.object({
  codice: z.string().trim().min(1, "Il codice è obbligatorio"),
  dataArrivo: z.string().min(1, "La data di arrivo è obbligatoria"),
  numeroCapiArrivati: z.coerce.number().int().min(0),
  pesoMedioArrivoKg: optionalNumber(),
  pesoTotaleArrivoKg: optionalNumber(),
  giorniCiclo: optionalNumber(),
  pesoMedioManualeKg: optionalNumber(),
  mangimeTotaleKg: optionalNumber(),
  fornitore: z.string().trim().optional(),
  genetica: z.string().trim().optional(),
  tatuaggio: z.string().trim().optional(),
  lettera: z.string().trim().max(1).optional(),
  venditaMese: z.string().trim().optional(), // "YYYY-MM"
  note: z.string().trim().optional(),
});

function parsePartita(formData: FormData) {
  return partitaSchema.safeParse({
    codice: formData.get("codice"),
    dataArrivo: formData.get("dataArrivo"),
    numeroCapiArrivati: formData.get("numeroCapiArrivati") ?? 0,
    pesoMedioArrivoKg: formData.get("pesoMedioArrivoKg") || "",
    pesoTotaleArrivoKg: formData.get("pesoTotaleArrivoKg") || "",
    giorniCiclo: formData.get("giorniCiclo") || "",
    pesoMedioManualeKg: formData.get("pesoMedioManualeKg") || "",
    mangimeTotaleKg: formData.get("mangimeTotaleKg") || "",
    fornitore: formData.get("fornitore") || undefined,
    genetica: formData.get("genetica") || undefined,
    tatuaggio: formData.get("tatuaggio") || undefined,
    lettera: formData.get("lettera") || undefined,
    venditaMese: formData.get("venditaMese") || undefined,
    note: formData.get("note") || undefined,
  });
}

export async function createPartita(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = parsePartita(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data;

  const existing = await prisma.partita.findUnique({ where: { codice: d.codice } });
  if (existing) return { error: `Esiste già una partita con codice "${d.codice}".` };

  const p = await prisma.partita.create({
    data: {
      codice: d.codice,
      dataArrivo: new Date(d.dataArrivo),
      numeroCapiArrivati: d.numeroCapiArrivati,
      pesoMedioArrivoKg: d.pesoMedioArrivoKg ?? null,
      pesoTotaleArrivoKg: d.pesoTotaleArrivoKg ?? null,
      giorniCiclo: d.giorniCiclo != null ? Math.round(d.giorniCiclo) : null,
      pesoMedioManualeKg: d.pesoMedioManualeKg ?? null,
      mangimeTotaleKg: d.mangimeTotaleKg ?? null,
      fornitore: d.fornitore ?? null,
      genetica: d.genetica ?? null,
      tatuaggio: d.tatuaggio ?? null,
      lettera: d.lettera ? d.lettera.toUpperCase() : null,
      venditaMese: d.venditaMese ?? null,
      note: d.note,
    },
  });

  revalidatePath("/partite");
  redirect(`/partite/${p.id}`);
}

export async function updatePartita(
  id: string,
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = parsePartita(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data;

  const clash = await prisma.partita.findFirst({ where: { codice: d.codice, NOT: { id } } });
  if (clash) return { error: `Esiste già una partita con codice "${d.codice}".` };

  await prisma.partita.update({
    where: { id },
    data: {
      codice: d.codice,
      dataArrivo: new Date(d.dataArrivo),
      numeroCapiArrivati: d.numeroCapiArrivati,
      pesoMedioArrivoKg: d.pesoMedioArrivoKg ?? null,
      pesoTotaleArrivoKg: d.pesoTotaleArrivoKg ?? null,
      giorniCiclo: d.giorniCiclo != null ? Math.round(d.giorniCiclo) : null,
      pesoMedioManualeKg: d.pesoMedioManualeKg ?? null,
      mangimeTotaleKg: d.mangimeTotaleKg ?? null,
      fornitore: d.fornitore ?? null,
      genetica: d.genetica ?? null,
      tatuaggio: d.tatuaggio ?? null,
      lettera: d.lettera ? d.lettera.toUpperCase() : null,
      venditaMese: d.venditaMese ?? null,
      note: d.note,
    },
  });

  revalidatePath("/partite");
  revalidatePath(`/partite/${id}`);
  redirect(`/partite/${id}`);
}

export async function deletePartita(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id"));
  await prisma.partita.delete({ where: { id } });
  revalidatePath("/partite");
  redirect("/partite");
}

export async function setStatoPartita(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id"));
  const stato = String(formData.get("stato")) === "CHIUSA" ? "CHIUSA" : "ATTIVA";
  await prisma.partita.update({
    where: { id },
    data: {
      stato,
      dataChiusura: stato === "CHIUSA" ? new Date() : null,
    },
  });
  revalidatePath("/partite");
  revalidatePath(`/partite/${id}`);
}

// --- Giacenza: imposta il numero esatto di capi di una partita in un box ---
const giacenzaSchema = z.object({
  partitaId: z.string().min(1),
  boxId: z.string().min(1, "Seleziona un box"),
  quantita: z.coerce.number().int().min(0),
});

export async function impostaGiacenza(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = giacenzaSchema.safeParse({
    partitaId: formData.get("partitaId"),
    boxId: formData.get("boxId"),
    quantita: formData.get("quantita") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const { partitaId, boxId, quantita } = parsed.data;

  if (quantita <= 0) {
    await prisma.giacenza.deleteMany({ where: { partitaId, boxId } });
  } else {
    await prisma.giacenza.upsert({
      where: { boxId_partitaId: { boxId, partitaId } },
      create: { boxId, partitaId, quantita },
      update: { quantita },
    });
  }

  revalidatePath("/stalle");
  revalidatePath(`/partite/${partitaId}`);
  return { ok: true };
}

// --- Spostamento capi tra box (con tracciamento) ---
const spostaSchema = z.object({
  partitaId: z.string().min(1),
  boxDaId: z.string().min(1, "Seleziona il box di partenza"),
  boxAId: z.string().min(1, "Seleziona il box di destinazione"),
  quantita: z.coerce.number().int().min(1, "Quantità non valida"),
  data: z.string().min(1, "La data è obbligatoria"),
  note: z.string().trim().optional(),
});

export async function spostaCapi(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = spostaSchema.safeParse({
    partitaId: formData.get("partitaId"),
    boxDaId: formData.get("boxDaId"),
    boxAId: formData.get("boxAId"),
    quantita: formData.get("quantita") ?? 0,
    data: formData.get("data"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const { partitaId, boxDaId, boxAId, quantita, data, note } = parsed.data;

  if (boxDaId === boxAId) return { error: "Box di partenza e destinazione coincidono." };

  const gDa = await prisma.giacenza.findUnique({
    where: { boxId_partitaId: { boxId: boxDaId, partitaId } },
  });
  if (!gDa || gDa.quantita < quantita) {
    return { error: `Nel box di partenza ci sono solo ${gDa?.quantita ?? 0} capi di questa partita.` };
  }

  await prisma.$transaction(async (tx) => {
    const rimanenti = gDa.quantita - quantita;
    if (rimanenti <= 0) {
      await tx.giacenza.delete({ where: { id: gDa.id } });
    } else {
      await tx.giacenza.update({ where: { id: gDa.id }, data: { quantita: rimanenti } });
    }
    await tx.giacenza.upsert({
      where: { boxId_partitaId: { boxId: boxAId, partitaId } },
      create: { boxId: boxAId, partitaId, quantita },
      update: { quantita: { increment: quantita } },
    });
    await tx.spostamentoBox.create({
      data: {
        data: new Date(data),
        quantita,
        note,
        partitaId,
        boxDaId,
        boxAId,
      },
    });
  });

  revalidatePath("/stalle");
  revalidatePath(`/partite/${partitaId}`);
  return { ok: true };
}

// --- Vendite / uscite di fine ciclo (carico per box) ---
const venditaSchema = z.object({
  partitaId: z.string().min(1),
  data: z.string().min(1, "La data è obbligatoria"),
  pesoTotaleKg: optionalNumber(),
  prezzo: optionalNumber(),
  macello: z.string().trim().optional(),
  ddtNumero: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export async function createVendita(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = venditaSchema.safeParse({
    partitaId: formData.get("partitaId"),
    data: formData.get("data"),
    pesoTotaleKg: formData.get("pesoTotaleKg") || "",
    prezzo: formData.get("prezzo") || "",
    macello: formData.get("macello") || undefined,
    ddtNumero: formData.get("ddtNumero") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data;
  const nonDop = formData.get("nonDop") != null; // spunta "vendita NON DOP"
  const dataVendita = new Date(d.data);
  dataVendita.setHours(0, 0, 0, 0);

  // Righe box: da quali box sono stati caricati i suini
  const vboxIds = formData.getAll("vboxId").map(String);
  const vboxQte = formData.getAll("vboxQta").map((v) => Math.floor(Number(v)));
  const righeBox: { boxId: string; quantita: number }[] = [];
  for (let i = 0; i < vboxIds.length; i++) {
    if (!vboxIds[i] || !vboxQte[i] || vboxQte[i] < 1 || isNaN(vboxQte[i])) continue;
    const gia = righeBox.find((r) => r.boxId === vboxIds[i]);
    if (gia) gia.quantita += vboxQte[i];
    else righeBox.push({ boxId: vboxIds[i], quantita: vboxQte[i] });
  }
  if (righeBox.length === 0) {
    return { error: "Indica da quali box hai caricato i suini (almeno una riga)." };
  }
  const numeroCapi = righeBox.reduce((s, r) => s + r.quantita, 0);
  const boxSelezionati = new Set(righeBox.map((r) => r.boxId));

  // --- Controlli DOP (saltati se vendita dichiarata NON DOP) ---
  if (!nonDop) {
    const partita = await prisma.partita.findUnique({
      where: { id: d.partitaId },
      include: {
        giacenze: {
          where: { quantita: { gt: 0 } },
          include: { box: { select: { numero: true } } },
        },
      },
    });

    // 1) Età minima: 9 mesi compiuti (venditaMese, Tab. 1 PDC Parma)
    if (partita?.venditaMese) {
      const [anno, mese] = partita.venditaMese.split("-").map(Number);
      if (anno && mese) {
        const primoUtile = new Date(anno, mese - 1, 1);
        if (dataVendita < primoUtile) {
          const label = primoUtile.toLocaleDateString("it-IT", {
            month: "long",
            year: "numeric",
          });
          return {
            error: `⛔ Vincolo DOP: i suini di questo lotto (lettera ${partita.lettera ?? "?"}) compiono 9 mesi a ${label}. Vendita DOP bloccata — spunta "Vendita NON DOP" per forzare.`,
          };
        }
      }
    }

    // 2) Tempi di sospensione farmaci nei box della partita (inclusi ereditati)
    if (partita && partita.giacenze.length > 0) {
      const [trattamentiRaw, spostamenti] = await Promise.all([
        prisma.trattamento.findMany({ include: { boxes: { select: { boxId: true } } } }),
        prisma.spostamentoBox.findMany({ select: { boxDaId: true, boxAId: true, data: true } }),
      ]);
      const { calcolaDossierBox } = await import("@/lib/trattamenti");
      const tratt = trattamentiRaw.map((t) => ({
        id: t.id,
        farmaco: t.farmaco,
        patologia: t.patologia,
        dataInizio: t.dataInizio,
        dataFine: t.dataFine,
        dataFineSospensione: t.dataFineSospensione,
        giorniSospensione: t.giorniSospensione,
        boxIds: t.boxes.map((b) => b.boxId),
      }));
      const bloccati: string[] = [];
      for (const g of partita.giacenze) {
        if (!boxSelezionati.has(g.boxId)) continue; // solo i box da cui si carica
        const dossier = calcolaDossierBox(g.boxId, tratt, spostamenti);
        const attivi = [
          ...dossier.diretti,
          ...dossier.ereditati.map((e) => e.tratt),
        ].filter((t) => t.dataFineSospensione != null && t.dataFineSospensione >= dataVendita);
        if (attivi.length > 0) {
          bloccati.push(
            `Box ${g.box.numero} (${attivi.map((t) => t.farmaco).join(", ")})`
          );
        }
      }
      if (bloccati.length > 0) {
        return {
          error: `⛔ Tempo di sospensione farmaci attivo: ${bloccati.join(" · ")}. Vendita DOP bloccata — spunta "Vendita NON DOP" per forzare.`,
        };
      }
    }
  }

  // Verifica disponibilità nei box selezionati e scarico giacenze in transazione
  const giacenzeSel = await prisma.giacenza.findMany({
    where: { partitaId: d.partitaId, boxId: { in: [...boxSelezionati] } },
    include: { box: { select: { numero: true } } },
  });
  const giaByBox = new Map(giacenzeSel.map((g) => [g.boxId, g]));
  for (const r of righeBox) {
    const g = giaByBox.get(r.boxId);
    if (!g || g.quantita < r.quantita) {
      return {
        error: `Nel box ${g?.box.numero ?? "?"} ci sono solo ${g?.quantita ?? 0} capi di questa partita.`,
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const r of righeBox) {
      const g = giaByBox.get(r.boxId)!;
      const rimanenti = g.quantita - r.quantita;
      if (rimanenti <= 0) await tx.giacenza.delete({ where: { id: g.id } });
      else await tx.giacenza.update({ where: { id: g.id }, data: { quantita: rimanenti } });
    }
    await tx.venditaSuini.create({
      data: {
        partitaId: d.partitaId,
        data: new Date(d.data),
        numeroCapi,
        pesoTotaleKg: d.pesoTotaleKg ?? null,
        prezzo: d.prezzo ?? null,
        macello: d.macello,
        ddtNumero: d.ddtNumero,
        dop: !nonDop,
        note: d.note,
        boxes: { create: righeBox.map((r) => ({ boxId: r.boxId, quantita: r.quantita })) },
      },
    });
  });

  revalidatePath(`/partite/${d.partitaId}`);
  revalidatePath("/stalle");
  revalidatePath("/annullo-tatuaggi");
  revalidatePath("/anagrafica-stalla");
  return { ok: true };
}

export async function deleteVendita(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id"));
  const v = await prisma.venditaSuini.findUnique({ where: { id }, include: { boxes: true } });
  if (!v) return;
  await prisma.$transaction(async (tx) => {
    // ripristina i capi nei box di provenienza
    for (const b of v.boxes) {
      await tx.giacenza.upsert({
        where: { boxId_partitaId: { boxId: b.boxId, partitaId: v.partitaId } },
        create: { boxId: b.boxId, partitaId: v.partitaId, quantita: b.quantita },
        update: { quantita: { increment: b.quantita } },
      });
    }
    await tx.venditaSuini.delete({ where: { id } });
  });
  revalidatePath(`/partite/${v.partitaId}`);
  revalidatePath("/stalle");
  revalidatePath("/annullo-tatuaggi");
  revalidatePath("/anagrafica-stalla");
}

// --- DDT di carico suini ---
// Dopo ogni modifica, i totali della partita (capi arrivati, peso ricevuto,
// peso medio) vengono ricalcolati dalla somma dei DDT.
async function sincronizzaTotaliDaDdt(partitaId: string): Promise<void> {
  const ddt = await prisma.ddtSuini.findMany({ where: { partitaId } });
  if (ddt.length === 0) return; // nessun DDT: si lasciano i valori manuali
  const capi = ddt.reduce((s, d) => s + d.quantita, 0);
  const peso = ddt.reduce((s, d) => s + (d.pesoKg ?? 0), 0);
  await prisma.partita.update({
    where: { id: partitaId },
    data: {
      numeroCapiArrivati: capi,
      pesoTotaleArrivoKg: peso > 0 ? peso : null,
      pesoMedioArrivoKg: peso > 0 && capi > 0 ? Math.round((peso / capi) * 10) / 10 : null,
    },
  });
}

const ddtSuiniSchema = z.object({
  partitaId: z.string().min(1),
  numero: z.string().trim().min(1, "Il numero DDT è obbligatorio"),
  data: z.string().min(1, "La data DDT è obbligatoria"),
  quantita: z.coerce.number().int().min(1, "Quantità non valida"),
  pesoKg: optionalNumber(),
  modello4Numero: z.string().trim().optional(),
  modello4Data: z.string().optional(),
  atNumero: z.string().trim().optional(),
  atData: z.string().optional(),
  note: z.string().trim().optional(),
});

export async function createDdtSuini(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireSession();
  const parsed = ddtSuiniSchema.safeParse({
    partitaId: formData.get("partitaId"),
    numero: formData.get("numero"),
    data: formData.get("data"),
    quantita: formData.get("quantita") ?? 0,
    pesoKg: formData.get("pesoKg") || "",
    modello4Numero: formData.get("modello4Numero") || undefined,
    modello4Data: formData.get("modello4Data") || undefined,
    atNumero: formData.get("atNumero") || undefined,
    atData: formData.get("atData") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const d = parsed.data;

  await prisma.ddtSuini.create({
    data: {
      partitaId: d.partitaId,
      numero: d.numero,
      data: new Date(d.data),
      quantita: d.quantita,
      pesoKg: d.pesoKg ?? null,
      modello4Numero: d.modello4Numero,
      modello4Data: d.modello4Data ? new Date(d.modello4Data) : null,
      atNumero: d.atNumero,
      atData: d.atData ? new Date(d.atData) : null,
      note: d.note,
    },
  });
  await sincronizzaTotaliDaDdt(d.partitaId);

  revalidatePath(`/partite/${d.partitaId}`);
  revalidatePath("/partite");
  return { ok: true };
}

export async function deleteDdtSuini(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id"));
  const ddt = await prisma.ddtSuini.delete({ where: { id } });
  await sincronizzaTotaliDaDdt(ddt.partitaId);
  revalidatePath(`/partite/${ddt.partitaId}`);
  revalidatePath("/partite");
}
