import Link from "next/link";

const TABS = [
  { href: "/mangime", label: "Prodotti", key: "prodotti" },
  { href: "/mangime/ordini", label: "Ordini", key: "ordini" },
  { href: "/mangime/carichi", label: "Carichi", key: "carichi" },
  { href: "/mangime/consumi", label: "Consumi", key: "consumi" },
];

export default function MangimeTabs({ active }: { active: string }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-slate-200">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
            active === t.key
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
