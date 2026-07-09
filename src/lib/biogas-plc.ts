// Parser dei log CSV del PLC (WinCC/HMI Siemens).
// Formato: "VarName";"TimeString";"VarValue";"Validity";"Time_ms"
// Variabili: "DB HMI_Totalizzatori_kWh erogati_Oggi|_Ieri" e
//            "DB HMI_Totalizzatori_kWh consumati_Oggi|_Ieri" (campione ogni ~5 min).
//
// Valore giornaliero: il totalizzatore "Oggi" cresce durante il giorno e
// "Ieri" riporta il totale del giorno precedente. Per il giorno D usiamo
// max( ultimo "Ieri" letto in D+1 , massimo "Oggi" letto in D ).

export type GiornoPlc = {
  data: string; // "YYYY-MM-DD"
  erogatiKWh?: number;
  consumatiKWh?: number;
};

type Serie = "erogati" | "consumati";

function chiaveGiorno(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function giornoPrima(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return chiaveGiorno(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

// Analizza un CSV e accumula i massimi "Oggi" e gli ultimi "Ieri" per giorno.
export function parseCsvPlc(
  testo: string,
  acc: {
    oggi: Map<string, Map<Serie, number>>;
    ieri: Map<string, Map<Serie, { valore: number; ts: number }>>;
  }
): number {
  let righe = 0;
  for (const line of testo.split(/\r?\n/)) {
    if (!line || line.startsWith('"VarName"')) continue;
    // "Var";"14.04.2025 11:54:58";68;1;457614...
    const m = line.match(
      /^"([^"]+)";"(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})";([\d.,\-]+);/
    );
    if (!m) continue;
    const varName = m[1].toLowerCase();
    let serie: Serie | null = null;
    if (varName.includes("kwh erogati")) serie = "erogati";
    else if (varName.includes("kwh consumati")) serie = "consumati";
    if (!serie) continue;
    const isIeri = varName.endsWith("_ieri");
    const isOggi = varName.endsWith("_oggi");
    if (!isIeri && !isOggi) continue;

    const [, , dd, MM, yyyy, hh, mi, ss] = m;
    const valore = Number(m[8].replace(",", "."));
    if (isNaN(valore) || valore < 0) continue;
    const giorno = chiaveGiorno(Number(yyyy), Number(MM), Number(dd));
    const ts =
      Number(yyyy) * 1e10 +
      Number(MM) * 1e8 +
      Number(dd) * 1e6 +
      Number(hh) * 1e4 +
      Number(mi) * 1e2 +
      Number(ss);

    if (isOggi) {
      const g = acc.oggi.get(giorno) ?? new Map<Serie, number>();
      g.set(serie, Math.max(g.get(serie) ?? 0, valore));
      acc.oggi.set(giorno, g);
    } else {
      // "Ieri" letto nel giorno D si riferisce al giorno D-1
      const rif = giornoPrima(giorno);
      const g = acc.ieri.get(rif) ?? new Map<Serie, { valore: number; ts: number }>();
      const cur = g.get(serie);
      if (!cur || ts >= cur.ts) g.set(serie, { valore, ts });
      acc.ieri.set(rif, g);
    }
    righe++;
  }
  return righe;
}

export function nuovoAccumulatore() {
  return {
    oggi: new Map<string, Map<Serie, number>>(),
    ieri: new Map<string, Map<Serie, { valore: number; ts: number }>>(),
  };
}

// ---------------------------------------------------------------------
// Sonde di analisi (Awite, livelli, temperature): media giornaliera.
// ---------------------------------------------------------------------

export type CampoAnalisi =
  | "ch4"
  | "co2"
  | "o2"
  | "h2s"
  | "livGas"
  | "livF"
  | "livPre"
  | "tempF"
  | "tempRic";

// Riconoscimento della variabile PLC → campo (l'ordine conta per i prefissi)
function campoDaVarName(varName: string): CampoAnalisi | null {
  const v = varName.toLowerCase();
  if (v.includes("awite_chp_ch4")) return "ch4";
  if (v.includes("awite_chp_co2")) return "co2";
  if (v.includes("awite_atm_o2")) return "o2";
  if (v.includes("awite_chp_h2s")) return "h2s";
  if (v.includes("livello gas_pv")) return "livGas";
  if (v.includes("livello f_pv")) return "livF";
  if (v.includes("livello pre_pv")) return "livPre";
  if (v.includes("temp ric f_pv")) return "tempRic";
  if (v.includes("temp f_pv")) return "tempF";
  return null;
}

export type AccAnalisi = Map<
  string, // giorno "YYYY-MM-DD"
  Map<CampoAnalisi, { somma: number; n: number; max: number }>
>;

export function nuovoAccumulatoreAnalisi(): AccAnalisi {
  return new Map();
}

// Analizza un CSV delle sonde e accumula somme/conteggi per giorno.
// Scarta le righe con orologio PLC sballato (date < 2024).
export function parseCsvAnalisi(testo: string, acc: AccAnalisi): number {
  let righe = 0;
  for (const line of testo.split(/\r?\n/)) {
    if (!line || line.startsWith('"VarName"')) continue;
    const m = line.match(
      /^"([^"]+)";"(\d{2})\.(\d{2})\.(\d{4}) \d{2}:\d{2}:\d{2}";(-?[\d.,]+);/
    );
    if (!m) continue;
    const campo = campoDaVarName(m[1]);
    if (!campo) continue;
    const anno = Number(m[4]);
    if (anno < 2024) continue; // orologio PLC sballato
    const valore = Number(m[5].replace(",", "."));
    if (isNaN(valore)) continue;

    const giorno = chiaveGiorno(anno, Number(m[3]), Number(m[2]));
    const g = acc.get(giorno) ?? new Map();
    const c = g.get(campo) ?? { somma: 0, n: 0, max: -Infinity };
    c.somma += valore;
    c.n += 1;
    if (valore > c.max) c.max = valore;
    g.set(campo, c);
    acc.set(giorno, g);
    righe++;
  }
  return righe;
}

// ---------------------------------------------------------------------
// Allarmi (DB_Storico*.csv): eventi attivo(1)/rientrato(0) da accoppiare.
// Formato riga: Time_ms;2;stato;MsgClass;MsgNumber;...;"dd.MM.yyyy HH:mm:ss";"";""
// ---------------------------------------------------------------------

export type EventoAllarme = { msgNumber: number; stato: 0 | 1; ts: number }; // ts = epoch ms

export function parseCsvStorico(testo: string, eventi: EventoAllarme[]): number {
  let righe = 0;
  for (const line of testo.split(/\r?\n/)) {
    if (!line || line.startsWith('"')) {
      // le righe dati iniziano col numero seriale, non con virgolette
      if (!/^\d/.test(line)) continue;
    }
    const campi = line.split(";");
    if (campi.length < 14) continue;
    const stato = Number(campi[2]);
    const msgNumber = Number(campi[4]);
    if ((stato !== 0 && stato !== 1) || isNaN(msgNumber) || msgNumber <= 0) continue;
    const m = campi[13]?.match(/"(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})"/);
    if (!m) continue;
    const anno = Number(m[3]);
    if (anno < 2024) continue; // orologio PLC sballato
    const ts = new Date(
      anno,
      Number(m[2]) - 1,
      Number(m[1]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6])
    ).getTime();
    eventi.push({ msgNumber, stato: stato as 0 | 1, ts });
    righe++;
  }
  return righe;
}

export type AllarmeAccoppiato = { msgNumber: number; inizio: number; fine: number | null };

// Accoppia gli eventi: per ogni codice, 1 apre e il successivo 0 chiude.
export function accoppiaAllarmi(eventi: EventoAllarme[]): AllarmeAccoppiato[] {
  const perCodice = new Map<number, EventoAllarme[]>();
  for (const e of eventi) {
    (perCodice.get(e.msgNumber) ?? perCodice.set(e.msgNumber, []).get(e.msgNumber)!).push(e);
  }
  const out: AllarmeAccoppiato[] = [];
  for (const [msgNumber, evs] of perCodice) {
    evs.sort((a, b) => a.ts - b.ts);
    let aperto: number | null = null;
    for (const e of evs) {
      if (e.stato === 1) {
        if (aperto == null) aperto = e.ts; // ignora doppi "attivo"
      } else if (aperto != null) {
        out.push({ msgNumber, inizio: aperto, fine: e.ts });
        aperto = null;
      }
    }
    if (aperto != null) out.push({ msgNumber, inizio: aperto, fine: null });
  }
  return out.sort((a, b) => b.inizio - a.inizio);
}

export type AnalisiGiorno = {
  data: string; // "YYYY-MM-DD"
  medie: Partial<Record<CampoAnalisi, number>>;
  h2sMax?: number;
};

export function risultatiAnalisi(acc: AccAnalisi): AnalisiGiorno[] {
  const out: AnalisiGiorno[] = [];
  for (const [giorno, campi] of [...acc.entries()].sort()) {
    const medie: Partial<Record<CampoAnalisi, number>> = {};
    let h2sMax: number | undefined;
    for (const [campo, c] of campi) {
      if (c.n === 0) continue;
      medie[campo] = Math.round((c.somma / c.n) * 100) / 100;
      if (campo === "h2s") h2sMax = Math.round(c.max * 100) / 100;
    }
    if (Object.keys(medie).length > 0) out.push({ data: giorno, medie, h2sMax });
  }
  return out;
}

// Combina gli accumulatori nei valori giornalieri finali.
export function risultatiGiornalieri(acc: ReturnType<typeof nuovoAccumulatore>): GiornoPlc[] {
  const giorni = new Set<string>([...acc.oggi.keys(), ...acc.ieri.keys()]);
  const out: GiornoPlc[] = [];
  for (const g of [...giorni].sort()) {
    const riga: GiornoPlc = { data: g };
    for (const serie of ["erogati", "consumati"] as Serie[]) {
      const daOggi = acc.oggi.get(g)?.get(serie);
      const daIeri = acc.ieri.get(g)?.get(serie)?.valore;
      const v =
        daIeri != null && daOggi != null
          ? Math.max(daIeri, daOggi)
          : (daIeri ?? daOggi);
      if (v != null) {
        if (serie === "erogati") riga.erogatiKWh = v;
        else riga.consumatiKWh = v;
      }
    }
    if (riga.erogatiKWh != null || riga.consumatiKWh != null) out.push(riga);
  }
  return out;
}
