import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Restituisce il cartellino mangime archiviato.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { id } = await params;
  const allegato = await prisma.allegatoCartellino.findUnique({ where: { id } });
  if (!allegato) {
    return NextResponse.json({ error: "Cartellino non trovato." }, { status: 404 });
  }

  const nome = allegato.nome.toLowerCase();
  const tipo = nome.endsWith(".pdf")
    ? "application/pdf"
    : nome.endsWith(".png")
      ? "image/png"
      : nome.endsWith(".jpg") || nome.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";

  return new NextResponse(Buffer.from(allegato.dati), {
    headers: {
      "Content-Type": tipo,
      "Content-Disposition": `inline; filename="${allegato.nome.replace(/[^\w.\-]/g, "_")}"`,
    },
  });
}
