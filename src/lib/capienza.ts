// Calcolo della capienza dinamica dei box in base al peso medio dei suini.

export type CurvaRow = { giorno: number; pesoKg: number };
export type FasciaDensita = { pesoMaxKg: number | null; mqPerCapo: number; ordine: number };

export const PESO_ARRIVO_DEFAULT = 30; // kg al giorno 1

// Peso medio teorico a un dato giorno di ciclo (clamp agli estremi della curva).
export function pesoDaGiorno(curva: CurvaRow[], giorno: number): number | null {
  if (curva.length === 0) return null;
  const ordinata = [...curva].sort((a, b) => a.giorno - b.giorno);
  if (giorno <= ordinata[0].giorno) return ordinata[0].pesoKg;
  const ultimo = ordinata[ordinata.length - 1];
  if (giorno >= ultimo.giorno) return ultimo.pesoKg;
  const esatto = ordinata.find((r) => r.giorno === giorno);
  if (esatto) return esatto.pesoKg;
  // interpolazione lineare tra i due giorni più vicini
  let prev = ordinata[0];
  for (const r of ordinata) {
    if (r.giorno > giorno) {
      const t = (giorno - prev.giorno) / (r.giorno - prev.giorno);
      return prev.pesoKg + t * (r.pesoKg - prev.pesoKg);
    }
    prev = r;
  }
  return ultimo.pesoKg;
}

// m² per capo richiesti a un dato peso (dalla curva di densità).
export function mqPerCapo(fasce: FasciaDensita[], peso: number): number {
  const ordinate = [...fasce].sort((a, b) => a.ordine - b.ordine);
  for (const f of ordinate) {
    if (f.pesoMaxKg === null) return f.mqPerCapo; // fascia "oltre"
    if (peso <= f.pesoMaxKg) return f.mqPerCapo;
  }
  // se nessuna fascia copre il peso, usa l'ultima
  return ordinate[ordinate.length - 1]?.mqPerCapo ?? 1;
}

// Capienza teorica di un box a un dato peso.
export function capienzaAlPeso(
  superficieMq: number,
  fasce: FasciaDensita[],
  peso: number
): number {
  const mq = mqPerCapo(fasce, peso);
  if (mq <= 0 || superficieMq <= 0) return 0;
  return Math.floor(superficieMq / mq);
}

// Peso medio corrente di una partita: manuale > da giorni di ciclo > peso arrivo > default.
export function pesoPartita(
  partita: {
    pesoMedioManualeKg: number | null;
    giorniCiclo: number | null;
    pesoMedioArrivoKg: number | null;
  },
  curva: CurvaRow[]
): number {
  if (partita.pesoMedioManualeKg != null) return partita.pesoMedioManualeKg;
  if (partita.giorniCiclo != null) {
    const p = pesoDaGiorno(curva, partita.giorniCiclo);
    if (p != null) return p;
  }
  return partita.pesoMedioArrivoKg ?? PESO_ARRIVO_DEFAULT;
}
