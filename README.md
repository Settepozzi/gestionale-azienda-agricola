# 🐷 Gestionale Allevamento Suini

Gestionale web per l'allevamento suini in soccida (Comazoo) dell'Az. Agr. Pavesi:
stalle e box con mappa interattiva, partite classificate DOP, alimentazione con
rampe automatiche, trattamenti da ricetta elettronica, mortalità, vendite con
tutele DOP e adempimenti RIFT.

Stack: **Next.js 15** (App Router, Server Actions) · **Prisma** (SQLite in
sviluppo, Postgres/Supabase in produzione) · **Tailwind CSS**.

---

## 📦 Moduli

| Sezione | Cosa fa |
|---|---|
| **Dashboard** | KPI (capi, scorte, morti, sospensioni), indici partite con ICA teorico/stimato |
| **Inserimento giornata** 🧤 | Pagina mobile per l'operaio: pasto **+/0/−** per box, morti, spostamenti |
| **Riepilogo giornaliero** | Tutto ciò che è stato inserito, navigabile per data |
| **Andamento** | Grafici alimentazione teorica/impostata/reale e ICA teorico vs stimato |
| **Mappa stalle** | Mappa interattiva dei 75 box, colori per occupazione, capienza **dinamica** dal peso |
| **Anagrafica stalla** | Riepilogo capi per box/lotto/lettera, stampabile |
| **Partite** | Lotti YY.SS.PP, classificazione DOP (fornitore, genetica, tatuaggio, lettera, mese vendita), **carico per DDT** (Modello 4, AT), giacenze, spostamenti, vendite con **blocco DOP**, report macello, scheda **AM** |
| **Mangime** | Prodotti Comazoo, **ordini d'acquisto + DDT in entrata**, carichi con **cartellino archiviato**, consumi per Linea+Gruppo con kg/capo |
| **Razione %** | Percentuale giornaliera correlata alla curva di accrescimento, **rampe automatiche** con override manuale |
| **Trattamenti** | Upload **ricetta elettronica PDF** con estrazione automatica, dossier per box (ereditato negli spostamenti), PDF archiviati |
| **Mortalità** | Registro decessi con causali, scarico automatico giacenze |
| **Annullo tatuaggi** | Suini distolti dalla DOP per lettera-mese, per il RIFT (entro il 7 del mese) |
| **Anagrafiche** | Curva densità m²/capo, curva accrescimento, causali morte |

---

## 🚀 Avvio in locale

Requisiti: **Node.js** ≥ 20.

```bash
npm install          # dipendenze (prima volta)
npm run db:push      # crea/aggiorna il database locale (SQLite)
npm run db:seed      # utente admin (prima volta)
npm run db:seed-suini# stalle, 75 box con superfici reali, curve, causali (prima volta)
npm run dev          # avvia su http://localhost:3000
```

### 🔑 Credenziali iniziali

| Email | Password |
|---|---|
| `admin@azienda.it` | `allevamento2026` |

> ⚠️ Cambia la password creando un nuovo utente e rimuovendo quello predefinito.

### 👥 Utenti

```bash
npx tsx scripts/crea-utente.ts <email> <password> "<Nome Cognome>" [ADMIN|OPERATORE]
```

### 🧹 Azzerare i dati di prova

Cancella i dati operativi conservando box, curve, anagrafiche e utenti:

```bash
npx tsx scripts/azzera-dati-test.ts --conferma
```

---

## 🛠️ Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Sviluppo |
| `npm run build` | Build di produzione (⚠ ferma prima `npm run dev`) |
| `npm run db:push` | Applica lo schema al database |
| `npm run db:studio` | Interfaccia visuale al database |

## ⚠️ Google Drive

Il progetto vive in una cartella sincronizzata: **metti in pausa la sync**
mentre sviluppi (lock su `node_modules`, errori EPERM di Prisma), oppure sposta
il progetto fuori da Drive.

---

## ☁️ Messa online (Vercel + Supabase)

1. **Supabase**: crea un progetto, copia da *Settings → Database* le stringhe
   **pooling** (porta 6543 → `DATABASE_URL`) e **direct** (5432 → `DIRECT_URL`).
2. **Schema**: in [`prisma/schema.prisma`](prisma/schema.prisma) cambia il datasource:

   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```

   Poi, con il `.env` di produzione: `npx prisma db push && npm run db:seed && npm run db:seed-suini`.
3. **Vercel**: importa il repository GitHub, imposta le variabili
   `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (nuovo valore:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   e avvia il deploy.

## 🗂️ Struttura

```
src/
  app/(app)/        → pagine protette (una cartella per sezione)
  app/actions/      → Server Actions (logica di scrittura)
  app/api/          → route (parse ricette, PDF archiviati, cartellini)
  components/       → UI riutilizzabile (mappa, grafici, stampa…)
  lib/              → dominio: capienza, razione, rampe, ICA, bonus, lotto DOP, parser ricette
prisma/
  schema.prisma     → modello dati
  data/             → superfici box e curva di accrescimento (da Excel aziendali)
  seed*.ts          → dati iniziali
scripts/            → utilità da riga di comando
```

**Visione**: piattaforma multi-attività — Suini (attiva), Avicoli, Biogas,
Fotovoltaico, Agriturismo, Terreni e Colture (future sezioni).
