/* ── Luftlinie zwischen zwei Punkten (Haversine, Erdradius 6371 km) ─────────
   Lag sechsmal im Projekt, unter drei Namen (haversine / havKm / dist) und in
   zwei verschieden geschriebenen, aber rechnerisch identischen Fassungen.

   Wichtig: Anreise und Entdecken rundeten das Ergebnis auf ganze Kilometer,
   die übrigen nicht. Damit sich keine angezeigte Zahl ändert, gibt es beide
   Varianten getrennt – nicht eine, die es allen recht macht. */

export function abstandKm(aLat, aLon, bLat, bLon) {
  const R = 6371, r = Math.PI / 180;
  const dLa = (bLat - aLat) * r, dLo = (bLon - aLon) * r;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* Gleiche Rechnung für Objekte mit { lat, lon }. */
export const abstandKmPunkte = (a, b) => abstandKm(a.lat, a.lon, b.lat, b.lon);

/* Auf ganze Kilometer gerundet – für Anreise und Entdecken. */
export const abstandKmGerundet = (aLat, aLon, bLat, bLon) => Math.round(abstandKm(aLat, aLon, bLat, bLon));
