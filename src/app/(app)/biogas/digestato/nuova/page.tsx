import PageHeader from "@/components/PageHeader";
import NuovaAnalisiClient from "./NuovaAnalisiClient";

export default function NuovaAnalisiPage() {
  return (
    <div>
      <PageHeader
        title="Nuova analisi digestato"
        subtitle="Carica il referto PDF del laboratorio oppure compila a mano"
      />
      <NuovaAnalisiClient />
    </div>
  );
}
