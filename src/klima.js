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

/* ─────────── Jahresklima: alle 12 Monate für einen Ort ─────────── */

const JAHRE_MATRIX = 5;

const jahrKey = (lat, lon) => `klimajahr:${lat.toFixed(1)}:${lon.toFixed(1)}`;

/**
 * Liefert für jeden Monat (1-12):
 *   { tmax, tmin, regentage, anteilWarm, anteilTrocken }
 * anteilWarm    = Anteil der Tage mit Höchsttemperatur >= 20 °C
 * anteilTrocken = Anteil der Tage mit weniger als 1 mm Niederschlag
 * Das ist aussagekräftiger als der bloße Durchschnitt.
 */
export async function ladeKlimaJahr(lat, lon) {
  if (lat == null || lon == null) return null;
  const key = jahrKey(lat, lon);
  try {
    const rec = await db.kv.get(key);
    if (rec && rec.value && rec.value.monate) {
      const alter = Date.now() - (rec.value.zeit || 0);
      if (alter < 1000 * 60 * 60 * 24 * 180) return rec.value.monate;
    }
  } catch (e) {}

  const jetzt = new Date().getUTCFullYear();
  const von = `${jetzt - JAHRE_MATRIX}-01-01`;
  const bis = `${jetzt - 1}-12-31`;

  try {
    const url = `${ARCHIV}?latitude=${lat}&longitude=${lon}&start_date=${von}&end_date=${bis}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const d = j && j.daily;
    if (!d || !Array.isArray(d.time)) return null;

    const eimer = {};
    for (let m = 1; m <= 12; m++) eimer[m] = { max: [], min: [], regen: [] };

    d.time.forEach((tag, i) => {
      const m = Number(tag.slice(5, 7));
      const tmax = d.temperature_2m_max[i], tmin = d.temperature_2m_min[i], p = d.precipitation_sum[i];
      if (tmax != null) eimer[m].max.push(tmax);
      if (tmin != null) eimer[m].min.push(tmin);
      if (p != null) eimer[m].regen.push(p);
    });

    const monate = {};
    for (let m = 1; m <= 12; m++) {
      const e = eimer[m];
      if (!e.max.length) { monate[m] = null; continue; }
      const mittel = (a) => a.reduce((s, x) => s + x, 0) / a.length;
      const regentage = e.regen.filter((p) => p >= 1).length / JAHRE_MATRIX;
      monate[m] = {
        tmax: Math.round(mittel(e.max)),
        tmin: Math.round(mittel(e.min)),
        regentage: Math.round(regentage),
        anteilWarm: Math.round((e.max.filter((t) => t >= 20).length / e.max.length) * 100),
        anteilTrocken: e.regen.length ? Math.round((e.regen.filter((p) => p < 1).length / e.regen.length) * 100) : null,
      };
    }

    try { await db.kv.put({ key, value: { monate, zeit: Date.now() } }); } catch (e) {}
    return monate;
  } catch (e) {
    return null;
  }
}

/** Koordinaten zu einem Suchbegriff, lokal gemerkt (schont den Geocoder) */
export async function koordinatenGemerkt(suchbegriff, finder) {
  const key = `koord:${(suchbegriff || "").toLowerCase().trim()}`;
  try {
    const rec = await db.kv.get(key);
    if (rec && rec.value && Array.isArray(rec.value.koord)) return rec.value.koord;
  } catch (e) {}
  const koord = await finder(suchbegriff);
  if (koord) { try { await db.kv.put({ key, value: { koord, zeit: Date.now() } }); } catch (e) {} }
  return koord;
}

/** Bewertung eines Monats nach deinen Kriterien */
export function bewerteMonat(werte, kriterien) {
  if (!werte) return null;
  const { minTemp = 18, maxRegentage = 9 } = kriterien || {};
  const warmGenug = werte.tmax >= minTemp;
  const trockenGenug = werte.regentage <= maxRegentage;
  if (warmGenug && trockenGenug) return "gut";
  if (warmGenug || trockenGenug) return "mittel";
  return "schlecht";
}
