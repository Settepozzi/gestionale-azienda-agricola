// Script per creare (o aggiornare) un utente dell'applicazione.
//
// Uso:
//   npx tsx scripts/crea-utente.ts <email> <password> "<Nome Cognome>" [ADMIN|OPERATORE|VETERINARIO_SUINI|VETERINARIO_AVICOLI]
//
// Esempi:
//   npx tsx scripts/crea-utente.ts mario@azienda.it segreta123 "Mario Bianchi" OPERATORE
//   npx tsx scripts/crea-utente.ts vet@azienda.it segreta123 "Dr. Rossi" VETERINARIO   (sola lettura)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [email, password, name, roleArg] = process.argv.slice(2);

  if (!email || !password || !name) {
    console.error(
      'Uso: npx tsx scripts/crea-utente.ts <email> <password> "<Nome>" [ADMIN|OPERATORE]'
    );
    process.exit(1);
  }

  const role = ["ADMIN", "OPERATORE", "VETERINARIO_SUINI", "VETERINARIO_AVICOLI"].includes(roleArg ?? "")
    ? roleArg
    : "OPERATORE";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, name, role },
    create: { email: email.toLowerCase(), passwordHash, name, role },
  });

  console.log(`✔ Utente pronto: ${user.email} (${user.role})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
