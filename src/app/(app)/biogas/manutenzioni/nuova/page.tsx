import PageHeader from "@/components/PageHeader";
import NuovaManutenzioneClient from "./NuovaManutenzioneClient";

export default function NuovaManutenzionePage() {
  return (
    <div>
      <PageHeader
        title="Nuovo intervento di manutenzione"
        subtitle="Carica il rapporto PDF della ditta oppure compila a mano"
      />
      <NuovaManutenzioneClient />
    </div>
  );
}
