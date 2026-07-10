// Sehenswürdigkeiten aus OpenStreetMap (Overpass API) – kostenlos, ohne API-Key.
// Ergebnisse werden lokal (Dexie) zwischengespeichert: schneller + offline nutzbar.
// Attribution "© OpenStreetMap-Mitwirkende" ist Pflicht und wird in der UI angezeigt.

import { db } from "./db.js";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const PHOTON = "https://photon.komoot.io/api/";

// Kategorien -> Overpass-Filter (Knoten + Wege)
export const POI_KATEGORIEN = [
  { key: "sehenswuerdigkeit", label: "Sehenswürdigkeiten", filters: ['["tourism"="attraction"]', '["tourism"="museum"]', '["historic"="castle"]', '["historic"="monument"]'] },
  { key: "aussicht", label: "Aussichtspunkte", filters: ['["tourism"="viewpoint"]'] },
  { key: "restaurant", label: "Restaurants", filters: ['["amenity"="restaurant"]'] },
  { key: "wanderung", label: "Wanderungen", filters: ['["tourism"="alpine_hut"]', '["natural"="peak"]', '["waterway"="waterfall"]'] },
];

const catByKey = (k) => POI_KATEGORIEN.find((c) => c.key === k) || POI_KATEGORIEN[0];

// Bekannte Regionen mit Koordinaten (spart die Geokodierung)
const BEKANNTE_REGIONEN = {
  tirol: [47.26, 11.39], innsbruck: [47.27, 11.39], zillertal: [47.20, 11.86], achensee: [47.45, 11.72],
  suedtirol: [46.65, 11.45], "südtirol": [46.65, 11.45], dolomiten: [46.55, 11.85], bozen: [46.50, 11.35],
  gardasee: [45.70, 10.72], teneriffa: [28.29, -16.62], mallorca: [39.60, 2.95],
  schwarzwald: [48.10, 8.20], harz: [51.75, 10.60], amsterdam: [52.37, 4.90],
  paris: [48.86, 2.35], rom: [41.90, 12.50], wien: [48.21, 16.37], prag: [50.08, 14.44],
  barcelona: [41.39, 2.17], lissabon: [38.72, -9.14], london: [51.51, -0.13], venedig: [45.44, 12.33],
};

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/* Koordinaten zu einem Ort/Region ermitteln (erst bekannte Liste, dann Photon) */
export async function findeKoordinaten(ortText) {
  const t = norm(ortText);
  if (!t) return null;
  for (const key of Object.keys(BEKANNTE_REGIONEN)) {
    if (t.includes(norm(key))) return BEKANNTE_REGIONEN[key];
  }
  try {
    const r = await fetch(`${PHOTON}?q=${encodeURIComponent(ortText)}&lang=de&limit=1`);
    if (!r.ok) return null;
    const j = await r.json();
    const f = j.features && j.features[0];
    if (f && f.geometry && Array.isArray(f.geometry.coordinates)) {
      const [lon, lat] = f.geometry.coordinates;
      return [lat, lon];
    }
  } catch (e) { /* offline o. ä. */ }
  return null;
}

const cacheKey = (kat, lat, lon, radiusKm) => `poi:${kat}:${lat.toFixed(2)}:${lon.toFixed(2)}:${radiusKm}`;

async function readCache(key) {
  try {
    const rec = await db.kv.get(key);
    if (rec && rec.value && Array.isArray(rec.value.items)) {
      const alter = Date.now() - (rec.value.zeit || 0);
      if (alter < 1000 * 60 * 60 * 24 * 30) return rec.value.items; // 30 Tage frisch
    }
  } catch (e) {}
  return null;
}
async function writeCache(key, items) {
  try { await db.kv.put({ key, value: { items, zeit: Date.now() } }); } catch (e) {}
}

/* POIs laden – nutzt Cache, sonst Overpass */
export async function ladePOIs(katKey, lat, lon, radiusKm = 25, limit = 40) {
  const kat = catByKey(katKey);
  const key = cacheKey(kat.key, lat, lon, radiusKm);
  const cached = await readCache(key);
  if (cached) return { items: cached, ausCache: true };

  const r = Math.round(radiusKm * 1000);
  const teile = kat.filters.map((f) => `node${f}(around:${r},${lat},${lon});way${f}(around:${r},${lat},${lon});`).join("");
  const query = `[out:json][timeout:25];(${teile});out center ${limit};`;

  const res = await fetch(OVERPASS, { method: "POST", body: "data=" + encodeURIComponent(query), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  if (!res.ok) throw new Error(res.status === 429 ? "Server ausgelastet – bitte kurz warten." : "Abfrage fehlgeschlagen.");
  const j = await res.json();

  const items = (j.elements || [])
    .map((el) => {
      const t = el.tags || {};
      const plat = el.lat != null ? el.lat : (el.center && el.center.lat);
      const plon = el.lon != null ? el.lon : (el.center && el.center.lon);
      if (!t.name || plat == null) return null;
      return {
        osmId: `${el.type}/${el.id}`,
        name: t.name,
        kategorie: kat.key,
        gebiet: t["addr:city"] || t["addr:suburb"] || "",
        info: [t.description, t.tourism === "viewpoint" ? "Aussichtspunkt" : "", t.historic ? "historisch" : "", t.ele ? `${t.ele} m` : ""].filter(Boolean).join(" · "),
        oeffnung: t.opening_hours || "",
        website: t.website || t["contact:website"] || "",
        lat: plat, lon: plon,
      };
    })
    .filter(Boolean);

  // Doppelte Namen entfernen
  const gesehen = new Set();
  const unique = items.filter((i) => { const k = i.name.toLowerCase(); if (gesehen.has(k)) return false; gesehen.add(k); return true; });

  await writeCache(key, unique);
  return { items: unique, ausCache: false };
}

export const osmMapsUrl = (i) => `https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lon}`;

/* ─────────── Freie Ortssuche & Rückwärts-Suche (Photon, kostenlos, kein Schlüssel) ─────────── */

const beschreibung = (p) => {
  const teile = [p.street, p.city || p.town || p.village, p.state, p.country].filter(Boolean);
  const typ = p.osm_value && p.osm_value !== "yes" ? p.osm_value : "";
  return [typ, teile.join(", ")].filter(Boolean).join(" · ");
};

/**
 * Freie Suche nach Orten/POIs. Optional um Koordinaten herum gewichtet.
 * @returns [{ name, info, lat, lon }]
 */
export async function sucheOrte(text, nahLat, nahLon, limit = 8) {
  const q = (text || "").trim();
  if (q.length < 2) return [];
  try {
    let url = `${PHOTON}?q=${encodeURIComponent(q)}&lang=de&limit=${limit}`;
    if (nahLat != null && nahLon != null) url += `&lat=${nahLat}&lon=${nahLon}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.features || [])
      .filter((f) => f.geometry && Array.isArray(f.geometry.coordinates))
      .map((f) => {
        const p = f.properties || {};
        const [lon, lat] = f.geometry.coordinates;
        return { name: p.name || p.street || "Ort", info: beschreibung(p), lat, lon };
      });
  } catch (e) { return []; }
}

/** Was liegt an dieser Koordinate? (für „Punkt auf Karte setzen") */
export async function reverseSuche(lat, lon) {
  try {
    const r = await fetch(`${PHOTON}reverse?lat=${lat}&lon=${lon}&lang=de&limit=1`);
    if (!r.ok) return null;
    const j = await r.json();
    const f = j.features && j.features[0];
    if (!f) return null;
    const p = f.properties || {};
    return { name: p.name || p.street || "Eigener Punkt", info: beschreibung(p) };
  } catch (e) { return null; }
}
