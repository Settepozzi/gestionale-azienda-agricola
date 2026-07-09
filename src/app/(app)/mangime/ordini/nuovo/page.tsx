import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import MangimeTabs from "../../MangimeTabs";
import OrdineForm from "../OrdineForm";

export const dynamic = "force-dynamic";

export default async function NuovoOrdinePage() {
  const mangimi = await prisma.mangime.findMany({ orderBy: { codice: "asc" } });

  return (
    <div>
      <PageHeader title="Nuovo ordine mangime" subtitle="Ordine di acquisto da inviare a Comazoo" />
      <MangimeTabs active="ordini" />
      {mangimi.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          Prima aggiungi i mangimi nella scheda <b>Prodotti</b>.
        </div>
      ) : (
        <OrdineForm mangimi={mangimi.map((m) => ({ id: m.id, label: `${m.codice} · ${m.nome}` }))} />
      )}
    </div>
  );
}
