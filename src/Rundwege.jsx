/*
  Rundwege.jsx — Favoriten pro Bundesland: Wandern & Radfahren
  -------------------------------------------------------------
  „Favoriten" ist ein Urteil – deshalb NICHT mein Geschmack, sondern belegte Quellen:

   ZU FUSS: Publikumswahl „Deutschlands Schönster Wanderweg" (Wandermagazin, seit 2006;
     2026 mit 52.911 Stimmen, Finalisten von einer Fachjury aus über 100 Bewerbungen).
     Filter nach Vorgabe: nur Rundwege, maximal 20 km.

   RAD: ADFC-Radreiseanalyse (jährliche Umfrage, zuletzt über 17.300 Radfahrende).
     EHRLICH: Das sind RADFERNWEGE (hunderte km), keine 20-km-Runden – ein Gegenstück
     zur DSW-Wahl gibt es fürs Rad nicht. Die Platzierung ändert sich jährlich, deshalb
     steht hier nur „ADFC-Top-Radfernweg", keine erfundene Position.
     Weil so eine Route zigtausend Punkte hat, wird der Verlauf erst BEIM ANTIPPEN geladen.

  KURATIERT sind nur Name, Bundesland und Auszeichnung. Alles Zahlenmäßige kommt live:
   • Verlauf & Länge -> OpenStreetMap/Overpass (aus der Geometrie berechnet, ODbL)
   • Rundweg         -> aus dem Verlauf erkannt (Start ≈ Ziel), nicht aus dem Tag
   • Höhenmeter      -> Open-Meteo Elevation (90-m-Modell, Copernicus DEM) = Schätzung
   • Gehzeit         -> DIN 33466 aus Länge + berechnetem Aufstieg

  EINBAU: <Rundwege onAdd={…} onCreateTrip={…} trips={…} onAddToTrip={…} />
*/
import React, { useState } from "react";
import { Award, Loader2, Info, Plus, Check, CalendarPlus, X, Clock, Repeat, Ruler, MapPin, TrendingUp, ExternalLink, Search, Footprints, Bike } from "lucide-react";
import Wegkarte from "./Wegkarte.jsx";

const MAX_KM = 20;

const BL = ["Baden-Württemberg", "Bayern", "Brandenburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"];

/* q = Suchbegriff für OSM (Regex, i) – der markanteste Namensteil. */
const FUSS = [
  { q: "Wildes.?Wasser.?Weg", n: "Wildes-Wasser-Weg Bodenmais", r: "Bayerischer Wald", bl: "Bayern", a: "DSW-Sieger 2026", top: true },
  { q: "Büsenbachtal", n: "Heideschleife Büsenbachtal", r: "Lüneburger Heide", bl: "Niedersachsen", a: "DSW-Sieger 2025", top: true },
  { q: "Wasserfall-?Erlebnisroute", n: "Wasserfall-Erlebnisroute", r: "Vulkaneifel", bl: "Rheinland-Pfalz", a: "DSW 2023, Platz 1", top: true },
  { q: "Auenlandweg", n: "Auenlandweg", r: "Westerwald", bl: "Rheinland-Pfalz", a: "DSW 2023, Platz 2" },
  { q: "Lecker Pfädchen", n: "Lecker Pfädchen", r: "Hunsrück", bl: "Rheinland-Pfalz", a: "DSW 2023, Platz 3" },
  { q: "hochgehpilgert", n: "Hochgehberge – hochgehpilgert", r: "Schwäbische Alb", bl: "Baden-Württemberg", a: "DSW-Finalist 2026" },
  { q: "MaareGlück|Maaregluck", n: "HeimatSpur MaareGlück", r: "Eifel", bl: "Rheinland-Pfalz", a: "DSW-Finalist 2026" },
  { q: "Felsenwald", n: "Felsenwald", r: "Pfalz", bl: "Rheinland-Pfalz", a: "DSW-Finalist 2026" },
  { q: "Eichstätter Panoramaweg", n: "Eichstätter Panoramaweg", r: "Altmühltal", bl: "Bayern", a: "DSW-Finalist 2026" },
  { q: "Pfälzer Hüttentour", n: "Pfälzer Hüttentour", r: "Pfalz", bl: "Rheinland-Pfalz", a: "DSW-Finalist 2026" },
  { q: "Wurzacher Ried|Moor-Weg", n: "Moor-Weg – Ried pur erleben", r: "Wurzacher Ried", bl: "Baden-Württemberg", a: "DSW-Finalist 2026" },
  { q: "Tecklenburger Bergpfad", n: "Teutoschleife Tecklenburger Bergpfad", r: "Münsterland", bl: "Nordrhein-Westfalen", a: "DSW-Finalist 2026" },
  { q: "Altlayer", n: "Traumschleife Altlayer Schweiz", r: "Saar-Hunsrück", bl: "Rheinland-Pfalz", a: "DSW-Finalist 2026" },
  { q: "Nehmtener Horn", n: "Rundweg Nehmtener Horn", r: "Holsteinische Schweiz", bl: "Schleswig-Holstein", a: "DSW-Finalist 2026" },
  { q: "hochgehadelt", n: "Hochgehberge – hochgehadelt", r: "Schwäbische Alb", bl: "Baden-Württemberg", a: "DSW 2023, Platz 4" },
  { q: "Spittergrund", n: "Rundweg Spittergrund", r: "Thüringer Wald", bl: "Thüringen", a: "DSW 2023, Platz 5" },
  { q: "Hahnfels", n: "Hahnfels-Tour", r: "Pfalz", bl: "Rheinland-Pfalz", a: "DSW 2023, Platz 6" },
  { q: "Blaubeer", n: "Blaubeer-Route", r: "Teutoburger Wald", bl: "Nordrhein-Westfalen", a: "DSW 2023, Platz 7" },
  { q: "Karlsruher Grat", n: "Genießerpfad Karlsruher Grat", r: "Schwarzwald", bl: "Baden-Württemberg", a: "DSW 2023, Platz 8" },
  { q: "Extratour Michelsberg", n: "Extratour Michelsberg", r: "Rhön", bl: "Bayern", a: "DSW 2023, Platz 9" },
  { q: "Leitzachtaler", n: "Leitzachtaler Bergblicke", r: "Bayerische Voralpen", bl: "Bayern", a: "DSW 2023, Platz 10" },
  { q: "3-?Schluchten|Drei-?Schluchten", n: "Genießerpfad 3-Schluchten-Tour", r: "Schwarzwald", bl: "Baden-Württemberg", a: "DSW 2023, Platz 11" },
  { q: "Gipfelwanderweg Suhl", n: "Gipfelwanderweg Suhl", r: "Thüringer Wald", bl: "Thüringen", a: "DSW 2023, Platz 12" },
  { q: "Steinway", n: "Steinway-Trail", r: "Harz", bl: "Niedersachsen", a: "DSW 2023, Platz 13" },
  { q: "Durbacher Weitblick", n: "Genießerpfad Durbacher Weitblick", r: "Schwarzwald", bl: "Baden-Württemberg", a: "DSW 2023, Platz 14" },
  { q: "Treidlerweg", n: "Treidlerweg", r: "Pfalz", bl: "Rheinland-Pfalz", a: "DSW 2023, Platz 15" },
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
async function jpost(url, body, ms = 90000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { method: "POST", body, signal: c.signal, headers: { "Content-Type": "text/plain" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
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

/* Fuß: Geometrie für alle (Tagestouren sind klein) -> Linien auf der Deutschlandkarte.
   Rad: nur Mittelpunkt (Radfernwege haben zigtausend Punkte) -> Verlauf beim Antippen. */
async function ladeAlle(art) {
  const liste = art === "rad" ? RAD : FUSS;
  const typ = art === "rad" ? "bicycle" : "hiking";
  const teile = liste.map((w) => `rel(area.de)["route"="${typ}"]["name"~"${w.q}",i];`).join("");
  const raus = art === "rad" ? "out tags center 60;" : "out geom;";
  const q = `[out:json][timeout:90];area["ISO3166-1"="DE"][admin_level=2]->.de;(${teile});${raus}`;
  const o = await jpost("https://overpass-api.de/api/interpreter", q);
  const els = (o && o.elements) || [];
  const wege = [], features = [];
  let zuLang = 0, keinRund = 0, fehlt = 0;
  for (const w of liste) {
    const re = new RegExp(w.q, "i");
    const rel = els.find((e) => e.tags && e.tags.name && re.test(e.tags.name));
    if (!rel) { fehlt++; continue; }
    const basis = { id: rel.id, name: rel.tags.name || w.n, kurz: w.n, region: w.r, bl: w.bl, auszeichnung: w.a, top: !!w.top, art };
    if (art === "rad") {
      const d = rel.tags.distance ? parseFloat(String(rel.tags.distance).replace(",", ".")) : null;
      const c = rel.center;
      if (!c) { fehlt++; continue; }
      wege.push({ ...basis, km: d && isFinite(d) ? Math.round(d) : null, rund: rel.tags.roundtrip === "yes", lat: c.lat, lon: c.lon, linien: null });
      continue;
    }
    const ls = linienVon(rel);
    if (!ls.length) { fehlt++; continue; }
    const km = Math.round(laengeVon(ls) * 10) / 10;
    const rund = rundVon(ls) || rel.tags.roundtrip === "yes";
    if (!rund) { keinRund++; continue; }
    if (km > MAX_KM) { zuLang++; continue; }
    const mitte = ls[Math.floor(ls.length / 2)][0];
    wege.push({ ...basis, km, rund, lat: mitte.lat, lon: mitte.lon, linien: ls, zeit: gehzeit(km, null) });
    features.push({ type: "Feature", properties: { id: rel.id, name: rel.tags.name }, geometry: { type: "MultiLineString", coordinates: ls.map((g) => g.map((p) => [p.lon, p.lat])) } });
  }
  wege.sort((x, y) => (y.top ? 1 : 0) - (x.top ? 1 : 0) || x.bl.localeCompare(y.bl, "de") || x.kurz.localeCompare(y.kurz, "de"));
  return { wege, fc: { type: "FeatureCollection", features }, zuLang, keinRund, fehlt };
}

/* Verlauf einer einzelnen Route – für Rad (beim Antippen) */
async function ladeGeomEinzeln(id) {
  const o = await jpost("https://overpass-api.de/api/interpreter", `[out:json][timeout:90];relation(id:${id});out geom;`, 60000);
  const rel = ((o && o.elements) || [])[0];
  if (!rel) throw new Error("Verlauf nicht gefunden");
  const ls = linienVon(rel);
  if (!ls.length) throw new Error("kein Verlauf in OSM");
  return ls;
}

const norm = (x) => String(x || "").toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");

export default function Rundwege({ onAdd, onCreateTrip, trips, onAddToTrip }) {
  const [art, setArt] = useState("fuss");
  const [daten, setDaten] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [land, setLand] = useState("alle");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [done, setDone] = useState({});
  const [hm, setHm] = useState({});
  const [hmBusy, setHmBusy] = useState(null);
  const [geo, setGeo] = useState({});
  const [geoBusy, setGeoBusy] = useState(null);

  const data = daten[art] || null;

  async function laden(a2) {
    const A = a2 || art;
    if (busy || daten[A]) { setArt(A); return; }
    setBusy(true); setErr(""); setArt(A);
    try {
      const d = await ladeAlle(A);
      setDaten((o) => ({ ...o, [A]: d }));
      if (!d.wege.length) setErr("In OpenStreetMap ist davon gerade nichts auffindbar.");
    } catch (e) { setErr("Konnte nicht laden (Overpass): " + (e.message || e)); }
    finally { setBusy(false); }
  }

  async function waehle(w) {
    const neu = sel === w.id ? null : w.id;
    setSel(neu); setMenuFor(null);
    if (neu && w.art === "rad" && !geo[w.id] && !geoBusy) {
      setGeoBusy(w.id);
      try { setGeo((o) => ({ ...o, [w.id]: await ladeGeomEinzeln(w.id) })); }
      catch (e) { setGeo((o) => ({ ...o, [w.id]: "fehler" })); }
      finally { setGeoBusy(null); }
    }
  }
  const linienVonWeg = (w) => (w.art === "rad" ? (Array.isArray(geo[w.id]) ? geo[w.id] : null) : w.linien);

  async function hoehen(w) {
    const ls = linienVonWeg(w);
    if (!ls || hmBusy || hm[w.id]) return;
    setHmBusy(w.id);
    try { const h = await hoehenmeter(ls); if (h) setHm((o) => ({ ...o, [w.id]: h })); }
    catch (e) { setHm((o) => ({ ...o, [w.id]: { fehler: true } })); }
    finally { setHmBusy(null); }
  }

  const auf = (w) => (hm[w.id] && !hm[w.id].fehler ? hm[w.id].auf : null);
  const zeitVon = (w) => (w.art === "rad" ? null : gehzeit(w.km, auf(w)));
  const infoText = (w) => [w.art === "rad" ? "Radroute" : "Rundwanderweg", w.auszeichnung, w.km ? w.km + " km" : "", auf(w) ? auf(w) + " Hm" : "", zeitVon(w) ? "ca. " + hStr(zeitVon(w)) : ""].filter(Boolean).join(" · ");
  const sug = (w) => ({ name: w.kurz, gebiet: w.region + ", " + w.bl, info: infoText(w), lat: w.lat, lon: w.lon, kategorie: "wanderung" });
  const merke = (w, t) => { setDone((d) => ({ ...d, [w.id]: t })); setMenuFor(null); };
  const nurIdeen = !!onAdd && !onCreateTrip && !(onAddToTrip && trips && trips.length);
  const hatAktion = !!(onAdd || onCreateTrip || (onAddToTrip && trips && trips.length));

  const alle = (data && data.wege) || [];
  const laender = Array.from(new Set(alle.map((w) => w.bl))).sort((a2, b2) => a2.localeCompare(b2, "de"));
  const nq = norm(q).trim();
  const treffer = alle.filter((w) => (land === "alle" || w.bl === land) && (!nq || norm(w.kurz + " " + w.region + " " + w.bl + " " + w.auszeichnung).includes(nq)));

  /* Karte: Fuß = alle Linien; Rad = der geladene, ausgewählte Verlauf */
  let fc = null;
  if (art === "fuss" && data) {
    const ids = new Set(treffer.map((w) => w.id));
    fc = { type: "FeatureCollection", features: data.fc.features.filter((f) => ids.has(f.properties.id)) };
    if (!fc.features.length) fc = null;
  } else if (art === "rad" && sel) {
    const w = alle.find((x) => x.id === sel), ls = w && linienVonWeg(w);
    if (ls) fc = { type: "FeatureCollection", features: [{ type: "Feature", properties: { id: w.id, name: w.name }, geometry: { type: "MultiLineString", coordinates: ls.map((g) => g.map((p) => [p.lon, p.lat])) } }] };
  }

  const chip = (on) => "rounded-full px-3 py-1.5 text-xs font-medium transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300");
  const zeile = "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 transition hover:bg-emerald-50 dark:text-stone-200 dark:hover:bg-stone-800";

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100"><Award className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Favoriten nach Bundesland</div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Ausgezeichnete Touren aus ganz Deutschland – antippen zeigt den Verlauf auf der Karte.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => laden("fuss")} className={chip(art === "fuss")}><Footprints className="mr-1 inline h-3 w-3" />Zu Fuß</button>
        <button onClick={() => laden("rad")} className={chip(art === "rad")}><Bike className="mr-1 inline h-3 w-3" />Fahrrad</button>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-stone-400" />}
      </div>

      {!data && !busy && (
        <button onClick={() => laden()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
          <Award className="h-4 w-4" /> Touren laden
        </button>
      )}
      {err && <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err}</div>}

      {data && alle.length > 0 && (
        <>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 dark:border-stone-700 dark:bg-stone-900">
              <Search className="h-4 w-4 shrink-0 text-stone-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen – Name, Region, Bundesland …" className="w-full bg-transparent py-2 text-sm focus:outline-none" />
              {q && <button onClick={() => setQ("")} className="shrink-0 p-1 text-stone-400"><X className="h-3.5 w-3.5" /></button>}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <button onClick={() => setLand("alle")} className={chip(land === "alle")}>alle ({alle.length})</button>
            {laender.map((b2) => <button key={b2} onClick={() => setLand(b2)} className={chip(land === b2)}>{b2} ({alle.filter((w) => w.bl === b2).length})</button>)}
          </div>

          <div className="mt-3">
            {fc
              ? <Wegkarte geojson={fc} name={art === "rad" ? (alle.find((x) => x.id === sel) || {}).kurz || "" : `${treffer.length} Rundwege`} selectedId={sel} onSelect={(id) => { const w = alle.find((x) => x.id === id); if (w) waehle(w); }} hoehe="360px" />
              : <div className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-xs text-stone-400 dark:border-stone-700 dark:text-stone-500">
                  {art === "rad" ? (geoBusy ? "Verlauf wird geladen …" : "Eine Route antippen – der Verlauf wird dann geladen (Radfernwege sind hunderte Kilometer lang).") : "Keine Treffer für die Auswahl."}
                </div>}
          </div>

          <div className="mt-3 space-y-1.5">
            {treffer.map((w) => {
              const aktiv = sel === w.id;
              const h = hm[w.id];
              const ls = linienVonWeg(w);
              return (
                <div key={w.id} className={"rounded-lg px-2.5 py-2 text-sm transition " + (aktiv ? "bg-emerald-50 ring-1 ring-emerald-300 dark:bg-emerald-950 dark:ring-emerald-700" : "bg-stone-50 dark:bg-stone-800")}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => waehle(w)} className="min-w-0 flex-1 text-left">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-stone-800 dark:text-stone-100">{w.kurz}</span>
                        <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (w.top ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300")}>{w.auszeichnung}</span>
                        {w.rund && <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300"><Repeat className="h-3 w-3" /> Rundweg</span>}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-stone-500 dark:text-stone-400">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {w.bl} · {w.region}</span>
                        {w.km != null && <span className="inline-flex items-center gap-1"><Ruler className="h-3 w-3" /> {w.km} km</span>}
                        {h && !h.fehler && <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {h.auf} Hm</span>}
                        {zeitVon(w) && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> ca. {hStr(zeitVon(w))}</span>}
                        {geoBusy === w.id && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Verlauf …</span>}
                      </span>
                    </button>
                    {done[w.id]
                      ? <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /> {done[w.id]}</span>
                      : hatAktion && <button onClick={() => (nurIdeen ? (onAdd(sug(w)), merke(w, "in Ideen")) : setMenuFor(menuFor === w.id ? null : w.id))} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800">{menuFor === w.id ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {nurIdeen ? "Hinzufügen" : "Übernehmen"}</button>}
                  </div>

                  {aktiv && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {ls && !h && <button onClick={() => hoehen(w)} disabled={hmBusy === w.id} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:border-emerald-300 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300">
                        {hmBusy === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />} Höhenmeter berechnen
                      </button>}
                      {geo[w.id] === "fehler" && <span className="text-xs text-rose-600">Verlauf nicht ladbar.</span>}
                      {h && h.fehler && <span className="text-xs text-rose-600">Höhenmodell nicht erreichbar.</span>}
                      {h && !h.fehler && <span className="text-xs text-stone-500 dark:text-stone-400">{h.auf} Hm Aufstieg · {h.min}–{h.max} m ü. NN <span className="text-stone-400 dark:text-stone-500">(aus {h.punkte} Messpunkten, 90-m-Modell – Schätzung)</span></span>}
                      <a href={"https://www.openstreetmap.org/relation/" + w.id} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-stone-400 transition hover:text-emerald-700 dark:text-stone-500">auf OpenStreetMap <ExternalLink className="h-3 w-3" /></a>
                    </div>
                  )}

                  {menuFor === w.id && (
                    <div className="mt-2 space-y-1 rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900">
                      {onAddToTrip && trips && trips.length > 0 && (<>
                        <div className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">Zu einer Reise heften</div>
                        {trips.slice(0, 8).map((t) => (
                          <button key={t.id} onClick={() => { onAddToTrip(t.id, sug(w)); merke(w, "zu " + (t.name || "Reise")); }} className={zeile}>
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> <span className="min-w-0 truncate">{t.name || "Reise"}</span>
                          </button>
                        ))}
                      </>)}
                      {onCreateTrip && <button onClick={() => { onCreateTrip({ name: w.kurz, gebiet: w.region + ", " + w.bl, info: infoText(w), anreiseart: "auto", von: "Celle", nach: w.region, items: [sug(w)] }); merke(w, "neue Reise"); }} className={zeile + " font-medium"}><CalendarPlus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> Neue Reise daraus erstellen</button>}
                      {onAdd && <button onClick={() => { onAdd(sug(w)); merke(w, "in Ideen"); }} className={zeile}><Plus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> In Ideen merken</button>}
                    </div>
                  )}
                </div>
              );
            })}
            {treffer.length === 0 && <div className="rounded-lg bg-stone-50 px-3 py-3 text-sm text-stone-500 dark:bg-stone-800 dark:text-stone-400">Nichts gefunden – Suche leeren oder anderes Bundesland wählen.</div>}
          </div>

          {(data.zuLang > 0 || data.keinRund > 0 || data.fehlt > 0) && (
            <div className="mt-2 text-xs text-stone-400 dark:text-stone-500">
              Nicht dabei: {[data.zuLang ? `${data.zuLang} über ${MAX_KM} km` : "", data.keinRund ? `${data.keinRund} kein Rundweg` : "", data.fehlt ? `${data.fehlt} in OSM nicht gefunden` : ""].filter(Boolean).join(" · ")}.
            </div>
          )}
        </>
      )}

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>
        <b>Zu Fuß:</b> Publikumswahl „Deutschlands Schönster Wanderweg" (Wandermagazin, seit 2006; 2026 mit 52.911 Stimmen) – nur Rundwege bis {MAX_KM} km.
        <b> Rad:</b> ADFC-Radreiseanalyse (jährliche Umfrage, zuletzt über 17.300 Radfahrende). Das sind <b>Radfernwege über hunderte Kilometer</b>, keine 20-km-Runden – ein Gegenstück zur DSW-Wahl gibt es fürs Rad nicht. Platzierungen wechseln jährlich, deshalb nur die Auszeichnung statt einer erfundenen Position; der Verlauf wird erst beim Antippen geladen.
        Kuratiert sind nur Name, Bundesland und Auszeichnung – Länge und Verlauf kommen live aus OpenStreetMap (ODbL), Rundweg wird aus dem Verlauf erkannt.
        <b> Höhenmeter sind eine Schätzung</b> (Open-Meteo, 90-m-Modell). Gehzeit nach DIN 33466. Ohne Gewähr.
      </span></div>
    </section>
  );
}
