// Dossier trattamenti di un box: diretti + ereditati tramite gli spostamenti.
// Con la gestione a quantità non è possibile il tracciamento del singolo capo:
// ricostruiamo i trattamenti che i suini presenti nel box POSSONO aver ricevuto,
// risalendo i box di provenienza (spostamenti in entrata) prima della data di
// spostamento.

export type TrattInfo = {
  id: string;
  farmaco: string;
  patologia: string | null;
  dataInizio: Date;
  dataFine: Date;
  dataFineSospensione: Date | null;
  giorniSospensione: number;
  boxIds: string[];
};

export type Spostamento = {
  boxDaId: string | null;
  boxAId: string | null;
  data: Date;
};

export type DossierBox = {
  diretti: TrattInfo[];
  ereditati: { tratt: TrattInfo; provenienzaBoxId: string }[];
};

export function calcolaDossierBox(
  boxId: string,
  trattamenti: TrattInfo[],
  spostamenti: Spostamento[]
): DossierBox {
  // Trattamenti per box
  const trattByBox = new Map<string, TrattInfo[]>();
  for (const t of trattamenti) {
    for (const b of t.boxIds) {
      (trattByBox.get(b) ?? trattByBox.set(b, []).get(b)!).push(t);
    }
  }
  // Spostamenti in entrata per box
  const inByBox = new Map<string, Spostamento[]>();
  for (const s of spostamenti) {
    if (!s.boxAId) continue;
    (inByBox.get(s.boxAId) ?? inByBox.set(s.boxAId, []).get(s.boxAId)!).push(s);
  }

  const diretti = trattByBox.get(boxId) ?? [];

  const ereditati: { tratt: TrattInfo; provenienzaBoxId: string }[] = [];
  const giaVisti = new Set<string>([boxId]);
  const trattVisti = new Set<string>(diretti.map((t) => t.id));

  let frontier: { boxId: string; cutoff: number }[] = [{ boxId, cutoff: Infinity }];
  for (let depth = 0; depth < 8 && frontier.length > 0; depth++) {
    const next: { boxId: string; cutoff: number }[] = [];
    for (const { boxId: bId, cutoff } of frontier) {
      for (const sp of inByBox.get(bId) ?? []) {
        if (sp.data.getTime() > cutoff || !sp.boxDaId) continue;
        const src = sp.boxDaId;
        // trattamenti sul box di provenienza iniziati prima dello spostamento
        for (const t of trattByBox.get(src) ?? []) {
          if (t.dataInizio.getTime() <= sp.data.getTime() && !trattVisti.has(t.id)) {
            trattVisti.add(t.id);
            ereditati.push({ tratt: t, provenienzaBoxId: src });
          }
        }
        if (!giaVisti.has(src)) {
          giaVisti.add(src);
          next.push({ boxId: src, cutoff: sp.data.getTime() });
        }
      }
    }
    frontier = next;
  }

  const byDate = (a: TrattInfo, b: TrattInfo) => b.dataInizio.getTime() - a.dataInizio.getTime();
  diretti.sort(byDate);
  ereditati.sort((a, b) => byDate(a.tratt, b.tratt));
  return { diretti, ereditati };
}
