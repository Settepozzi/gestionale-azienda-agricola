// Stima dell'ICA a ciclo in corso e allocazione del mangime alle partite.

type ConsumoLG = { lineaId: string | null; gruppoId: string | null; quantitaKg: number };
type BoxLG = {
  lineaId: string | null;
  gruppoId: string | null;
  giacenze: { partitaId: string; quantita: number }[];
};

// Ripartisce i consumi (registrati per Linea+Gruppo) tra le partite, in
// proporzione ai capi presenti di ciascuna partita nella combinazione.
export function allocaMangimePerPartita(
  consumi: ConsumoLG[],
  boxLG: BoxLG[]
): Map<string, number> {
  const totLG = new Map<string, number>();
  const perPartitaLG = new Map<string, Map<string, number>>(); // key LG -> partita -> capi
  for (const b of boxLG) {
    const key = `${b.lineaId}:${b.gruppoId}`;
    for (const g of b.giacenze) {
      totLG.set(key, (totLG.get(key) ?? 0) + g.quantita);
      const m = perPartitaLG.get(key) ?? new Map<string, number>();
      m.set(g.partitaId, (m.get(g.partitaId) ?? 0) + g.quantita);
      perPartitaLG.set(key, m);
    }
  }
  const out = new Map<string, number>();
  for (const c of consumi) {
    const key = `${c.lineaId}:${c.gruppoId}`;
    const tot = totLG.get(key) ?? 0;
    if (tot <= 0) continue;
    const m = perPartitaLG.get(key);
    if (!m) continue;
    for (const [partitaId, capi] of m) {
      out.set(partitaId, (out.get(partitaId) ?? 0) + c.quantitaKg * (capi / tot));
    }
  }
  return out;
}

// ICA stimato a ciclo in corso:
// mangime consumato ÷ (peso vivo attuale + kg già venduti − kg ricevuti).
export function icaStimato(input: {
  mangimeKg: number | null;
  pesoMedioKg: number;
  capiPresenti: number;
  kgVenduti: number;
  kgRicevuti: number | null;
}): number | null {
  const { mangimeKg, pesoMedioKg, capiPresenti, kgVenduti, kgRicevuti } = input;
  if (mangimeKg == null || mangimeKg <= 0 || kgRicevuti == null) return null;
  const incremento = pesoMedioKg * capiPresenti + kgVenduti - kgRicevuti;
  if (incremento <= 0) return null;
  return mangimeKg / incremento;
}
