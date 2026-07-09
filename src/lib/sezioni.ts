// Registro delle sezioni della piattaforma. Ogni sezione ha i propri percorsi:
// il middleware nega l'accesso alle sezioni non abilitate per l'utente.

export type Sezione = {
  id: string;
  nome: string;
  icona: string;
  descrizione: string;
  home: string; // pagina iniziale della sezione
  prefissi: string[]; // percorsi appartenenti alla sezione
  attiva: boolean; // false = "in costruzione"
};

export const SEZIONI: Sezione[] = [
  {
    id: "SUINI",
    nome: "Allevamento Suini",
    icona: "🐷",
    descrizione: "Soccida Comazoo: stalle, partite, alimentazione, trattamenti, DOP",
    home: "/",
    prefissi: [
      "/operatore",
      "/riepilogo",
      "/andamento",
      "/stalle",
      "/anagrafica-stalla",
      "/partite",
      "/box",
      "/mangime",
      "/razione",
      "/trattamenti",
      "/mortalita",
      "/annullo-tatuaggi",
      "/anagrafiche",
      "/api/ricetta",
      "/api/cartellino",
    ],
    attiva: true,
  },
  {
    id: "AVICOLI",
    nome: "Allevamento Tacchini",
    icona: "🦃",
    descrizione: "Gestione allevamento tacchini",
    home: "/avicoli",
    prefissi: ["/avicoli"],
    attiva: false,
  },
  {
    id: "BIOGAS",
    nome: "Biogas",
    icona: "⚡",
    descrizione: "Impianto biogas: produzione, autoconsumi e dati mensili",
    home: "/biogas",
    prefissi: ["/biogas"],
    attiva: true,
  },
  {
    id: "FOTOVOLTAICO",
    nome: "Fotovoltaico",
    icona: "☀️",
    descrizione: "Impianti fotovoltaici: produzione e monitoraggio",
    home: "/fotovoltaico",
    prefissi: ["/fotovoltaico"],
    attiva: false,
  },
  {
    id: "AGRITURISMO",
    nome: "Agriturismo",
    icona: "🏡",
    descrizione: "Gestione agriturismo",
    home: "/agriturismo",
    prefissi: ["/agriturismo"],
    attiva: false,
  },
];

export const TUTTE_LE_SEZIONI = SEZIONI.map((s) => s.id).join(",");

// "SUINI,BIOGAS" -> ["SUINI","BIOGAS"] (solo id validi)
export function parseSezioni(csv: string | null | undefined): string[] {
  if (!csv) return [];
  const validi = new Set(SEZIONI.map((s) => s.id));
  return csv
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => validi.has(s));
}

// A quale sezione appartiene un percorso? ("/" e i percorsi suini → SUINI)
export function sezioneDaPath(pathname: string): Sezione | null {
  if (pathname === "/") return SEZIONI[0]; // dashboard suini
  for (const s of SEZIONI) {
    if (s.prefissi.some((p) => pathname.startsWith(p))) return s;
  }
  return null; // percorso di piattaforma (es. /sezioni, /utenti, /login)
}

export function sezioneById(id: string): Sezione | undefined {
  return SEZIONI.find((s) => s.id === id);
}
