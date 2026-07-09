"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Inserisci la password"),
});

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email o password non corretti." };
  }

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sezioni: user.sezioni,
  });

  const { parseSezioni, sezioneById } = await import("@/lib/sezioni");
  const sezioni = parseSezioni(user.sezioni);

  // Se richiesta una pagina specifica, torna lì; altrimenti:
  // più sezioni → selettore; una sola → home della sezione.
  const da = String(formData.get("da") || "");
  if (da.startsWith("/") && da !== "/") redirect(da);
  if (sezioni.length > 1) redirect("/sezioni");
  const unica = sezioni[0] ? sezioneById(sezioni[0]) : undefined;
  redirect(unica?.home ?? "/");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
