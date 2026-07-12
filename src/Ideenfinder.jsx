/*
  Ideenfinder.jsx — "Ich weiß nicht wohin": Region nach Vorlieben finden (eigener Tab)
  ----------------------------------------------------------------------------------
  Du wählst Typ (Stadt/Natur), Interessen, Klima und Anreise (Auto max km / Bahn ab
  Hannover / Direktflug ab HAJ) -> die App rankt passende Europa-Regionen, mit
  Begründung und echter Erreichbarkeit.
  Matching läuft offline über eine kuratierte Regionsliste (Lage = Fakten, Charakter
  = Einordnung). Nur für die Treffer wird die echte Fahrzeit ab Celle (OSRM) geholt.
  Gratis, ohne Schlüssel, keine Geräte-Ortung.

  EINBAU: <Ideenfinder onAdd={(s) => onAdd(mkItem(
    { kategorie:"sehenswuerdigkeit", name:s.name, info:s.info, gebiet:s.gebiet, maps_suche:s.name },
    { day:null, order:0, lat:s.lat ?? null, lon:s.lon ?? null }
  ))} />
*/
import React, { useState, useRef } from "react";
import { Lightbulb, MapPin, Plus, Check, Loader2, Info, Car, Train, Plane, ArrowLeftRight, Clock, CalendarRange, CalendarPlus } from "lucide-react";

const enc = encodeURIComponent;
const CELLE = { la: 52.6226, lo: 10.0806 };
async function jget(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
function hav(aLa, aLo, bLa, bLo) {
  const R = 6371, r = Math.PI / 180, dLa = (bLa - aLa) * r, dLo = (bLo - aLo) * r;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(aLa * r) * Math.cos(bLa * r) * Math.sin(dLo / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}
function hm(min) { const h = Math.floor(min / 60), m = Math.round(min % 60); return h > 0 ? h + " h " + (m < 10 ? "0" + m : m) + " min" : m + " min"; }

const HAJ = [
  { n: "Frankfurt", la: 50.0379, lo: 8.5622, air: "Lufthansa" }, { n: "München", la: 48.3538, lo: 11.7861, air: "Lufthansa" },
  { n: "London", la: 51.4700, lo: -0.4543, air: "British Airways" }, { n: "Kopenhagen", la: 55.6180, lo: 12.6508, air: "SAS" },
  { n: "Istanbul", la: 41.2753, lo: 28.7519, air: "Turkish Airlines" }, { n: "Palma", la: 39.5517, lo: 2.7388, air: "TUI fly u. a." },
  { n: "Antalya", la: 36.8987, lo: 30.8005, air: "TUI fly u. a." }, { n: "Gran Canaria", la: 27.9319, lo: -15.3866, air: "TUI fly" },
  { n: "Teneriffa", la: 28.0445, lo: -16.5725, air: "TUI fly" }, { n: "Fuerteventura", la: 28.4527, lo: -13.8638, air: "TUI fly" },
  { n: "Nizza", la: 43.6584, lo: 7.2159, air: "Eurowings" }, { n: "Alicante", la: 38.2822, lo: -0.5581, air: "Eurowings" },
  { n: "Lissabon", la: 38.7742, lo: -9.1342, air: "Eurowings" }, { n: "Pula", la: 44.8935, lo: 13.9222, air: "Eurowings" },
  { n: "Bozen", la: 46.4602, lo: 11.3264, air: "SkyAlps" },
];
function flugMatch(c) {
  let best = null; for (const a of HAJ) { const d = hav(c.la, c.lo, a.la, a.lo); if (!best || d < best.d) best = { ...a, d }; }
  return best && best.d <= 150 ? best : null;
}

async function celleStation() {
  const loc = await jget(`https://v6.db.transport.rest/locations?query=Celle&results=1&stops=true&addresses=false&poi=false`);
  const st = Array.isArray(loc) && loc[0]; if (!st || !st.id) throw new Error("Start unklar"); return st.id;
}
async function ladeBahn(la, lo, fromId) {
  const nb = await jget(`https://v6.db.transport.rest/stops/nearby?latitude=${la}&longitude=${lo}&results=1`);
  const dest = Array.isArray(nb) && nb[0]; if (!dest || !dest.id) throw new Error("kein Bahnhof in Zielnahe");
  const jr = await jget(`https://v6.db.transport.rest/journeys?from=${fromId}&to=${dest.id}&results=4&stopovers=false&language=de`);
  const journeys = (jr && jr.journeys) || [];
  let best = null;
  for (const j of journeys) {
    const legs = (j.legs || []).filter((l) => !l.walking);
    if (!legs.length) continue;
    const dep = new Date(legs[0].departure || legs[0].plannedDeparture);
    const arr = new Date(legs[legs.length - 1].arrival || legs[legs.length - 1].plannedArrival);
    const min = Math.round((arr - dep) / 60000);
    const umst = Math.max(0, legs.length - 1);
    if (!best || min < best.min) best = { min, umst };
  }
  if (!best) throw new Error("keine Verbindung");
  return { station: dest.name, min: best.min, umst: best.umst };
}

// tags: natur,stadt,kultur,berge,wandern,strand,see,wein,kulinarik,wellness,roadtrip,panorama,ruhig,lebhaft,sonne,ski,guenstig
// waerme 1..5 (typische Wärme Nebensaison) · bahn: sinnvoll mit Bahn ab Hannover (ohne Flug)
const REGIONEN = [
  { name: "Südtirol & Dolomiten", la: 46.50, lo: 11.35, waerme: 3, bahn: true, blurb: "Berge, Wein, Wellness, Panoramastraßen – im Winter Ski.", tags: ["natur", "berge", "wandern", "wein", "kulinarik", "roadtrip", "panorama", "wellness", "ski"] },
  { name: "Gardasee", la: 45.66, lo: 10.72, waerme: 4, bahn: true, blurb: "Milder See zwischen Bergen, lebhaft und mediterran.", tags: ["natur", "see", "roadtrip", "wein", "lebhaft", "sonne"] },
  { name: "Tirol / Inntal", la: 47.27, lo: 11.39, waerme: 3, bahn: true, blurb: "Klassische Alpen: Wandern, Wellness, Schlösser, Ski.", tags: ["natur", "berge", "wandern", "wellness", "panorama", "roadtrip", "ruhig", "ski"] },
  { name: "Wallis / Zermatt", la: 46.02, lo: 7.75, waerme: 2, bahn: true, blurb: "Hochalpin: Matterhorn, Gletscher, Skifahren.", tags: ["natur", "berge", "wandern", "ski", "panorama"] },
  { name: "Salzkammergut (Hallstatt)", la: 47.56, lo: 13.65, waerme: 3, bahn: true, blurb: "Seen und Berge wie aus dem Bilderbuch.", tags: ["natur", "see", "berge", "kultur", "panorama", "ruhig", "ski"] },
  { name: "Toskana", la: 43.46, lo: 11.04, waerme: 4, bahn: false, blurb: "Hügel, Wein, Renaissance-Städte.", tags: ["kultur", "wein", "kulinarik", "stadt", "natur", "roadtrip", "sonne"] },
  { name: "Provence", la: 43.95, lo: 4.81, waerme: 4, bahn: false, blurb: "Lavendel, Sonne, Märkte und Dörfer.", tags: ["natur", "kultur", "wein", "roadtrip", "ruhig", "sonne"] },
  { name: "Côte d'Azur / Nizza", la: 43.70, lo: 7.27, waerme: 4, bahn: true, blurb: "Stadt am Meer, viel Sonne und Flair.", tags: ["stadt", "strand", "kultur", "lebhaft", "sonne"] },
  { name: "Amsterdam", la: 52.37, lo: 4.90, waerme: 2, bahn: true, blurb: "Grachten, Kultur, lebhaft – direkt per IC.", tags: ["stadt", "kultur", "lebhaft"] },
  { name: "Wien", la: 48.21, lo: 16.37, waerme: 3, bahn: true, blurb: "Kaffeehäuser, Kultur, Kulinarik.", tags: ["stadt", "kultur", "kulinarik"] },
  { name: "Prag", la: 50.08, lo: 14.44, waerme: 2, bahn: true, blurb: "Altstadt-Charme, günstig, lebhaft.", tags: ["stadt", "kultur", "lebhaft", "guenstig"] },
  { name: "Kopenhagen", la: 55.68, lo: 12.57, waerme: 2, bahn: true, blurb: "Design, Rad, entspannte Großstadt.", tags: ["stadt", "kultur", "lebhaft"] },
  { name: "Lissabon", la: 38.72, lo: -9.14, waerme: 4, bahn: false, blurb: "Licht, Hügel, Meer und Kulinarik.", tags: ["stadt", "kultur", "kulinarik", "lebhaft", "sonne"] },
  { name: "Schwarzwald", la: 48.27, lo: 8.18, waerme: 3, bahn: true, blurb: "Wälder, Wandern, Thermen, Genussstraßen, Ski am Feldberg.", tags: ["natur", "berge", "wandern", "wellness", "roadtrip", "ruhig", "ski"] },
  { name: "Elsass", la: 48.32, lo: 7.44, waerme: 3, bahn: true, blurb: "Fachwerk, Wein und feine Küche.", tags: ["kultur", "wein", "kulinarik", "roadtrip", "ruhig"] },
  { name: "Bodensee", la: 47.66, lo: 9.18, waerme: 3, bahn: true, blurb: "See, Rad, Inseln und Kultur.", tags: ["natur", "see", "kultur", "ruhig"] },
  { name: "Allgäu", la: 47.58, lo: 10.30, waerme: 3, bahn: true, blurb: "Alpen-Idylle, Schlösser, Wellness, Ski.", tags: ["natur", "berge", "wandern", "wellness", "ruhig", "ski"] },
  { name: "Berchtesgaden / Königssee", la: 47.63, lo: 12.99, waerme: 3, bahn: true, blurb: "Dramatische Berge und ein tiefgrüner See.", tags: ["natur", "berge", "wandern", "see", "panorama", "ski"] },
  { name: "Slowenien (Bled & Julische Alpen)", la: 46.37, lo: 14.11, waerme: 3, bahn: true, blurb: "Alpen und Seen, ruhig und günstig, Ski in Kranjska Gora.", tags: ["natur", "berge", "see", "wandern", "ruhig", "ski", "guenstig"] },
  { name: "Dalmatien (Split)", la: 43.51, lo: 16.44, waerme: 4, bahn: false, blurb: "Adria, Inseln, antike Städte.", tags: ["strand", "natur", "kultur", "sonne", "lebhaft"] },
  { name: "Istrien (Pula)", la: 44.87, lo: 13.85, waerme: 4, bahn: false, blurb: "Küste, Kulinarik, ruhige Buchten.", tags: ["strand", "natur", "kulinarik", "ruhig", "sonne"] },
  { name: "Mallorca", la: 39.62, lo: 2.99, waerme: 4, bahn: false, blurb: "Strände, Rad, Berge – viel Sonne.", tags: ["strand", "natur", "sonne", "lebhaft"] },
  { name: "Teneriffa / Kanaren", la: 28.29, lo: -16.62, waerme: 5, bahn: false, blurb: "Ganzjährig warm, Vulkan und Meer.", tags: ["strand", "natur", "wandern", "sonne"] },
  { name: "Madeira", la: 32.65, lo: -16.91, waerme: 5, bahn: false, blurb: "Ewiger Frühling, Wandern über dem Meer.", tags: ["natur", "wandern", "sonne", "ruhig"] },
  { name: "Andalusien (Sevilla)", la: 37.39, lo: -5.99, waerme: 4, bahn: false, blurb: "Maurische Kultur, Sonne, Kulinarik.", tags: ["stadt", "kultur", "kulinarik", "sonne"] },
  { name: "Norwegen-Fjorde", la: 60.47, lo: 7.00, waerme: 2, bahn: false, blurb: "Fjorde und Wasserfälle, große Natur.", tags: ["natur", "berge", "wandern", "panorama", "ruhig"] },
  { name: "Schottland-Highlands", la: 57.00, lo: -4.50, waerme: 2, bahn: false, blurb: "Weite, Berge, Whisky, dramatisch.", tags: ["natur", "berge", "wandern", "ruhig"] },
  { name: "Harz", la: 51.75, lo: 10.62, waerme: 2, bahn: true, blurb: "Nah, waldig, Wandern, Dampfbahn, etwas Ski.", tags: ["natur", "berge", "wandern", "ruhig", "ski"] },
  { name: "Sächsische Schweiz", la: 50.92, lo: 14.16, waerme: 3, bahn: true, blurb: "Sandsteintürme, Klettern, Aussichten.", tags: ["natur", "berge", "wandern", "panorama"] },
  { name: "Mosel", la: 49.98, lo: 7.13, waerme: 3, bahn: true, blurb: "Steilhang-Wein, Burgen, Radweg.", tags: ["wein", "natur", "roadtrip", "kulinarik", "ruhig"] },
  { name: "Bayerischer Wald", la: 49.00, lo: 13.20, waerme: 2, bahn: true, blurb: "Urwald, Ruhe, günstig, Wandern und Ski.", tags: ["natur", "wandern", "ruhig", "ski", "guenstig"] },
  { name: "Sylt / Nordsee", la: 54.90, lo: 8.31, waerme: 2, bahn: true, blurb: "Weite Strände, Dünen, Wellness.", tags: ["strand", "natur", "wellness", "ruhig"] },
  { name: "Rügen / Ostsee", la: 54.42, lo: 13.43, waerme: 2, bahn: true, blurb: "Kreidefelsen, Bäderarchitektur, Strand.", tags: ["strand", "natur", "ruhig", "kultur"] },
  { name: "Zürich & Schweiz", la: 47.37, lo: 8.54, waerme: 3, bahn: true, blurb: "See, Berge, Kultur – gehoben, Ski nah.", tags: ["stadt", "see", "berge", "kultur", "ski"] },
  { name: "Berlin", la: 52.52, lo: 13.40, waerme: 2, bahn: true, blurb: "Kultur pur, lebhaft, günstig.", tags: ["stadt", "kultur", "lebhaft", "guenstig"] },
];

const REISEINFO = {
  "Südtirol & Dolomiten": { tage: 6, zeit: "Juni–Okt · Ski Dez–März" },
  "Gardasee": { tage: 4, zeit: "Mai–Sep" },
  "Tirol / Inntal": { tage: 5, zeit: "Mai–Okt · Ski Dez–März" },
  "Wallis / Zermatt": { tage: 5, zeit: "Juni–Sep · Ski Dez–April" },
  "Salzkammergut (Hallstatt)": { tage: 5, zeit: "Mai–Okt" },
  "Toskana": { tage: 6, zeit: "April–Juni, Sep–Okt" },
  "Provence": { tage: 6, zeit: "Mai–Sep · Lavendel Juni–Juli" },
  "Côte d'Azur / Nizza": { tage: 5, zeit: "Mai–Sep" },
  "Amsterdam": { tage: 3, zeit: "April–Sep" },
  "Wien": { tage: 3, zeit: "ganzjährig" },
  "Prag": { tage: 3, zeit: "April–Okt" },
  "Kopenhagen": { tage: 3, zeit: "Mai–Sep" },
  "Lissabon": { tage: 4, zeit: "März–Okt" },
  "Schwarzwald": { tage: 5, zeit: "Mai–Okt · Ski Jan–Feb" },
  "Elsass": { tage: 4, zeit: "April–Okt · Advent Dez" },
  "Bodensee": { tage: 4, zeit: "Mai–Sep" },
  "Allgäu": { tage: 5, zeit: "Mai–Okt" },
  "Berchtesgaden / Königssee": { tage: 4, zeit: "Mai–Okt" },
  "Slowenien (Bled & Julische Alpen)": { tage: 5, zeit: "Mai–Okt" },
  "Dalmatien (Split)": { tage: 6, zeit: "Mai–Sep" },
  "Istrien (Pula)": { tage: 5, zeit: "Mai–Sep" },
  "Mallorca": { tage: 7, zeit: "April–Okt" },
  "Teneriffa / Kanaren": { tage: 7, zeit: "ganzjährig · Winter mild" },
  "Madeira": { tage: 6, zeit: "ganzjährig" },
  "Andalusien (Sevilla)": { tage: 4, zeit: "März–Mai, Sep–Okt" },
  "Norwegen-Fjorde": { tage: 7, zeit: "Juni–Aug" },
  "Schottland-Highlands": { tage: 6, zeit: "Mai–Sep" },
  "Harz": { tage: 3, zeit: "Mai–Okt / Winter" },
  "Sächsische Schweiz": { tage: 3, zeit: "April–Okt" },
  "Mosel": { tage: 4, zeit: "Mai–Okt" },
  "Bayerischer Wald": { tage: 4, zeit: "Mai–Okt / Winter" },
  "Sylt / Nordsee": { tage: 4, zeit: "Mai–Sep" },
  "Rügen / Ostsee": { tage: 4, zeit: "Mai–Sep" },
  "Zürich & Schweiz": { tage: 4, zeit: "Mai–Okt" },
  "Berlin": { tage: 3, zeit: "ganzjährig" },
};

const INTERESSEN = [
  { k: "berge", label: "Berge & Wandern", tags: ["berge", "wandern"] },
  { k: "strand", label: "Strand & Meer", tags: ["strand"] },
  { k: "stadt", label: "Städte & Kultur", tags: ["stadt", "kultur"] },
  { k: "wellness", label: "Wellness & Thermen", tags: ["wellness"] },
  { k: "wein", label: "Wein & Kulinarik", tags: ["wein", "kulinarik"] },
  { k: "roadtrip", label: "Roadtrip & Panorama", tags: ["roadtrip", "panorama"] },
  { k: "see", label: "See & Baden", tags: ["see"] },
  { k: "ruhe", label: "Ruhe & Natur", tags: ["ruhig", "natur"] },
  { k: "ski", label: "Skifahren & Winter", tags: ["ski"] },
  { k: "budget", label: "Städtetrip günstig", tags: ["stadt", "guenstig"] },
];

export default function Ideenfinder({ onAdd, onCreateTrip }) {
  const [typ, setTyp] = useState("egal");
  const [interessen, setInteressen] = useState(new Set());
  const [klima, setKlima] = useState("egal");
  const [anreise, setAnreise] = useState("egal");
  const [maxKm, setMaxKm] = useState(1000);
  const [res, setRes] = useState({ loading: false, ran: false, list: [] });
  const [added, setAdded] = useState({});
  const [vergleich, setVergleich] = useState({});
  const celleIdRef = useRef(null);

  const toggleInt = (k) => setInteressen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  function bewerte(c) {
    let s = 0, max = 0;
    const want = new Set();
    interessen.forEach((k) => { const o = INTERESSEN.find((x) => x.k === k); if (o) o.tags.forEach((t) => want.add(t)); });
    want.forEach((t) => { max += 2; if (c.tags.includes(t)) s += 2; });
    if (typ !== "egal") { max += 2; if (c.tags.includes(typ)) s += 2; }
    if (klima === "mild") { max += 2; if (c.waerme >= 3) s += 2; }
    if (klima === "warm") { max += 2; if (c.waerme >= 4) s += 2; }
    return { s, max };
  }
  const passendeInteressen = (c) => INTERESSEN.filter((o) => interessen.has(o.k) && o.tags.some((t) => c.tags.includes(t)));

  async function finden() {
    let scored = REGIONEN.map((c) => { const { s, max } = bewerte(c); return { c, s, max, dist: hav(CELLE.la, CELLE.lo, c.la, c.lo), flug: flugMatch(c) }; });
    scored = scored.filter((x) => {
      if (anreise === "auto" && x.dist > maxKm) return false;
      if (anreise === "bahn" && !x.c.bahn) return false;
      if (anreise === "flug" && !x.flug) return false;
      return true;
    });
    scored.sort((a, b) => (b.s - a.s) || (a.dist - b.dist));
    const top = scored.slice(0, 8);
    setRes({ loading: true, ran: true, list: [] });
    const withReach = await Promise.all(top.map(async (x) => {
      let auto = null;
      try {
        const j = await jget(`https://router.project-osrm.org/route/v1/driving/${CELLE.lo},${CELLE.la};${x.c.lo},${x.c.la}?overview=false`);
        const r = j.routes && j.routes[0]; if (r) auto = { km: Math.round(r.distance / 1000), min: Math.round(r.duration / 60) };
      } catch (e) { /* n/v */ }
      return { ...x, auto };
    }));
    const list = anreise === "auto" ? withReach.filter((x) => !x.auto || x.auto.km <= maxKm) : withReach;
    setRes({ loading: false, ran: true, list });
  }

  function add(c) {
    const ri = REISEINFO[c.name];
    const info = c.blurb + (ri ? ` · ab ${ri.tage} Tagen · beste Zeit ${ri.zeit}` : "");
    if (onAdd) onAdd({ name: c.name, info, gebiet: c.name, lat: c.la, lon: c.lo });
    setAdded((a) => ({ ...a, [c.name]: true }));
  }

  async function vergleichen(x) {
    const name = x.c.name;
    setVergleich((v) => ({ ...v, [name]: { loading: true } }));
    try {
      if (!celleIdRef.current) celleIdRef.current = await celleStation();
      const bahn = await ladeBahn(x.c.la, x.c.lo, celleIdRef.current);
      setVergleich((v) => ({ ...v, [name]: { loading: false, bahn } }));
    } catch (e) {
      setVergleich((v) => ({ ...v, [name]: { loading: false, err: e.message || "n/v" } }));
    }
  }

  const chip = (on) => "rounded-full px-3 py-1.5 text-xs font-medium transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200");

  return (
    <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
        <Lightbulb className="h-4 w-4 text-emerald-700" /> Ideenfinder
      </div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Kein Ziel? Sag, was du magst – die App schlägt passende Regionen in Europa vor.</p>

      <div className="mt-3">
        <div className="mb-1 text-xs font-semibold text-stone-500 dark:text-stone-400">Lieber …</div>
        <div className="flex flex-wrap gap-2">
          {[["egal", "egal"], ["stadt", "Stadt"], ["natur", "Natur"]].map(([k, l]) => (
            <button key={k} onClick={() => setTyp(k)} className={chip(typ === k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-xs font-semibold text-stone-500 dark:text-stone-400">Das interessiert mich (Mehrfachauswahl)</div>
        <div className="flex flex-wrap gap-2">
          {INTERESSEN.map((o) => <button key={o.k} onClick={() => toggleInt(o.k)} className={chip(interessen.has(o.k))}>{o.label}</button>)}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-xs font-semibold text-stone-500 dark:text-stone-400">Klima</div>
        <div className="flex flex-wrap gap-2">
          {[["egal", "egal"], ["mild", "mild"], ["warm", "warm & sonnig"]].map(([k, l]) => (
            <button key={k} onClick={() => setKlima(k)} className={chip(klima === k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-xs font-semibold text-stone-500 dark:text-stone-400">Anreise</div>
        <div className="flex flex-wrap gap-2">
          {[["egal", "egal"], ["auto", "Auto"], ["bahn", "Bahn ab Hannover"], ["flug", "Direktflug ab HAJ"]].map(([k, l]) => (
            <button key={k} onClick={() => setAnreise(k)} className={chip(anreise === k)}>{l}</button>
          ))}
        </div>
        {anreise === "auto" && (
          <div className="mt-2 inline-flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <Car className="h-3.5 w-3.5" /> max.
            <input type="range" min={300} max={2000} step={100} value={maxKm} onChange={(e) => setMaxKm(Number(e.target.value))} className="w-40" style={{ accentColor: "#047857" }} />
            <b className="text-stone-700 dark:text-stone-200">{maxKm} km</b>
          </div>
        )}
      </div>

      <button onClick={finden} disabled={res.loading}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
        {res.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />} Regionen finden
      </button>

      {res.ran && (
        <div className="mt-4 space-y-2">
          {res.loading && <div className="flex items-center gap-2 rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-3 text-sm text-stone-500 dark:text-stone-400"><Loader2 className="h-4 w-4 animate-spin" /> Fahrzeiten werden geprüft …</div>}
          {!res.loading && res.list.length === 0 && <div className="rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-3 text-sm text-stone-500 dark:text-stone-400">Nichts Passendes im Rahmen – Filter lockern (z. B. mehr km oder Anreise „egal").</div>}
          {res.list.map((x, i) => {
            const c = x.c; const pct = x.max > 0 ? Math.round((x.s / x.max) * 100) : null; const isAdded = !!added[c.name];
            return (
              <div key={i} className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{c.name}</span>
                      {pct != null && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{pct}% Match</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{c.blurb}</div>
                    {REISEINFO[c.name] && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" /> ab {REISEINFO[c.name].tage} Tagen</span>
                        <span className="inline-flex items-center gap-1"><CalendarRange className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" /> beste Zeit: {REISEINFO[c.name].zeit}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => add(c)} disabled={isAdded}
                    className={"inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition " + (isAdded ? "bg-emerald-100 text-emerald-700" : "bg-emerald-700 text-white hover:bg-emerald-800")}>
                    {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {isAdded ? "drin" : "Ideen"}
                  </button>
                </div>

                {passendeInteressen(c).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {passendeInteressen(c).map((o) => <span key={o.k} className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">{o.label}</span>)}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                  {x.auto && <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-3.5" /> {x.auto.km} km · {hm(x.auto.min)} ab Celle</span>}
                  {!x.auto && <span className="inline-flex items-center gap-1 text-stone-400 dark:text-stone-500"><Car className="h-3.5 w-3.5" /> {x.dist} km Luftlinie</span>}
                  {c.bahn && <span className="inline-flex items-center gap-1 text-emerald-700"><Train className="h-3.5 w-3.5" /> gut per Bahn</span>}
                  {x.flug && <span className="inline-flex items-center gap-1 text-emerald-700"><Plane className="h-3.5 w-3.5" /> Direktflug ({x.flug.n}, {x.flug.air})</span>}
                  <a href={`https://www.google.com/maps/search/?api=1&query=${enc(c.name)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"><MapPin className="h-3.5 w-3.5" /> Karte</a>
                </div>
                {onCreateTrip && (
                  <button onClick={() => onCreateTrip({ name: c.name, gebiet: c.name, info: c.blurb, tage: (REISEINFO[c.name] || {}).tage, zeit: (REISEINFO[c.name] || {}).zeit })}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 dark:bg-emerald-800">
                    <CalendarPlus className="h-4 w-4" /> Reise daraus erstellen
                  </button>
                )}
                {(() => {
                  const vg = vergleich[c.name];
                  if (!vg) return (
                    <button onClick={() => vergleichen(x)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-700 px-2.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:border-emerald-300 hover:text-emerald-800">
                      <ArrowLeftRight className="h-3.5 w-3.5" /> Auto / Bahn / Flug vergleichen
                    </button>
                  );
                  return (
                    <div className="mt-2 space-y-1 rounded-lg bg-stone-50 dark:bg-stone-800 p-2 text-xs">
                      <div className="flex items-center gap-2 text-stone-700 dark:text-stone-200"><Car className="h-3.5 w-3.5 shrink-0 text-emerald-700" /><span className="w-11 text-stone-400 dark:text-stone-500">Auto</span>{x.auto ? `${x.auto.km} km · ${hm(x.auto.min)}` : `${x.dist} km Luftlinie`}</div>
                      <div className="flex items-center gap-2 text-stone-700 dark:text-stone-200"><Train className="h-3.5 w-3.5 shrink-0 text-emerald-700" /><span className="w-11 text-stone-400 dark:text-stone-500">Bahn</span>{vg.loading ? <span className="inline-flex items-center gap-1 text-stone-400 dark:text-stone-500"><Loader2 className="h-3 w-3 animate-spin" /> sucht …</span> : vg.bahn ? `${hm(vg.bahn.min)} · ${vg.bahn.umst === 0 ? "direkt" : vg.bahn.umst + " Umst."} · ${vg.bahn.station}` : <span className="text-stone-400 dark:text-stone-500">{vg.err || "keine Verbindung"}</span>}</div>
                      <div className="flex items-center gap-2 text-stone-700 dark:text-stone-200"><Plane className="h-3.5 w-3.5 shrink-0 text-emerald-700" /><span className="w-11 text-stone-400 dark:text-stone-500">Flug</span>{x.flug ? `Direktflug ${x.flug.n} (${x.flug.air})` : <span className="text-stone-400 dark:text-stone-500">kein Direktflug ab HAJ</span>}</div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Regionen kuratiert (Charakter = Einordnung), Fahrzeit ab Celle über OSRM (Richtwert), Direktflug aus HAJ-Auswahl. „Bahn" = realistisch ab Hannover ohne Flug. Als Startpunkt für die Detail-Planung gedacht.</span></div>
    </section>
  );
}
