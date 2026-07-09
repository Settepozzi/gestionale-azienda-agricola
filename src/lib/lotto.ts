// Numerazione interna del lotto e regole DOP (lettera-mese, mese di vendita).

// Settimana ISO 8601 dell'anno.
export function settimanaISO(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Codice lotto interno "YY.SS.PP":
// YY = anno (2 cifre), SS = settimana ISO, PP = 01 (1 gen–30 giu) | 02 (altrimenti).
export function codiceLotto(dataEntrata: Date): string {
  const yy = String(dataEntrata.getFullYear() % 100).padStart(2, "0");
  const ss = String(settimanaISO(dataEntrata)).padStart(2, "0");
  const pp = dataEntrata.getMonth() + 1 <= 6 ? "01" : "02";
  return `${yy}.${ss}.${pp}`;
}

// Tabella 1 PDC Prosciutto di Parma (pag. 21): lettera-mese del tatuaggio.
// La lettera identifica il mese di nascita; il suino è macellabile ai fini DOP
// dal mese in cui compie 9 mesi (mese di nascita + 9).
export const LETTERE_DOP: { lettera: string; meseNascita: number; nomeMese: string }[] = [
  { lettera: "T", meseNascita: 1, nomeMese: "Gennaio" },
  { lettera: "C", meseNascita: 2, nomeMese: "Febbraio" },
  { lettera: "B", meseNascita: 3, nomeMese: "Marzo" },
  { lettera: "A", meseNascita: 4, nomeMese: "Aprile" },
  { lettera: "M", meseNascita: 5, nomeMese: "Maggio" },
  { lettera: "P", meseNascita: 6, nomeMese: "Giugno" },
  { lettera: "L", meseNascita: 7, nomeMese: "Luglio" },
  { lettera: "E", meseNascita: 8, nomeMese: "Agosto" },
  { lettera: "S", meseNascita: 9, nomeMese: "Settembre" },
  { lettera: "R", meseNascita: 10, nomeMese: "Ottobre" },
  { lettera: "H", meseNascita: 11, nomeMese: "Novembre" },
  { lettera: "D", meseNascita: 12, nomeMese: "Dicembre" },
];

// Anno di nascita dedotto dalla lettera-mese e dalla data di entrata
// (i suini arrivano a ~60 giorni): il mese di nascita più recente
// precedente all'arrivo.
export function annoNascitaDaLettera(lettera: string, dataEntrata: Date): number | null {
  const info = LETTERE_DOP.find((l) => l.lettera === lettera.toUpperCase());
  if (!info) return null;
  let annoNascita = dataEntrata.getFullYear();
  // se il mese di nascita è successivo al mese di entrata, la nascita è l'anno prima
  if (info.meseNascita > dataEntrata.getMonth() + 1) annoNascita -= 1;
  return annoNascita;
}

// Mese di vendita ("YYYY-MM") dalla lettera-mese e dalla data di entrata.
export function venditaMeseDaLettera(lettera: string, dataEntrata: Date): string | null {
  const info = LETTERE_DOP.find((l) => l.lettera === lettera.toUpperCase());
  if (!info) return null;
  const annoNascita = annoNascitaDaLettera(lettera, dataEntrata);
  if (annoNascita == null) return null;

  // nascita + 9 mesi = primo mese utile per la macellazione DOP
  const totale = info.meseNascita + 9; // 10..21
  const meseVendita = ((totale - 1) % 12) + 1;
  const annoVendita = annoNascita + (totale > 12 ? 1 : 0);
  return `${annoVendita}-${String(meseVendita).padStart(2, "0")}`;
}
