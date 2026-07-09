import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import DeleteButton from "@/components/DeleteButton";
import { eliminaMeseBiogas } from "@/app/actions/biogas";
import { formatNumber } from "@/lib/format";
import { ImportCsvForm, MeseForm } from "./Forms";

export const dynamic = "force-dynamic";

const NOMI_MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

export default async function BiogasDatiPage() {
  const [conteggio, primo, ultimo, mesi] = await Promise.all([
    prisma.biogasGiorno.count(),
    prisma.biogasGiorno.findFirst({ orderBy: { data: "asc" } }),
    prisma.biogasGiorno.findFirst({ orderBy: { data: "desc" } }),
    prisma.biogasMese.findMany({ orderBy: [{ anno: "desc" }, { mese: "desc" }] }),
  ]);

  return (
    <div>
      <PageHeader title="Dati e import PLC" subtitle="Caricamento CSV del PLC e contatori mensili" />

      {/* Import CSV */}
      <div className="card mb-6 p-5">
        <h3 className="mb-1 font-semibold text-slate-800">📥 Import CSV dal PLC</h3>
        <p className="mb-4 text-sm text-slate-500">
          {conteggio > 0 && primo && ultimo ? (
            <>
              In archivio <b>{conteggio}</b> giorni: {primo.data.toLocaleDateString("it-IT")} →{" "}
              {ultimo.data.toLocaleDateString("it-IT")}
            </>
          ) : (
            "Archivio vuoto."
          )}
        </p>
        <ImportCsvForm />
      </div>

      {/* Mesi da contatori */}
      <div className="card p-5">
        <h3 className="mb-1 font-semibold text-slate-800">🧾 Contatori mensili</h3>
        <p className="mb-4 text-sm text-slate-500">
          Energia <b>prodotta</b> e <b>ceduta</b> dai contatori ufficiali: servono per calcolare
          l&apos;autoconsumo totale e quello del <b>motore</b> (totale − biologia PLC).
        </p>
        <MeseForm />

        {mesi.length > 0 && (
          <div className="mt-5 overflow-x-auto border-t border-slate-100 pt-4">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Mese</th>
                  <th className="px-3 py-2 text-right">Prodotta</th>
                  <th className="px-3 py-2 text-right">Ceduta</th>
                  <th className="px-3 py-2 text-right">Autoconsumo</th>
                  <th className="px-3 py-2 text-right">€/kWh</th>
                  <th className="px-3 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mesi.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {NOMI_MESI[m.mese - 1]} {m.anno}
                    </td>
                    <td className="px-3 py-2 text-right">{formatNumber(m.enProdKWh, 0)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(m.enCedKWh, 0)}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatNumber(m.enProdKWh - m.enCedKWh, 0)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {m.prezzoEuroKWh != null ? formatNumber(m.prezzoEuroKWh, 4) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <DeleteButton action={eliminaMeseBiogas} id={m.id} label="×" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
