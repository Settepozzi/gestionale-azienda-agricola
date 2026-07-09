"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword, type SessionPayload } from "@/lib/auth";
import { USER_ROLES, SEZIONE_PER_RUOLO } from "@/lib/constants";
import { SEZIONI } from "@/lib/sezioni";

export type FormResult = { error?: string; ok?: boolean };

// Solo l'amministratore può gestire gli utenti.
async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/sezioni");
  return session;
}

function sezioniDaForm(formData: FormData): string {
  const validi = new Set(SEZIONI.map((s) => s.id));
  const scelte = formData
    .getAll("sezioni")
    .map(String)
    .filter((s) => validi.has(s));
  return scelte.join(",");
}

export async function salvaUtente(id: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  let role = String(formData.get("role") ?? "OPERATORE");
  if (!(USER_ROLES as readonly string[]).includes(role)) role = "OPERATORE";
  let sezioni = sezioniDaForm(formData);

  // I ruoli veterinario hanno la sezione fissa, qualunque cosa sia spuntato
  if (SEZIONE_PER_RUOLO[role]) sezioni = SEZIONE_PER_RUOLO[role];

  // Non permettere di declassare sé stessi (per non chiudersi fuori)
  if (id === admin.userId) {
    role = "ADMIN";
    if (!sezioni) sezioni = "SUINI";
  }

  const password = String(formData.get("password") ?? "");
  await prisma.user.update({
    where: { id },
    data: {
      ...(nome ? { name: nome } : {}),
      role,
      sezioni,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
  revalidatePath("/utenti");
}

export async function creaUtente(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  await requireAdmin();
  const schema = z.object({
    email: z.string().email("Email non valida"),
    nome: z.string().trim().min(1, "Il nome è obbligatorio"),
    password: z.string().min(6, "Password di almeno 6 caratteri"),
    role: z.enum(USER_ROLES),
  });
  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    nome: formData.get("nome"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { error: "Esiste già un utente con questa email." };

  // I ruoli veterinario hanno la sezione fissa
  const sezioni =
    SEZIONE_PER_RUOLO[parsed.data.role] ?? (sezioniDaForm(formData) || "SUINI");

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.nome,
      role: parsed.data.role,
      sezioni,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  revalidatePath("/utenti");
  return { ok: true };
}

export async function eliminaUtente(id: string, _formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (id === admin.userId) return; // non eliminare sé stessi
  await prisma.user.delete({ where: { id } });
  revalidatePath("/utenti");
}
