/*
  Wandern.jsx — Touren-Empfehlungen (OSM) + Komoot-Verknüpfung
  ------------------------------------------------------------
  EHRLICH: Komoot hat KEINE öffentliche API (steht so in Komoots Support-Doku) –
  fertige Touren mit Höhenprofil lassen sich daher nicht in die App holen, nur verlinken.
  OSM hat markierte Wanderrouten samt Geometrie. Daraus macht dieses Modul echte Empfehlungen:

   1. Abfrage: Wo? · Umkreis · Wunschlänge · Rundweg? · nur bedeutende Wege?
   2. Overpass holt Routen (frei, ohne Schlüssel). Länge = Tag "distance", sonst AUS DER
      GEOMETRIE BERECHNET. Gehzeit = Schätzung nach DIN 33466 (4 km/h, 300 Hm/h Aufstieg),
      Höhenmeter nur wenn in OSM getaggt -> sonst reine Flach-Schätzung (wird angezeigt).
   3. Treffer werden nach Passung sortiert (Länge, Rundweg, Netz-Ebene) = Empfehlungsliste.
   4. Auswählen -> auf die Wunschliste ("In Ideen"), an eine Reise heften oder neue Reise daraus.

  EINBAU: <Wandern /> · eingebettet: <Wandern embedded defaultQuery="Tirol" onAdd={…}
          onCreateTrip={…} trips={…} onAddToTrip={…} />
*/
import React, { useState, useEffect } from "react";
import { Mountain, Search, Loader2, Info, ExternalLink, MapPin, Route as RouteIcon, Plus, Check, CalendarPlus, X, Clock, Repeat, Ruler, Star, Map as MapIcon } from "lucide-react";
import Wegkarte from "./Wegkarte.jsx";

const enc = encodeURIComponent;
async function jget(url, ms = 25000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try { const r = await fetch(url, { signal: ctrl.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function jpost(url, body, ms = 30000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { method: "POST", body, signal: ctrl.signal, headers: { "Content-Type": "text/plain" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

const havKm = (aLa, aLo, bLa, bLo) => {
  const R = 6371, r = Math.PI / 180, dLa = (bLa - aLa) * r, dLo = (bLo - aLo) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(aLa * r) * Math.cos(bLa * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
// Länge aus der Relations-Geometrie (Neben-/Zubringer-Rollen werden ausgelassen)
const ROLLEN_OK = ["", "forward", "backward", "main"];
function laengeAusGeom(rel) {
  let sum = 0;
  for (const m of (rel.members || [])) {
    if (m.type !== "way" || !Array.isArray(m.geometry)) continue;
    if (!ROLLEN_OK.includes(m.role || "")) continue;
    for (let i = 1; i < m.geometry.length; i++) sum += havKm(m.geometry[i - 1].lat, m.geometry[i - 1].lon, m.geometry[i].lat, m.geometry[i].lon);
  }
  return sum > 0 ? sum : null;
}
// Rundweg aus der Geometrie: Start- und Endpunkt liegen dicht beieinander (< 1 km)
function rundAusGeom(rel) {
  const ms = (rel.members || []).filter((m) => m.type === "way" && Array.isArray(m.geometry) && m.geometry.length > 1 && ROLLEN_OK.includes(m.role || ""));
  if (ms.length < 2) return false;
  const a = ms[0].geometry[0];
  const g = ms[ms.length - 1].geometry, b = g[g.length - 1];
  return havKm(a.lat, a.lon, b.lat, b.lon) < 1;
}
// Gehzeit nach DIN 33466: größerer Wert + halber kleinerer (4 km/h horizontal, 300 Hm/h Aufstieg)
function gehzeit(km, hm) {
  if (!km) return null;
  const th = km / 4, tv = hm ? hm / 300 : 0;
  return Math.max(th, tv) + Math.min(th, tv) / 2;
}
const hStr = (t) => { const h = Math.floor(t), m = Math.round((t - h) * 60); return h > 0 ? h + ":" + String(m).padStart(2, "0") + " h" : m + " min"; };
const LAENGE = {
  bis5:  { label: "bis 5 km",  von: 0, bis: 5 },
  bis10: { label: "bis 10 km", von: 0, bis: 10 },
  bis20: { label: "bis 20 km", von: 0, bis: 20 },
  egal:  { label: "egal",      von: 0, bis: 1e9 },
};

/* Bekannte Fernwege – bewusst NUR Name + Gebiet kuratiert.
   Länge/Verlauf holt die App live aus OSM, weil selbst seriöse Quellen sich
   widersprechen (Hexenstieg: 97 / ~100 / ~150 km; Weserbergland-Weg: 220 / 225 km). */
const FERNWEGE = [
  { l: "Heidschnuckenweg", q: "Heidschnuckenweg", geb: "Lüneburger Heide" },
  { l: "Harzer Hexenstieg", q: "Hexen-?[Ss]tieg", geb: "Harz" },
  { l: "Weserbergland-Weg", q: "Weserbergland-?[Ww]eg", geb: "Weserbergland" },
  { l: "Ith-Hils-Weg", q: "Ith-Hils-Weg", geb: "Weserbergland" },
  { l: "Försterstieg", q: "Försterstieg", geb: "Solling" },
  { l: "Nordpfade", q: "Nordpfad", geb: "Rotenburg (Wümme)" },
];
/* Schnellwahl-Regionen – reine Ortsnamen, keine erfundenen Daten */
const REGIONEN = [
  { g: "Nahe Celle", orte: ["Lüneburger Heide", "Deister", "Harz", "Elm", "Weserbergland", "Solling", "Ith"] },
  { g: "Deutsche Alpen", orte: ["Berchtesgaden", "Garmisch-Partenkirchen", "Oberstdorf", "Mittenwald", "Ruhpolding", "Oberammergau"] },
];

const NETZ = {
  iwn: { label: "international", rang: 4, stil: "bg-emerald-600 text-white" },
  nwn: { label: "national", rang: 3, stil: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  rwn: { label: "regional", rang: 2, stil: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  lwn: { label: "lokal", rang: 1, stil: "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300" },
};

// Nur verifizierte Komoot-Seiten (von komoot.com selbst verlinkt)
const KOMOOT_TOUREN = [
  { l: "Touren-Suche (Karte)", u: "https://www.komoot.com/discover" },
  { l: "Wanderwege", u: "https://www.komoot.com/discover/hiking-trails" },
  { l: "Bergtouren", u: "https://www.komoot.com/discover/mountain-hikes" },
  { l: "Fernwanderwege", u: "https://www.komoot.com/discover/long-distance-hikes" },
  { l: "Wandern mit Kindern", u: "https://www.komoot.com/discover/hiking-with-kids" },
  { l: "Tourenplaner", u: "https://www.komoot.com/plan" },
];
const KOMOOT_ORTE = [
  { l: "Hütten", u: "https://www.komoot.com/places/2/huts" },
  { l: "Gipfel", u: "https://www.komoot.com/places/3/mountain-peaks" },
  { l: "Wasserfälle", u: "https://www.komoot.com/places/4/waterfalls" },
  { l: "Seen", u: "https://www.komoot.com/places/6/lakes" },
  { l: "Bergpässe", u: "https://www.komoot.com/places/7/mountain-passes" },
  { l: "Burgen", u: "https://www.komoot.com/places/11/castles" },
];

async function ladeWege(term, radiusKm, wunsch) {
  const g = await jget(`https://photon.komoot.io/api/?q=${enc(term)}&limit=1&lang=de`);
  const f = g.features && g.features[0];
  if (!f || !f.geometry) throw new Error("Region nicht gefunden");
  const lon = f.geometry.coordinates[0], lat = f.geometry.coordinates[1];
  const ort = (f.properties && (f.properties.name || term)) || term;

  // Schritt 1: Kandidaten (leichtgewichtig, nur Tags + Mittelpunkt)
  const q1 = `[out:json][timeout:25];relation["route"="hiking"]["name"](around:${radiusKm * 1000},${lat},${lon});out center 100;`;
  const o1 = await jpost("https://overpass-api.de/api/interpreter", q1);
  let kand = ((o1 && o1.elements) || []).map((e) => {
    const t = e.tags || {};
    const d = t.distance ? parseFloat(String(t.distance).replace(",", ".")) : null;
    const asc = t.ascent ? parseFloat(String(t.ascent).replace(",", ".")) : null;
    return {
      id: e.id, name: t.name, netz: NETZ[t.network] || null, rang: NETZ[t.network] ? NETZ[t.network].rang : 0,
      km: d && isFinite(d) ? d : null, kmQuelle: d && isFinite(d) ? "tag" : null,
      hm: asc && isFinite(asc) ? asc : null, rund: t.roundtrip === "yes",
      betreiber: t.operator || "", lat: e.center ? e.center.lat : null, lon: e.center ? e.center.lon : null,
    };
  });

  // Schritt 2: Geometrie holen -> Länge berechnen UND Rundweg erkennen.
  // Bewusst begrenzt auf regionale/lokale Wege (Fernwege sprengen die Abfrage) und max. 20.
  const band = LAENGE[wunsch.laenge] || LAENGE.egal;
  const zuPruefen = kand.filter((k) => k.rang <= 2 && (k.km == null || k.km <= band.bis * 1.5)).slice(0, 20);
  const geprueft = {};
  if (zuPruefen.length) {
    try {
      const ids = zuPruefen.map((k) => k.id).join(",");
      const o2 = await jpost("https://overpass-api.de/api/interpreter", `[out:json][timeout:60];relation(id:${ids});out geom;`, 45000);
      for (const rel of ((o2 && o2.elements) || [])) {
        const L = laengeAusGeom(rel);
        geprueft[rel.id] = { km: L ? Math.round(L * 10) / 10 : null, rund: rundAusGeom(rel) };
      }
    } catch (e) { /* Geometrie nicht verfügbar – dann bleibt es ehrlich unbekannt */ }
  }
  kand = kand.map((k) => {
    const g = geprueft[k.id];
    if (!g) return { ...k, rundBekannt: k.rund === true };
    return {
      ...k,
      km: g.km != null ? g.km : k.km,
      kmQuelle: g.km != null ? "geom" : k.kmQuelle,
      rund: k.rund || g.rund,
      rundBekannt: true,
    };
  });

  // Schritt 3: bewerten & filtern (ehrlich: was nicht prüfbar ist, fliegt raus und wird gezählt)
  let ohneLaenge = 0, ohneRund = 0;
  const wege = [];
  for (const k of kand) {
    if (wunsch.nurWichtig && k.rang < 2) continue;
    if (wunsch.laenge !== "egal") {
      if (k.km == null) { ohneLaenge++; continue; }
      if (k.km < band.von || k.km > band.bis) continue;
    }
    if (wunsch.rund) {
      if (!k.rundBekannt) { ohneRund++; continue; }
      if (!k.rund) continue;
    }
    const p = k.rang * 5 + (k.rund ? 15 : 0) + (k.km != null ? 8 : 0);
    wege.push({ ...k, punkte: p, zeit: gehzeit(k.km, k.hm) });
  }
  wege.sort((a, b) => b.punkte - a.punkte || (b.km || 0) - (a.km || 0) || a.name.localeCompare(b.name, "de"));
  return { ort, lat, lon, wege, gesamt: kand.length, ohneLaenge, ohneRund };
}

async function ladeName(item) {
  const q = `[out:json][timeout:30];relation["route"="hiking"]["name"~"${item.q}",i];out center 12;`;
  const o = await jpost("https://overpass-api.de/api/interpreter", q);
  const wege = ((o && o.elements) || []).map((e) => {
    const t = e.tags || {};
    const d = t.distance ? parseFloat(String(t.distance).replace(",", ".")) : null;
    const asc = t.ascent ? parseFloat(String(t.ascent).replace(",", ".")) : null;
    const km = d && isFinite(d) ? d : null;
    const hm = asc && isFinite(asc) ? asc : null;
    return {
      id: e.id, name: t.name, netz: NETZ[t.network] || null, rang: NETZ[t.network] ? NETZ[t.network].rang : 0,
      km, kmQuelle: km ? "tag" : null, hm, rund: t.roundtrip === "yes", betreiber: t.operator || "",
      lat: e.center ? e.center.lat : null, lon: e.center ? e.center.lon : null, zeit: gehzeit(km, hm),
    };
  });
  wege.sort((a, b) => b.rang - a.rang || (b.km || 0) - (a.km || 0));
  return { ort: item.geb, wege, gesamt: wege.length, name: item.l };
}

/* Verlauf einer Route als GeoJSON – für die Vorschau IN der App. */
async function ladeGeom(id) {
  const o = await jpost("https://overpass-api.de/api/interpreter", `[out:json][timeout:60];relation(id:${id});out geom;`, 45000);
  const rel = ((o && o.elements) || [])[0];
  if (!rel) throw new Error("Verlauf nicht gefunden");
  const lines = [];
  for (const m of (rel.members || [])) {
    if (m.type !== "way" || !Array.isArray(m.geometry) || m.geometry.length < 2) continue;
    if (!ROLLEN_OK.includes(m.role || "")) continue;
    lines.push(m.geometry.map((g) => [g.lon, g.lat]));
  }
  if (!lines.length) throw new Error("kein Verlauf in OSM hinterlegt");
  return { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: lines } };
}

export default function Wandern({ embedded = false, defaultQuery = "", onAdd, onCreateTrip, trips, onAddToTrip }) {
  const [menuFor, setMenuFor] = useState(null);
  const [done, setDone] = useState({});
  const [vorschau, setVorschau] = useState(null);
  const [vBusy, setVBusy] = useState(null);
  const [vErr, setVErr] = useState("");
  const [input, setInput] = useState(defaultQuery || "");
  const [radius, setRadius] = useState(20);
  const [laenge, setLaenge] = useState("bis20");
  const [rund, setRund] = useState(true);
  const [nurWichtig, setNurWichtig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  async function run(q0, over) {
    const term = (q0 != null ? q0 : input).trim();
    if (!term || loading) return;
    const w = { laenge, rund, nurWichtig, radius, ...(over || {}) };
    setLoading(true); setErr(""); setData(null); setMenuFor(null);
    try { setData(await ladeWege(term, w.radius, w)); }
    catch (e) { setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }
  async function runName(item) {
    if (loading) return;
    setLoading(true); setErr(""); setData(null); setMenuFor(null);
    try {
      const d = await ladeName(item);
      setData(d);
      if (!d.wege.length) setErr(`„${item.l}“ ist in OpenStreetMap gerade nicht auffindbar.`);
    } catch (e) { setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }
  const term = () => (defaultQuery || input || "").trim();
  const neuLaden = (over) => { if (term()) run(term(), over); };
  useEffect(() => { const t = (defaultQuery || "").trim(); if (t) run(t); /* eslint-disable-next-line */ }, []);

  async function zeigeWeg(w) {
    if (vorschau && vorschau.id === w.id) { setVorschau(null); return; }
    setVBusy(w.id); setVErr("");
    try { setVorschau({ id: w.id, name: w.name, geojson: await ladeGeom(w.id) }); }
    catch (e) { setVErr(`„${w.name}“: ${e.message || "Verlauf nicht ladbar"}`); setVorschau(null); }
    finally { setVBusy(null); }
  }

  const infoText = (w) => ["Wanderung", w.netz ? w.netz.label : "", w.km ? w.km + " km" : "", w.zeit ? "ca. " + hStr(w.zeit) : "", w.rund ? "Rundweg" : "", w.betreiber].filter(Boolean).join(" · ");
  const sug = (w) => ({ name: w.name, gebiet: (data && data.ort) || "", info: infoText(w), lat: w.lat, lon: w.lon });
  const merke = (w, txt) => { setDone((d) => ({ ...d, [w.id]: txt })); setMenuFor(null); };
  const inIdeen = (w) => { if (onAdd) { onAdd(sug(w)); merke(w, "in Ideen"); } };
  const anReise = (w, t) => { if (onAddToTrip) { onAddToTrip(t.id, { ...sug(w), kategorie: "wanderung" }); merke(w, "zu " + (t.name || "Reise")); } };
  const neueReise = (w) => { if (onCreateTrip) onCreateTrip({ name: w.name, gebiet: (data && data.ort) || w.name, info: infoText(w), anreiseart: "auto", von: "Celle", nach: (data && data.ort) || "", items: [{ ...sug(w), kategorie: "wanderung" }] }); };
  const hatAktion = !!(onAdd || onCreateTrip || (onAddToTrip && trips && trips.length));
  const nurIdeen = !!onAdd && !onCreateTrip && !(onAddToTrip && trips && trips.length);

  const chip = (on) => "rounded-full px-3 py-1.5 text-xs font-medium transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300");
  const linkCls = "inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:border-emerald-300 hover:text-emerald-800 dark:border-stone-700 dark:text-stone-300 dark:hover:border-emerald-700";

  return (
    <section className={embedded ? "space-y-0 text-stone-800 dark:text-stone-200" : "rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900 text-stone-800 dark:text-stone-200"}>
      {!embedded && (<>
        <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100"><Mountain className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Wandern</div>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Wanderwege in der Region (aus OpenStreetMap) – plus Komoot-Links zum Weiterstöbern.</p>
        <div className="mt-3 flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            placeholder="Region oder Stadt …" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900" />
          <button onClick={() => run()} disabled={loading} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Suchen
          </button>
        </div>
      </>)}

      <div className={(embedded ? "" : "mt-3 ") + "space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950"}>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-600 dark:text-stone-300"><Star className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" /> Bekannte Fernwege</div>
        <div className="flex flex-wrap gap-1.5">
          {FERNWEGE.map((x) => (
            <button key={x.l} onClick={() => runName(x)} disabled={loading}
              className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700 dark:bg-stone-900 dark:text-stone-200">
              {x.l} <span className="text-stone-400 dark:text-stone-500">· {x.geb}</span>
            </button>
          ))}
        </div>
        {!defaultQuery && REGIONEN.map((r) => (
          <div key={r.g}>
            <div className="mb-1 text-xs font-semibold text-stone-500 dark:text-stone-400">{r.g}</div>
            <div className="flex flex-wrap gap-1.5">
              {r.orte.map((o) => (
                <button key={o} onClick={() => { setInput(o); run(o); }} disabled={loading}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-emerald-300 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">{o}</button>
              ))}
            </div>
          </div>
        ))}
        <div className="text-xs text-stone-400 dark:text-stone-500">Kuratiert sind nur die Namen – Länge &amp; Verlauf kommen live aus OpenStreetMap.</div>
      </div>

      <div className={"mt-3 space-y-2 rounded-xl border border-stone-200 p-3 dark:border-stone-700"}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-semibold text-stone-500 dark:text-stone-400">Umkreis</span>
          {[10, 20, 40].map((r) => (
            <button key={r} onClick={() => { setRadius(r); neuLaden({ radius: r }); }} className={chip(radius === r)}>{r} km</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-semibold text-stone-500 dark:text-stone-400">Länge</span>
          {Object.keys(LAENGE).map((k) => (
            <button key={k} onClick={() => { setLaenge(k); neuLaden({ laenge: k }); }} className={chip(laenge === k)}>{LAENGE[k].label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-semibold text-stone-500 dark:text-stone-400">Art</span>
          <button onClick={() => { const v = !rund; setRund(v); neuLaden({ rund: v }); }} className={chip(rund)}><Repeat className="mr-1 inline h-3 w-3" />nur Rundwege</button>
          <button onClick={() => { const v = !nurWichtig; setNurWichtig(v); neuLaden({ nurWichtig: v }); }} className={chip(nurWichtig)}>nur bedeutende</button>
        </div>
      </div>

      {err && <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err}</div>}
      {loading && <div className="mt-3 flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Wanderwege werden gesucht …</div>}

      {data && (
        <div className="mt-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200">
            <RouteIcon className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> {data.name ? data.name + " · " + data.ort : "Empfehlungen um " + data.ort + " · " + data.wege.length + " von " + data.gesamt}
          </div>
          {data.wege.length === 0 && <div className="text-sm text-stone-500 dark:text-stone-400">Nichts Passendes gefunden – größeren Umkreis wählen, Länge auf „egal“ stellen oder Filter lockern.</div>}
          <div className="space-y-1.5">
            {data.wege.slice(0, 25).map((w) => (
              <div key={w.id} className="rounded-lg bg-stone-50 px-2.5 py-2 text-sm dark:bg-stone-800">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-stone-800 dark:text-stone-100">{w.name}</span>
                      {w.netz && <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + w.netz.stil}>{w.netz.label}</span>}
                      {w.rund && <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300"><Repeat className="h-3 w-3" /> Rundweg</span>}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400">
                      <span className="inline-flex items-center gap-1"><Ruler className="h-3 w-3" /> {w.km != null ? w.km + " km" : "Länge unbekannt"}{w.kmQuelle === "geom" ? " (berechnet)" : ""}</span>
                      {w.zeit && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> ca. {hStr(w.zeit)}{w.hm ? " · " + Math.round(w.hm) + " Hm" : ""}</span>}
                      {w.betreiber && <span className="truncate">{w.betreiber}</span>}
                    </span>
                  </span>
                  <button onClick={() => zeigeWeg(w)} title="Verlauf auf der Karte ansehen" className={"shrink-0 rounded-lg p-1.5 transition " + (vorschau && vorschau.id === w.id ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "text-stone-400 hover:text-emerald-700 dark:text-stone-500 dark:hover:text-emerald-300")}>
                    {vBusy === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapIcon className="h-4 w-4" />}
                  </button>
                  {done[w.id]
                    ? <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /> {done[w.id]}</span>
                    : hatAktion && <button onClick={() => (nurIdeen ? inIdeen(w) : setMenuFor(menuFor === w.id ? null : w.id))} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800">{menuFor === w.id ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {nurIdeen ? "Hinzufügen" : "Übernehmen"}</button>}
                </div>
                {vErr && vBusy !== w.id && vorschau === null && vErr.includes(w.name) && <div className="mt-1.5 text-xs text-rose-600">{vErr}</div>}
                {vorschau && vorschau.id === w.id && (
                  <div className="mt-2 rounded-lg border border-stone-200 p-2 dark:border-stone-700">
                    <Wegkarte geojson={vorschau.geojson} name={vorschau.name} />
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                      <a href={"https://www.openstreetmap.org/relation/" + w.id} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-stone-400 transition hover:text-emerald-700 dark:text-stone-500">auf OpenStreetMap <ExternalLink className="h-3 w-3" /></a>
                      {hatAktion && !done[w.id] && (
                        <button onClick={() => (nurIdeen ? inIdeen(w) : setMenuFor(w.id))} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800">
                          <Plus className="h-3.5 w-3.5" /> {nurIdeen ? "Hinzufügen" : "Übernehmen"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {menuFor === w.id && (
                  <div className="mt-2 space-y-1.5 rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900">
                    {onAddToTrip && trips && trips.length > 0 && (<>
                      <div className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">Zu einer Reise heften</div>
                      {trips.slice(0, 8).map((t) => (
                        <button key={t.id} onClick={() => anReise(w, t)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 transition hover:bg-emerald-50 dark:text-stone-200 dark:hover:bg-stone-800">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> <span className="min-w-0 truncate">{t.name || "Reise"}</span>
                        </button>
                      ))}
                    </>)}
                    {onCreateTrip && <button onClick={() => neueReise(w)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-stone-700 transition hover:bg-emerald-50 dark:text-stone-200 dark:hover:bg-stone-800"><CalendarPlus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> Neue Reise daraus erstellen</button>}
                    {onAdd && <button onClick={() => inIdeen(w)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 transition hover:bg-emerald-50 dark:text-stone-200 dark:hover:bg-stone-800"><Plus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> In Ideen merken</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
          {data.wege.length > 25 && <div className="pt-1.5 text-xs text-stone-400 dark:text-stone-500">… und {data.wege.length - 25} weitere.</div>}
          {(data.ohneLaenge > 0 || data.ohneRund > 0) && (
            <div className="pt-1.5 text-xs text-stone-400 dark:text-stone-500">
              Ausgeblendet, weil nicht prüfbar: {data.ohneLaenge > 0 ? `${data.ohneLaenge} ohne bekannte Länge` : ""}{data.ohneLaenge > 0 && data.ohneRund > 0 ? " · " : ""}{data.ohneRund > 0 ? `${data.ohneRund} ohne prüfbaren Verlauf` : ""}. Filter lockern, um sie zu sehen.
            </div>
          )}
        </div>
      )}

      <div className="mt-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200"><MapPin className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Auf Komoot weiterstöbern</div>
        <div className="flex flex-wrap gap-1.5">
          {KOMOOT_TOUREN.map((k) => <a key={k.u} href={k.u} target="_blank" rel="noreferrer" className={linkCls}>{k.l} <ExternalLink className="h-3 w-3" /></a>)}
        </div>
        <div className="mt-2 text-xs font-semibold text-stone-500 dark:text-stone-400">Orte</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {KOMOOT_ORTE.map((k) => <a key={k.u} href={k.u} target="_blank" rel="noreferrer" className={linkCls}>{k.l} <ExternalLink className="h-3 w-3" /></a>)}
        </div>
        <div className="mt-2 text-xs text-stone-400 dark:text-stone-500">
          {data ? <>Region bei Komoot ins „Wo?"-Feld eingeben: <b>{data.ort}</b>. </> : null}
          Komoot bietet keine offene API – die Touren lassen sich daher nicht in die App holen, nur verlinken.
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Daten: OpenStreetMap/Overpass (ODbL), Suche via Photon – frei &amp; ohne Schlüssel. Länge aus dem OSM-Tag „distance“ oder aus der Geometrie berechnet (bei Fernwegen bleibt sie ggf. unbekannt). Rundweg wird aus dem Verlauf erkannt (Start ≈ Ziel), da der OSM-Tag „roundtrip“ selten gepflegt ist. <b>Gehzeit ist eine Schätzung nach DIN 33466</b> (4 km/h, 300 Hm/h Aufstieg, ohne Pausen); Höhenmeter nur, wenn in OSM getaggt – sonst reine Flach-Schätzung. Es sind markierte OSM-Routen, keine fertigen Komoot-Touren. Ohne Gewähr.</span></div>
    </section>
  );
}
