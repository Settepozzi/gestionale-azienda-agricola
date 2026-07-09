import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PartitaForm from "../../PartitaForm";
import { updatePartita } from "@/app/actions/partite";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ModificaPartitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partita = await prisma.partita.findUnique({ where: { id } });
  if (!partita) notFound();

  const action = updatePartita.bind(null, id);

  return (
    <div>
      <PageHeader title={`Modifica partita ${partita.codice}`} subtitle="Aggiorna i dati della partita" />
      <PartitaForm action={action} initial={partita} />
    </div>
  );
}
