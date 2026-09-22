import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseAnalisiDigestatoText } from "@/lib/analisi-digestato-parser";

export const runtime = "nodejs";

// Riceve il PDF del referto ISF/Schaumann e restituisce i valori estratti
// (il salvataggio avviene poi con la server action, PDF incluso).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "File troppo grande (max 4 MB)." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
    const { text } = await pdfParse(buffer);
    const dati = parseAnalisiDigestatoText(text);
    return NextResponse.json({ dati });
  } catch (e) {
    console.error("Errore lettura referto:", e);
    return NextResponse.json(
      { error: "Impossibile leggere il PDF. Compila i campi a mano." },
      { status: 422 }
    );
  }
}
