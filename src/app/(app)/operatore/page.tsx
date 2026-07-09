import { prisma } from "@/lib/prisma";
import { setSegnalazionePasto } from "@/app/actions/operatore";
import { startOfDay } from "@/lib/razione";
import MortalitaRapida from "./MortalitaRapida";
import SpostamentoRapido from "./SpostamentoRapido";

export const dynamic = "force-dynamic";

const SEGNI = [
  { segno: "PIU", label: "+", active: "bg-green-600 text-white", idle: "bg-green-50 text-green-700" },
  { segno: "ZERO", label: "0", active: "bg-slate-600 text-white", idle: "bg-slate-100 text-slate-600" },
  { segno: "MENO", label: "−", active: "bg-red-600 text-white", idle: "bg-red-50 text-red-700" },
];

export default async function OperatorePage() {
  const oggi = startOfDay(new Date());

  const [giacenze, tuttiBox, segnalazioni] = await Promise.all([
    prisma.giacenza.findMany({
      where: { quantita: { gt: 0 } },
      include: { box: { include: { stalla: { select: { nome: true } } } } },
    }),
    prisma.box.findMany({
      orderBy: { numero: "asc" },
      include: { stalla: { select: { nome: true } } },
    }),
    prisma.segnalazionePasto.findMany({ where: { data: oggi } }),
  ]);

  // Box occupati (somma capi per box)
  const boxMap = new Map<
    string,
    { numero: number; stalla: string; capi: number }
  >();
  for (const g of giacenze) {
    const cur = boxMap.get(g.boxId) ?? { numero: g.box.numero, stalla: g.box.stalla.nome, capi: 0 };
    cur.capi += g.quantita;
    boxMap.set(g.boxId, cur);
  }
  const boxOccupati = [...boxMap.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => a.numero - b.numero);

  const segnoByBox = new Map(segnalazioni.map((s) => [s.boxId, s.segno]));

  const opzioniDa = boxOccupati.map((b) => ({ id: b.id, label: `Box ${b.numero} (${b.capi})` }));
  const opzioniTutti = tuttiBox.map((b) => ({ id: b.id, label: `Box ${b.numero}` }));

  const dataStr = oggi.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">🧤 Giornata</h1>
        <p className="text-sm capitalize text-slate-500">{dataStr}</p>
      </div>

      {/* PASTO */}
      <section className="card mb-5 p-4">
        <h2 className="mb-1 text-lg font-bold text-slate-800">Pasto</h2>
        <p className="mb-3 text-sm text-slate-500">
          <span className="font-semibold text-green-700">+</span> aumenta ·{" "}
          <span className="font-semibold text-slate-600">0</span> salta pasto ·{" "}
          <span className="font-semibold text-red-700">−</span> diminuisci
        </p>
        {boxOccupati.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Nessun box con capi.</p>
        ) : (
          <div className="space-y-2">
            {boxOccupati.map((b) => {
              const sel = segnoByBox.get(b.id);
              return (
                <div key={b.id} className="flex items-center gap-2">
                  <div className="w-24 shrink-0">
                    <div className="font-bold text-slate-800">Box {b.numero}</div>
                    <div className="text-xs text-slate-400">{b.capi} capi</div>
                  </div>
                  <div className="flex flex-1 gap-2">
                    {SEGNI.map((s) => (
                      <form key={s.segno} action={setSegnalazionePasto} className="flex-1">
                        <input type="hidden" name="boxId" value={b.id} />
                        <input type="hidden" name="segno" value={s.segno} />
                        <button
                          type="submit"
                          className={`w-full rounded-xl py-3 text-2xl font-bold transition-colors ${
                            sel === s.segno ? s.active : s.idle
                          }`}
                        >
                          {s.label}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MORTALITÀ */}
      <section className="card mb-5 p-4">
        <h2 className="mb-3 text-lg font-bold text-slate-800">☠️ Morti</h2>
        <MortalitaRapida boxes={opzioniDa} />
      </section>

      {/* SPOSTAMENTI */}
      <section className="card mb-5 p-4">
        <h2 className="mb-3 text-lg font-bold text-slate-800">🔁 Spostamenti</h2>
        <SpostamentoRapido boxesDa={opzioniDa} boxes={opzioniTutti} />
      </section>
    </div>
  );
}
