/* ── Öffnungszeiten wirklich deuten (nur mit kanonischem Parser, keine Heuristik) ──
   Nutzt die Referenz-Bibliothek „opening_hours" (npm i opening_hours). Beantwortet exakt
   eine Frage: Ist ein Punkt an einem bestimmten KALENDERTAG überhaupt geöffnet – und wenn
   ja, grob von wann bis wann. Wir raten NICHT: kann der Wert nicht sicher geparst werden
   (oder hängt er an Feiertags-/Ferienregeln ohne bekannte Region), kommt „unbekannt"
   zurück – nie fälschlich „geschlossen".

   opening_hours wird per dynamischem import() nur geladen, wenn die Funktion wirklich läuft
   (kleinere Startlast; und die Auswertelogik bleibt ohne Dependency testbar).

   VORAUSSETZUNG: `npm i opening_hours` – sonst schlägt der Build fehl (Rollup löst den
   dynamischen Import zur Bauzeit auf). */

const zwei = (n) => (n < 10 ? "0" + n : "" + n);
const hhmm = (d) => zwei(d.getHours()) + ":" + zwei(d.getMinutes());

/* Reine, testbare Auswertung: aus einem opening_hours-Objekt den Tagesstatus ableiten. */
export function statusAusOh(oh, datumISO) {
  const von = new Date(datumISO + "T00:00:00");
  const bis = new Date(von.getTime()); bis.setDate(bis.getDate() + 1);
  const iv = oh.getOpenIntervals(von, bis) || [];
  if (!iv.length) return { status: "zu", text: "an diesem Tag geschlossen" };
  let start = iv[0][0], ende = iv[0][1];
  for (const seg of iv) { if (seg[0] < start) start = seg[0]; if (seg[1] > ende) ende = seg[1]; }
  return { status: "auf", text: "geöffnet " + hhmm(start) + "–" + hhmm(ende) };
}

/* Öffentliche Funktion: Wert + Datum → Status. opts.nominatim optional für Feiertage. */
export async function oeffnungsStatus(value, datumISO, opts = {}) {
  if (!value || !datumISO) return { status: "unbekannt", text: "" };
  try {
    const mod = await import("opening_hours");
    const OpeningHours = mod.default || mod;
    const oh = new OpeningHours(value, opts.nominatim || null, { locale: "de" });
    return statusAusOh(oh, datumISO);
  } catch (e) {
    return { status: "unbekannt", text: "" };
  }
}
