import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";
import { toDateInputValue } from "@/lib/format";
import descrizioni from "@/lib/allarmi-biogas.json";
import AllarmiClient, { type RigaAllarme } from "./AllarmiClient";

export const dynamic = "force-dynamic";

const MS_G = 24 * 60 * 60 * 1000;

function descrizioneDi(msgNumber: number): string {
  return (descrizioni as Record<string, string>)[String(msgNumber)] ?? `Allarme ${msgNumber}`;
}

export default async function BiogasAllarmiPage({
  searchParams,
}: {
  searchParams: Promise<{ da?: string; a?: string }>;
}) {
  const sp = await searchParams;

  const ultimo = await prisma.biogasAllarme.findFirst({ orderBy: { inizio: "desc" } });
  const fineDefault = ultimo ? new Date(ultimo.inizio) : new Date();
  fineDefault.setHours(0, 0, 0, 0);

  const a = sp.a ? new Date(`${sp.a}T00:00:00`) : fineDefault;
  const aFine = new Date(a.getTime() + MS_G); // incluso tutto il giorno "a"
  const da = sp.da ? new Date(`${sp.da}T00:00:00`) : new Date(a.getTime() - 29 * MS_G);

  const allarmi = await prisma.biogasAllarme.findMany({
    where: { inizio: { gte: da, lt: aFine } },
    orderBy: { inizio: "desc" },
  });

  // Righe serializzabili per il client (filtro/KPI in tempo reale)
  const righe: RigaAllarme[] = allarmi.map((al) => {
    const descrizione = descrizioneDi(al.msgNumber);
    return {
      id: al.id,
      msgNumber: al.msgNumber,
      inizio: al.inizio.getTime(),
      fine: al.fine?.getTime() ?? null,
      descrizione,
      avviso: /^AVVIS/i.test(descrizione),
    };
  });

  const preset = (gg: number) =>
    `/biogas/allarmi?da=${toDateInputValue(new Date(fineDefault.getTime() - (gg - 1) * MS_G))}&a=${toDateInputValue(fineDefault)}`;

  return (
    <div>
      <div className="print:hidden">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">🚨 Registro allarmi PLC</h1>
            <p className="mt-1 text-sm text-slate-500">
              {ultimo
                ? `Ultimo allarme: ${ultimo.inizio.toLocaleString("it-IT")}`
                : "Nessun allarme: importa i file DB_Storico del PLC"}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/biogas/dati" className="btn-secondary">
              📥 Import PLC
            </Link>
            <PrintButton />
          </div>
        </div>

        {/* Selettore periodo */}
        <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label" htmlFor="da">
                Dal
              </label>
              <input id="da" name="da" type="date" defaultValue={toDateInputValue(da)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="a">
                Al
              </label>
              <input id="a" name="a" type="date" defaultValue={toDateInputValue(a)} className="input" />
            </div>
            <button type="submit" className="btn-primary">
              Applica
            </button>
          </form>
          <div className="flex gap-2 text-sm">
            <Link href={preset(30)} className="btn-secondary !py-1.5">
              30 gg
            </Link>
            <Link href={preset(90)} className="btn-secondary !py-1.5">
              90 gg
            </Link>
            <Link href={preset(365)} className="btn-secondary !py-1.5">
              1 anno
            </Link>
          </div>
        </div>
      </div>

      {/* Intestazione stampa */}
      <div className="mb-4 hidden border-b-2 border-slate-800 pb-3 print:block">
        <h1 className="text-xl font-bold text-slate-900">Registro allarmi PLC — Biogas</h1>
        <p className="text-sm text-slate-600">
          Dal {da.toLocaleDateString("it-IT")} al {a.toLocaleDateString("it-IT")} · {righe.length}{" "}
          voci
        </p>
      </div>

      <AllarmiClient righe={righe} />
    </div>
  );
}
