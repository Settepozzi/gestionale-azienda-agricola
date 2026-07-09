"use client";

import { useMemo, useRef, useState } from "react";

// Grafico a linee leggero (SVG) con crosshair e tooltip.
// Colori: palette categorica validata (blu, aqua, giallo) — vedi dataviz.
export type Serie = {
  nome: string;
  colore: string; // hex della palette
  punti: { x: number; y: number | null }[]; // x = ms epoch o giorno di ciclo
  tipo?: "linea" | "punti";
  marcatori?: boolean; // pallini su ogni punto della linea
};

export type Soglia = { y: number; label: string };

export default function LineChart({
  serie,
  formatoX,
  decimaliY = 0,
  height = 260,
  unitaY,
  soglie = [],
}: {
  serie: Serie[];
  formatoX: "data" | "giorno"; // "data" = x in ms epoch, "giorno" = giorno di ciclo
  decimaliY?: number;
  height?: number;
  unitaY?: string;
  soglie?: Soglia[]; // linee orizzontali di riferimento (es. 100% / 70% / 50%)
}) {
  const formatX = (x: number) =>
    formatoX === "data"
      ? new Date(x).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })
      : `g. ${x}`;
  const formatY = (y: number) =>
    y.toLocaleString("it-IT", {
      minimumFractionDigits: decimaliY,
      maximumFractionDigits: decimaliY,
    });
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ px: number; x: number } | null>(null);

  const W = 720;
  const H = height;
  const M = { top: 16, right: 110, bottom: 28, left: 52 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;

  const { xs, minX, maxX, maxY } = useMemo(() => {
    const xsAll = [...new Set(serie.flatMap((s) => s.punti.map((p) => p.x)))].sort(
      (a, b) => a - b
    );
    const ys = serie.flatMap((s) => s.punti.map((p) => p.y)).filter((y): y is number => y != null);
    return {
      xs: xsAll,
      minX: xsAll[0] ?? 0,
      maxX: xsAll[xsAll.length - 1] ?? 1,
      maxY: Math.max(1, ...ys, ...soglie.map((s) => s.y)) * 1.08,
    };
  }, [serie, soglie]);

  const sx = (x: number) => M.left + (maxX === minX ? 0.5 : (x - minX) / (maxX - minX)) * iw;
  const sy = (y: number) => M.top + ih - (y / maxY) * ih;

  const gridY = [0.25, 0.5, 0.75, 1].map((f) => maxY * f);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    if (px < M.left || px > W - M.right || xs.length === 0) {
      setHover(null);
      return;
    }
    // x più vicino
    let best = xs[0];
    let bestD = Infinity;
    for (const x of xs) {
      const d = Math.abs(sx(x) - px);
      if (d < bestD) {
        bestD = d;
        best = x;
      }
    }
    setHover({ px: sx(best), x: best });
  }

  const valoriHover = hover
    ? serie
        .map((s) => ({
          nome: s.nome,
          colore: s.colore,
          y: s.punti.find((p) => p.x === hover.x)?.y ?? null,
        }))
        .filter((v) => v.y != null)
    : [];

  return (
    <div ref={wrapRef} className="relative">
      {/* Legenda */}
      <div className="mb-2 flex flex-wrap gap-4 text-sm">
        {serie.map((s) => (
          <span key={s.nome} className="flex items-center gap-1.5 text-slate-600">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: s.colore }}
            />
            {s.nome}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Griglia recessiva */}
        {gridY.map((y) => (
          <g key={y}>
            <line x1={M.left} x2={W - M.right} y1={sy(y)} y2={sy(y)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={M.left - 8} y={sy(y)} textAnchor="end" dominantBaseline="central" fontSize={10} fill="#94a3b8">
              {formatY(y)}
            </text>
          </g>
        ))}
        <line x1={M.left} x2={W - M.right} y1={sy(0)} y2={sy(0)} stroke="#cbd5e1" strokeWidth={1} />
        {unitaY && (
          <text x={M.left - 8} y={M.top - 6} textAnchor="end" fontSize={10} fill="#94a3b8">
            {unitaY}
          </text>
        )}

        {/* Soglie di riferimento (linee tratteggiate, stile Data Studio) */}
        {soglie.map((s) => (
          <g key={s.label}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={sy(s.y)}
              y2={sy(s.y)}
              stroke="#e34948"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            <rect
              x={M.left + 4}
              y={sy(s.y) - 16}
              width={s.label.length * 6.5 + 10}
              height={14}
              rx={3}
              fill="#fde8e8"
            />
            <text x={M.left + 9} y={sy(s.y) - 9} dominantBaseline="central" fontSize={10} fill="#c0392b">
              {s.label}
            </text>
          </g>
        ))}

        {/* Etichette X (prima, metà, ultima) */}
        {[minX, xs[Math.floor(xs.length / 2)] ?? minX, maxX].map((x, i) => (
          <text key={i} x={sx(x)} y={H - 8} textAnchor="middle" fontSize={10} fill="#94a3b8">
            {formatX(x)}
          </text>
        ))}

        {/* Serie */}
        {serie.map((s) => {
          const pts = s.punti.filter((p) => p.y != null) as { x: number; y: number }[];
          if (s.tipo === "punti") {
            return (
              <g key={s.nome}>
                {pts.map((p, i) => (
                  <circle
                    key={i}
                    cx={sx(p.x)}
                    cy={sy(p.y)}
                    r={5}
                    fill={s.colore}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </g>
            );
          }
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x)},${sy(p.y)}`).join(" ");
          const last = pts[pts.length - 1];
          return (
            <g key={s.nome}>
              <path d={d} fill="none" stroke={s.colore} strokeWidth={2} strokeLinejoin="round" />
              {s.marcatori &&
                pts.map((p, i) => (
                  <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={2.8} fill={s.colore} />
                ))}
              {last && (
                <>
                  <circle cx={sx(last.x)} cy={sy(last.y)} r={3.5} fill={s.colore} />
                  {/* Etichetta diretta a fine linea (testo in inchiostro, punto colorato) */}
                  <text
                    x={sx(last.x) + 8}
                    y={sy(last.y)}
                    dominantBaseline="central"
                    fontSize={11}
                    fill="#52514e"
                  >
                    {s.nome}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Crosshair */}
        {hover && (
          <line x1={hover.px} x2={hover.px} y1={M.top} y2={M.top + ih} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>

      {/* Tooltip */}
      {hover && valoriHover.length > 0 && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{
            left: `calc(${(hover.px / W) * 100}% + ${hover.px / W > 0.6 ? -140 : 12}px)`,
          }}
        >
          <div className="mb-1 font-medium text-slate-700">{formatX(hover.x)}</div>
          {valoriHover.map((v) => (
            <div key={v.nome} className="flex items-center gap-1.5 text-slate-600">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: v.colore }} />
              {v.nome}: <b>{formatY(v.y!)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
