import "server-only";
import { prisma } from "@/lib/prisma";
import { SPECIES_LABELS } from "@/lib/constants";

export type TargetOption = {
  value: string; // "lot:<id>" | "animal:<id>"
  label: string;
  group: "Lotti" | "Animali";
};

// Carica lotti e animali come opzioni per il selettore "destinatario".
export async function loadTargetOptions(): Promise<TargetOption[]> {
  const [lots, animals] = await Promise.all([
    prisma.lot.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, species: true, name: true },
    }),
    prisma.animal.findMany({
      orderBy: { tag: "asc" },
      select: { id: true, tag: true, species: true },
    }),
  ]);

  return [
    ...lots.map((l) => ({
      value: `lot:${l.id}`,
      label: `${l.code}${l.name ? ` – ${l.name}` : ""} (${SPECIES_LABELS[l.species]})`,
      group: "Lotti" as const,
    })),
    ...animals.map((a) => ({
      value: `animal:${a.id}`,
      label: `${a.tag} (${SPECIES_LABELS[a.species]})`,
      group: "Animali" as const,
    })),
  ];
}

// Converte il valore del select in { animalId, lotId } per Prisma.
export function parseTarget(value: string | null | undefined): {
  animalId: string | null;
  lotId: string | null;
} {
  if (!value) return { animalId: null, lotId: null };
  const [kind, id] = value.split(":");
  if (kind === "lot" && id) return { animalId: null, lotId: id };
  if (kind === "animal" && id) return { animalId: id, lotId: null };
  return { animalId: null, lotId: null };
}

export function targetToValue(row: {
  animalId: string | null;
  lotId: string | null;
}): string {
  if (row.lotId) return `lot:${row.lotId}`;
  if (row.animalId) return `animal:${row.animalId}`;
  return "";
}
