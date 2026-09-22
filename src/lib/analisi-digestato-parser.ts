// Parser dei referti "Rapporto Biogas" del laboratorio ISF GmbH / Schaumann
// (analisi del digestato). Testo estratto con pdf-parse: i parametri compaiono
// a COPPIE — due righe di sigle consecutive, poi le due righe di valori.

export type AnalisiEstratta = {
  rapportoNumero?: string;
  data?: string; // yyyy-mm-dd (campionamento)
  luogo?: string; // es. F1
  laboratorio?: string;
  ph?: number;
  ce?: number;
  agv?: number;
  tac?: number;
  fosTac?: number;
  nh4?: number;
  ss?: number;
  sso?: number;
  cenere?: number;
  acAcetico?: number;
  acPropionico?: number;
  acButirrico?: number;
  acIsoButirrico?: number;
  acValerianico?: number;
  acIsoValerianico?: number;
  acCaproico?: number;
  hacEq?: number;
};

// Coppie di sigle così come compaiono nel referto, nell'ordine dei valori
const COPPIE: [string, keyof AnalisiEstratta][][] = [
  [["pH", "ph"], ["CE", "ce"]],
  [["AGV", "agv"], ["TAC", "tac"]],
  [["AGV/TAC", "fosTac"], ["NH4+-N", "nh4"]],
  [["SS", "ss"], ["SSo", "sso"]],
  [["AA", "acAcetico"], ["AP", "acPropionico"]],
  [["AB", "acButirrico"], ["iAB", "acIsoButirrico"]],
  [["AV", "acValerianico"], ["iAV", "acIsoValerianico"]],
  [["AC", "acCaproico"], ["HAc-EQ", "hacEq"]],
];

// Una riga "valore": numero (eventualmente con standard attaccato, es. "13,9<20,0")
// oppure sotto-soglia "<50" (→ null, non quantificato).
function leggiValore(riga: string): { valore: number | null; ok: boolean } {
  const sotto = riga.match(/^<\s*[\d.,]+$/);
  if (sotto) return { valore: null, ok: true };
  const m = riga.match(/^(-?\d+(?:[.,]\d+)?)/);
  if (!m) return { valore: null, ok: false };
  return { valore: Number(m[1].replace(",", ".")), ok: true };
}

export function parseAnalisiDigestatoText(raw: string): AnalisiEstratta {
  const righe = raw.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const testo = righe.join("\n");
  const out: AnalisiEstratta = {};

  const rapporto = testo.match(/(\d{2}-\d{3,7}-BG-\d+)/);
  if (rapporto) out.rapportoNumero = rapporto[1];

  const dataCamp = testo.match(/Data campionamento\s*(\d{2})\.(\d{2})\.(\d{4})/);
  if (dataCamp) out.data = `${dataCamp[3]}-${dataCamp[2]}-${dataCamp[1]}`;

  const luogo = testo.match(/Luogo campionam\.\s*([A-Za-z0-9\-]+)/);
  if (luogo) out.luogo = luogo[1];

  if (/ISF GmbH/i.test(testo)) out.laboratorio = "ISF GmbH (Schaumann)";

  // Cenere: compare come riga unica "CenereXA380,5g/kg SS…"
  const cenere = testo.match(/Cenere\s*XA\s*([\d.,]+)/);
  if (cenere) out.cenere = Number(cenere[1].replace(",", "."));

  // Coppie sigla+sigla → i due valori nelle righe successive
  for (const coppia of COPPIE) {
    const [[sigla1, campo1], [sigla2, campo2]] = coppia;
    for (let i = 0; i < righe.length - 1; i++) {
      if (righe[i] !== sigla1 || righe[i + 1] !== sigla2) continue;
      // primi due "valori" entro le 4 righe successive
      const valori: (number | null)[] = [];
      for (let j = i + 2; j < Math.min(i + 6, righe.length) && valori.length < 2; j++) {
        const v = leggiValore(righe[j]);
        if (v.ok) valori.push(v.valore);
      }
      if (valori.length === 2) {
        if (valori[0] != null) (out[campo1] as number) = valori[0];
        if (valori[1] != null) (out[campo2] as number) = valori[1];
      }
      break;
    }
  }

  // FOS/TAC mancante ma calcolabile
  if (out.fosTac == null && out.agv != null && out.tac != null && out.tac > 0) {
    out.fosTac = Math.round((out.agv / out.tac) * 100) / 100;
  }

  return out;
}
