import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Battito giornaliero (cron Vercel): una query minima tiene attivo il
// progetto Supabase del piano gratuito, che altrimenti si pausa dopo
// ~7 giorni senza traffico. Non espone alcun dato.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
