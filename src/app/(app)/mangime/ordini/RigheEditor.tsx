"use client";

import { useState } from "react";

export type MangimeOpt = { id: string; label: string };
export type RigaInit = { mangimeId: string; quantitaKg: string; numeroLotto?: string };

let counter = 0;
const newId = () => `r${counter++}`;

export default function RigheEditor({
  mangimi,
  conLotto = false,
  initial,
}: {
  mangimi: MangimeOpt[];
  conLotto?: boolean;
  initial?: RigaInit[];
}) {
  const [rows, setRows] = useState(() =>
    (initial && initial.length > 0 ? initial : [{ mangimeId: "", quantitaKg: "", numeroLotto: "" }]).map(
      (r) => ({ key: newId(), ...r })
    )
  );

  const addRow = () =>
    setRows((rs) => [...rs, { key: newId(), mangimeId: "", quantitaKg: "", numeroLotto: "" }]);
  const removeRow = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));
  const update = (key: string, patch: Partial<RigaInit>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.key} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px] flex-1">
            <select
              name="rigaMangime"
              value={r.mangimeId}
              onChange={(e) => update(r.key, { mangimeId: e.target.value })}
              className="input"
            >
              <option value="">— Mangime —</option>
              {mangimi.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <input
              name="rigaQta"
              type="number"
              step="0.1"
              min={0}
              placeholder="kg"
              value={r.quantitaKg}
              onChange={(e) => update(r.key, { quantitaKg: e.target.value })}
              className="input"
            />
          </div>
          {conLotto && (
            <div className="w-32">
              <input
                name="rigaLotto"
                placeholder="lotto"
                value={r.numeroLotto ?? ""}
                onChange={(e) => update(r.key, { numeroLotto: e.target.value })}
                className="input"
              />
            </div>
          )}
          {!conLotto && <input type="hidden" name="rigaLotto" value="" />}
          <button
            type="button"
            onClick={() => removeRow(r.key)}
            className="btn-secondary !px-3"
            aria-label="Rimuovi riga"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="text-sm font-medium text-brand-600 hover:text-brand-800">
        + Aggiungi riga
      </button>
    </div>
  );
}
