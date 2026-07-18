/*
  Rundwege.jsx — Schöne Touren: Wandern, Radfahren & Gipfel
  -----------------------------------------------------------
  „Favoriten" ist ein Urteil – deshalb NICHT mein Geschmack, sondern belegte Quellen:
   ZU FUSS: Publikumswahl „Deutschlands Schönster Wanderweg" (Wandermagazin, seit 2006;
     2026 mit 52.911 Stimmen, Finalisten von einer Fachjury aus über 100 Bewerbungen).
   RAD: ADFC-Radreiseanalyse (jährliche Umfrage, zuletzt über 17.300 Radfahrende).
     Das sind RADFERNWEGE (hunderte km), keine 20-km-Runden – ein Gegenstück zur
     DSW-Wahl gibt es fürs Rad nicht. Platzierungen wechseln jährlich -> nur die
     Auszeichnung, keine erfundene Position.

  WICHTIG – Architektur (nach zwei Fehlversuchen):
   Die Liste ist kuratiert und braucht KEIN Netz -> sie steht sofort da.
   Der Verlauf wird ERST BEIM ANTIPPEN geladen, und zwar so:
     1. Region per Photon geokodieren (frei, schnell)  -> ungefährer Punkt
     2. Overpass NUR in einem kleinen Kasten um diesen Punkt nach dem Namen fragen
   Vorher wurden alle 26 Routen auf einmal aus ganz Deutschland geholt. Overpass musste
   dafür entweder alle Routen weltweit durchsuchen oder für jede die Lage auflösen –
   der freie Server brach ab und der Browser meldete nur "Failed to fetch".
   Eine Route in einem kleinen Kasten ist dagegen eine Sekundensache.

  Kuratiert sind nur Name, Bundesland und Auszeichnung. Alles Zahlenmäßige kommt live:
   • Verlauf & Länge -> OpenStreetMap/Overpass (aus der Geometrie berechnet, ODbL)
   • Rundweg         -> aus dem Verlauf erkannt (Start ≈ Ziel), nicht aus dem Tag
   • Höhenmeter      -> Open-Meteo Elevation (90-m-Modell, Copernicus DEM) = Schätzung
   • Gehzeit         -> DIN 33466 aus Länge + berechnetem Aufstieg

   GIPFEL: dritte Art, aber bewusst ANDERS gebaut – siehe den Block weiter unten.
     Für Gipfel gibt es keine Publikumswahl wie DSW/ADFC. Eine kuratierte Liste wäre
     hier also wieder mein Geschmack. Deshalb: Suche nach einem belegten Kriterium
     (OSM sac_scale) statt einer Favoritenliste.

  EINBAU: <Rundwege onAdd={…} onCreateTrip={…} trips={…} onAddToTrip={…} />
*/
import React, { useState, useMemo, useEffect } from "react";
import { Award, Loader2, Info, Plus, Check, CalendarPlus, X, Clock, Repeat, Ruler, MapPin, TrendingUp, ExternalLink, Search, Footprints, Bike, Mountain, Route as RouteIcon } from "lucide-react";
import Wegkarte from "./Wegkarte.jsx";

const MAX_KM = 20;

const BL = ["Baden-Württemberg", "Bayern", "Brandenburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"];

/* q = Suchbegriff für OSM (Regex, i) – der markanteste Namensteil. */
const FUSS = [
  /* --- Tagestouren-SIEGER (Quelle: Wandermagazin, offizielle Gewinner-Sammlung) --- */
  { q: "Wildes.?Wasser.?Weg", n: "Wildes-Wasser-Weg Bodenmais", r: "Bodenmais, Bayerischer Wald", bl: "Bayern", a: "DSW-Sieger 2026", top: true },
  { q: "Caspar-?David-?Friedrich-?Weg", n: "Caspar-David-Friedrich-Weg", r: "Sächsische Schweiz", bl: "Sachsen", a: "DSW-Sieger 2025", top: true },
  { q: "Osterspaier Langhalsweg|Langhalsweg", n: "Osterspaier Langhalsweg", r: "Osterspai, Mittelrhein", bl: "Rheinland-Pfalz", a: "DSW-Sieger 2024", top: true },
  { q: "Wasserfall-?Erlebnisroute", n: "HeimatSpur Wasserfall-Erlebnisroute", r: "Vulkaneifel", bl: "Rheinland-Pfalz", a: "DSW-Sieger 2023", top: true },
  { q: "Gipfel-? ?und Aussichtstour|Bad Tabarz", n: "Rundwanderweg 1 – Gipfel- und Aussichtstour", r: "Bad Tabarz, Thüringer Wald", bl: "Thüringen", a: "DSW-Sieger 2022", top: true },
  { q: "Dör't Moor|Doer't Moor|NORDPFAD Dör", n: "NORDPFAD Dör't Moor", r: "Rotenburg (Wümme)", bl: "Niedersachsen", a: "DSW-Sieger 2021", top: true },
  { q: "Belchensteig", n: "Genießerpfad Belchensteig", r: "Schönau, Schwarzwald", bl: "Baden-Württemberg", a: "DSW-Sieger 2020", top: true },
  { q: "Wasserfallsteig", n: "Wasserfallsteig Bad Urach", r: "Bad Urach, Schwäbische Alb", bl: "Baden-Württemberg", a: "DSW-Sieger 2016", top: true },

  /* --- Weitere Gewinnerwege (Tagestouren) --- */
  { q: "Büsenbachtal", n: "Heideschleife Büsenbachtal", r: "Handeloh, Lüneburger Heide", bl: "Niedersachsen", a: "DSW 2025, Platz 2" },
  { q: "Auenlandweg", n: "Auenlandweg (Erlebniswege Sieg)", r: "Siegtal, Westerwald", bl: "Rheinland-Pfalz", a: "DSW 2023, Platz 2" },
  { q: "Lecker Pfädchen", n: "Lecker Pfädchen", r: "Hunsrück", bl: "Rheinland-Pfalz", a: "DSW 2023, Platz 3" },
  { q: "VulkaMaar-?Pfad", n: "VulkaMaar-Pfad", r: "Vulkaneifel", bl: "Rheinland-Pfalz", a: "DSW-Gewinnerweg 2021" },
  { q: "wilde Endert", n: "Die wilde Endert", r: "Cochem, Eifel", bl: "Rheinland-Pfalz", a: "DSW-Gewinnerweg 2019" },
  { q: "Aulheimer Tal", n: "Hiwweltour Aulheimer Tal", r: "Rheinhessen", bl: "Rheinland-Pfalz", a: "DSW-Gewinnerweg" },
  { q: "Teufelsschlucht|Felsenweg 6", n: "Felsenweg 6 – Teufelsschlucht", r: "Ernzen, Südeifel", bl: "Rheinland-Pfalz", a: "DSW-Gewinnerweg" },
  { q: "Kaiserstuhlpfad", n: "Kaiserstuhlpfad", r: "Kaiserstuhl", bl: "Baden-Württemberg", a: "DSW-Gewinnerweg" },

  /* --- DSW-Finalisten 2026 (Fachjury aus über 100 Bewerbungen) --- */
  { q: "hochgehpilgert", n: "Hochgehberge – hochgehpilgert", r: "Schwäbische Alb", bl: "Baden-Württemberg", a: "DSW-Finalist 2026" },
  { q: "MaareGlück|Maaregluck", n: "HeimatSpur MaareGlück", r: "Daun, Eifel", bl: "Rheinland-Pfalz", a: "DSW-Finalist 2026" },
  { q: "Felsenwald", n: "Felsenwald", r: "Dahner Felsenland, Pfalz", bl: "Rheinland-Pfalz", a: "DSW-Finalist 2026" },
  { q: "Eichstätter Panoramaweg", n: "Eichstätter Panoramaweg", r: "Eichstätt, Altmühltal", bl: "Bayern", a: "DSW-Finalist 2026" },
  { q: "Pfälzer Hüttentour", n: "Pfälzer Hüttentour", r: "Pfälzerwald", bl: "Rheinland-Pfalz", a: "DSW-Finalist 2026" },
  { q: "Wurzacher Ried|Moor-Weg", n: "Moor-Weg – Ried pur erleben", r: "Bad Wurzach", bl: "Baden-Württemberg", a: "DSW-Finalist 2026" },
  { q: "Tecklenburger Bergpfad", n: "Teutoschleife Tecklenburger Bergpfad", r: "Tecklenburg", bl: "Nordrhein-Westfalen", a: "DSW-Finalist 2026" },
  { q: "Altlayer", n: "Traumschleife Altlayer Schweiz", r: "Altlay, Hunsrück", bl: "Rheinland-Pfalz", a: "DSW-Finalist 2026" },
  { q: "Nehmtener Horn", n: "Rundweg Nehmtener Horn", r: "Plön, Holsteinische Schweiz", bl: "Schleswig-Holstein", a: "DSW-Finalist 2026" },

  /* --- DSW 2023, Plätze 4–15 --- */
  { q: "hochgehadelt", n: "Hochgehberge – hochgehadelt", r: "Schwäbische Alb", bl: "Baden-Württemberg", a: "DSW 2023, Platz 4" },
  { q: "Spittergrund", n: "Rundweg Spittergrund", r: "Tambach-Dietharz, Thüringer Wald", bl: "Thüringen", a: "DSW 2023, Platz 5" },
  { q: "Hahnfels", n: "Hahnfels-Tour", r: "Pfälzerwald", bl: "Rheinland-Pfalz", a: "DSW 2023, Platz 6" },
  { q: "Blaubeer", n: "Blaubeer-Route", r: "Teutoburger Wald", bl: "Nordrhein-Westfalen", a: "DSW 2023, Platz 7" },
  { q: "Karlsruher Grat", n: "Genießerpfad Karlsruher Grat", r: "Ottenhöfen, Schwarzwald", bl: "Baden-Württemberg", a: "DSW 2023, Platz 8" },
  { q: "Extratour Michelsberg", n: "Extratour Michelsberg", r: "Münnerstadt, Rhön", bl: "Bayern", a: "DSW 2023, Platz 9" },
  { q: "Leitzachtaler", n: "Leitzachtaler Bergblicke", r: "Fischbachau, Bayerische Voralpen", bl: "Bayern", a: "DSW 2023, Platz 10" },
  { q: "3-?Schluchten|Drei-?Schluchten", n: "Genießerpfad 3-Schluchten-Tour", r: "Hornberg, Schwarzwald", bl: "Baden-Württemberg", a: "DSW 2023, Platz 11" },
  { q: "Gipfelwanderweg", n: "Gipfelwanderweg Suhl", r: "Suhl, Thüringer Wald", bl: "Thüringen", a: "DSW 2023, Platz 12" },
  { q: "Steinway", n: "Steinway-Trail", r: "Seesen, Harz", bl: "Niedersachsen", a: "DSW 2023, Platz 13" },
  { q: "Durbacher Weitblick", n: "Genießerpfad Durbacher Weitblick", r: "Durbach, Schwarzwald", bl: "Baden-Württemberg", a: "DSW 2023, Platz 14" },
  { q: "Treidlerweg", n: "Treidlerweg", r: "Pfalz", bl: "Rheinland-Pfalz", a: "DSW 2023, Platz 15" },

  /* --- Heideschleifen: zertifizierte Qualitäts-RUNDWEGE am Heidschnuckenweg (seit 2021,
     12 Stück, 1,4–20,9 km). KEIN Publikumsvoting wie DSW – aber auch nicht mein Geschmack,
     sondern eine offizielle Auszeichnung. Aufgenommen sind nur die im Naturpark Südheide
     (Landkreis Celle), deren Namen belegt sind; die vollständigen 23 Südheide-Touren stehen
     auf region-celle-navigator.de. Länge/Verlauf kommen wie überall live aus OSM. --- */
  { q: "Heideschleife Müden|Heideschleife Mueden", n: "Heideschleife Müden (Örtze)", r: "Müden, Örtze", bl: "Niedersachsen", a: "Heideschleife · Qualitätsrundweg" },
  { q: "Heideschleife Misselhorner|Misselhorner Heide", n: "Heideschleife Misselhorner Heide", r: "Hermannsburg", bl: "Niedersachsen", a: "Heideschleife · Qualitätsrundweg" },
];

/* Rad: ADFC-Radreiseanalyse. Radfernwege – keine Rundwege, hunderte Kilometer.
   Platzierungen wechseln jährlich -> bewusst keine Position, nur die Auszeichnung. */
const RAD = [
  { q: "Weser-?Radweg", n: "Weser-Radweg", r: "Weserbergland → Nordsee", bl: "Niedersachsen", a: "ADFC-Top-Radfernweg", top: true },
  { q: "Elberadweg|Elbe-?Radweg", n: "Elberadweg", r: "Sachsen → Nordsee", bl: "Sachsen", a: "ADFC-Top-Radfernweg", top: true },
  { q: "Ostseeküsten-?Radweg", n: "Ostseeküsten-Radweg", r: "Ostseeküste", bl: "Mecklenburg-Vorpommern", a: "ADFC-Top-Radfernweg", top: true },
  { q: "Rheinradweg|Rhein-?Radweg", n: "Rhein-Radweg", r: "Bodensee → Nordsee", bl: "Rheinland-Pfalz", a: "ADFC-Top-Radfernweg" },
  { q: "Main-?Radweg", n: "Main-Radweg", r: "Franken → Hessen", bl: "Bayern", a: "ADFC 2026, Platz 6" },
  { q: "RuhrtalRadweg|Ruhrtal-?Radweg", n: "RuhrtalRadweg", r: "Sauerland → Ruhrgebiet", bl: "Nordrhein-Westfalen", a: "ADFC-Top-Radfernweg" },
  { q: "EmsRadweg|Ems-?Radweg", n: "EmsRadweg", r: "Münsterland → Emsland", bl: "Nordrhein-Westfalen", a: "ADFC-Top-Radfernweg" },
  { q: "Mosel-?Radweg", n: "Mosel-Radweg", r: "Mosel", bl: "Rheinland-Pfalz", a: "ADFC-Top-Radfernweg" },
  { q: "Fünf-?Flüsse-?Radweg|Funf-?Flusse-?Radweg", n: "Fünf-Flüsse-Radweg", r: "Nürnberg / Altmühltal", bl: "Bayern", a: "ADFC 2026, Platz 10 · Rundtour", top: true },

  /* Region Celle: der Aller-Radweg führt auf 325 km quer durch den Landkreis (Celle,
     Wietze, Winsen). Keine ADFC-Platzierung, aber ein durchgängig ausgeschilderter
     Radfernweg und in OSM sauber als route=bicycle erfasst. Die 10 lokalen Rad-
     Thementouren des Naturparks (424 km) sind meist keine benannten OSM-Relationen –
     die stehen komplett auf region-celle-navigator.de. */
  { q: "Aller-?Radweg|Allerradweg", n: "Aller-Radweg", r: "Celle", bl: "Niedersachsen", a: "Radfernweg · 325 km · Lkr. Celle" },
];

const ROLLEN_OK = ["", "forward", "backward", "main"];
const havKm = (aLa, aLo, bLa, bLo) => {
  const R = 6371, r = Math.PI / 180, dLa = (bLa - aLa) * r, dLo = (bLo - aLo) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(aLa * r) * Math.cos(bLa * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
function gehzeit(km, hm) {
  if (!km) return null;
  const th = km / 4, tv = hm ? hm / 300 : 0;
  return Math.max(th, tv) + Math.min(th, tv) / 2;
}
const hStr = (t) => { const h = Math.floor(t), m = Math.round((t - h) * 60); return h > 0 ? h + ":" + String(m).padStart(2, "0") + " h" : m + " min"; };

async function jget(url, ms = 20000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function jpost(url, body, ms = 120000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { method: "POST", body, signal: c.signal, headers: { "Content-Type": "text/plain" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
/* Laut OSM-Wiki verteilt overpass-api.de per Round-Robin auf die beiden Hauptinstanzen
   z und lz4. Ist ein Knoten ausgelastet, hilft der direkte Griff zum anderen – gleicher
   Betreiber, also kein CORS-Risiko. kumi.systems steht zuletzt: dort werden CORS-Probleme
   berichtet, als letzter Versuch schadet es aber nicht. */
const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
async function overpass(q, ms = 120000) {
  let letzter = null;
  for (const url of OVERPASS) {
    try { return await jpost(url, q, ms); }
    catch (e) { letzter = e; }
  }
  throw letzter || new Error("nicht erreichbar");
}

function linienVon(rel) {
  const out = [];
  for (const m of (rel.members || [])) {
    if (m.type !== "way" || !Array.isArray(m.geometry) || m.geometry.length < 2) continue;
    if (!ROLLEN_OK.includes(m.role || "")) continue;
    out.push(m.geometry);
  }
  return out;
}
const laengeVon = (ls) => { let s = 0; for (const g of ls) for (let i = 1; i < g.length; i++) s += havKm(g[i - 1].lat, g[i - 1].lon, g[i].lat, g[i].lon); return s; };
const rundVon = (ls) => { if (ls.length < 2) return false; const a = ls[0][0], g = ls[ls.length - 1], b = g[g.length - 1]; return havKm(a.lat, a.lon, b.lat, b.lon) < 1; };

/* Höhenmeter aus dem Geländemodell: Weg abtasten (max. 100 Punkte = 1 Abruf). */
async function hoehenmeter(ls) {
  const pts = [];
  for (const g of ls) for (const p of g) pts.push(p);
  if (pts.length < 4) return null;
  const N = Math.min(100, pts.length);
  const schritt = (pts.length - 1) / (N - 1);
  const probe = [];
  for (let i = 0; i < N; i++) probe.push(pts[Math.round(i * schritt)]);
  const lat = probe.map((p) => p.lat.toFixed(5)).join(",");
  const lon = probe.map((p) => p.lon.toFixed(5)).join(",");
  const j = await jget(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
  const h = j && j.elevation;
  if (!Array.isArray(h) || h.length < 4) return null;
  let auf = 0;
  for (let i = 1; i < h.length; i++) { const d = h[i] - h[i - 1]; if (d > 0) auf += d; }
  return { auf: Math.round(auf), min: Math.round(Math.min(...h)), max: Math.round(Math.max(...h)), punkte: h.length };
}

/* Grobe Umgrenzung Deutschlands – nur zur Plausibilitätsprüfung im Browser. */
const DE = { s: 47.2, w: 5.8, n: 55.1, e: 15.1 };
const inDeutschland = (lat, lon) => lat >= DE.s && lat <= DE.n && lon >= DE.w && lon <= DE.e;

const GEO_CACHE = {};
async function orten(begriff) {
  if (begriff in GEO_CACHE) return GEO_CACHE[begriff];
  const j = await jget(`https://photon.komoot.io/api/?q=${encodeURIComponent(begriff + ", Deutschland")}&limit=1&lang=de`);
  const f = j.features && j.features[0];
  const c = f && f.geometry ? { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] } : null;
  GEO_CACHE[begriff] = c;
  return c;
}

/* EINE Route, in einem kleinen Kasten um die Region. Grad ~1.0 ≈ 110 km – großzügig
   genug für weitläufige Regionen (Schwarzwald, Pfalz), aber winzig gegen ein ganzes Land. */
async function ladeRoute(w) {
  const typ = w.art === "rad" ? "bicycle" : "hiking";
  const c = await orten(w.r);
  if (!c) throw new Error("Region nicht gefunden");
  const d = w.art === "rad" ? 2.2 : 1.0;
  const box = [(c.lat - d).toFixed(3), (c.lon - d * 1.5).toFixed(3), (c.lat + d).toFixed(3), (c.lon + d * 1.5).toFixed(3)].join(",");
  const q = `[out:json][timeout:60];rel["route"="${typ}"]["name"~"${w.q}",i](${box});out geom;`;
  const o = await overpass(q, 60000);
  const els = (o && o.elements) || [];
  const re = new RegExp(w.q, "i");
  const rel = els.find((e) => e.tags && e.tags.name && re.test(e.tags.name));
  if (!rel) throw new Error("in OpenStreetMap nicht gefunden");
  const ls = linienVon(rel);
  if (!ls.length) throw new Error("kein Verlauf hinterlegt");
  const p0 = ls[0][0];
  if (!inDeutschland(p0.lat, p0.lon)) throw new Error("Treffer liegt nicht in Deutschland");
  const km = Math.round(laengeVon(ls) * 10) / 10;
  const tagKm = rel.tags.distance ? parseFloat(String(rel.tags.distance).replace(",", ".")) : null;
  return {
    id: rel.id, name: rel.tags.name, linien: ls, km,
    tagKm: tagKm && isFinite(tagKm) ? Math.round(tagKm) : null,
    rund: rundVon(ls) || rel.tags.roundtrip === "yes",
    lat: p0.lat, lon: p0.lon,
  };
}

/* Was einmal geladen wurde, bleibt gemerkt: Länge, Rundweg, Ort, Höhenmeter.
   Der VERLAUF wird bewusst nicht gespeichert (zu groß) – nur die Eckdaten. Dadurch
   filtert die Liste ab dem zweiten Besuch sofort korrekt nach „Rundweg, max. 20 km“. */
const MERK = "up-rundwege-v1";
function ladeMerk() { try { return JSON.parse(localStorage.getItem(MERK) || "{}"); } catch (e) { return {}; } }
function merkeWeg(key, d) {
  try {
    const o = ladeMerk();
    o[key] = { id: d.id, name: d.name, km: d.km, rund: d.rund, lat: d.lat, lon: d.lon, hm: d.hm != null ? d.hm : (o[key] || {}).hm };
    localStorage.setItem(MERK, JSON.stringify(o));
  } catch (e) {}
}

const norm = (x) => String(x || "").toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");

/* ══════════════ Gipfel: leichte Gipfeltouren ohne Steigeisen ══════════════

   „Ohne Steigeisen" ist hier KEIN Geschmacksurteil, sondern der OSM-Tag `sac_scale`
   (SAC-Wanderskala). Das OSM-Wiki zieht die Grenze selbst: ab `alpine_hiking` (T4)
   führen die Wege entweder über GLETSCHER oder es kommt Klettern mit Handeinsatz
   (UIAA) dazu – darunter nicht. Daraus folgt die Regel dieses Moduls:
     T1/T2   strolling | hiking | mountain_hiking            -> aufgenommen, „leicht"
     T3      demanding_mountain_hiking                       -> aufgenommen
     ab T4   alpine_hiking | demanding_alpine_hiking | …     -> NICHT aufgenommen

   Wie gesucht wird – zwei kleine Abfragen, KEINE Geometrie, deshalb schnell:
     1. benannte Gipfel mit Höhenangabe im Umkreis                 -> Gesamtzahl
     2. Wege mit sac_scale ≤ T2 bzw. = T3 NUR im 150-m-Umkreis der Gipfel,
        dann die Gipfel an diesen Wegen                            -> Trefferliste
   Entscheidend ist der 150-m-Umkreis: die Wegsuche läuft nur an den Gipfeln, nicht im
   ganzen Radius. In dichten Gebieten (Allgäu, Oberstdorf) würde „alle sac_scale-Wege im
   20-km-Radius" den freien Overpass-Server sonst sprengen (Timeout -> leere Liste).

   EHRLICH, und das bleibt so:
    • Bewertet sind die Wege AM GIPFEL (100 m Umkreis). Weiter unten kann der Aufstieg
      anders aussehen. Das hier ist eine Vorauswahl, keine Tourenfreigabe.
    • sac_scale ist laut OSM-Wiki subjektiv und längst nicht überall gesetzt. Gipfel
      ohne getaggten Weg werden GEZÄHLT und offen benannt – nicht geraten.
    • Die SAC-Skala gilt für günstige Verhältnisse (trocken, aper). Bei Schnee, Nässe
      oder Vereisung trägt sie nicht – im Frühjahr also mit Verstand lesen.
    • Höhe = OSM-Tag `ele`. Aufstieg/Gehzeit stehen bewusst NICHT da: ohne definierten
      Startpunkt wären das erfundene Zahlen.
*/
const SAC_LEICHT = "strolling|hiking|mountain_hiking";
const MAX_GIPFEL = 150;
const GRAD = {
  leicht: { label: "T1–T2", text: "Wandern / Bergwandern", stil: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  t3: { label: "T3", text: "anspruchsvolles Bergwandern", stil: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
};

/* Photon OHNE Länder-Zusatz – Gipfel gibt es auch in Tirol, nicht nur in Deutschland. */
const GEO_FREI = {};
async function ortenFrei(begriff) {
  if (begriff in GEO_FREI) return GEO_FREI[begriff];
  const j = await jget(`https://photon.komoot.io/api/?q=${encodeURIComponent(begriff)}&limit=1&lang=de`);
  const f = j.features && j.features[0];
  const c = f && f.geometry
    ? { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], name: (f.properties && f.properties.name) || begriff }
    : null;
  GEO_FREI[begriff] = c;
  return c;
}

function gipfelAus(o) {
  const peaks = [];
  let gesamt = null;
  for (const e of ((o && o.elements) || [])) {
    if (e.type === "count") { const n = Number((e.tags && e.tags.nodes) || 0); gesamt = isFinite(n) ? n : null; continue; }
    if (e.type !== "node" || !e.tags || !e.tags.name || e.lat == null || e.lon == null) continue;
    const h = parseFloat(String(e.tags.ele).replace(",", "."));
    peaks.push({ id: e.id, name: e.tags.name, ele: isFinite(h) ? Math.round(h) : null, lat: e.lat, lon: e.lon });
  }
  return { gesamt, peaks };
}

async function ladeGipfel(term, radiusKm) {
  const c = await ortenFrei(term);
  if (!c) throw new Error("Region nicht gefunden");
  const um = `around:${Math.round(radiusKm * 1000)},${c.lat.toFixed(5)},${c.lon.toFixed(5)}`;
  const alle = `node["natural"="peak"]["name"]["ele"](${um})->.alle;`;
  const qA = `[out:json][timeout:90];${alle}.alle out count;way["sac_scale"~"^(${SAC_LEICHT})$"](around.alle:150)->.w;node.alle(around.w:150);out body ${MAX_GIPFEL};`;
  const qB = `[out:json][timeout:90];${alle}way["sac_scale"="demanding_mountain_hiking"](around.alle:150)->.w;node.alle(around.w:150);out body ${MAX_GIPFEL};`;
  const a = gipfelAus(await overpass(qA, 90000));
  const b = gipfelAus(await overpass(qB, 90000));
  const schon = new Set(a.peaks.map((p) => p.id));
  const liste = [
    ...a.peaks.map((p) => ({ ...p, grad: "leicht" })),
    ...b.peaks.filter((p) => !schon.has(p.id)).map((p) => ({ ...p, grad: "t3" })),
  ].map((p) => ({ ...p, weg: Math.round(havKm(c.lat, c.lon, p.lat, p.lon) * 10) / 10 }));
  liste.sort((x, y) => (y.ele || 0) - (x.ele || 0) || x.weg - y.weg);
  return { ort: c.name, lat: c.lat, lon: c.lon, gesamt: a.gesamt, liste, voll: liste.length >= MAX_GIPFEL };
}

/* Erst beim Antippen: Welche markierten Routen laufen über den Gipfel – und liegt dort
   ein Klettersteig? Zwei winzige Abfragen in einer. */
async function ladeZustieg(p) {
  const um = `around:150,${p.lat.toFixed(5)},${p.lon.toFixed(5)}`;
  const q = `[out:json][timeout:60];rel["route"="hiking"]["name"](${um});out tags 8;way["via_ferrata_scale"](${um});out count;`;
  const o = await overpass(q, 60000);
  const routen = [];
  let ferrata = 0;
  for (const e of ((o && o.elements) || [])) {
    if (e.type === "count") { const n = Number((e.tags && e.tags.ways) || 0); if (isFinite(n)) ferrata = n; continue; }
    if (e.type === "relation" && e.tags && e.tags.name) routen.push(e.tags.name);
  }
  return { routen: Array.from(new Set(routen)).slice(0, 6), ferrata };
}

/* ══════════════ Beliebte Bergtouren (Bayern & Tirol) — kuratiert ══════════════

   Diese Liste ist bewusst „beliebt", NICHT „am schönsten": Bekanntheit lässt sich
   belegen, Geschmack nicht. Jeder Gipfel taucht in mehreren etablierten Quellen als
   populäre Tour auf – bergtour-online.de, Bergwelten, tirol.at (offiziell), Komoot-
   Community, gamssteig.de u. a. – und ist dort als leicht bis mittel eingestuft:
   kein Gletscher, keine Steigeisen, kein Pflicht-Klettersteig. Wo eine Bergbahn den
   Aufstieg verkürzt, ist das vermerkt.

   EHRLICH, und das bleibt so:
    • „leicht/mittel" ist die TECHNISCHE Einstufung der Quellen, nicht die Länge oder
      Kondition. Trittsicherheit und Grundkondition setzen auch leichte Gipfel voraus.
    • Höhenangaben stehen bewusst NICHT in der Liste – Meterzahlen aus dem Kopf wären
      geraten. Höhe und Verlauf zeigt die Karte/OSM beim Antippen.
    • Verortung live über Photon (frei). Steht ein Gipfel woanders als erwartet, sagt
      es die Karte ehrlich – erfunden wird nichts.
    • Grenzberge (Kranzhorn u. a.) liegen teils auf der Grenze; zugeordnet ist die Seite
      des üblichen Aufstiegs.
   Das ist eine Auswahl bekannter Klassiker, keine Rangliste und keine Tourenfreigabe. */
const BERGE = [
  /* --- BAYERN --- */
  { rg: "Bayern", n: "Herzogstand", geo: "Herzogstand, Kochel am See", area: "Walchensee · Oberbayern", grad: "leicht", bahn: true },
  { rg: "Bayern", n: "Jochberg", geo: "Jochberg, Walchensee, Bayern", area: "Walchensee · Oberbayern", grad: "leicht", bahn: false },
  { rg: "Bayern", n: "Wank", geo: "Wank, Garmisch-Partenkirchen", area: "Garmisch · Wetterstein", grad: "leicht", bahn: true },
  { rg: "Bayern", n: "Hoher Kranzberg", geo: "Hoher Kranzberg, Mittenwald", area: "Mittenwald · Karwendel", grad: "leicht", bahn: true },
  { rg: "Bayern", n: "Wallberg", geo: "Wallberg, Rottach-Egern", area: "Tegernsee · Oberbayern", grad: "leicht", bahn: true },
  { rg: "Bayern", n: "Neureuth", geo: "Neureuth, Tegernsee", area: "Tegernsee", grad: "leicht", bahn: false },
  { rg: "Bayern", n: "Riederstein", geo: "Riederstein, Rottach-Egern", area: "Tegernsee", grad: "leicht", bahn: false },
  { rg: "Bayern", n: "Blomberg", geo: "Blomberg, Bad Tölz", area: "Bad Tölz · Isarwinkel", grad: "leicht", bahn: true },
  { rg: "Bayern", n: "Brauneck", geo: "Brauneck, Lenggries", area: "Lenggries · Isarwinkel", grad: "mittel", bahn: true },
  { rg: "Bayern", n: "Seekarkreuz", geo: "Seekarkreuz, Lenggries", area: "Lenggries", grad: "mittel", bahn: false },
  { rg: "Bayern", n: "Fockenstein", geo: "Fockenstein, Bad Wiessee", area: "Tegernsee", grad: "mittel", bahn: false },
  { rg: "Bayern", n: "Hirschberg", geo: "Hirschberg, Kreuth", area: "Tegernsee", grad: "mittel", bahn: false },
  { rg: "Bayern", n: "Breitenstein", geo: "Breitenstein, Bayrischzell", area: "Bayrischzell · Mangfall", grad: "mittel", bahn: false },
  { rg: "Bayern", n: "Wendelstein", geo: "Wendelstein, Bayrischzell", area: "Bayrischzell · Mangfall", grad: "mittel", bahn: true },
  { rg: "Bayern", n: "Hinteres Hörnle", geo: "Hörnle, Bad Kohlgrub", area: "Ammergauer Alpen", grad: "leicht", bahn: true },
  { rg: "Bayern", n: "Kranzhorn", geo: "Kranzhorn, Erl, Inntal", area: "Inntal · Chiemgau", grad: "leicht", bahn: false },
  { rg: "Bayern", n: "Heuberg", geo: "Heuberg, Nußdorf am Inn", area: "Inntal · Chiemgau", grad: "mittel", bahn: false },
  { rg: "Bayern", n: "Spitzstein", geo: "Spitzstein, Sachrang", area: "Chiemgau", grad: "leicht", bahn: false },
  { rg: "Bayern", n: "Hochries", geo: "Hochries, Samerberg", area: "Chiemgau", grad: "mittel", bahn: true },
  { rg: "Bayern", n: "Kampenwand", geo: "Kampenwand, Aschau im Chiemgau", area: "Chiemgau", grad: "mittel", bahn: true },
  { rg: "Bayern", n: "Laubenstein", geo: "Laubenstein, Aschau im Chiemgau", area: "Chiemgau", grad: "leicht", bahn: false },
  { rg: "Bayern", n: "Geigelstein", geo: "Geigelstein, Schleching", area: "Chiemgau", grad: "mittel", bahn: false },
  { rg: "Bayern", n: "Hochgern", geo: "Hochgern, Marquartstein", area: "Chiemgau", grad: "mittel", bahn: false },
  { rg: "Bayern", n: "Hochfelln", geo: "Hochfelln, Bergen Chiemgau", area: "Chiemgau", grad: "mittel", bahn: true },
  { rg: "Bayern", n: "Grünstein", geo: "Grünstein, Schönau am Königssee", area: "Berchtesgaden", grad: "leicht", bahn: false },
  { rg: "Bayern", n: "Grünten", geo: "Grünten, Rettenberg, Allgäu", area: "Allgäu", grad: "mittel", bahn: false },

  /* --- TIROL --- */
  { rg: "Tirol", n: "Hohe Salve", geo: "Hohe Salve, Hopfgarten, Tirol", area: "Brixental · Kitzbüheler Alpen", grad: "leicht", bahn: true },
  { rg: "Tirol", n: "Kitzbüheler Horn", geo: "Kitzbüheler Horn, Kitzbühel", area: "Kitzbühel", grad: "mittel", bahn: true },
  { rg: "Tirol", n: "Patscherkofel", geo: "Patscherkofel, Igls, Innsbruck", area: "Innsbruck · Tuxer Alpen", grad: "mittel", bahn: true },
  { rg: "Tirol", n: "Rofanspitze", geo: "Rofanspitze, Maurach, Achensee", area: "Achensee · Rofan", grad: "mittel", bahn: true },
  { rg: "Tirol", n: "Galtjoch", geo: "Galtjoch, Rinnen, Berwang", area: "Lechtal · Außerfern", grad: "leicht", bahn: false },
  { rg: "Tirol", n: "Simmering", geo: "Simmering, Obsteig, Tirol", area: "Mieminger Plateau", grad: "leicht", bahn: false },
  { rg: "Tirol", n: "Nockspitze (Saile)", geo: "Nockspitze, Axams, Innsbruck", area: "Innsbruck · Stubaier Alpen", grad: "mittel", bahn: false },
  { rg: "Tirol", n: "Thaneller", geo: "Thaneller, Berwang, Lechtal", area: "Lechtaler Alpen · Außerfern", grad: "mittel", bahn: false },
  { rg: "Tirol", n: "Tschirgant", geo: "Tschirgant, Imst", area: "Inntal · Imst", grad: "mittel", bahn: false },
  { rg: "Tirol", n: "Schwarzkogel", geo: "Schwarzkogel, Kitzbüheler Alpen", area: "Kitzbüheler Alpen · Brixental", grad: "leicht", bahn: false },
  { rg: "Tirol", n: "Filzenkogel", geo: "Filzenkogel, Mayrhofen, Zillertal", area: "Zillertal · Ahorn", grad: "leicht", bahn: true },
];

const G_STIL = {
  leicht: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  mittel: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

function BeliebteBerge({ onAdd, onCreateTrip, trips, onAddToTrip }) {
  const [rg, setRg] = useState("Bayern");
  const [nurLeicht, setNurLeicht] = useState(false);
  const [sel, setSel] = useState(null);
  const [spots, setSpots] = useState({});      // key -> {lat,lon}
  const [busy, setBusy] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const [done, setDone] = useState({});

  const liste = BERGE.filter((b) => b.rg === rg).map((b) => ({ ...b, key: b.rg + ":" + b.n }));
  const treffer = liste.filter((b) => !nurLeicht || b.grad === "leicht");

  /* Gefilterte Region einmalig verorten (gestaffelt, Ergebnisse landen im Photon-Cache,
     ab dem zweiten Öffnen also sofort da). Kostet Overpass nichts – nur Photon. */
  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      for (const b of treffer) {
        if (!alive) return;
        if (spots[b.key]) continue;
        try { const c = await ortenFrei(b.geo); if (alive && c) setSpots((o) => ({ ...o, [b.key]: { lat: c.lat, lon: c.lon } })); }
        catch (e) { /* Nadel fehlt dann eben */ }
        await new Promise((r) => setTimeout(r, 150));
      }
      if (alive) setBusy(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line
  }, [rg, nurLeicht]);

  const mapSpots = treffer.filter((b) => spots[b.key]).map((b) => ({ id: b.key, name: b.n, kategorie: "gipfel", lat: spots[b.key].lat, lon: spots[b.key].lon }));
  const infoText = (b) => ["Gipfeltour", b.grad === "leicht" ? "leicht" : "mittel", b.area, b.bahn ? "Bergbahn möglich" : ""].filter(Boolean).join(" · ");
  const sug = (b) => { const c = spots[b.key]; return { name: b.n, gebiet: b.area, info: infoText(b), lat: c ? c.lat : null, lon: c ? c.lon : null, kategorie: "gipfel" }; };
  const merke = (b, t) => { setDone((o) => ({ ...o, [b.key]: t })); setMenuFor(null); };
  const nurIdeen = !!onAdd && !onCreateTrip && !(onAddToTrip && trips && trips.length);
  const hatAktion = !!(onAdd || onCreateTrip || (onAddToTrip && trips && trips.length));

  const chip = (on) => "rounded-full px-3 py-1.5 text-xs font-medium transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300");
  const zeile = "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 transition hover:bg-emerald-50 dark:text-stone-200 dark:hover:bg-stone-800";

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-800 dark:bg-emerald-950/40">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100"><Mountain className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Beliebte Bergtouren</div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Bekannte Gipfel in Bayern und Tirol, leicht bis mittel – ohne Steigeisen, ohne Pflicht-Klettersteig. Antippen zeigt den Gipfel auf der Karte und lässt ihn übernehmen.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => { setRg("Bayern"); setSel(null); setMenuFor(null); }} className={chip(rg === "Bayern")}>Bayern ({BERGE.filter((b) => b.rg === "Bayern").length})</button>
        <button onClick={() => { setRg("Tirol"); setSel(null); setMenuFor(null); }} className={chip(rg === "Tirol")}>Tirol ({BERGE.filter((b) => b.rg === "Tirol").length})</button>
        <button onClick={() => setNurLeicht((v) => !v)} className={chip(nurLeicht)}><Footprints className="mr-1 inline h-3 w-3" />nur leicht</button>
        {busy && <span className="inline-flex items-center gap-1 text-xs text-stone-400"><Loader2 className="h-3 w-3 animate-spin" /> Gipfel werden verortet …</span>}
      </div>

      <div className="mt-3">
        <Wegkarte
          spots={mapSpots}
          selectedId={sel}
          onSelect={(id) => { setSel(sel === id ? null : id); setMenuFor(null); }}
          name={`${treffer.length} beliebte Touren · ${rg}`}
          hoehe="320px"
        />
      </div>

      <div className="mt-3 space-y-1.5">
        {treffer.map((b) => {
          const aktiv = sel === b.key;
          return (
            <div key={b.key} className={"rounded-lg px-2.5 py-2 text-sm transition " + (aktiv ? "bg-white ring-1 ring-emerald-300 dark:bg-stone-900 dark:ring-emerald-700" : "bg-white/70 dark:bg-stone-900/60")}>
              <div className="flex items-center gap-2">
                <button onClick={() => { setSel(aktiv ? null : b.key); setMenuFor(null); }} className="min-w-0 flex-1 text-left">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-stone-800 dark:text-stone-100">{b.n}</span>
                    <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + G_STIL[b.grad]}>{b.grad}</span>
                    {b.bahn && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300">Bergbahn</span>}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-stone-500 dark:text-stone-400">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {b.area}</span>
                    {!spots[b.key] && busy && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> verorten …</span>}
                  </span>
                </button>
                {done[b.key]
                  ? <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /> {done[b.key]}</span>
                  : hatAktion && <button onClick={() => (nurIdeen ? (onAdd(sug(b)), merke(b, "in Ideen")) : setMenuFor(menuFor === b.key ? null : b.key))} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800">{menuFor === b.key ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {nurIdeen ? "Hinzufügen" : "Übernehmen"}</button>}
              </div>

              {aktiv && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <span>{b.grad === "leicht" ? "Technisch leicht" : "Technisch mittel"} · {b.area}{b.bahn ? " · Aufstieg per Bergbahn abkürzbar" : ""}.</span>
                  <a href={"https://www.openstreetmap.org/search?query=" + encodeURIComponent(b.geo)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stone-400 transition hover:text-emerald-700 dark:text-stone-500">auf OpenStreetMap <ExternalLink className="h-3 w-3" /></a>
                </div>
              )}

              {menuFor === b.key && (
                <div className="mt-2 space-y-1 rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900">
                  {onAddToTrip && trips && trips.length > 0 && (<>
                    <div className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">Zu einer Reise heften</div>
                    {trips.slice(0, 8).map((t) => (
                      <button key={t.id} onClick={() => { onAddToTrip(t.id, sug(b)); merke(b, "zu " + (t.name || "Reise")); }} className={zeile}>
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> <span className="min-w-0 truncate">{t.name || "Reise"}</span>
                      </button>
                    ))}
                  </>)}
                  {onCreateTrip && <button onClick={() => { onCreateTrip({ name: b.n, gebiet: b.area, info: infoText(b), anreiseart: "auto", von: "Celle", nach: b.geo, items: [sug(b)] }); merke(b, "neue Reise"); }} className={zeile + " font-medium"}><CalendarPlus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> Neue Reise daraus erstellen</button>}
                  {onAdd && <button onClick={() => { onAdd(sug(b)); merke(b, "in Ideen"); }} className={zeile}><Plus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> In Ideen merken</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>
        Auswahl <b>bekannter</b> Gipfel, die in mehreren etablierten Quellen (bergtour-online.de, Bergwelten, tirol.at, Komoot, gamssteig.de) als <b>leicht bis mittel</b> gelten – keine Rangliste, kein „am schönsten". „leicht/mittel" meint die <b>technische</b> Schwierigkeit, nicht Länge oder Kondition; Trittsicherheit und Grundkondition braucht es trotzdem. <b>Höhenmeter stehen bewusst nicht dabei</b> (aus dem Kopf wären sie geraten) – Höhe und Verlauf zeigt die Karte beim Antippen. Verortung über Photon; sitzt eine Nadel falsch, sag Bescheid. Für die genaue Wegschwierigkeit am Gipfel die Suche unten nutzen (prüft `sac_scale` live). Verhältnisse im Frühjahr (Schnee, Nässe) gesondert bedenken – ohne Gewähr.
      </span></div>
    </div>
  );
}

function GipfelSuche({ onAdd, onCreateTrip, trips, onAddToTrip }) {
  const [input, setInput] = useState("");
  const [radius, setRadius] = useState(20);
  const [nurLeicht, setNurLeicht] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(null);
  const [zu, setZu] = useState({});
  const [zuBusy, setZuBusy] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [done, setDone] = useState({});

  async function run(q0, r0) {
    const term = (q0 != null ? q0 : input).trim();
    if (!term || loading) return;
    setLoading(true); setErr(""); setData(null); setSel(null); setMenuFor(null); setZu({});
    try { setData(await ladeGipfel(term, r0 != null ? r0 : radius)); }
    catch (e) { setErr((e.message || String(e)) + " – Overpass ist ein freier Dienst und zeitweise überlastet; noch einmal versuchen oder kleineren Umkreis wählen."); }
    finally { setLoading(false); }
  }

  async function waehle(p) {
    const neu = sel === p.id ? null : p.id;
    setSel(neu); setMenuFor(null);
    if (!neu || zu[p.id] || zuBusy) return;
    setZuBusy(p.id);
    try { const z = await ladeZustieg(p); setZu((o) => ({ ...o, [p.id]: z })); }
    catch (e) { setZu((o) => ({ ...o, [p.id]: { fehler: true } })); }
    finally { setZuBusy(null); }
  }

  const treffer = (data ? data.liste : []).filter((p) => !nurLeicht || p.grad === "leicht");
  const ohneWeg = data && data.gesamt != null ? Math.max(0, data.gesamt - data.liste.length) : null;
  const infoText = (p) => ["Gipfeltour", p.ele != null ? p.ele + " m ü. NN" : "", GRAD[p.grad].label + " (" + GRAD[p.grad].text + ")", (zu[p.id] && zu[p.id].routen && zu[p.id].routen.length ? "über " + zu[p.id].routen[0] : "")].filter(Boolean).join(" · ");
  const sug = (p) => ({ name: p.name, gebiet: (data && data.ort) || "", info: infoText(p), lat: p.lat, lon: p.lon, kategorie: "gipfel" });
  const merke = (p, t) => { setDone((o) => ({ ...o, [p.id]: t })); setMenuFor(null); };
  const nurIdeen = !!onAdd && !onCreateTrip && !(onAddToTrip && trips && trips.length);
  const hatAktion = !!(onAdd || onCreateTrip || (onAddToTrip && trips && trips.length));

  const chip = (on) => "rounded-full px-3 py-1.5 text-xs font-medium transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300");
  const zeile = "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 transition hover:bg-emerald-50 dark:text-stone-200 dark:hover:bg-stone-800";

  return (
    <div>
      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
        Gipfel mit markiertem Weg bis oben – <b>ohne Gletscher, ohne Klettern, ohne Steigeisen</b>. Region eingeben; für Gipfel gibt es keine Auszeichnungswahl wie bei den Wanderwegen, deshalb eine Suche nach belegten Kriterien statt einer Favoritenliste.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); }}
          placeholder="Region, Tal oder Ort … z. B. Stans, Tirol" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900" />
        <button onClick={() => run()} disabled={loading} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Suchen
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="w-16 shrink-0 text-xs font-semibold text-stone-500 dark:text-stone-400">Umkreis</span>
        {[10, 20, 40].map((r) => (
          <button key={r} onClick={() => { setRadius(r); if (data || input.trim()) run(null, r); }} className={chip(radius === r)}>{r} km</button>
        ))}
        <button onClick={() => setNurLeicht((v) => !v)} className={chip(nurLeicht)}><Footprints className="mr-1 inline h-3 w-3" />nur T1–T2</button>
      </div>

      {!data && !loading && !err && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Stans, Tirol", "Berchtesgaden", "Oberstdorf", "Harz", "Sächsische Schweiz", "Schwarzwald"].map((o) => (
            <button key={o} onClick={() => { setInput(o); run(o); }} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-emerald-300 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">{o}</button>
          ))}
        </div>
      )}

      {err && <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err}</div>}
      {loading && <div className="mt-3 flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Gipfel und Wegschwierigkeiten werden gesucht …</div>}

      {data && (<>
        <div className="mt-3">
          <Wegkarte
            spots={treffer.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, kategorie: "gipfel" }))}
            selectedId={sel}
            onSelect={(id) => { const p = data.liste.find((x) => x.id === id); if (p) waehle(p); }}
            name={`${treffer.length} Gipfel um ${data.ort}`}
            hoehe="340px"
          />
          <div className="mt-1 text-center text-xs text-stone-400 dark:text-stone-500">Nadel antippen – Routen am Gipfel werden dann geladen.</div>
        </div>

        <div className="mt-3 space-y-1.5">
          {treffer.map((p) => {
            const aktiv = sel === p.id;
            const g = GRAD[p.grad];
            const z = zu[p.id];
            return (
              <div key={p.id} className={"rounded-lg px-2.5 py-2 text-sm transition " + (aktiv ? "bg-emerald-50 ring-1 ring-emerald-300 dark:bg-emerald-950 dark:ring-emerald-700" : "bg-stone-50 dark:bg-stone-800")}>
                <div className="flex items-center gap-2">
                  <button onClick={() => waehle(p)} className="min-w-0 flex-1 text-left">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-stone-800 dark:text-stone-100">{p.name}</span>
                      <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + g.stil}>{g.label}</span>
                      {z && !z.fehler && z.ferrata > 0 && <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-700 dark:text-stone-300">auch Klettersteig</span>}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-stone-500 dark:text-stone-400">
                      {p.ele != null && <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {p.ele} m ü. NN</span>}
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.weg} km ab {data.ort}</span>
                      <span>{g.text}</span>
                      {zuBusy === p.id && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> lädt …</span>}
                    </span>
                  </button>
                  {done[p.id]
                    ? <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /> {done[p.id]}</span>
                    : hatAktion && <button onClick={() => (nurIdeen ? (onAdd(sug(p)), merke(p, "in Ideen")) : setMenuFor(menuFor === p.id ? null : p.id))} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800">{menuFor === p.id ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {nurIdeen ? "Hinzufügen" : "Übernehmen"}</button>}
                </div>

                {aktiv && z && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {z.fehler && <span className="text-rose-600">Routen am Gipfel nicht ladbar.</span>}
                    {!z.fehler && (z.routen.length
                      ? <span className="inline-flex flex-wrap items-center gap-1 text-stone-600 dark:text-stone-300"><RouteIcon className="h-3 w-3 shrink-0 text-emerald-700 dark:text-emerald-300" /> {z.routen.join(" · ")}</span>
                      : <span className="text-stone-400 dark:text-stone-500">Keine benannte Wanderroute am Gipfel hinterlegt – der Weg ist trotzdem da, nur ohne Namen.</span>)}
                    <a href={"https://www.openstreetmap.org/node/" + p.id} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stone-400 transition hover:text-emerald-700 dark:text-stone-500">auf OpenStreetMap <ExternalLink className="h-3 w-3" /></a>
                  </div>
                )}

                {menuFor === p.id && (
                  <div className="mt-2 space-y-1 rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900">
                    {onAddToTrip && trips && trips.length > 0 && (<>
                      <div className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">Zu einer Reise heften</div>
                      {trips.slice(0, 8).map((t) => (
                        <button key={t.id} onClick={() => { onAddToTrip(t.id, sug(p)); merke(p, "zu " + (t.name || "Reise")); }} className={zeile}>
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> <span className="min-w-0 truncate">{t.name || "Reise"}</span>
                        </button>
                      ))}
                    </>)}
                    {onCreateTrip && <button onClick={() => { onCreateTrip({ name: p.name, gebiet: (data && data.ort) || p.name, info: infoText(p), anreiseart: "auto", von: "Celle", nach: (data && data.ort) || "", items: [sug(p)] }); merke(p, "neue Reise"); }} className={zeile + " font-medium"}><CalendarPlus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> Neue Reise daraus erstellen</button>}
                    {onAdd && <button onClick={() => { onAdd(sug(p)); merke(p, "in Ideen"); }} className={zeile}><Plus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> In Ideen merken</button>}
                  </div>
                )}
              </div>
            );
          })}
          {treffer.length === 0 && <div className="rounded-lg bg-stone-50 px-3 py-3 text-sm text-stone-500 dark:bg-stone-800 dark:text-stone-400">Kein Gipfel mit hinterlegter Wegschwierigkeit im Umkreis – größeren Umkreis wählen oder Filter „nur T1–T2" ausschalten.</div>}
        </div>

        <div className="mt-2 text-xs text-stone-400 dark:text-stone-500">
          {ohneWeg != null && ohneWeg > 0 && <>Von {data.gesamt} benannten Gipfeln im Umkreis haben <b>{ohneWeg}</b> keinen Weg mit hinterlegter Schwierigkeit – die sind nicht in der Liste, weil ich sie nicht bewerten kann (nicht, weil sie schwer wären). </>}
          {data.voll && <>Die Liste ist bei {MAX_GIPFEL} Treffern gekappt. </>}
        </div>
      </>)}

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>
        Maßstab ist der OSM-Tag <b>sac_scale</b> (SAC-Wanderskala), nicht mein Urteil: Laut OSM-Wiki führen Wege ab <b>T4 (alpine_hiking)</b> entweder über Gletscher oder es kommt Klettern mit Handeinsatz dazu – deshalb endet diese Liste bei <b>T3</b>. Gesucht wird über Overpass (ODbL), verortet über Photon – frei und ohne Schlüssel.
        <b> Grenzen, ehrlich:</b> Bewertet sind die Wege <b>am Gipfel</b> (100 m Umkreis) – weiter unten kann der Aufstieg anders sein. sac_scale ist laut Wiki <b>subjektiv</b> und nicht überall gesetzt; Gipfel ohne getaggten Weg werden gezählt statt geraten. Die SAC-Skala gilt für <b>günstige Verhältnisse</b> (trocken, aper) – bei Schnee oder Vereisung trägt sie nicht, gerade im Frühjahr. Höhe aus dem OSM-Tag <b>ele</b>. Aufstieg und Gehzeit stehen bewusst nicht da: ohne festen Startpunkt wären das erfundene Zahlen. Vorauswahl, keine Tourenfreigabe – ohne Gewähr.
      </span></div>
    </div>
  );
}

export default function Rundwege({ onAdd, onCreateTrip, trips, onAddToTrip }) {
  const [art, setArt] = useState("fuss");
  const [land, setLand] = useState("alle");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [done, setDone] = useState({});
  const [lad, setLad] = useState({});      // key -> {daten} | {fehler}
  const [busy, setBusy] = useState(null);
  const [hm, setHm] = useState({});
  const [hmBusy, setHmBusy] = useState(null);
  const [merk, setMerk] = useState(() => ladeMerk());
  const [spots, setSpots] = useState({});
  const [nurPassend, setNurPassend] = useState(true);

  /* Übersicht: Regionen einmalig verorten -> Stecknadel pro Tour. Kostet Overpass nichts. */
  useEffect(() => {
    if (art === "gipfel") return;   // Gipfel bringen ihre eigene Suche mit – hier gibt es nichts zu verorten
    let aktiv = true;
    (async () => {
      const l = art === "rad" ? RAD : FUSS;
      for (const w of l) {
        const key = art + ":" + w.q;
        if (!aktiv) return;
        const g = merk[key];
        if (g && g.lat != null) { setSpots((o) => ({ ...o, [key]: { lat: g.lat, lon: g.lon } })); continue; }
        try {
          const c = await orten(w.r);
          if (!aktiv) return;
          if (c) setSpots((o) => ({ ...o, [key]: c }));
        } catch (e) { /* still übergehen – Nadel fehlt dann eben */ }
        await new Promise((r) => setTimeout(r, 120));
      }
    })();
    return () => { aktiv = false; };
    // eslint-disable-next-line
  }, [art]);

  /* Liste kommt aus der kuratierten Tabelle – sofort da, ohne Netz. */
  const liste = (art === "rad" ? RAD : FUSS).map((w) => ({ ...w, art, key: art + ":" + w.q }));
  const laender = Array.from(new Set(liste.map((w) => w.bl))).sort((a2, b2) => a2.localeCompare(b2, "de"));
  const nq = norm(q).trim();
  /* „nur passend“ greift erst, wenn die Eckdaten bekannt sind (geladen oder gemerkt).
     Unbekannte bleiben sichtbar – sonst würde die Liste beim ersten Besuch leer sein. */
  const passt = (w) => {
    if (w.art === "rad" || !nurPassend) return true;
    const d = merk[w.key] || (lad[w.key] && !lad[w.key].fehler ? lad[w.key] : null);
    if (!d || d.km == null) return true;
    return d.rund && d.km <= MAX_KM;
  };
  const treffer = liste.filter((w) => (land === "alle" || w.bl === land) && passt(w) && (!nq || norm(w.n + " " + w.r + " " + w.bl + " " + w.a).includes(nq)));
  const gefiltert = liste.filter((w) => (land === "alle" || w.bl === land) && !passt(w)).length;
  const gemerkt = liste.filter((w) => merk[w.key]).length;

  const info = (w) => (lad[w.key] && !lad[w.key].fehler ? lad[w.key] : null);
  /* Eckdaten: frisch geladen ODER aus dem Merkspeicher (dann ohne Verlauf). */
  const eck = (w) => info(w) || merk[w.key] || null;

  async function waehle(w) {
    const neu = sel === w.key ? null : w.key;
    setSel(neu); setMenuFor(null);
    if (!neu || lad[w.key] || busy) return;
    setBusy(w.key);
    try {
      const d = await ladeRoute(w);                 // erst warten …
      setLad((o) => ({ ...o, [w.key]: d }));       // … dann setzen (Callback ist nicht async!)
      setSpots((o) => ({ ...o, [w.key]: { lat: d.lat, lon: d.lon } }));
      merkeWeg(w.key, d); setMerk(ladeMerk());
      /* Höhenmeter gleich mit – kein Extra-Knopf mehr. */
      setHmBusy(w.key);
      try {
        const h = await hoehenmeter(d.linien);
        if (h) { setHm((o) => ({ ...o, [w.key]: h })); merkeWeg(w.key, { ...d, hm: h.auf }); setMerk(ladeMerk()); }
      } catch (e2) { setHm((o) => ({ ...o, [w.key]: { fehler: true } })); }
      finally { setHmBusy(null); }
    } catch (e) { setLad((o) => ({ ...o, [w.key]: { fehler: e.message || String(e) } })); }
    finally { setBusy(null); }
  }

  async function hoehen(w) {
    const d = info(w);
    if (!d || hmBusy || hm[w.key]) return;
    setHmBusy(w.key);
    try { const h = await hoehenmeter(d.linien); if (h) setHm((o) => ({ ...o, [w.key]: h })); }
    catch (e) { setHm((o) => ({ ...o, [w.key]: { fehler: true } })); }
    finally { setHmBusy(null); }
  }

  const auf = (w) => (hm[w.key] && !hm[w.key].fehler ? hm[w.key].auf : (merk[w.key] && merk[w.key].hm != null ? merk[w.key].hm : null));
  const zeitVon = (w) => { const d = eck(w); return d && d.km && w.art === "fuss" ? gehzeit(d.km, auf(w)) : null; };
  const infoText = (w) => { const d = eck(w); return [w.art === "rad" ? "Radroute" : "Rundwanderweg", w.a, d && d.km ? d.km + " km" : "", auf(w) ? auf(w) + " Hm" : "", zeitVon(w) ? "ca. " + hStr(zeitVon(w)) : ""].filter(Boolean).join(" · "); };
  const sug = (w) => { const d = eck(w), sp = spots[w.key]; return { name: w.n, gebiet: w.r + ", " + w.bl, info: infoText(w), lat: d && d.lat != null ? d.lat : (sp ? sp.lat : null), lon: d && d.lon != null ? d.lon : (sp ? sp.lon : null), kategorie: w.art === "rad" ? "radtour" : "wanderung" }; };
  const merke = (w, t) => { setDone((o) => ({ ...o, [w.key]: t })); setMenuFor(null); };
  const nurIdeen = !!onAdd && !onCreateTrip && !(onAddToTrip && trips && trips.length);
  const hatAktion = !!(onAdd || onCreateTrip || (onAddToTrip && trips && trips.length));

  /* Karte: nur der ausgewählte, geladene Weg. useMemo, sonst zoomt sie bei jedem Render neu. */
  const selDaten = sel && lad[sel] && !lad[sel].fehler ? lad[sel] : null;
  const fc = useMemo(() => {
    if (!selDaten) return null;
    return { type: "FeatureCollection", features: [{ type: "Feature", properties: { id: selDaten.id, name: selDaten.name }, geometry: { type: "MultiLineString", coordinates: selDaten.linien.map((g) => g.map((p) => [p.lon, p.lat])) } }] };
  }, [selDaten]);

  const chip = (on) => "rounded-full px-3 py-1.5 text-xs font-medium transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300");
  const zeile = "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 transition hover:bg-emerald-50 dark:text-stone-200 dark:hover:bg-stone-800";

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
        {art === "gipfel"
          ? <><Mountain className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Gipfel ohne Steigeisen</>
          : <><Award className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Favoriten nach Bundesland</>}
      </div>
      {art !== "gipfel" && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Ausgezeichnete Touren aus ganz Deutschland. Eine antippen – Verlauf und Länge werden dann geladen.</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => { setArt("fuss"); setSel(null); setLand("alle"); }} className={chip(art === "fuss")}><Footprints className="mr-1 inline h-3 w-3" />Zu Fuß ({FUSS.length})</button>
        <button onClick={() => { setArt("rad"); setSel(null); setLand("alle"); }} className={chip(art === "rad")}><Bike className="mr-1 inline h-3 w-3" />Fahrrad ({RAD.length})</button>
        <button onClick={() => { setArt("gipfel"); setSel(null); setMenuFor(null); }} className={chip(art === "gipfel")}><Mountain className="mr-1 inline h-3 w-3" />Gipfel</button>
      </div>

      {art === "gipfel" ? <><BeliebteBerge onAdd={onAdd} onCreateTrip={onCreateTrip} trips={trips} onAddToTrip={onAddToTrip} /><GipfelSuche onAdd={onAdd} onCreateTrip={onCreateTrip} trips={trips} onAddToTrip={onAddToTrip} /></> : (<>

      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 dark:border-stone-700 dark:bg-stone-900">
          <Search className="h-4 w-4 shrink-0 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen – Name, Region, Bundesland …" className="w-full bg-transparent py-2 text-sm focus:outline-none" />
          {q && <button onClick={() => setQ("")} className="shrink-0 p-1 text-stone-400"><X className="h-3.5 w-3.5" /></button>}
        </span>
      </div>

      {art === "fuss" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={() => setNurPassend((v) => !v)} className={chip(nurPassend)}><Repeat className="mr-1 inline h-3 w-3" />nur Rundwege bis {MAX_KM} km</button>
          {gefiltert > 0 && <span className="text-xs text-stone-400 dark:text-stone-500">{gefiltert} ausgeblendet</span>}
          {gemerkt > 0 && <span className="text-xs text-stone-400 dark:text-stone-500">· {gemerkt} bekannt</span>}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button onClick={() => setLand("alle")} className={chip(land === "alle")}>alle ({liste.length})</button>
        {laender.map((b2) => <button key={b2} onClick={() => setLand(b2)} className={chip(land === b2)}>{b2} ({liste.filter((w) => w.bl === b2).length})</button>)}
      </div>

      <div className="mt-3">
        <Wegkarte
          geojson={fc}
          spots={treffer.map((w) => ({ id: w.key, name: w.n, kategorie: w.art === "rad" ? "radtour" : "wanderung", lat: spots[w.key] ? spots[w.key].lat : null, lon: spots[w.key] ? spots[w.key].lon : null })).filter((p) => p.lat != null)}
          selectedId={sel}
          onSelect={(k) => { const w = liste.find((x) => x.key === k); if (w) waehle(w); }}
          name={selDaten ? selDaten.name : `${treffer.length} Touren auf der Karte`}
          hoehe="360px"
        />
        <div className="mt-1 text-center text-xs text-stone-400 dark:text-stone-500">
          {busy ? "Verlauf wird geladen …" : selDaten ? "Nochmal antippen schließt den Verlauf." : "Nadel antippen – der Verlauf wird dann geladen."}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {treffer.map((w) => {
          const aktiv = sel === w.key;
          const d = eck(w);
          const f = lad[w.key] && lad[w.key].fehler;
          const h = hm[w.key];
          return (
            <div key={w.key} className={"rounded-lg px-2.5 py-2 text-sm transition " + (aktiv ? "bg-emerald-50 ring-1 ring-emerald-300 dark:bg-emerald-950 dark:ring-emerald-700" : "bg-stone-50 dark:bg-stone-800")}>
              <div className="flex items-center gap-2">
                <button onClick={() => waehle(w)} className="min-w-0 flex-1 text-left">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-stone-800 dark:text-stone-100">{w.n}</span>
                    <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (w.top ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300")}>{w.a}</span>
                    {d && d.rund && <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300"><Repeat className="h-3 w-3" /> Rundweg</span>}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-stone-500 dark:text-stone-400">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {w.bl} · {w.r}</span>
                    {d && <span className="inline-flex items-center gap-1"><Ruler className="h-3 w-3" /> {d.km} km{d.km > MAX_KM && w.art === "fuss" ? " (über " + MAX_KM + ")" : ""}</span>}
                    {h && !h.fehler && <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {h.auf} Hm</span>}
                    {zeitVon(w) && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> ca. {hStr(zeitVon(w))}</span>}
                    {busy === w.key && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> lädt …</span>}
                    {f && <span className="text-rose-600">{lad[w.key].fehler}</span>}
                  </span>
                </button>
                {done[w.key]
                  ? <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /> {done[w.key]}</span>
                  : hatAktion && <button onClick={() => (nurIdeen ? (onAdd(sug(w)), merke(w, "in Ideen")) : setMenuFor(menuFor === w.key ? null : w.key))} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800">{menuFor === w.key ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {nurIdeen ? "Hinzufügen" : "Übernehmen"}</button>}
              </div>

              {aktiv && d && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {hmBusy === w.key && <span className="inline-flex items-center gap-1 text-xs text-stone-400"><Loader2 className="h-3 w-3 animate-spin" /> Höhenmeter …</span>}
                  {h && h.fehler && <span className="text-xs text-rose-600">Höhenmodell nicht erreichbar.</span>}
                  {h && !h.fehler && <span className="text-xs text-stone-500 dark:text-stone-400">{h.auf} Hm Aufstieg · {h.min}–{h.max} m ü. NN <span className="text-stone-400 dark:text-stone-500">(90-m-Modell – Schätzung)</span></span>}
                  <a href={"https://www.openstreetmap.org/relation/" + d.id} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-stone-400 transition hover:text-emerald-700 dark:text-stone-500">auf OpenStreetMap <ExternalLink className="h-3 w-3" /></a>
                </div>
              )}

              {menuFor === w.key && (
                <div className="mt-2 space-y-1 rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900">
                  {onAddToTrip && trips && trips.length > 0 && (<>
                    <div className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">Zu einer Reise heften</div>
                    {trips.slice(0, 8).map((t) => (
                      <button key={t.id} onClick={() => { onAddToTrip(t.id, sug(w)); merke(w, "zu " + (t.name || "Reise")); }} className={zeile}>
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> <span className="min-w-0 truncate">{t.name || "Reise"}</span>
                      </button>
                    ))}
                  </>)}
                  {onCreateTrip && <button onClick={() => { onCreateTrip({ name: w.n, gebiet: w.r + ", " + w.bl, info: infoText(w), anreiseart: "auto", von: "Celle", nach: w.r, items: [sug(w)] }); merke(w, "neue Reise"); }} className={zeile + " font-medium"}><CalendarPlus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> Neue Reise daraus erstellen</button>}
                  {onAdd && <button onClick={() => { onAdd(sug(w)); merke(w, "in Ideen"); }} className={zeile}><Plus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> In Ideen merken</button>}
                </div>
              )}
            </div>
          );
        })}
        {treffer.length === 0 && <div className="rounded-lg bg-stone-50 px-3 py-3 text-sm text-stone-500 dark:bg-stone-800 dark:text-stone-400">Nichts gefunden – Suche leeren oder anderes Bundesland wählen.</div>}
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>
        <b>Zu Fuß:</b> Publikumswahl „Deutschlands Schönster Wanderweg" (Wandermagazin, seit 2006; 2026 mit 52.911 Stimmen) – Tagestouren, überwiegend Rundwege bis {MAX_KM} km. Dazu für die Region: die <b>Heideschleifen</b> im Naturpark Südheide (Landkreis Celle) – seit 2021 zertifizierte Qualitäts-Rundwege am Heidschnuckenweg, keine Publikumswahl, aber eine offizielle Auszeichnung. Aufgenommen sind nur belegte Namen; die vollständigen 23 Südheide-Touren stehen auf region-celle-navigator.de.
        <b> Rad:</b> ADFC-Radreiseanalyse (zuletzt über 17.300 Radfahrende) – das sind <b>Radfernwege über hunderte Kilometer</b>, keine 20-km-Runden; ein Gegenstück zur DSW-Wahl gibt es fürs Rad nicht. Platzierungen wechseln jährlich, deshalb nur die Auszeichnung statt einer erfundenen Position. Für die Region zusätzlich der <b>Aller-Radweg</b> (325 km, quer durch den Landkreis Celle) – keine ADFC-Platzierung, aber ein durchgängig ausgeschilderter Radfernweg. Die 10 lokalen Rad-Thementouren des Naturparks Südheide (424 km) sind meist keine benannten OSM-Relationen und stehen vollständig auf region-celle-navigator.de.
        Kuratiert sind nur Name, Bundesland und Auszeichnung – <b>Länge und Verlauf kommen beim Antippen live aus OpenStreetMap</b> (ODbL). Alles auf einmal zu laden hat den freien Overpass-Server überlastet, deshalb einzeln.
        Rundweg wird aus dem Verlauf erkannt. <b>Höhenmeter sind eine Schätzung</b> (Open-Meteo, 90-m-Modell), sie werden beim Antippen automatisch berechnet. Gehzeit nach DIN 33466.
        Einmal geladene Eckdaten bleiben gespeichert – dann filtert die Liste sofort richtig.
        <b>Nicht jedes Bundesland ist dabei:</b> Bei den Tagestouren gab es bislang keine DSW-Gewinner in Brandenburg, Bremen, Hamburg, Hessen, Mecklenburg-Vorpommern, Saarland, Sachsen-Anhalt und Berlin – deren Gewinnerwege (z. B. Habichtswaldsteig/Hessen, Bliessteig/Saarland) sind Mehrtagestouren. Erfundene Ergänzungen gibt es hier nicht.
        Ohne Gewähr.
      </span></div>

      </>)}
    </section>
  );
}
