import { PrismaClient } from "@prisma/client";

// Singleton del Prisma Client: in sviluppo Next.js ricarica i moduli e senza
// questo pattern si aprirebbero troppe connessioni al database.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
