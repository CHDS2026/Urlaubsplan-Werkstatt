/* ══════════════════════════ nadeln.js — Kartennadeln ══════════════════════════

   EINE gemeinsame Quelle für das Aussehen aller Karten-Nadeln. Reisekarte, Ideenkarte
   und Wegkarte importieren von hier, damit dieselbe Aktivität überall gleich aussieht
   (und es nicht wieder auseinanderläuft wie zwischen den alten Einzel-Definitionen).

   Jede Aktivität hat eine Farbe, ein Label und ein ERKENNBARES Symbol (Linien-Icon in
   Weiß auf farbiger Tropfen-Nadel): Wandern = Wanderer, Gipfel = Berg, Radtour = Fahrrad,
   Foto = Kamera, Aussicht = Fernglas, Essen = Besteck, Unterkunft = Bett, Baden = Welle,
   Kultur = Säule, sonst = Stern.

   Reines JS ohne JSX/React-Abhängigkeit – so lässt es sich in jede Karte einbinden und
   sogar außerhalb (Tests, Vorschau-Rendering) verwenden.

   API:
     KATEGORIEN            – Liste { key, label, farbe } (z. B. für Legenden)
     nadelInfo(kategorie)  – { farbe, label }  (mit Fallback auf „sehenswuerdigkeit")
     nadelSVG(kategorie, opts?) – kompletter <svg>-String der Nadel
         opts: { aktiv=false, size=28 }  (aktiv = größer + roter Schein für Auswahl)
*/

/* Symbol je Kategorie – gezeichnet im Nadelkopf um (9,9), Fläche ~ x:[4,14] y:[4,13].
   Weiße Linien, damit es auf jeder Farbe sitzt. Rein additiv gehaltene, einfache Formen,
   die auch bei ~16 px noch lesbar sind. */
const GLYPH = {
  // Wanderer mit Stock
  wanderung:
    '<circle cx="7.7" cy="5.4" r="1.05" fill="#fff"/>' +
    '<path d="M7.7 6.6 L8.5 9.4 M8.5 9.4 L7.2 12.7 M8.5 9.4 L10 12.4 M7.9 7.7 L10 8.7 M11.5 5.9 L11.7 12.7" fill="none" stroke="#fff" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>',
  // Berg mit zweiter Spitze (ohne farbige Innenlinie – funktioniert auf jeder Nadelfarbe)
  gipfel:
    '<path d="M3.9 12.9 L7.4 6.4 L9.4 9.5 L10.7 7.4 L14.1 12.9 Z" fill="#fff"/>',
  // Fahrrad
  radtour:
    '<g fill="none" stroke="#fff" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="5.9" cy="11.3" r="2.05"/><circle cx="12.1" cy="11.3" r="2.05"/>' +
    '<path d="M5.9 11.3 L8.7 11.3 L10.6 7.7 L7.6 7.7 M8.7 11.3 L10.6 7.7 M12.1 11.3 L10.6 7.7"/>' +
    '<path d="M6.7 7.7 h1.4"/></g>',
  // Kamera
  fotospot:
    '<g fill="none" stroke="#fff" stroke-width="1.2" stroke-linejoin="round">' +
    '<path d="M4.4 8.2 h2.1 l0.9 -1.2 h3.2 l0.9 1.2 h0.9 a0.9 0.9 0 01 0.9 0.9 v3.4 a0.9 0.9 0 01 -0.9 0.9 H4.4 a0.9 0.9 0 01 -0.9 -0.9 V9.1 a0.9 0.9 0 01 0.9 -0.9 Z"/>' +
    '<circle cx="9" cy="10.6" r="1.75"/></g>',
  // Fernglas
  aussicht:
    '<g fill="none" stroke="#fff" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M6.6 6.2 v2.2 M11.4 6.2 v2.2 M6.6 6.2 h1.3 M10.1 6.2 h1.3"/>' +
    '<circle cx="6.5" cy="10.6" r="2.15"/><circle cx="11.5" cy="10.6" r="2.15"/>' +
    '<path d="M8.55 9.9 h0.9"/></g>',
  // Besteck (Gabel + Messer)
  restaurant:
    '<g fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M6.4 5.4 v3 a1.1 1.1 0 002.2 0 v-3 M7.5 5.4 v7.4"/>' +
    '<path d="M11.4 5.4 c1.5 0.2 1.5 4.4 0 4.6 M11.4 10 v2.8"/></g>',
  // Bett
  hotel:
    '<g fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4.5 7.6 V12.8 M4.5 10.6 H13.5 V12.8 M13.5 10.6 V9.6"/>' +
    '<path d="M6.2 10.6 V9.3 a0.9 0.9 0 01 0.9 -0.9 H11 a0.9 0.9 0 01 0.9 0.9 v1.3"/></g>',
  // Welle (Baden / See)
  badesee:
    '<g fill="none" stroke="#fff" stroke-width="1.25" stroke-linecap="round">' +
    '<path d="M4.2 8.4 q1.2 -1.2 2.4 0 t2.4 0 t2.4 0 t2.4 0"/>' +
    '<path d="M4.2 11 q1.2 -1.2 2.4 0 t2.4 0 t2.4 0 t2.4 0"/></g>',
  // Säule (Kultur / Sehenswürdigkeit mit Gebäude)
  kultur:
    '<g fill="none" stroke="#fff" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M9 5 L13 7.4 H5 Z M5.6 7.8 V12 M8.2 7.8 V12 M9.8 7.8 V12 M12.4 7.8 V12 M4.6 12.6 H13.4"/></g>',
  // Stadt / Reiseziel – Skyline aus drei Häusern
  stadt:
    '<g fill="#fff">' +
    '<rect x="4.3" y="8.6" width="3" height="5" rx="0.3"/>' +
    '<rect x="7.6" y="6.2" width="3.2" height="7.4" rx="0.3"/>' +
    '<rect x="11.1" y="9.6" width="2.4" height="4" rx="0.3"/>' +
    "</g>",
  // Stern (Standard)
  sehenswuerdigkeit:
    '<path d="M9 5 L10.15 7.5 L12.9 7.85 L10.85 9.75 L11.4 12.5 L9 11.1 L6.6 12.5 L7.15 9.75 L5.1 7.85 L7.85 7.5 Z" fill="#fff"/>',
};

/* Farbe + Label je Kategorie. Reihenfolge = Legenden-Reihenfolge. */
const KATEGORIEN = [
  { key: "wanderung", label: "Wandertour", farbe: "#0f766e" },
  { key: "gipfel", label: "Gipfel / Berg", farbe: "#7c3aed" },
  { key: "radtour", label: "Radtour", farbe: "#0284c7" },
  { key: "aussicht", label: "Aussicht", farbe: "#ca8a04" },
  { key: "fotospot", label: "Fotospot", farbe: "#db2777" },
  { key: "badesee", label: "Baden / See", farbe: "#0891b2" },
  { key: "restaurant", label: "Essen", farbe: "#c2410c" },
  { key: "hotel", label: "Unterkunft", farbe: "#4f46e5" },
  { key: "kultur", label: "Kultur", farbe: "#78350f" },
  { key: "stadt", label: "Stadt / Ziel", farbe: "#dc2626" },
  { key: "sehenswuerdigkeit", label: "Sehenswürdigkeit", farbe: "#047857" },
];

const _MAP = Object.fromEntries(KATEGORIEN.map((k) => [k.key, k]));

function nadelInfo(kategorie) {
  return _MAP[kategorie] || _MAP.sehenswuerdigkeit;
}

/* Kompletter Nadel-SVG-String. Tropfenform + Symbol; bei aktiv größer und mit rotem
   Schein (passend zur roten Linie eines gewählten Verlaufs). Farbe bleibt die der
   Kategorie – sonst ginge die Unterscheidung bei Auswahl verloren. */
function nadelSVG(kategorie, opts) {
  const o = opts || {};
  const info = nadelInfo(kategorie);
  const glyph = GLYPH[info.key] || GLYPH.sehenswuerdigkeit;
  const farbe = o.farbe || info.farbe;   // Override, z. B. Farbe pro Reise auf der Übersicht
  const base = o.size || 28;
  const w = o.aktiv ? Math.round(base * 0.86) : Math.round(base * 0.72);
  const h = Math.round(w * 26 / 18);
  const schein = o.aktiv ? ' style="filter:drop-shadow(0 0 5px #be123c)"' : "";
  return (
    '<svg viewBox="0 0 18 26" width="' + w + '" height="' + h + '"' + schein + '>' +
    '<path d="M9 0C4 0 0 4 0 9c0 6.6 9 17 9 17s9-10.4 9-17c0-5-4-9-9-9z" fill="' + farbe + '" stroke="#fff" stroke-width="1.5"/>' +
    glyph +
    "</svg>"
  );
}

export { KATEGORIEN, nadelInfo, nadelSVG, GLYPH };
