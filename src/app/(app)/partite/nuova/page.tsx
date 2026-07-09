import PageHeader from "@/components/PageHeader";
import PartitaForm from "../PartitaForm";
import { createPartita } from "@/app/actions/partite";

export default function NuovaPartitaPage() {
  return (
    <div>
      <PageHeader title="Nuova partita" subtitle="Registra una consegna di suini da Comazoo" />
      <PartitaForm action={createPartita} />
    </div>
  );
}
