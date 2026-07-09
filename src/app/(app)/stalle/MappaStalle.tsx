"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { moveBox } from "@/app/actions/box";

export type BoxView = {
  id: string;
  numero: number;
  tipo: string;
  posX: number;
  posY: number;
  larghezza: number;
  altezza: number;
  capienza: number;
  superficieMq: number;
  pesoRif: number;
  occupazione: number;
  stallaNome: string;
  lineaNome: string | null;
  gruppoNome: string | null;
};

function colorFor(occ: number, cap: number): { fill: string; text: string } {
  if (cap <= 0 || occ <= 0) return { fill: "#e2e8f0", text: "#334155" }; // slate-200
  const r = occ / cap;
  if (r > 1) return { fill: "#ef4444", text: "#fff" }; // rosso: oltre capienza
  if (r >= 0.85) return { fill: "#15803d", text: "#fff" }; // verde scuro
  if (r >= 0.5) return { fill: "#4ade80", text: "#064e3b" };
  return { fill: "#bbf7d0", text: "#065f46" };
}

export default function MappaStalle({ boxes }: { boxes: BoxView[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(
    () => Object.fromEntries(boxes.map((b) => [b.id, { x: b.posX, y: b.posY }]))
  );

  // Stato del trascinamento (pan della mappa o spostamento di un box)
  const drag = useRef<
    | null
    | {
        mode: "pan" | "box";
        startClientX: number;
        startClientY: number;
        startTx: number;
        startTy: number;
        boxId?: string;
        startBoxX?: number;
        startBoxY?: number;
        moved?: boolean;
      }
  >(null);

  const bounds = (() => {
    if (boxes.length === 0) return { minX: 0, minY: 0, w: 100, h: 100 };
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const b of boxes) {
      const p = positions[b.id] ?? { x: b.posX, y: b.posY };
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + b.larghezza);
      maxY = Math.max(maxY, p.y + b.altezza);
    }
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  })();

  const fit = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pad = 40;
    const k = Math.min(
      (rect.width - pad) / bounds.w,
      (rect.height - pad) / bounds.h,
      1.6
    );
    const tx = (rect.width - bounds.w * k) / 2 - bounds.minX * k;
    const ty = (rect.height - bounds.h * k) / 2 - bounds.minY * k;
    setView({ k, tx, ty });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.w, bounds.h, bounds.minX, bounds.minY]);

  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setView((v) => {
      const k2 = Math.max(0.15, Math.min(6, v.k * factor));
      const lx = (cx - v.tx) / v.k;
      const ly = (cy - v.ty) / v.k;
      return { k: k2, tx: cx - lx * k2, ty: cy - ly * k2 };
    });
  };

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setView((v) => {
      const k2 = Math.max(0.15, Math.min(6, v.k * factor));
      const lx = (cx - v.tx) / v.k;
      const ly = (cy - v.ty) / v.k;
      return { k: k2, tx: cx - lx * k2, ty: cy - ly * k2 };
    });
  };

  const onPointerDownBg = (e: React.PointerEvent) => {
    if (drag.current) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = {
      mode: "pan",
      startClientX: e.clientX,
      startClientY: e.clientY,
      startTx: view.tx,
      startTy: view.ty,
    };
  };

  const onPointerDownBox = (e: React.PointerEvent, b: BoxView) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const p = positions[b.id];
    drag.current = {
      mode: editMode ? "box" : "pan",
      startClientX: e.clientX,
      startClientY: e.clientY,
      startTx: view.tx,
      startTy: view.ty,
      boxId: b.id,
      startBoxX: p.x,
      startBoxY: p.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    if (d.mode === "pan") {
      setView((v) => ({ ...v, tx: d.startTx + dx, ty: d.startTy + dy }));
    } else if (d.mode === "box" && d.boxId) {
      setPositions((prev) => ({
        ...prev,
        [d.boxId!]: {
          x: (d.startBoxX ?? 0) + dx / view.k,
          y: (d.startBoxY ?? 0) + dy / view.k,
        },
      }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.mode === "box" && d.boxId && d.moved) {
      const p = positions[d.boxId];
      if (p) moveBox(d.boxId, p.x, p.y);
    } else if (d.boxId && !d.moved) {
      // click semplice su un box → selezione
      setSelected(d.boxId);
    }
  };

  const sel = selected ? boxes.find((b) => b.id === selected) ?? null : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="card relative flex-1 overflow-hidden p-0">
        {/* Controlli */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
          <button onClick={() => zoomBy(1.2)} className="btn-secondary h-9 w-9 !px-0" title="Zoom +">
            +
          </button>
          <button onClick={() => zoomBy(1 / 1.2)} className="btn-secondary h-9 w-9 !px-0" title="Zoom −">
            −
          </button>
          <button onClick={fit} className="btn-secondary h-9 px-3" title="Adatta">
            Adatta
          </button>
          <button
            onClick={() => setEditMode((m) => !m)}
            className={`btn h-9 px-3 ${
              editMode ? "bg-amber-500 text-white hover:bg-amber-600" : "btn-secondary"
            }`}
            title="Trascina i box per riposizionarli"
          >
            {editMode ? "✓ Riposiziona attivo" : "Riposiziona box"}
          </button>
        </div>

        <svg
          ref={svgRef}
          className={`h-[70vh] w-full touch-none select-none ${
            editMode ? "cursor-move bg-amber-50" : "cursor-grab bg-slate-50"
          }`}
          onWheel={onWheel}
          onPointerDown={onPointerDownBg}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <g transform={`translate(${view.tx},${view.ty}) scale(${view.k})`}>
            {boxes.map((b) => {
              const p = positions[b.id] ?? { x: b.posX, y: b.posY };
              const c = colorFor(b.occupazione, b.capienza);
              const isSel = b.id === selected;
              return (
                <g
                  key={b.id}
                  transform={`translate(${p.x},${p.y})`}
                  onPointerDown={(e) => onPointerDownBox(e, b)}
                  className={editMode ? "cursor-grab" : "cursor-pointer"}
                >
                  <rect
                    width={b.larghezza}
                    height={b.altezza}
                    rx={4}
                    fill={c.fill}
                    stroke={isSel ? "#2563eb" : "#0f172a"}
                    strokeWidth={isSel ? 3 : 1}
                  />
                  <text
                    x={b.larghezza / 2}
                    y={b.altezza / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={Math.min(14, b.altezza * 0.5)}
                    fontWeight={700}
                    fill={c.text}
                  >
                    {b.numero}
                  </text>
                  {b.capienza > 0 && b.altezza >= 34 && (
                    <text
                      x={b.larghezza / 2}
                      y={b.altezza - 6}
                      textAnchor="middle"
                      fontSize={9}
                      fill={c.text}
                      opacity={0.8}
                    >
                      {b.occupazione}/{b.capienza}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legenda */}
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-3 rounded-lg bg-white/90 px-3 py-2 text-xs shadow">
          <span className="font-medium text-slate-600">Occupazione:</span>
          <Legend color="#e2e8f0" label="vuoto" />
          <Legend color="#bbf7d0" label="&lt;50%" />
          <Legend color="#4ade80" label="50-85%" />
          <Legend color="#15803d" label="&gt;85%" />
          <Legend color="#ef4444" label="oltre" />
        </div>
      </div>

      {/* Pannello dettaglio box */}
      <div className="w-full lg:w-72">
        {sel ? (
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Box {sel.numero}</h3>
              <span className="badge bg-slate-100 text-slate-600">
                {sel.tipo === "SINGOLO" ? "Singolo" : "Doppio"}
              </span>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Stalla" value={sel.stallaNome} />
              <Row label="Linea" value={sel.lineaNome ?? "—"} />
              <Row label="Gruppo" value={sel.gruppoNome ?? "—"} />
              <Row label="Superficie" value={`${sel.superficieMq} m²`} />
              <Row label="Peso rif." value={`${sel.pesoRif} kg`} />
              <Row label="Capienza" value={`${sel.capienza} capi`} />
              <Row label="Presenti" value={`${sel.occupazione}`} />
            </dl>
            <Link href={`/box/${sel.id}`} className="btn-primary mt-4 w-full">
              Apri / Modifica
            </Link>
          </div>
        ) : (
          <div className="card p-5 text-sm text-slate-500">
            Clicca un box sulla mappa per vederne i dettagli.
            <p className="mt-3 text-xs text-slate-400">
              Suggerimento: usa la rotellina per zoomare, trascina per spostarti.
              Attiva <b>Riposiziona box</b> per sistemare la disposizione.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-3 w-3 rounded" style={{ background: color }} />
      <span className="text-slate-500" dangerouslySetInnerHTML={{ __html: label }} />
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
