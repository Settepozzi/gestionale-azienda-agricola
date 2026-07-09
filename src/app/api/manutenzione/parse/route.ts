import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseManutenzioneText } from "@/lib/manutenzione-parser";

export const runtime = "nodejs";

// Riceve il PDF del rapporto di manutenzione, lo archivia e restituisce i campi estratti.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "File troppo grande (max 15 MB)." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
    const { text } = await pdfParse(buffer);
    const dati = parseManutenzioneText(text);

    const allegato = await prisma.allegatoManutenzione.create({
      data: { nome: file.name, dati: buffer },
    });

    return NextResponse.json({ dati, allegatoId: allegato.id });
  } catch (e) {
    console.error("Errore lettura rapporto:", e);
    return NextResponse.json(
      { error: "Impossibile leggere il PDF. Compila i campi a mano." },
      { status: 422 }
    );
  }
}
