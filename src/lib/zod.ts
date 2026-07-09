import { z } from "zod";

// Numero opzionale: tratta stringa vuota / null / undefined come "non valorizzato"
// (altrimenti z.coerce.number() convertirebbe "" in 0).
export function optionalNumber(min = 0) {
  return z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(min).optional()
  );
}
