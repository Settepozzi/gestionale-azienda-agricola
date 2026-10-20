import PageHeader from "@/components/PageHeader";
import NuovaAnalisiPiezometroClient from "./NuovaAnalisiPiezometroClient";

export default function NuovaAnalisiPiezometroPage() {
  return (
    <div>
      <PageHeader
        title="Nuova analisi piezometro"
        subtitle="Valori dal rapporto di prova del laboratorio (allega il PDF per l'archivio)"
      />
      <NuovaAnalisiPiezometroClient />
    </div>
  );
}
