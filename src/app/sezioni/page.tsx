import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { SEZIONI, parseSezioni } from "@/lib/sezioni";

export const dynamic = "force-dynamic";

export default async function SezioniPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const abilitate = new Set(parseSezioni(session.sezioni));
  const mie = SEZIONI.filter((s) => abilitate.has(s.id));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-3xl">
            🌾
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Azienda Agricola Pavesi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ciao {session.name} — scegli la sezione in cui entrare
          </p>
        </div>

        {mie.length === 0 ? (
          <div className="card p-8 text-center text-slate-500">
            Nessuna sezione abilitata per il tuo utente. Contatta l&apos;amministratore.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mie.map((s) => (
              <Link
                key={s.id}
                href={s.home}
                className="card group p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-3xl transition-transform group-hover:scale-110">
                  {s.icona}
                </div>
                <div className="font-bold text-slate-800">{s.nome}</div>
                <p className="mt-1 text-xs text-slate-500">{s.descrizione}</p>
                {!s.attiva && (
                  <span className="badge mt-3 bg-amber-100 text-amber-800">In costruzione</span>
                )}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-4 text-sm">
          {session.role === "ADMIN" && (
            <Link href="/utenti" className="text-brand-600 hover:underline">
              👥 Gestione utenti
            </Link>
          )}
          <form action={logoutAction}>
            <button type="submit" className="text-slate-500 hover:text-slate-700 hover:underline">
              Esci
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
