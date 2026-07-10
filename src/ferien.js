// Schulferien aller 16 Bundesländer über die OpenHolidays API (offenes Datenprojekt,
// kostenlos, kein API-Schlüssel, CORS-fähig). Ergebnisse werden lokal zwischengespeichert.
//
// Belegte Zusammenhänge, die wir nutzen:
//  - Ferien und Feiertage sind der stärkste Preistreiber -> ferienfreie Tage markieren
//  - Erste und letzte Ferientage sind besonders teuer -> als Randtage markieren
// Nicht genutzt: "günstiger Wochentag" - dazu widersprechen sich die Studien.

import { db } from "./db.js";

const API = "https://openholidaysapi.org/SchoolHolidays";
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const cacheKey = (von, bis) => `ferien2:DE:${von}:${bis}`;

async function readCache(key) {
  try {
    const rec = await db.kv.get(key);
    if (rec && rec.value && rec.value.daten) {
      const alter = Date.now() - (rec.value.zeit || 0);
      if (alter < 1000 * 60 * 60 * 24 * 14) return rec.value.daten; // 14 Tage frisch
    }
  } catch (e) {}
  return null;
}
async function writeCache(key, daten) {
  try { await db.kv.put({ key, value: { daten, zeit: Date.now() } }); } catch (e) {}
}

/**
 * Liefert { tage: { "2026-07-10": ["DE-NI", ...] }, rand: { "2026-07-10": ["Ferienbeginn NI"] } }
 * oder null (offline / Dienst nicht erreichbar).
 */
export async function ladeSchulferien(vonISO, bisISO) {
  const key = cacheKey(vonISO, bisISO);
  const cached = await readCache(key);
  if (cached) return cached;

  try {
    const url = `${API}?countryIsoCode=DE&languageIsoCode=DE&validFrom=${vonISO}&validTo=${bisISO}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const eintraege = await res.json();
    if (!Array.isArray(eintraege)) return null;

    const tage = {};
    const rand = {};

    eintraege.forEach((e) => {
      const start = (e.startDate || "").slice(0, 10);
      const ende = (e.endDate || "").slice(0, 10);
      if (!start || !ende) return;
      const laender = Array.isArray(e.subdivisions)
        ? e.subdivisions.map((s) => s.shortName || s.code || "").filter(Boolean)
        : [];

      // alle Tage der Ferienperiode
      let tag = start, schutz = 0;
      while (tag <= ende && schutz < 400) {
        if (tag >= vonISO && tag <= bisISO) {
          if (!tage[tag]) tage[tag] = [];
          laender.forEach((l) => { if (!tage[tag].includes(l)) tage[tag].push(l); });
        }
        tag = addDays(tag, 1); schutz++;
      }

      // Randtage: erster und letzter Ferientag (erfahrungsgemäß teuer, starker Reiseverkehr)
      const kurz = laender.length ? laender.join("/") : "";
      const merke = (d, text) => {
        if (d < vonISO || d > bisISO) return;
        if (!rand[d]) rand[d] = [];
        if (!rand[d].includes(text)) rand[d].push(text);
      };
      merke(start, `Ferienbeginn ${kurz}`.trim());
      merke(ende, `Ferienende ${kurz}`.trim());
    });

    const daten = { tage, rand };
    await writeCache(key, daten);
    return daten;
  } catch (e) {
    return null;
  }
}

/** Wie viele Bundesländer haben an diesem Tag Ferien? */
export const ferienAnzahl = (daten, tag) => (daten && daten.tage && daten.tage[tag] ? daten.tage[tag].length : 0);

/** Ist der Tag ein erster oder letzter Ferientag? -> Liste der Hinweise, sonst null */
export const randTag = (daten, tag) => (daten && daten.rand && daten.rand[tag] ? daten.rand[tag] : null);

/** Kurzbewertung der Reisezeit anhand der Ferienlage */
export function reisezeitStufe(daten, tag) {
  if (!daten) return null;
  if (randTag(daten, tag)) return "randtag";     // Ferienbeginn/-ende: besonders teuer
  const n = ferienAnzahl(daten, tag);
  if (n === 0) return "guenstig";
  if (n <= 4) return "mittel";
  return "teuer";
}

/* ─────────── Feiertage im Zielland (OpenHolidays, kostenlos, kein Schlüssel) ─────────── */

const FEIERTAGE_API = "https://openholidaysapi.org/PublicHolidays";

// Deutsche Ländernamen -> ISO-Code (nur Länder, die die API abdeckt)
export const LAND_ISO = {
  Deutschland: "DE", Österreich: "AT", Schweiz: "CH", Italien: "IT", Frankreich: "FR",
  Spanien: "ES", Portugal: "PT", Niederlande: "NL", Belgien: "BE", Luxemburg: "LU",
  Polen: "PL", Tschechien: "CZ", Slowakei: "SK", Ungarn: "HU", Slowenien: "SI",
  Kroatien: "HR", Irland: "IE", Malta: "MT", Estland: "EE", Lettland: "LV", Litauen: "LT",
  Rumänien: "RO", Bulgarien: "BG", Albanien: "AL", Andorra: "AD", Liechtenstein: "LI",
  Monaco: "MC", "San Marino": "SM", Schweden: "SE",
};

export const landIso = (land) => LAND_ISO[(land || "").trim()] || null;

const ftKey = (iso, von, bis) => `feiertage:${iso}:${von}:${bis}`;

/**
 * Feiertage im Zielland im Reisezeitraum.
 * @returns [{ datum, name }] oder null (Land nicht abgedeckt / offline)
 */
export async function ladeFeiertageLand(land, vonISO, bisISO) {
  const iso = landIso(land);
  if (!iso || !vonISO || !bisISO) return null;

  const key = ftKey(iso, vonISO, bisISO);
  try {
    const rec = await db.kv.get(key);
    if (rec && rec.value && Array.isArray(rec.value.liste)) {
      const alter = Date.now() - (rec.value.zeit || 0);
      if (alter < 1000 * 60 * 60 * 24 * 30) return rec.value.liste;
    }
  } catch (e) {}

  try {
    const url = `${FEIERTAGE_API}?countryIsoCode=${iso}&languageIsoCode=DE&validFrom=${vonISO}&validTo=${bisISO}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const daten = await res.json();
    if (!Array.isArray(daten)) return null;

    const liste = daten.map((e) => {
      const namen = Array.isArray(e.name) ? e.name : [];
      const de = namen.find((x) => x.language === "DE") || namen[0];
      return { datum: (e.startDate || "").slice(0, 10), name: (de && de.text) || "Feiertag" };
    }).filter((x) => x.datum);

    try { await db.kv.put({ key, value: { liste, zeit: Date.now() } }); } catch (e) {}
    return liste;
  } catch (e) {
    return null;
  }
}
