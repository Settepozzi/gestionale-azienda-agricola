"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { SEZIONI, sezioneDaPath, parseSezioni } from "@/lib/sezioni";

type NavItem = { href: string; label: string; icon: string };
type NavSection = { title?: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    items: [{ href: "/", label: "Dashboard", icon: "🏠" }],
  },
  {
    title: "Suini",
    items: [
      { href: "/operatore", label: "Inserimento giornata", icon: "🧤" },
      { href: "/riepilogo", label: "Riepilogo giornaliero", icon: "📋" },
      { href: "/andamento", label: "Andamento", icon: "📊" },
      { href: "/stalle", label: "Mappa stalle", icon: "🗺️" },
      { href: "/anagrafica-stalla", label: "Anagrafica stalla", icon: "📇" },
      { href: "/partite", label: "Partite", icon: "🚚" },
      { href: "/mangime", label: "Mangime", icon: "🌽" },
      { href: "/razione", label: "Razione %", icon: "🍽️" },
      { href: "/trattamenti", label: "Trattamenti", icon: "💉" },
      { href: "/mortalita", label: "Mortalità", icon: "☠️" },
      { href: "/annullo-tatuaggi", label: "Annullo tatuaggi", icon: "🚫" },
    ],
  },
  {
    title: "Anagrafiche",
    items: [
      { href: "/anagrafiche/densita", label: "Densità m²/capo", icon: "📐" },
      { href: "/anagrafiche/accrescimento", label: "Accrescimento", icon: "📈" },
      { href: "/anagrafiche/causali", label: "Causali morte", icon: "🏷️" },
    ],
  },
];

// Pagine visibili al profilo Veterinario (sola lettura)
const VETERINARIO_HREFS = new Set(["/", "/andamento", "/riepilogo", "/trattamenti"]);

export default function Sidebar({
  userName,
  userRole,
  userSezioni,
}: {
  userName: string;
  userRole?: string;
  userSezioni?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Sezione attiva in base al percorso corrente
  const sezione = sezioneDaPath(pathname) ?? SEZIONI[0];

  const isActive = (href: string) =>
    href === "/" || href === sezione.home ? pathname === href : pathname.startsWith(href);
  const multiSezione = parseSezioni(userSezioni).length > 1;

  const navSuini =
    userRole === "VETERINARIO_SUINI"
      ? NAV.map((s) => ({ ...s, items: s.items.filter((i) => VETERINARIO_HREFS.has(i.href)) }))
          .filter((s) => s.items.length > 0)
      : NAV;

  // Menu delle altre sezioni (quelle senza voci hanno solo la dashboard)
  const NAV_SEZIONI: Record<string, NavSection[]> = {
    BIOGAS: [
      {
        items: [
          { href: "/biogas", label: "Dashboard", icon: "🏠" },
          { href: "/biogas/analisi", label: "Analisi e sonde", icon: "🧪" },
          { href: "/biogas/digestato", label: "Analisi digestato", icon: "🔬" },
          { href: "/biogas/olio", label: "Analisi olio", icon: "🛢️" },
          { href: "/biogas/piezometri", label: "Acque piezometri", icon: "💧" },
          { href: "/biogas/dati", label: "Dati e import PLC", icon: "📥" },
          { href: "/biogas/allarmi", label: "Registro allarmi", icon: "🚨" },
          { href: "/biogas/manutenzioni", label: "Manutenzioni", icon: "🔧" },
          { href: "/biogas/torcia", label: "Registro torcia", icon: "🔥" },
        ],
      },
    ],
  };
  const nav =
    sezione.id === "SUINI"
      ? navSuini
      : (NAV_SEZIONI[sezione.id] ?? [
          { items: [{ href: sezione.home, label: "Dashboard", icon: "🏠" }] },
        ]);

  return (
    <>
      {/* Barra superiore mobile */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden print:hidden">
        <span className="flex items-center gap-2 font-bold text-slate-800">
          {sezione.icona} {sezione.nome}
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
          aria-label="Menu"
        >
          ☰
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } w-full shrink-0 border-b border-slate-200 bg-white md:block md:w-60 md:border-b-0 md:border-r print:hidden`}
      >
        <div className="flex h-full flex-col">
          <div className="hidden items-center gap-2 px-6 py-5 md:flex">
            <span className="text-2xl">{sezione.icona}</span>
            <span className="font-bold leading-tight text-slate-800">{sezione.nome}</span>
          </div>
          {multiSezione && (
            <div className="px-3 pb-2">
              <Link
                href="/sezioni"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              >
                🔀 Cambia sezione
              </Link>
            </div>
          )}

          <nav className="flex-1 space-y-4 px-3 py-2">
            {nav.map((section, i) => (
              <div key={i} className="space-y-1">
                {section.title && (
                  <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-200 p-3">
            {userRole === "ADMIN" && (
              <Link
                href="/utenti"
                onClick={() => setOpen(false)}
                className="mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                👥 Gestione utenti
              </Link>
            )}
            <div className="px-2 py-1 text-xs text-slate-500">Accesso come</div>
            <div className="mb-2 px-2 text-sm font-medium text-slate-700">
              {userName}
              {userRole?.startsWith("VETERINARIO") && (
                <span className="block text-xs font-normal text-slate-400">
                  Veterinario · sola lettura
                </span>
              )}
            </div>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary w-full">
                Esci
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
