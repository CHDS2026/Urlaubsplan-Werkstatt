/* ── Ortssuche (Photon, frei und ohne Schlüssel) ────────────────────────────
   Gemeinsame Fassung für Anreise, Bedingungen und Entdecken. Wirft, wenn nichts
   gefunden wird – der Text ist über `was` steuerbar, damit die bisherigen
   Meldungen ("Ziel …" bzw. "Ort … nicht gefunden") unverändert bleiben.
   Das Länderkürzel `cc` liefert diese Fassung immer mit; bisher tat das nur
   Bedingungen, ein zusätzliches Feld stört die anderen nicht.

   NICHT hierher gehört die Variante in Reisekarte.jsx: die puffert Ergebnisse
   und gibt bei Misserfolg `null` zurück statt zu werfen – anderer Vertrag. */

import { jget } from "./net.js";

const enc = encodeURIComponent;

export async function geocode(q, was = "Ort") {
  const j = await jget(`https://photon.komoot.io/api?q=${enc(q)}&limit=1&lang=de`);
  const f = j.features && j.features[0];
  if (!f || !f.geometry) throw new Error(was + " „" + q + "“ nicht gefunden.");
  const [lon, lat] = f.geometry.coordinates;
  const p = f.properties || {};
  return { lat, lon, label: [p.name, p.state, p.country].filter(Boolean).join(", ") || q, cc: (p.countrycode || "").toUpperCase() };
}
