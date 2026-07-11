/*
  Entdecken.jsx — Ideen-Motor für den Urlaubsplaner (eigener Tab)
  --------------------------------------------------------------
  Region/Stadt eingeben, Thema wählen -> passende Orte im Umkreis, mit Distanz,
  Fahrzeit ab Celle (auf Knopfdruck) und "In Ideen".
  Alle Quellen gratis & ohne Schlüssel, datenschutzfreundlich (fester Start Celle,
  keine Geräte-Ortung, keine Cookies/Accounts):
    • Photon (komoot)  – Geocoding der Region (ODbL)
    • Overpass / OSM   – Orte je Thema (ODbL)
    • OSRM (Demo)      – Fahrzeit ab Celle (Richtwert, Fair-Use)
    • MotoGP-Strecken  – kleine kuratierte Liste (Koordinaten)

  EINBAU: <Entdecken onAdd={(s) => onAdd(mkItem(
    { kategorie:"sehenswuerdigkeit", name:s.name, info:s.info, gebiet:s.gebiet, maps_suche:s.name },
    { day:null, order:0, lat:s.lat ?? null, lon:s.lon ?? null }
  ))} />
*/
import { useState } from "react";
import { Sparkles, Search, MapPin, Plus, Check, Loader2, Car, Info } from "lucide-react";

const enc = encodeURIComponent;
const CELLE = { lat: 52.6226, lon: 10.0806 };

async function jget(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
function dist(aLat, aLon, bLat, bLon) {
  const R = 6371, r = Math.PI / 180;
  const dLa = (bLat - aLat) * r, dLo = (bLon - aLon) * r;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLo / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}
function maps(item) {
  if (Number.isFinite(item.lat) && Number.isFinite(item.long))
    return "https://www.google.com/maps/search/?api=1&query=" + enc(item.lat + "," + item.long);
  return "https://www.google.com/maps/search/?api=1&query=" + enc(item.name);
}

async function geocode(q) {
  const j = await jget(`https://photon.komoot.io/api?q=${enc(q)}&limit=1&lang=de`);
  const f = j.features && j.features[0];
  if (!f || !f.geometry) throw new Error("Ort „" + q + "“ nicht gefunden.");
  const [lon, lat] = f.geometry.coordinates;
  const p = f.properties || {};
  return { lat, lon, label: [p.name, p.state, p.country].filter(Boolean).join(", ") || q };
}

const THEMEN = [
  { key: "therme", label: "Thermen & Spas", info: "Therme/Spa", q: ['nwr["leisure"="spa"]', 'nwr["amenity"="public_bath"]', 'nwr["natural"="hot_spring"]'] },
  { key: "burg", label: "Burgen & Schlösser", info: "Burg/Schloss", q: ['nwr["historic"="castle"]', 'nwr["historic"="palace"]', 'nwr["historic"="manor"]'] },
  { key: "see", label: "Seen", info: "See", q: ['nwr["natural"="water"]["water"~"lake|reservoir"]'] },
  { key: "wasser", label: "Wasserfälle & Klammen", info: "Wasserfall/Klamm", q: ['nwr["waterway"="waterfall"]', 'nwr["natural"="gorge"]'] },
  { key: "turm", label: "Aussichtspunkte & -türme", info: "Aussichtspunkt", q: ['nwr["tourism"="viewpoint"]', 'nwr["man_made"="tower"]["tower:type"="observation"]'] },
  { key: "pass", label: "Alpenpässe", info: "Pass", q: ['nwr["mountain_pass"="yes"]', 'node["natural"="saddle"]'] },
  { key: "bergbahn", label: "Bergbahnen", info: "Bergbahn", q: ['nwr["aerialway"~"cable_car|gondola|mixed_lift"]', 'nwr["railway"="funicular"]'] },
  { key: "np", label: "Nationalparks", info: "Nationalpark", q: ['nwr["boundary"="national_park"]'] },
  { key: "motogp", label: "MotoGP-/Rennstrecken", info: "Rennstrecke", curated: true },
];

const MOTOGP = [
  { name: "TT Circuit Assen", lat: 52.9585, long: 6.5236 },
  { name: "Sachsenring", lat: 50.7915, long: 12.6883 },
  { name: "Red Bull Ring (Spielberg)", lat: 47.2197, long: 14.7647 },
  { name: "Automotodrom Brno", lat: 49.2075, long: 16.4460 },
  { name: "Circuit Bugatti Le Mans", lat: 47.9558, long: 0.2075 },
  { name: "Autodromo del Mugello", lat: 43.9975, long: 11.3715 },
  { name: "Misano World Circuit", lat: 43.9611, long: 12.6839 },
  { name: "Circuit de Barcelona-Catalunya", lat: 41.5700, long: 2.2611 },
  { name: "MotorLand Aragón", lat: 41.0686, long: -0.2092 },
  { name: "Circuito de Jerez", lat: 36.7083, long: -6.0342 },
];

function overpassQuery(theme, lat, lon, radiusM) {
  const body = theme.q.map((sel) => sel + `["name"](around:${radiusM},${lat},${lon});`).join("");
  return `[out:json][timeout:25];(${body});out center 90;`;
}

async function ladeThema(theme, center, radiusKm) {
  if (theme.curated) {
    return MOTOGP.map((c) => ({ ...c, distCenter: dist(center.lat, center.lon, c.lat, c.long) }))
      .sort((a, b) => a.distCenter - b.distCenter);
  }
  const j = await jget(`https://overpass-api.de/api/interpreter?data=${enc(overpassQuery(theme, center.lat, center.lon, radiusKm * 1000))}`);
  const seen = new Set(); const out = [];
  for (const el of (j.elements || [])) {
    const name = el.tags && el.tags.name; if (!name) continue;
    const key = name.toLowerCase(); if (seen.has(key)) continue; seen.add(key);
    const lat = el.lat != null ? el.lat : (el.center && el.center.lat);
    const lon = el.lon != null ? el.lon : (el.center && el.center.lon);
    if (lat == null || lon == null) continue;
    out.push({ name, lat, long: lon, distCenter: dist(center.lat, center.lon, lat, lon) });
  }
  out.sort((a, b) => a.distCenter - b.distCenter);
  return out.slice(0, 25);
}

export default function Entdecken({ onAdd }) {
  const [q, setQ] = useState("Innsbruck");
  const [center, setCenter] = useState(null);
  const [geoLoad, setGeoLoad] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const [radius, setRadius] = useState(30);
  const [theme, setTheme] = useState("");
  const [res, setRes] = useState({ loading: false, error: "", list: [] });
  const [added, setAdded] = useState({});
  const [fahrten, setFahrten] = useState({});

  async function suchen() {
    const term = q.trim(); if (!term || geoLoad) return;
    setGeoLoad(true); setGeoErr(""); setCenter(null); setRes({ loading: false, error: "", list: [] }); setTheme("");
    try { setCenter(await geocode(term)); }
    catch (e) { setGeoErr(e.message || String(e)); }
    finally { setGeoLoad(false); }
  }
  async function waehle(t) {
    if (!center) return;
    setTheme(t.key); setRes({ loading: true, error: "", list: [] }); setAdded({}); setFahrten({});
    try { setRes({ loading: false, error: "", list: await ladeThema(t, center, radius) }); }
    catch (e) { setRes({ loading: false, error: "Suche fehlgeschlagen (" + (e.message || e) + ") – Overpass ist ggf. ausgelastet, kurz später erneut.", list: [] }); }
  }
  function add(it, t) {
    if (onAdd) onAdd({ name: it.name, info: t ? t.info : "", gebiet: center ? center.label.split(",")[0] : "", lat: it.lat, lon: it.long });
    setAdded((a) => ({ ...a, [it.name]: true }));
  }
  async function fahrzeit(it) {
    setFahrten((f) => ({ ...f, [it.name]: { loading: true } }));
    try {
      const j = await jget(`https://router.project-osrm.org/route/v1/driving/${CELLE.lon},${CELLE.lat};${it.long},${it.lat}?overview=false`);
      const r = j.routes && j.routes[0];
      const h = Math.floor(r.duration / 3600), m = Math.round((r.duration % 3600) / 60);
      setFahrten((f) => ({ ...f, [it.name]: { loading: false, km: Math.round(r.distance / 1000), txt: (h > 0 ? h + " h " + (m < 10 ? "0" + m : m) : m + " min") } }));
    } catch (e) { setFahrten((f) => ({ ...f, [it.name]: { loading: false, err: true } })); }
  }

  const activeTheme = THEMEN.find((t) => t.key === theme);

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800">
        <Sparkles className="h-4 w-4 text-emerald-700" /> Entdecken
      </div>
      <p className="mt-1 text-xs text-stone-500">Region eingeben, Thema wählen – passende Orte im Umkreis, mit Distanz und Fahrzeit ab Celle. Ein Klick übernimmt sie in die Ideen.</p>

      <div className="mt-3 flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") suchen(); }}
          placeholder="Region oder Stadt …" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
        <button onClick={suchen} disabled={geoLoad}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
          {geoLoad ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Suchen
        </button>
      </div>
      {geoErr && <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {geoErr}</div>}

      {center && (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-stone-600">Umkreis um <b className="text-stone-800">{center.label}</b></span>
            <span className="inline-flex items-center gap-2 text-xs text-stone-500">
              <input type="range" min={10} max={60} step={5} value={radius}
                onChange={(e) => setRadius(Number(e.target.value))} className="w-28" style={{ accentColor: "#047857" }} />
              {radius} km
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {THEMEN.map((t) => (
              <button key={t.key} onClick={() => waehle(t)}
                className={"rounded-full px-3 py-1.5 text-xs font-medium transition " + (theme === t.key ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200")}>
                {t.label}
              </button>
            ))}
          </div>

          {res.loading && <div className="mt-3 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-3 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> suche „{activeTheme ? activeTheme.label : ""}“ …</div>}
          {res.error && <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {res.error}</div>}

          {!res.loading && theme && (
            <div className="mt-3">
              {res.list.length === 0 && !res.error && <p className="text-sm text-stone-400">Nichts im Umkreis gefunden – Radius erhöhen oder anderes Thema.</p>}
              <ul className="space-y-2">
                {res.list.map((it, i) => {
                  const isAdded = !!added[it.name]; const fz = fahrten[it.name];
                  return (
                    <li key={i} className="flex items-start gap-3 rounded-xl border border-stone-100 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-stone-800">{it.name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                          <span>{it.distCenter} km {activeTheme && activeTheme.curated ? "von hier" : "entfernt"}</span>
                          <a href={maps(it)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"><MapPin className="h-3.5 w-3.5" /> Karte</a>
                          {fz && fz.loading && <span className="inline-flex items-center gap-1 text-stone-400"><Loader2 className="h-3 w-3 animate-spin" /> …</span>}
                          {fz && fz.km != null && <span className="inline-flex items-center gap-1 text-stone-600"><Car className="h-3.5 w-3.5" /> {fz.km} km · {fz.txt} ab Celle</span>}
                          {fz && fz.err && <span className="text-rose-500">Fahrzeit n/v</span>}
                          {!fz && <button onClick={() => fahrzeit(it)} className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"><Car className="h-3.5 w-3.5" /> Fahrzeit ab Celle</button>}
                        </div>
                      </div>
                      <button onClick={() => add(it, activeTheme)} disabled={isAdded}
                        className={"inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition " + (isAdded ? "bg-emerald-100 text-emerald-700" : "bg-emerald-700 text-white hover:bg-emerald-800")}>
                        {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {isAdded ? "drin" : "Ideen"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-start gap-2 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Orte: OpenStreetMap via Overpass (ODbL) · Geocoding: Photon/komoot · Fahrzeit: OSRM-Demo (Richtwert) · Rennstrecken kuratiert. Distanz = Luftlinie, Fahrzeit = echte Route.</span>
      </div>
    </section>
  );
}
