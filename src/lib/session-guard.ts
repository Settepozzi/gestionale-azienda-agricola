import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/auth";

// Da usare nelle Server Action (tutte di scrittura) per garantire
// l'autenticazione. Il profilo VETERINARIO è in sola lettura: qualsiasi
// tentativo di scrittura viene reindirizzato alla dashboard.
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role.startsWith("VETERINARIO")) redirect("/");
  return session;
}
