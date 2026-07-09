// Valori di dominio condivisi (usati per validazione e menu a tendina).
// Non usiamo enum Prisma per restare compatibili con SQLite e Postgres.

export const SPECIES = ["SUINI", "AVICOLI", "ALTRO"] as const;
export type Species = (typeof SPECIES)[number];

export const SPECIES_LABELS: Record<string, string> = {
  SUINI: "Suini",
  AVICOLI: "Avicoli",
  ALTRO: "Altro",
};

export const LOT_ENTRY_TYPES = ["NASCITA", "ACQUISTO"] as const;
export const LOT_STATUS = ["ATTIVO", "CHIUSO"] as const;

export const LOT_STATUS_LABELS: Record<string, string> = {
  ATTIVO: "Attivo",
  CHIUSO: "Chiuso",
};

export const ANIMAL_STATUS = ["PRESENTE", "VENDUTO", "MORTO"] as const;
export const ANIMAL_STATUS_LABELS: Record<string, string> = {
  PRESENTE: "Presente",
  VENDUTO: "Venduto",
  MORTO: "Morto",
};

export const SEX = ["M", "F"] as const;
export const SEX_LABELS: Record<string, string> = {
  M: "Maschio",
  F: "Femmina",
};

export const MOVEMENT_TYPES = [
  "NASCITA",
  "ACQUISTO",
  "VENDITA",
  "MORTE",
  "TRASFERIMENTO",
] as const;
export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  NASCITA: "Nascita",
  ACQUISTO: "Acquisto",
  VENDITA: "Vendita",
  MORTE: "Morte",
  TRASFERIMENTO: "Trasferimento",
};

export const USER_ROLES = [
  "ADMIN",
  "OPERATORE",
  "VETERINARIO_SUINI",
  "VETERINARIO_AVICOLI",
] as const;
export const USER_ROLE_LABELS: Record<string, string> = {
  ADMIN: "Amministratore",
  OPERATORE: "Operatore",
  VETERINARIO_SUINI: "Veterinario Suini",
  VETERINARIO_AVICOLI: "Veterinario Avicoli",
};

// I ruoli veterinario sono in sola lettura e vincolati a una sezione fissa.
export function isVeterinario(role: string | undefined | null): boolean {
  return !!role && role.startsWith("VETERINARIO");
}
export const SEZIONE_PER_RUOLO: Record<string, string> = {
  VETERINARIO_SUINI: "SUINI",
  VETERINARIO_AVICOLI: "AVICOLI",
};

// Pagine accessibili al profilo Veterinario (sola lettura).
// I prefissi valgono per l'intera sezione; le eccezioni bloccano le sottopagine di inserimento.
export const VETERINARIO_PREFISSI = ["/andamento", "/riepilogo", "/trattamenti"];
export const VETERINARIO_ECCEZIONI = ["/trattamenti/nuovo"];
