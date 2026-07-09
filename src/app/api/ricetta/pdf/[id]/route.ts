import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Restituisce il PDF originale della ricetta archiviata.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { id } = await params;
  const allegato = await prisma.allegatoRicetta.findUnique({ where: { id } });
  if (!allegato) {
    return NextResponse.json({ error: "Allegato non trovato." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(allegato.dati), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${allegato.nome.replace(/[^\w.\-]/g, "_")}"`,
    },
  });
}
