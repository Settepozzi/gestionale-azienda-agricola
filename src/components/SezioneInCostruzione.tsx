import Link from "next/link";

export default function SezioneInCostruzione({
  icona,
  nome,
  descrizione,
}: {
  icona: string;
  nome: string;
  descrizione: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-5xl">
        {icona}
      </div>
      <h1 className="text-2xl font-bold text-slate-800">{nome}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">{descrizione}</p>
      <span className="badge mt-4 bg-amber-100 px-3 py-1 text-amber-800">
        🚧 Sezione in costruzione
      </span>
      <p className="mt-6 max-w-md text-xs text-slate-400">
        La struttura è pronta: qui arriveranno le funzioni di questa sezione. Intanto puoi tornare
        al{" "}
        <Link href="/sezioni" className="text-brand-600 underline">
          selettore delle sezioni
        </Link>
        .
      </p>
    </div>
  );
}
