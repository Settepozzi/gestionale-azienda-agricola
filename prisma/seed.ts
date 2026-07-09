import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Utente amministratore predefinito. CAMBIA la password dopo il primo accesso.
const ADMIN_EMAIL = "admin@azienda.it";
const ADMIN_PASSWORD = "allevamento2026";

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: "Amministratore",
      role: "ADMIN",
      sezioni: "SUINI,AVICOLI,BIOGAS,FOTOVOLTAICO,AGRITURISMO",
      passwordHash,
    },
  });
  console.log(`✔ Utente admin pronto: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
