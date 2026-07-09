// Wetter pro Reisetag über Open-Meteo: kostenlos, ohne API-Schlüssel, ohne Tracking.
// Ergebnisse werden kurz lokal zwischengespeichert (Vorhersagen ändern sich).

import { db } from "./db.js";

const API = "https://api.open-meteo.com/v1/forecast";
const MAX_TAGE = 16; // weiter reicht die Vorhersage nicht

const heuteISO = () => new Date().toISOString().slice(0, 10);
const diffTage = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000);

/* WMO-Wettercodes -> kurze deutsche Beschreibung */
export function wetterText(code) {
  if (code == null) return "";
  if (code === 0) return "klar";
  if (code <= 2) return "leicht bewölkt";
  if (code === 3) return "bedeckt";
  if (code <= 48) return "Nebel";
  if (code <= 57) return "Nieselregen";
  if (code <= 67) return "Regen";
  if (code <= 77) return "Schnee";
  if (code <= 82) return "Schauer";
  if (code <= 86) return "Schneeschauer";
  return "Gewitter";
}

/* Grobe Einordnung für die Planung */
export function wetterLage(tag) {
  if (!tag) return null;
  const regen = tag.regen != null ? tag.regen : 0;
  if (regen >= 60) return "schlecht";
  if (regen >= 30) return "durchwachsen";
  return "gut";
}

const cacheKey = (lat, lon, von, bis) => `wetter:${lat.toFixed(2)}:${lon.toFixed(2)}:${von}:${bis}`;

async function readCache(key) {
  try {
    const rec = await db.kv.get(key);
    if (rec && rec.value && rec.value.map) {
      const alter = Date.now() - (rec.value.zeit || 0);
      if (alter < 1000 * 60 * 60 * 3) return rec.value.map; // 3 Stunden frisch
    }
  } catch (e) {}
  return null;
}
async function writeCache(key, map) {
  try { await db.kv.put({ key, value: { map, zeit: Date.now() } }); } catch (e) {}
}

/**
 * Liefert { "2026-07-10": { tmax, tmin, regen, code, sonnenaufgang, sonnenuntergang }, ... }
 * Gibt null zurück, wenn keine Vorhersage möglich ist (zu weit in der Zukunft / offline).
 */
export async function ladeWetter(lat, lon, vonISO, bisISO) {
  if (lat == null || lon == null || !vonISO) return null;

  const heute = heuteISO();
  // Nur der Teil des Zeitraums, den die Vorhersage abdeckt
  const von = vonISO < heute ? heute : vonISO;
  const grenze = new Date(Date.now() + (MAX_TAGE - 1) * 86400000).toISOString().slice(0, 10);
  const bis = (bisISO || von) > grenze ? grenze : (bisISO || von);
  if (von > bis) return null; // Reise liegt komplett außerhalb der Vorhersage

  const key = cacheKey(lat, lon, von, bis);
  const cached = await readCache(key);
  if (cached) return cached;

  try {
    const url = `${API}?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,sunrise,sunset` +
      `&timezone=auto&start_date=${von}&end_date=${bis}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    const d = j && j.daily;
    if (!d || !Array.isArray(d.time)) return null;

    const map = {};
    d.time.forEach((tag, i) => {
      map[tag] = {
        tmax: d.temperature_2m_max ? Math.round(d.temperature_2m_max[i]) : null,
        tmin: d.temperature_2m_min ? Math.round(d.temperature_2m_min[i]) : null,
        regen: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null,
        code: d.weathercode ? d.weathercode[i] : null,
        sonnenaufgang: d.sunrise ? String(d.sunrise[i]).slice(11, 16) : "",
        sonnenuntergang: d.sunset ? String(d.sunset[i]).slice(11, 16) : "",
      };
    });
    await writeCache(key, map);
    return map;
  } catch (e) {
    return null;
  }
}

/** Liegt der Tag überhaupt im Vorhersagefenster? */
export const inVorhersage = (tag) => {
  const d = diffTage(heuteISO(), tag);
  return d >= 0 && d < MAX_TAGE;
};
