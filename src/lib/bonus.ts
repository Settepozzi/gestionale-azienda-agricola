// Calcolo indicatori e bonus di fine ciclo secondo il contratto Comazoo.

export type Metriche = {
  immessi: number;
  morti: number;
  venduti: number;
  mortalitaPct: number | null; // (morti + scarti) / immessi * 100
  resaPct: number | null; // venduti / immessi * 100
  kgRicevuti: number | null;
  kgVenduti: number | null;
  mangimeKg: number | null;
  ica: number | null; // mangime / (kgVenduti - kgRicevuti)
  bonusMortalitaCapo: number;
  bonusIcaCapo: number;
  bonusTotale: number;
  penale: boolean;
};

// € per capo del bonus mortalità (in base alla % del ciclo).
export function bonusMortalitaPerCapo(mortalitaPct: number | null): number {
  if (mortalitaPct == null) return 0;
  if (mortalitaPct <= 3.5) return 4;
  if (mortalitaPct <= 4) return 2;
  return 0;
}

// € per capo del bonus ICA.
export function bonusIcaPerCapo(ica: number | null): number {
  if (ica == null || ica <= 0) return 0;
  if (ica <= 3.45) return 1.5;
  if (ica <= 3.5) return 1.0;
  if (ica <= 3.57) return 0.8;
  return 0;
}

export function calcolaMetriche(input: {
  immessi: number;
  morti: number;
  venduti: number;
  kgRicevuti: number | null;
  kgVenduti: number | null;
  mangimeKg: number | null;
}): Metriche {
  const { immessi, morti, venduti, kgRicevuti, kgVenduti, mangimeKg } = input;

  const mortalitaPct = immessi > 0 ? (morti / immessi) * 100 : null;
  const resaPct = immessi > 0 ? (venduti / immessi) * 100 : null;

  let ica: number | null = null;
  if (mangimeKg != null && kgVenduti != null && kgRicevuti != null) {
    const incremento = kgVenduti - kgRicevuti;
    if (incremento > 0) ica = mangimeKg / incremento;
  }

  const bonusMortalitaCapo = bonusMortalitaPerCapo(mortalitaPct);
  const bonusIcaCapo = bonusIcaPerCapo(ica);
  // I bonus sono "per suino consegnato al macello" = capi venduti.
  const bonusTotale = (bonusMortalitaCapo + bonusIcaCapo) * venduti;
  const penale = mortalitaPct != null && mortalitaPct > 4;

  return {
    immessi,
    morti,
    venduti,
    mortalitaPct,
    resaPct,
    kgRicevuti,
    kgVenduti,
    mangimeKg,
    ica,
    bonusMortalitaCapo,
    bonusIcaCapo,
    bonusTotale,
    penale,
  };
}
