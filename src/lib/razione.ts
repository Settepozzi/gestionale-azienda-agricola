// Calcolo della razione giornaliera correlata alla curva di accrescimento.

export type CurvaMangime = { giorno: number; mangimeCapoGg: number };

const MS_GIORNO = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date | string): Date {
  const x = typeof d === "string" ? new Date(d) : new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

// Giorno di ciclo a una certa data (giorno 1 = data di arrivo).
export function giornoCiclo(dataArrivo: Date | string, data: Date | string): number {
  const a = startOfDay(dataArrivo).getTime();
  const d = startOfDay(data).getTime();
  const giorni = Math.floor((d - a) / MS_GIORNO) + 1;
  return giorni < 1 ? 1 : giorni;
}

// mangime standard per capo/giorno a un dato giorno di ciclo (clamp/interpolazione).
export function mangimeCapoGgAlGiorno(curva: CurvaMangime[], giorno: number): number {
  if (curva.length === 0) return 0;
  const ord = [...curva].sort((a, b) => a.giorno - b.giorno);
  if (giorno <= ord[0].giorno) return ord[0].mangimeCapoGg;
  const ultimo = ord[ord.length - 1];
  if (giorno >= ultimo.giorno) return ultimo.mangimeCapoGg;
  const esatto = ord.find((r) => r.giorno === giorno);
  if (esatto) return esatto.mangimeCapoGg;
  let prev = ord[0];
  for (const r of ord) {
    if (r.giorno > giorno) {
      const t = (giorno - prev.giorno) / (r.giorno - prev.giorno);
      return prev.mangimeCapoGg + t * (r.mangimeCapoGg - prev.mangimeCapoGg);
    }
    prev = r;
  }
  return ultimo.mangimeCapoGg;
}

export type RampaDef = {
  incrementoGiornaliero: number;
  percentualeMax: number;
  percentualeMin: number;
};

// Percentuale prevista dalla rampa a una certa data, partendo dall'ultima
// registrazione (manuale o automatica) come base.
export function percentualeDaRampa(
  basePercentuale: number,
  baseData: Date | string,
  rampa: RampaDef,
  dataTarget: Date | string
): number {
  const giorni = Math.max(
    0,
    Math.round((startOfDay(dataTarget).getTime() - startOfDay(baseData).getTime()) / MS_GIORNO)
  );
  const p = basePercentuale + rampa.incrementoGiornaliero * giorni;
  const clamped = Math.min(rampa.percentualeMax, Math.max(rampa.percentualeMin, p));
  return Math.round(clamped * 100) / 100;
}

export type GiacenzaConPartita = {
  quantita: number;
  partita: { dataArrivo: Date | string } | null;
};

// Calcola la razione di un box a una certa data.
export function calcolaRazioneBox(
  giacenze: GiacenzaConPartita[],
  curva: CurvaMangime[],
  data: Date | string,
  percentuale: number
): { capi: number; kgStandardCapo: number; kgStandardTotale: number; kgTotale: number } {
  let capi = 0;
  let kgStandardTotale = 0;
  for (const g of giacenze) {
    if (g.quantita <= 0 || !g.partita) continue;
    const gc = giornoCiclo(g.partita.dataArrivo, data);
    const kgCapo = mangimeCapoGgAlGiorno(curva, gc);
    capi += g.quantita;
    kgStandardTotale += kgCapo * g.quantita;
  }
  const kgStandardCapo = capi > 0 ? kgStandardTotale / capi : 0;
  const kgTotale = kgStandardTotale * (percentuale / 100);
  return { capi, kgStandardCapo, kgStandardTotale, kgTotale };
}
