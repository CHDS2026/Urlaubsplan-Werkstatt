/* ── Netz-Helfer ────────────────────────────────────────────────────────────
   jget = JSON per fetch mit hartem Timeout. Lag bisher in zehn Komponenten
   wortgleich herum (nur Formatierung und Standard-Timeout wichen ab).

   Der Standard sind 15 s. Wo längere Wartezeiten nötig sind – Overpass-Abfragen
   in Rundwege (20 s) und Wandern (25 s) – reicht die aufrufende Datei den Wert
   weiterhin selbst durch, damit sich am Verhalten nichts ändert. */

export async function jget(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
