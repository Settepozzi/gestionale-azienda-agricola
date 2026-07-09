import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import { formatKg, formatNumber, toDateInputValue } from "@/lib/format";
import { startOfDay } from "@/lib/razione";

export const dynamic = "force-dynamic";

const SEGNO_LABEL: Record<string, { txt: string; cls: string }> = {
  PIU: { txt: "+ aumenta", cls: "bg-green-100 text-green-800" },
  MENO: { txt: "− diminuisci", cls: "bg-red-100 text-red-800" },
  ZERO: { txt: "0 salta pasto", cls: "bg-slate-200 text-slate-600" },
};

export default async function RiepilogoPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const sp = await searchParams;
  const giorno = startOfDay(sp.data ? sp.data : new Date());
  const domani = new Date(giorno.getTime() + 24 * 60 * 60 * 1000);
  const ieri = new Date(giorno.getTime() - 24 * 60 * 60 * 1000);
  const range = { gte: giorno, lt: domani };

  const [segnalazioni, morti, spostamenti, razioni] = await Promise.all([
    prisma.segnalazionePasto.findMany({
      where: { data: range },
      include: { box: { select: { numero: true } } },
      orderBy: { box: { numero: "asc" } },
    }),
    prisma.mortalita.findMany({
      where: { data: range },
      include: { box: { select: { numero: true } }, causale: { select: { nome: true } } },
      orderBy: { box: { numero: "asc" } },
    }),
    prisma.spostamentoBox.findMany({
      where: { data: range },
      include: { boxDa: { select: { numero: true } }, boxA: { select: { numero: true } } },
    }),
    prisma.razioneBox.findMany({
      where: { data: range },
      include: { box: { select: { numero: true } } },
      orderBy: { box: { numero: "asc" } },
    }),
  ]);

  const totMorti = morti.reduce((s, m) => s + m.quantita, 0);
  const kgRazione = razioni.reduce((s, r) => s + r.kgTotale, 0);
  const dataStr = giorno.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const link = (d: Date) => `/riepilogo?data=${toDateInputValue(d)}`;

  return (
    <div>
      <PageHeader title="Riepilogo giornaliero" subtitle="Tutto ciò che è stato inserito nella giornata" />

      {/* Navigazione data */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href={link(ieri)} className="btn-secondary">
          ← Giorno prima
        </Link>
        <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium capitalize text-slate-700">
          {dataStr}
        </div>
        <Link href={link(domani)} className="btn-secondary">
          Giorno dopo →
        </Link>
        <Link href="/riepilogo" className="text-sm text-brand-600 hover:underline">
          Oggi
        </Link>
      </div>

      {/* Sintesi */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Box label="Decessi" value={`${totMorti}`} />
        <Box label="Spostamenti" value={`${spostamenti.length}`} />
        <Box label="Mangime dato" value={formatKg(kgRazione)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pasto */}
        <Card title="Segnalazioni pasto">
          {segnalazioni.length === 0 ? (
            <Empty />
          ) : (
            <div className="flex flex-wrap gap-2">
              {segnalazioni.map((s) => {
                const l = SEGNO_LABEL[s.segno];
                return (
                  <span key={s.id} className={`badge ${l?.cls}`}>
                    Box {s.box.numero}: {l?.txt}
                  </span>
                );
              })}
            </div>
          )}
        </Card>

        {/* Mortalità */}
        <Card title="Decessi">
          {morti.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {morti.map((m) => (
                <li key={m.id} className="flex justify-between py-2">
                  <span className="text-slate-700">
                    Box {m.box.numero}
                    <span className="text-slate-400"> · {m.causale?.nome ?? "—"}</span>
                  </span>
                  <span className="font-medium text-red-700">{m.quantita} capi</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Spostamenti */}
        <Card title="Spostamenti">
          {spostamenti.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {spostamenti.map((s) => (
                <li key={s.id} className="flex justify-between py-2">
                  <span className="text-slate-700">
                    Box {s.boxDa?.numero ?? "?"} → Box {s.boxA?.numero ?? "?"}
                  </span>
                  <span className="font-medium">{s.quantita} capi</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Razioni */}
        <Card title="Razioni impostate">
          {razioni.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {razioni.map((r) => (
                <li key={r.id} className="flex justify-between py-2">
                  <span className="text-slate-700">Box {r.box.numero}</span>
                  <span>
                    <span className="text-slate-500">{formatNumber(r.percentuale, 0)}% · </span>
                    <span className="font-medium text-brand-700">{formatKg(r.kgTotale)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 font-semibold text-slate-800">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-slate-400">Niente registrato.</p>;
}
