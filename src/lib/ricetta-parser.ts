// Parser del testo delle "Ricette Elettroniche Veterinarie" (promemoria PDF).
// Un PDF può contenere PIÙ prescrizioni (una per pagina): ognuna diventa un
// trattamento estratto. Il testo arriva da pdf-parse (etichette e valori
// attaccati, es. "Data03-06-2026", "30CAP. 1MISTI").

export type TrattamentoEstratto = {
  farmaco: string;
  aic?: string;
  viaSomministrazione?: string; // INTRAMUSCOLARE | ACQUA | MANGIME | ORALE
  patologia?: string;
  durataGiorni?: number;
  giorniSospensione?: number;
  quantitaCapi?: number;
  capannone?: number; // CAP. 1 / CAP. 2
  note?: string;
};

export type RicettaEstratta = {
  numeroRicetta?: string;
  dataRicetta?: string; // yyyy-mm-dd
  veterinario?: string;
  trattamenti: TrattamentoEstratto[];
};

// Parole con cui tipicamente inizia la descrizione della confezione:
// servono a separare il nome del farmaco (es. "RAPISONFLACONE...").
const CONFEZIONE = [
  "FLACONCINO",
  "FLACONCINI",
  "FLACONE",
  "FLACONI",
  "TANICA",
  "TANICHE",
  "BAG IN BOX",
  "BAG",
  "BARATTOLO",
  "SACCO",
  "SACCHETTO",
  "SCATOLA",
  "BUSTA",
  "BUSTINE",
  "FIALA",
  "FIALE",
  "BOTTIGLIA",
  "BIDONE",
  "CONFEZIONE",
  "BLISTER",
];

function splitNomeConfezione(resto: string): string {
  let idx = resto.length;
  // "…LA1 FLACONE IN PLASTICA…" → il numero di pezzi precede la parola chiave
  const conNumero = resto.match(
    new RegExp(`\\d+\\s+(?:${CONFEZIONE.join("|")})`)
  );
  if (conNumero && conNumero.index !== undefined) idx = Math.min(idx, conNumero.index);
  // "…RAPISONFLACONE…", "…FEBRIFUGAMBAG IN BOX…" → parola chiave attaccata
  for (const k of CONFEZIONE) {
    const i = resto.indexOf(k);
    if (i > 0) idx = Math.min(idx, i);
  }
  return resto.slice(0, idx).trim();
}

function parseMedicinale(block: string): TrattamentoEstratto | null {
  // "1104220076LONGOCILLINA LA1 FLACONE IN PLASTICA DA 250 ML"
  const m = block.match(/\n\d{1,3}(\d{9})([^\n]+)/);
  if (!m) return null;
  const t: TrattamentoEstratto = {
    aic: m[1],
    farmaco: splitNomeConfezione(m[2]) || m[2].trim(),
  };
  comune(block, t);
  return t;
}

function parseMangime(block: string): TrattamentoEstratto | null {
  // "6000 Kg9432 CMZ 521005 giorni" → kg + nome + %razione + durata
  const riga = block.match(/\n([\d.,]+)\s*Kg([^\n]*?)(\d+)\s*giorni/);
  const t: TrattamentoEstratto = {
    farmaco: "Mangime medicato",
    viaSomministrazione: "MANGIME",
  };
  if (riga) {
    // Es. "9432 CMZ 521005" = nome "9432 CMZ 52" + razione 100% + 5 giorni.
    const resto = `${riga[2]}${riga[3]}`.trim();
    const cmz = resto.match(/^(.*?CMZ)\s*(\d+)$/);
    let risolto = false;
    if (cmz) {
      const prefix = cmz[1].trim(); // "9432 CMZ"
      const digits = cmz[2]; // "521005"
      // La coda è: codice + "100" (% razione) + durata (1-2 cifre)
      for (const durLen of [1, 2]) {
        if (digits.length <= durLen + 3) continue;
        const durata = parseInt(digits.slice(-durLen), 10);
        const rest = digits.slice(0, -durLen);
        if (rest.endsWith("100") && rest.length > 3 && durata >= 1 && durata <= 60) {
          t.farmaco = `Mangime medicato ${prefix} ${rest.slice(0, -3)}`;
          t.durataGiorni = durata;
          t.note = "Razione 100%";
          risolto = true;
          break;
        }
      }
    }
    if (!risolto) t.farmaco = `Mangime medicato ${resto}`;
  }
  // Fornitura: "11-06-20266020 Kg826022268COMAZOO…"
  const forn = block.match(/(\d{2}-\d{2}-\d{4})([\d.,]+)\s*Kg(\d{6,})/);
  if (forn) {
    const nota = `Fornitura ${forn[1]} · ${forn[2]} kg · lotto ${forn[3]}`;
    t.note = t.note ? `${t.note} · ${nota}` : nota;
  }
  // Principio attivo: "FLORFENICOLO 40 mg/g200"
  const pa = block.match(/Sostanza Attiva[^\n]*\n([A-ZÀ-Ú][A-Za-zÀ-ú ]+)/);
  if (pa) {
    const nota = `principio attivo ${pa[1].trim()}`;
    t.note = t.note ? `${t.note} · ${nota}` : nota;
  }
  comune(block, t);
  return t;
}

// Campi comuni a entrambi i tipi di prescrizione.
function comune(block: string, t: TrattamentoEstratto): void {
  // Durata: "…pv 3 giorniSUINI" (solo se non già trovata)
  if (t.durataGiorni == null) {
    const d = block.match(/(\d{1,2})\s*giorni/);
    if (d) t.durataGiorni = parseInt(d[1], 10);
  }
  // Tempo di attesa/sospensione: "16 Giorni16 Giorni" (Carne/Organi) → max
  const sosp = [...block.matchAll(/(\d{1,3})\s*Giorni/g)].map((x) => parseInt(x[1], 10));
  if (sosp.length > 0) t.giorniSospensione = Math.max(...sosp);
  // Via di somministrazione
  if (!t.viaSomministrazione) {
    if (/USO\s+INTRAMUSCOLARE/i.test(block)) t.viaSomministrazione = "INTRAMUSCOLARE";
    else if (/IN\s+ACQUA/i.test(block)) t.viaSomministrazione = "ACQUA";
    else if (/USO\s+ORALE/i.test(block)) t.viaSomministrazione = "ORALE";
  }
  // Patologia: minuscole soltanto, così si ferma dove il testo torna MAIUSCOLO
  // ("Patologie respiratorieSUINI…" → "respiratorie")
  const pat = block.match(/Patologie ([a-zà-ù]+)/);
  if (pat) t.patologia = `Patologie ${pat[1]}`;
  else if (/Altro \(specificare/i.test(block)) t.patologia = "Altro";
  // Nota diagnostica: "Notepolmonite batterica"
  const nota = block.match(/\nNote([a-zà-ù][^\n]*)/);
  if (nota) {
    const n = nota[1].trim();
    t.note = t.note ? `${t.note} · ${n}` : n;
  }
  // Capi e capannone: "30CAP. 1MISTI"
  const capi = block.match(/(\d{1,6})\s*CAP\.?\s*(\d+)/);
  if (capi) {
    t.quantitaCapi = parseInt(capi[1], 10);
    t.capannone = parseInt(capi[2], 10);
  }
}

export function parseRicettaText(raw: string): RicettaEstratta {
  const text = raw.replace(/\r/g, "");
  const out: RicettaEstratta = { trattamenti: [] };

  const num = text.match(/Numero\s*(\d{8,})/);
  if (num) out.numeroRicetta = num[1];

  const data = text.match(/Data\s*(\d{2})-(\d{2})-(\d{4})/);
  if (data) out.dataRicetta = `${data[3]}-${data[2]}-${data[1]}`;

  const vet = text.match(/Veterinario\s*\nCognome e Nome([^\n]+)/);
  if (vet) out.veterinario = vet[1].trim();

  // Ogni prescrizione inizia con "Questa ricetta non può essere riutilizzata"
  const blocks = text.split(/Questa ricetta non pu[oò] essere riutilizzata[^\n]*\n/).slice(1);
  for (const block of blocks) {
    const isMangime = /%\s*Raz\.|QuantitativoMangime/i.test(block);
    const t = isMangime ? parseMangime(block) : parseMedicinale(block);
    if (t && t.farmaco) out.trattamenti.push(t);
  }

  return out;
}
