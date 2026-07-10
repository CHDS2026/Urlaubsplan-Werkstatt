// Langjährige Klimawerte aus dem Open-Meteo-Archiv (ERA5): kostenlos, kein API-Schlüssel.
// Zweck: Einschätzung der Reisezeit, wenn die 16-Tage-Vorhersage nicht mehr reicht.

import { db } from "./db.js";

const ARCHIV = "https://archive-api.open-meteo.com/v1/archive";
const JAHRE = 5; // Durchschnitt der letzten 5 vollständigen Jahre

const letzterTagImMonat = (jahr, monat) => new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
const pad = (n) => String(n).padStart(2, "0");

const cacheKey = (lat, lon, monat) => `klima:${lat.toFixed(1)}:${lon.toFixed(1)}:${monat}`;

async function readCache(key) {
  try {
    const rec = await db.kv.get(key);
    if (rec && rec.value && rec.value.werte) {
      const alter = Date.now() - (rec.value.zeit || 0);
      if (alter < 1000 * 60 * 60 * 24 * 180) return rec.value.werte; // 180 Tage
    }
  } catch (e) {}
  return null;
}
async function writeCache(key, werte) {
  try { await db.kv.put({ key, value: { werte, zeit: Date.now() } }); } catch (e) {}
}

/**
 * Durchschnittswerte für einen Monat an einem Ort.
 * @returns { tmax, tmin, regentage, jahreVon, jahreBis } oder null
 */
export async function ladeKlima(lat, lon, monat /* 1-12 */) {
  if (lat == null || lon == null || !monat) return null;
  const key = cacheKey(lat, lon, monat);
  const cached = await readCache(key);
  if (cached) return cached;

  const aktuellesJahr = new Date().getUTCFullYear();
  const jahre = [];
  for (let j = aktuellesJahr - JAHRE; j < aktuellesJahr; j++) jahre.push(j);

  try {
    const antworten = await Promise.all(jahre.map(async (j) => {
      const von = `${j}-${pad(monat)}-01`;
      const bis = `${j}-${pad(monat)}-${pad(letzterTagImMonat(j, monat))}`;
      const url = `${ARCHIV}?latitude=${lat}&longitude=${lon}&start_date=${von}&end_date=${bis}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      const r = await fetch(url);
      if (!r.ok) return null;
      const j2 = await r.json();
      return j2 && j2.daily ? j2.daily : null;
    }));

    const gueltig = antworten.filter(Boolean);
    if (!gueltig.length) return null;

    let summeMax = 0, summeMin = 0, anzahl = 0, regentage = 0, tageGesamt = 0;
    gueltig.forEach((d) => {
      (d.temperature_2m_max || []).forEach((v) => { if (v != null) { summeMax += v; anzahl++; } });
      (d.temperature_2m_min || []).forEach((v) => { if (v != null) summeMin += v; });
      (d.precipitation_sum || []).forEach((v) => { if (v != null) { tageGesamt++; if (v >= 1) regentage++; } });
    });
    if (!anzahl) return null;

    const werte = {
      tmax: Math.round(summeMax / anzahl),
      tmin: Math.round(summeMin / anzahl),
      regentage: tageGesamt ? Math.round((regentage / gueltig.length)) : null,
      jahreVon: jahre[0],
      jahreBis: jahre[jahre.length - 1],
    };
    await writeCache(key, werte);
    return werte;
  } catch (e) {
    return null;
  }
}

export const MONATSNAMEN = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
