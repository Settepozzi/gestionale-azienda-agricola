import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRicettaText } from "@/lib/ricetta-parser";

export const runtime = "nodejs";

// Riceve il PDF della ricetta veterinaria e restituisce i campi estratti.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File troppo grande (max 10 MB)." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
    const { text } = await pdfParse(buffer);
    const dati = parseRicettaText(text);

    if (dati.trattamenti.length === 0) {
      return NextResponse.json(
        { error: "Nessuna prescrizione riconosciuta nel PDF. Compila i campi a mano." },
        { status: 422 }
      );
    }

    // Archivia il PDF originale (riusato se la stessa ricetta viene ricaricata)
    let allegatoId: string | null = null;
    const esistente = dati.numeroRicetta
      ? await prisma.allegatoRicetta.findFirst({
          where: { numeroRicetta: dati.numeroRicetta },
        })
      : null;
    if (esistente) {
      allegatoId = esistente.id;
    } else {
      const allegato = await prisma.allegatoRicetta.create({
        data: {
          nome: file.name,
          numeroRicetta: dati.numeroRicetta ?? null,
          dati: buffer,
        },
      });
      allegatoId = allegato.id;
    }

    return NextResponse.json({ dati, allegatoId });
  } catch (e) {
    console.error("Errore lettura ricetta:", e);
    return NextResponse.json(
      { error: "Impossibile leggere il PDF. Compila i campi a mano." },
      { status: 422 }
    );
  }
}
