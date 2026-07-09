import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { salvaUtente, eliminaUtente } from "@/app/actions/utenti";
import { USER_ROLES, USER_ROLE_LABELS } from "@/lib/constants";
import { SEZIONI, parseSezioni } from "@/lib/sezioni";
import NuovoUtenteForm from "./NuovoUtenteForm";

export const dynamic = "force-dynamic";

export default async function UtentiPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/sezioni");

  const utenti = await prisma.user.findMany({ orderBy: { email: "asc" } });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">👥 Gestione utenti</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ruoli e sezioni abilitate per ogni utente
            </p>
          </div>
          <Link href="/sezioni" className="btn-secondary">
            ← Torna alle sezioni
          </Link>
        </div>

        {/* Elenco utenti */}
        <div className="space-y-4">
          {utenti.map((u) => {
            const action = salvaUtente.bind(null, u.id);
            const abilitate = new Set(parseSezioni(u.sezioni));
            const isSelf = u.id === session.userId;
            return (
              <form key={u.id} action={action} className="card p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800">{u.email}</span>
                    {isSelf && <span className="badge ml-2 bg-brand-50 text-brand-700">tu</span>}
                  </div>
                  {!isSelf && (
                    <button
                      formAction={eliminaUtente.bind(null, u.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Elimina utente
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label">Nome</label>
                    <input name="nome" defaultValue={u.name} className="input" />
                  </div>
                  <div>
                    <label className="label">Ruolo</label>
                    <select
                      name="role"
                      defaultValue={u.role}
                      className="input"
                      disabled={isSelf}
                    >
                      {USER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {USER_ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    {isSelf && (
                      <p className="mt-1 text-xs text-slate-400">
                        Non puoi cambiare il tuo ruolo.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">Nuova password (facoltativa)</label>
                    <input
                      name="password"
                      type="text"
                      className="input"
                      placeholder="lascia vuoto per non cambiarla"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="label">Sezioni abilitate</div>
                  <div className="flex flex-wrap gap-3">
                    {SEZIONI.map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          name="sezioni"
                          value={s.id}
                          defaultChecked={abilitate.has(s.id)}
                          className="h-4 w-4"
                        />
                        {s.icona} {s.nome}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <button type="submit" className="btn-primary">
                    Salva
                  </button>
                  <span className="ml-3 text-xs text-slate-400">
                    Le modifiche a ruolo/sezioni valgono dal prossimo accesso dell&apos;utente.
                  </span>
                </div>
              </form>
            );
          })}
        </div>

        {/* Nuovo utente */}
        <div className="card mt-8 p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Nuovo utente</h2>
          <NuovoUtenteForm />
        </div>
      </div>
    </main>
  );
}
