// Parser dei referti "Rapporto Biogas" del laboratorio ISF GmbH / Schaumann
// (analisi del digestato). Testo estratto con pdf-parse: i parametri compaiono
// a COPPIE — due righe di sigle consecutive, poi le due righe di valori.

export type AnalisiEstratta = {
  tipo?: "PROCESSO" | "AGRONOMICA" | "IGIENE";
  rapportoNumero?: string;
  data?: string; // yyyy-mm-dd (campionamento)
  luogo?: string; // es. F1
  laboratorio?: string;
  // agronomica / igiene (Eurofins)
  ssPct?: number;
  ssoPctSS?: number;
  azotoPctSS?: number;
  fosforoPctSS?: number;
  salmonella?: string;
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

// --- Referti Eurofins Lab-Control (agronomica / igiene) -------------------
// Layout pdf-parse: il VALORE sta sulla riga precedente a quella che inizia
// col nome del parametro (es. "4,0" poi "Sostanza Secca (residuo…)± 0,6").
const MESI_ITA: Record<string, string> = {
  gen: "01", feb: "02", mar: "03", apr: "04", mag: "05", giu: "06",
  lug: "07", ago: "08", set: "09", ott: "10", nov: "11", dic: "12",
};

function parseEurofins(righe: string[], testo: string): AnalisiEstratta {
  const out: AnalisiEstratta = { laboratorio: "Eurofins Lab-Control" };

  const rapporto = testo.match(/R(\d{9,12})/);
  if (rapporto) out.rapportoNumero = `R${rapporto[1]}`;

  // Data: prelievo se presente, altrimenti ricevimento ("18-set-26")
  const dataRic = testo.match(/Data ricev\.?:?\s*\n?\s*(\d{1,2})-([a-z]{3})-(\d{2})\b/i);
  if (dataRic && MESI_ITA[dataRic[2].toLowerCase()]) {
    out.data = `20${dataRic[3]}-${MESI_ITA[dataRic[2].toLowerCase()]}-${dataRic[1].padStart(2, "0")}`;
  }

  const valorePrima = (nomeRe: RegExp): number | undefined => {
    for (let i = 1; i < righe.length; i++) {
      if (!nomeRe.test(righe[i])) continue;
      const m = righe[i - 1].match(/^(\d+(?:[.,]\d+)?)$/);
      if (m) return Number(m[1].replace(",", "."));
    }
    return undefined;
  };

  out.ssPct = valorePrima(/^Sostanza Secca \(residuo/i);
  out.ssoPctSS = valorePrima(/^Sostanza organica secca/i);
  out.fosforoPctSS = valorePrima(/^Fosforo±|^Fosforo\b/);
  out.azotoPctSS = valorePrima(/^Azoto±|^Azoto\b/);

  // Igiene: Salmonella su N unità campionarie
  const unita = (testo.match(/UNITA' CAMPIONARIA \d+/g) ?? []).length;
  const assenti = (testo.match(/^assente$/gm) ?? []).length;
  if (/Salmonella/i.test(testo) && unita > 0) {
    out.salmonella =
      assenti >= unita ? `assente (${unita}/${unita} unità campionarie)` : `presente! (${assenti}/${unita} assenti)`;
    out.tipo = out.azotoPctSS == null && out.fosforoPctSS == null ? "IGIENE" : "AGRONOMICA";
  } else {
    out.tipo = "AGRONOMICA";
  }

  return out;
}

export function parseAnalisiDigestatoText(raw: string): AnalisiEstratta {
  const righe = raw.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const testo = righe.join("\n");

  // Referto Eurofins? (agronomica/igiene) — altrimenti ISF (processo)
  if (/Eurofins Lab-Control/i.test(testo)) return parseEurofins(righe, testo);

  const out: AnalisiEstratta = { tipo: "PROCESSO" };

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
