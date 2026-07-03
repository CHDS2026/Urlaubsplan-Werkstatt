// Kuratierte Vorschläge statt KI. Erweiterbar: einfach neue Regionen ergänzen.
// Kategorien: sehenswuerdigkeit | fotospot | aussicht | wanderung | restaurant | hotel

export const SUGGESTIONS = {
  tirol: {
    sehenswuerdigkeit: [
      { name: "Swarovski Kristallwelten", gebiet: "Wattens", info: "Erlebniswelt & Gärten", maps_suche: "Swarovski Kristallwelten Wattens", kosten_ca: "23 €", wetter: "any" },
      { name: "Schloss Ambras", gebiet: "Innsbruck", info: "Renaissance-Schloss", maps_suche: "Schloss Ambras Innsbruck", kosten_ca: "12 €", wetter: "any" },
      { name: "Altstadt & Goldenes Dachl", gebiet: "Innsbruck", info: "historische Altstadt", maps_suche: "Goldenes Dachl Innsbruck", kosten_ca: "kostenlos", wetter: "any" },
    ],
    aussicht: [
      { name: "Nordkette / Hafelekar", gebiet: "Innsbruck", info: "Bergpanorama über der Stadt", maps_suche: "Hafelekar Nordkette Innsbruck", kosten_ca: "Bahn ca. 44 €", wetter: "sun" },
      { name: "Zisterne Achensee Aussicht", gebiet: "Achensee", info: "Blick über den See", maps_suche: "Achensee Aussichtspunkt", kosten_ca: "kostenlos", wetter: "sun" },
    ],
    wanderung: [
      { name: "Zirbenweg", gebiet: "Patscherkofel", info: "Höhenweg, ca. 7 km, leicht", maps_suche: "Zirbenweg Patscherkofel", kosten_ca: "Bahn", wetter: "sun" },
      { name: "Wolfsklamm", gebiet: "Stans", info: "Klammwanderung zu Kloster St. Georgenberg", maps_suche: "Wolfsklamm Stans", kosten_ca: "6 €", wetter: "sun" },
    ],
    restaurant: [
      { name: "Restaurant Schwarzer Adler", gebiet: "Innsbruck", info: "Tiroler Küche", maps_suche: "Schwarzer Adler Innsbruck Restaurant", kosten_ca: "20–35 €", wetter: "any" },
    ],
    fotospot: [
      { name: "Seegrube bei Sonnenuntergang", gebiet: "Nordkette", info: "goldene Stunde über Innsbruck", maps_suche: "Seegrube Innsbruck", kosten_ca: "Bahn", wetter: "sun" },
    ],
  },

  südtirol: {
    sehenswuerdigkeit: [
      { name: "Pragser Wildsee", gebiet: "Pragser Tal", info: "türkiser Bergsee", maps_suche: "Pragser Wildsee", kosten_ca: "Parkgebühr", wetter: "sun" },
      { name: "Drei Zinnen", gebiet: "Sextner Dolomiten", info: "Wahrzeichen der Dolomiten", maps_suche: "Drei Zinnen Umrundung", kosten_ca: "Mautstraße", wetter: "sun" },
      { name: "Altstadt Bozen & Ötzi-Museum", gebiet: "Bozen", info: "Archäologiemuseum", maps_suche: "Südtiroler Archäologiemuseum Bozen", kosten_ca: "13 €", wetter: "rain" },
    ],
    aussicht: [
      { name: "Seiser Alm", gebiet: "Kastelruth", info: "größte Hochalm Europas", maps_suche: "Seiser Alm", kosten_ca: "Bahn", wetter: "sun" },
    ],
    wanderung: [
      { name: "Tre Cime Runde", gebiet: "Dolomiten", info: "ca. 10 km, mittel", maps_suche: "Drei Zinnen Rundweg", kosten_ca: "Maut", wetter: "sun" },
    ],
    restaurant: [
      { name: "Hopfen & Co.", gebiet: "Bozen", info: "Brauhaus, Südtiroler Küche", maps_suche: "Hopfen und Co Bozen", kosten_ca: "18–30 €", wetter: "any" },
    ],
    fotospot: [
      { name: "Pragser Wildsee Bootssteg", gebiet: "Pragser Tal", info: "Klassiker früh morgens", maps_suche: "Pragser Wildsee Bootssteg", kosten_ca: "-", wetter: "sun" },
    ],
  },

  gardasee: {
    sehenswuerdigkeit: [
      { name: "Altstadt Malcesine & Scaligerburg", gebiet: "Malcesine", info: "Burg am See", maps_suche: "Scaligerburg Malcesine", kosten_ca: "6 €", wetter: "any" },
      { name: "Limone sul Garda", gebiet: "Limone", info: "malerischer Ort, Zitronengärten", maps_suche: "Limone sul Garda", kosten_ca: "kostenlos", wetter: "sun" },
      { name: "Grotten des Catull", gebiet: "Sirmione", info: "römische Ausgrabung", maps_suche: "Grotte di Catullo Sirmione", kosten_ca: "8 €", wetter: "sun" },
    ],
    aussicht: [
      { name: "Monte Baldo", gebiet: "Malcesine", info: "Seilbahn aufs Bergmassiv", maps_suche: "Monte Baldo Seilbahn Malcesine", kosten_ca: "22 €", wetter: "sun" },
    ],
    wanderung: [
      { name: "Ponale-Weg", gebiet: "Riva del Garda", info: "Panoramaweg über dem See", maps_suche: "Ponale Riva del Garda", kosten_ca: "kostenlos", wetter: "sun" },
    ],
    restaurant: [
      { name: "Trattoria am Hafen", gebiet: "Bardolino", info: "Seeblick, italienisch", maps_suche: "Trattoria Bardolino Hafen", kosten_ca: "20–35 €", wetter: "any" },
    ],
    fotospot: [
      { name: "Sirmione Landzunge", gebiet: "Sirmione", info: "Blick über die Halbinsel", maps_suche: "Sirmione Punta", kosten_ca: "-", wetter: "sun" },
    ],
  },

  teneriffa: {
    sehenswuerdigkeit: [
      { name: "Teide Nationalpark", gebiet: "Zentrum", info: "höchster Berg Spaniens", maps_suche: "Teide Nationalpark", kosten_ca: "Seilbahn ca. 40 €", wetter: "sun" },
      { name: "Altstadt La Laguna", gebiet: "La Laguna", info: "UNESCO-Altstadt", maps_suche: "La Laguna Altstadt", kosten_ca: "kostenlos", wetter: "any" },
      { name: "Loro Parque", gebiet: "Puerto de la Cruz", info: "Tier- & Themenpark", maps_suche: "Loro Parque Teneriffa", kosten_ca: "38 €", wetter: "any" },
    ],
    aussicht: [
      { name: "Mirador de la Garañona", gebiet: "El Sauzal", info: "Steilküsten-Blick", maps_suche: "Mirador Garañona El Sauzal", kosten_ca: "kostenlos", wetter: "sun" },
    ],
    wanderung: [
      { name: "Masca-Schlucht", gebiet: "Masca", info: "spektakuläre Schlucht (Anmeldung nötig)", maps_suche: "Masca Schlucht Teneriffa", kosten_ca: "ca. 10 €", wetter: "sun" },
    ],
    restaurant: [
      { name: "Guachinche (lokal)", gebiet: "Norden", info: "typisch kanarisch, günstig", maps_suche: "Guachinche Teneriffa Norden", kosten_ca: "10–18 €", wetter: "any" },
    ],
    fotospot: [
      { name: "Playa de Benijo", gebiet: "Anaga", info: "wilde Küste, Sonnenuntergang", maps_suche: "Playa de Benijo", kosten_ca: "-", wetter: "sun" },
    ],
  },

  schwarzwald: {
    sehenswuerdigkeit: [
      { name: "Triberger Wasserfälle", gebiet: "Triberg", info: "höchste Wasserfälle Deutschlands", maps_suche: "Triberger Wasserfälle", kosten_ca: "9 €", wetter: "any" },
      { name: "Freiburg Altstadt & Münster", gebiet: "Freiburg", info: "Bächle, Münster", maps_suche: "Freiburg Münster Altstadt", kosten_ca: "kostenlos", wetter: "any" },
    ],
    aussicht: [
      { name: "Feldberg", gebiet: "Feldberg", info: "höchster Gipfel", maps_suche: "Feldberg Schwarzwald Gipfel", kosten_ca: "Bahn", wetter: "sun" },
    ],
    wanderung: [
      { name: "Wutachschlucht", gebiet: "Bonndorf", info: "Schluchtwanderung", maps_suche: "Wutachschlucht", kosten_ca: "kostenlos", wetter: "sun" },
    ],
    restaurant: [
      { name: "Badische Weinstube", gebiet: "Freiburg", info: "regionale Küche", maps_suche: "Badische Weinstube Freiburg", kosten_ca: "18–30 €", wetter: "any" },
    ],
    fotospot: [
      { name: "Mummelsee", gebiet: "Seebach", info: "Karsee an der Schwarzwaldhochstraße", maps_suche: "Mummelsee", kosten_ca: "-", wetter: "sun" },
    ],
  },

  harz: {
    sehenswuerdigkeit: [
      { name: "Brocken", gebiet: "Wernigerode", info: "höchster Gipfel, Brockenbahn", maps_suche: "Brocken Harz", kosten_ca: "Bahn ca. 52 €", wetter: "any" },
      { name: "Schloss Wernigerode", gebiet: "Wernigerode", info: "Schloss über der Stadt", maps_suche: "Schloss Wernigerode", kosten_ca: "8 €", wetter: "any" },
    ],
    aussicht: [
      { name: "Hexentanzplatz", gebiet: "Thale", info: "Blick ins Bodetal", maps_suche: "Hexentanzplatz Thale", kosten_ca: "kostenlos", wetter: "sun" },
    ],
    wanderung: [
      { name: "Bodetal (Thale–Treseburg)", gebiet: "Thale", info: "ca. 10 km, mittel, Schluchtweg", maps_suche: "Bodetal Wanderung Thale Treseburg", kosten_ca: "kostenlos", wetter: "sun" },
    ],
    restaurant: [
      { name: "Brauhaus Wernigerode", gebiet: "Wernigerode", info: "deftig, regional", maps_suche: "Brauhaus Wernigerode", kosten_ca: "15–28 €", wetter: "any" },
    ],
    fotospot: [
      { name: "Rosstrappe", gebiet: "Thale", info: "Felskanzel überm Bodetal", maps_suche: "Rosstrappe Thale", kosten_ca: "-", wetter: "sun" },
    ],
  },

  mallorca: {
    sehenswuerdigkeit: [
      { name: "Kathedrale La Seu", gebiet: "Palma", info: "gotische Kathedrale", maps_suche: "Kathedrale La Seu Palma", kosten_ca: "10 €", wetter: "any" },
      { name: "Valldemossa", gebiet: "Serra de Tramuntana", info: "Bergdorf", maps_suche: "Valldemossa", kosten_ca: "kostenlos", wetter: "sun" },
    ],
    aussicht: [
      { name: "Cap de Formentor", gebiet: "Norden", info: "Leuchtturm, Steilküste", maps_suche: "Cap de Formentor", kosten_ca: "kostenlos", wetter: "sun" },
    ],
    wanderung: [
      { name: "Torrent de Pareis", gebiet: "Sa Calobra", info: "Schlucht zum Meer", maps_suche: "Torrent de Pareis", kosten_ca: "kostenlos", wetter: "sun" },
    ],
    restaurant: [
      { name: "Mercat de l'Olivar", gebiet: "Palma", info: "Markt mit Tapas", maps_suche: "Mercat Olivar Palma", kosten_ca: "12–25 €", wetter: "any" },
    ],
    fotospot: [
      { name: "Sa Calobra Serpentine", gebiet: "Tramuntana", info: "berühmte Straßenschleife", maps_suche: "Sa Calobra Straße", kosten_ca: "-", wetter: "sun" },
    ],
  },

  amsterdam: {
    sehenswuerdigkeit: [
      { name: "Rijksmuseum", gebiet: "Amsterdam", info: "Kunstmuseum", maps_suche: "Rijksmuseum Amsterdam", kosten_ca: "22,50 €", wetter: "rain" },
      { name: "Anne-Frank-Haus", gebiet: "Amsterdam", info: "Gedenkstätte (früh buchen)", maps_suche: "Anne Frank Huis Amsterdam", kosten_ca: "16 €", wetter: "rain" },
      { name: "Grachtenfahrt", gebiet: "Amsterdam", info: "Bootstour", maps_suche: "Grachtenfahrt Amsterdam", kosten_ca: "18 €", wetter: "any" },
    ],
    aussicht: [
      { name: "A'DAM Lookout", gebiet: "Amsterdam-Noord", info: "Aussichtsplattform", maps_suche: "A'DAM Lookout Amsterdam", kosten_ca: "16,50 €", wetter: "any" },
    ],
    wanderung: [
      { name: "Vondelpark Runde", gebiet: "Amsterdam", info: "Stadtpark-Spaziergang", maps_suche: "Vondelpark Amsterdam", kosten_ca: "kostenlos", wetter: "sun" },
    ],
    restaurant: [
      { name: "Foodhallen", gebiet: "Amsterdam-West", info: "Streetfood-Halle", maps_suche: "Foodhallen Amsterdam", kosten_ca: "12–22 €", wetter: "rain" },
    ],
    fotospot: [
      { name: "Papeneiland Gracht", gebiet: "Jordaan", info: "typische Grachtenkulisse", maps_suche: "Papeneiland Amsterdam", kosten_ca: "-", wetter: "any" },
    ],
  },
};

// Synonyme / Teiltreffer auf einen SUGGESTIONS-Schlüssel abbilden
const ALIASES = [
  ["südtirol", "südtirol"], ["suedtirol", "südtirol"], ["dolomiten", "südtirol"], ["bozen", "südtirol"],
  ["tirol", "tirol"], ["innsbruck", "tirol"], ["zillertal", "tirol"], ["achensee", "tirol"], ["stans", "tirol"], ["ötztal", "tirol"], ["stubaital", "tirol"],
  ["gardasee", "gardasee"], ["garda", "gardasee"],
  ["teneriffa", "teneriffa"], ["tenerife", "teneriffa"],
  ["schwarzwald", "schwarzwald"], ["freiburg", "schwarzwald"],
  ["harz", "harz"], ["thale", "harz"], ["wernigerode", "harz"], ["bodetal", "harz"],
  ["mallorca", "mallorca"], ["palma", "mallorca"],
  ["amsterdam", "amsterdam"], ["niederlande", "amsterdam"],
];

export function getSuggestions(regionLabel) {
  const s = (regionLabel || "").toLowerCase();
  if (!s.trim()) return null;
  for (const [needle, key] of ALIASES) {
    if (s.includes(needle) && SUGGESTIONS[key]) return { key, data: SUGGESTIONS[key] };
  }
  return null;
}

export const availableRegions = Object.keys(SUGGESTIONS);

// ---------- Packlisten-Bausteine (statt KI) ----------
const PACK = {
  allgemein: ["Ausweis / Reisepass", "Bargeld & Karte", "Ladekabel & Powerbank", "Zahnbürste & Kulturbeutel", "Medikamente", "Kopfhörer", "Trinkflasche", "Sonnenbrille"],
  wandern: ["Wanderschuhe", "Regenjacke", "Wanderrucksack", "Blasenpflaster", "Wandersocken", "Müsliriegel"],
  strand: ["Badesachen", "Handtuch", "Sonnencreme", "Flip-Flops", "Strandtasche", "After-Sun"],
  sommer: ["Sonnencreme", "Kopfbedeckung", "leichte Kleidung", "Mückenspray"],
  winter: ["warme Jacke", "Mütze & Handschuhe", "Thermounterwäsche", "Lippenpflege", "warme Schuhe"],
  flug: ["Reisedokumente ausgedruckt", "Handgepäck-Flüssigkeiten (100 ml)", "Reiseadapter", "Nackenkissen"],
  auto: ["Führerschein", "Warnwesten", "Vignette (falls nötig)", "Snacks für unterwegs"],
};

// Monat 5–9 = warm, 11–3 = kalt (grobe Heuristik)
export function suggestPacking(trip) {
  const out = new Set(PACK.allgemein);
  const month = trip.start && /^\d{4}-\d{2}-\d{2}$/.test(trip.start) ? Number(trip.start.slice(5, 7)) : null;
  if (month !== null) {
    if (month >= 5 && month <= 9) PACK.sommer.forEach((x) => out.add(x));
    if (month === 12 || month <= 3) PACK.winter.forEach((x) => out.add(x));
  }
  if (trip.anreiseart === "flug") PACK.flug.forEach((x) => out.add(x));
  if (trip.anreiseart === "auto") PACK.auto.forEach((x) => out.add(x));
  const kats = new Set((trip.items || []).map((i) => i.kategorie));
  if (kats.has("wanderung")) PACK.wandern.forEach((x) => out.add(x));
  const reg = ((trip.region || "") + " " + (trip.land || "")).toLowerCase();
  if (/(teneriffa|mallorca|garda|strand|see)/.test(reg)) PACK.strand.forEach((x) => out.add(x));
  return Array.from(out);
}
