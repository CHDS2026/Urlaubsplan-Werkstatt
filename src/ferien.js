// Schulferien aller 16 Bundesländer über die OpenHolidays API (offenes Datenprojekt,
// kostenlos, kein API-Schlüssel, CORS-fähig). Ergebnisse werden lokal zwischengespeichert.
// Zweck: Tage erkennen, an denen KEIN Bundesland Ferien hat -> erfahrungsgemäß günstiger.

import { db } from "./db.js";

const API = "https://openholidaysapi.org/SchoolHolidays";

const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const cacheKey = (von, bis) => `ferien:DE:${von}:${bis}`;

async function readCache(key) {
  try {
    const rec = await db.kv.get(key);
    if (rec && rec.value && rec.value.map) {
      const alter = Date.now() - (rec.value.zeit || 0);
      if (alter < 1000 * 60 * 60 * 24 * 14) return rec.value.map; // 14 Tage frisch
    }
  } catch (e) {}
  return null;
}
async function writeCache(key, map) {
  try { await db.kv.put({ key, value: { map, zeit: Date.now() } }); } catch (e) {}
}

/**
 * Liefert { "2026-07-10": ["DE-NI","DE-BY"], ... } – je Tag die Bundesländer mit Ferien.
 * Bei Netzproblemen: null (die App zeigt dann einfach keine Ferien-Einfärbung).
 */
export async function ladeSchulferien(vonISO, bisISO) {
  const key = cacheKey(vonISO, bisISO);
  const cached = await readCache(key);
  if (cached) return cached;

  try {
    const url = `${API}?countryIsoCode=DE&languageIsoCode=DE&validFrom=${vonISO}&validTo=${bisISO}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const daten = await res.json();
    if (!Array.isArray(daten)) return null;

    const map = {};
    daten.forEach((eintrag) => {
      const start = (eintrag.startDate || "").slice(0, 10);
      const ende = (eintrag.endDate || "").slice(0, 10);
      if (!start || !ende) return;
      const laender = Array.isArray(eintrag.subdivisions)
        ? eintrag.subdivisions.map((s) => s.code || s.shortName).filter(Boolean)
        : [];
      let tag = start, schutz = 0;
      while (tag <= ende && schutz < 400) {
        if (tag >= vonISO && tag <= bisISO) {
          if (!map[tag]) map[tag] = [];
          laender.forEach((l) => { if (!map[tag].includes(l)) map[tag].push(l); });
        }
        tag = addDays(tag, 1); schutz++;
      }
    });

    await writeCache(key, map);
    return map;
  } catch (e) {
    return null;
  }
}

/** Wie viele Bundesländer haben an diesem Tag Ferien? */
export const ferienAnzahl = (map, tag) => (map && map[tag] ? map[tag].length : 0);

/** Kurzbewertung der Reisezeit anhand der Ferienlage */
export function reisezeitStufe(map, tag) {
  if (!map) return null;                 // keine Daten -> keine Aussage
  const n = ferienAnzahl(map, tag);
  if (n === 0) return "guenstig";        // kein Bundesland in Ferien
  if (n <= 4) return "mittel";
  return "teuer";                        // Hauptreisezeit
}
