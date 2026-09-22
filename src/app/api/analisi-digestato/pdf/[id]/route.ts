import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Restituisce il PDF originale del referto di analisi.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const { id } = await params;
  const analisi = await prisma.analisiDigestato.findUnique({
    where: { id },
    select: { pdfNome: true, pdfDati: true },
  });
  if (!analisi?.pdfDati) {
    return NextResponse.json({ error: "PDF non presente." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(analisi.pdfDati), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${(analisi.pdfNome ?? "referto.pdf").replace(/[^\w.\-]/g, "_")}"`,
    },
  });
}
