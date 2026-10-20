import PageHeader from "@/components/PageHeader";
import NuovaAnalisiOlioClient from "./NuovaAnalisiOlioClient";

export default function NuovaAnalisiOlioPage() {
  return (
    <div>
      <PageHeader
        title="Nuova analisi olio"
        subtitle="Valori dal report del laboratorio lubrificanti (allega il PDF per l'archivio)"
      />
      <NuovaAnalisiOlioClient />
    </div>
  );
}
