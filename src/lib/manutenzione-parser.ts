// Parser dei rapporti di intervento ETS (PDF, testo estratto con pdf-parse).
// Estrae dati intervento, ore moto, manodopera, trasferta e ricambi.

export type RicambioEstratto = { codice: string; descrizione: string; quantita: number };

export type ManutenzioneEstratta = {
  odlNumero?: string;
  data?: string; // yyyy-mm-dd
  tipo?: string; // M1/M2/M4…
  descrizione?: string;
  ditta?: string;
  tecnico?: string;
  oreMoto?: number;
  oreLavoro?: number;
  oreViaggio?: number;
  km?: number;
  commento?: string;
  ricambi: RicambioEstratto[];
};

function numero(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s.replace(",", "."));
  return isNaN(n) ? undefined : n;
}

export function parseManutenzioneText(raw: string): ManutenzioneEstratta {
  const text = raw.replace(/\r/g, "");
  const righe = text.split("\n").map((l) => l.trim());
  const out: ManutenzioneEstratta = { ricambi: [] };

  // OdL e data
  const odl = text.match(/OdL num:\s*(\d+)\s+del\s+(\d{2})\/(\d{2})\/(\d{4})/);
  if (odl) {
    out.odlNumero = odl[1];
    out.data = `${odl[4]}-${odl[3]}-${odl[2]}`;
  }
  const dataInt = text.match(/Data intervento:\s*(\d{2})\/(\d{2})\/(\d{4})/);
  if (dataInt) out.data = `${dataInt[3]}-${dataInt[2]}-${dataInt[1]}`;

  // Codice intervento (es. "M2-E0836-LE202-B") e oggetto
  const codInt = text.match(/^(M\d+-[A-Z0-9-]+)$/m);
  const oggetto = text.match(/Descr\. oggetto:\s*([^\n]+)/);
  out.descrizione = [codInt?.[1], oggetto?.[1]?.trim()].filter(Boolean).join(" · ") || undefined;

  // Ditta: i rapporti ETS citano "contratto ETS" / "ditta ETS"
  if (/\bETS\b/.test(text)) out.ditta = "ETS";

  // Tecnico: riga dopo "Tecnico/i assegnato/i:"
  const iTec = righe.findIndex((l) => l.startsWith("Tecnico/i assegnato/i:"));
  if (iTec >= 0) {
    const stessa = righe[iTec].replace("Tecnico/i assegnato/i:", "").trim();
    const val = stessa || righe[iTec + 1] || "";
    const tec = val.replace(/\|/g, "").trim();
    if (tec) out.tecnico = tec;
  }

  // Ore motore e tipo manutenzione dal commento tecnico
  const oreMoto = text.match(/Ore\s+mot\w*\s+(\d{3,7})/i);
  if (oreMoto) out.oreMoto = Number(oreMoto[1]);
  const tipo = text.match(/manutenzione\s+(M\d+)/i) ?? text.match(/^(M\d+)-/m);
  if (tipo) out.tipo = tipo[1].toUpperCase();

  // Commento tecnico: righe tra "COMMENTI TECNICO:" e la successiva intestazione
  const iComm = righe.findIndex((l) => l.startsWith("COMMENTI TECNICO"));
  if (iComm >= 0) {
    const blocco: string[] = [];
    for (let i = iComm + 1; i < righe.length; i++) {
      const l = righe[i];
      if (/^(OdL num:|FIRMA|Pag\.|TRASFERTA)/.test(l)) break;
      if (l) blocco.push(l);
    }
    if (blocco.length > 0) out.commento = blocco.join(" ").replace(/\s+/g, " ").trim();
  }

  // Trasferta e manodopera (ore in centesimi = ore decimali)
  out.km = numero(text.match(/Totale Km:\s*([\d.,]+)/)?.[1]);
  const vOrd = numero(text.match(/Totale ore viaggio ordinarie:\s*([\d.,]+)/)?.[1]) ?? 0;
  const vStr = numero(text.match(/Totale ore viaggio straordinarie:\s*([\d.,]+)/)?.[1]) ?? 0;
  const vNot = numero(text.match(/Totale ore viaggio notturne:\s*([\d.,]+)/)?.[1]) ?? 0;
  if (vOrd + vStr + vNot > 0) out.oreViaggio = Math.round((vOrd + vStr + vNot) * 100) / 100;
  const lOrd = numero(text.match(/Totale ore lavoro ordinarie:\s*([\d.,]+)/)?.[1]) ?? 0;
  const lStr = numero(text.match(/Totale ore lavoro straordinarie:\s*([\d.,]+)/)?.[1]) ?? 0;
  const lNot = numero(text.match(/Totale ore lavoro notturne:\s*([\d.,]+)/)?.[1]) ?? 0;
  if (lOrd + lStr + lNot > 0) out.oreLavoro = Math.round((lOrd + lStr + lNot) * 100) / 100;

  // Ricambi: righe tra "ArticoloDescrizioneQta." e la successiva intestazione.
  // Formato attaccato: "222688Ers.Filtereinsatz…1.00", "GE3-5Spark plug…6.00"
  const iMat = righe.findIndex((l) => l.replace(/\s/g, "").startsWith("ArticoloDescrizioneQta"));
  if (iMat >= 0) {
    for (let i = iMat + 1; i < righe.length; i++) {
      const l = righe[i];
      if (!l || /^(OdL num:|FIRMA|Pag\.|Condizioni)/.test(l)) break;
      // quantità in coda (1-2 cifre + 2 decimali); attenzione a descrizioni
      // che finiscono con frazioni tipo "1 1/2" → la qta è la sola ultima cifra
      let m = l.match(/^([A-Z]{0,4}\d[\d\-\/]*?)([A-ZÀ-Ú].*?)(\d{1,2}\.\d{2})$/);
      if (!m) continue;
      let [, codice, descrizione, qtaStr] = m;
      if (/[\/\d]$/.test(descrizione) && qtaStr.length > 4) {
        // es. "…Rp 1 1/2" + "1.00" letto come "21.00": riprova con 1 cifra
        const m2 = l.match(/^([A-Z]{0,4}\d[\d\-\/]*?)([A-ZÀ-Ú].*?)(\d\.\d{2})$/);
        if (m2) [, codice, descrizione, qtaStr] = m2;
      }
      out.ricambi.push({
        codice: codice.trim(),
        descrizione: descrizione.trim().replace(/,\s*$/, ""),
        quantita: Number(qtaStr),
      });
    }
  }

  return out;
}
