/*
  Reisekarte.jsx — Karte mit Stecknadeln (Übersicht ODER einzelne Reise)
  ---------------------------------------------------------------------
  Übersicht: <Reisekarte trips={data.trips} onOpenTrip={setActiveId} />
    -> Europakarte, eine Nadel pro Reise (Region/Stadt), Tippen öffnet die Reise.
  Einzelne Reise: <Reisekarte trips={[trip]} items fit />
    -> auf die Region gezoomt, Ziel + Programm-Punkte als Nadeln.
  Verortung per Photon (frei, ohne Schlüssel). react-simple-maps + world-atlas.
  Kartenfläche bleibt hell (in beiden Modi gut lesbar).
*/
import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { MapPin, Loader2, Info } from "lucide-react";

const GEO = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
const enc = encodeURIComponent;
const CACHE = {};
async function geocode(q) {
  if (q in CACHE) return CACHE[q];
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(`https://photon.komoot.io/api/?q=${enc(q)}&limit=1&lang=de`, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const f = j.features && j.features[0];
    const c = f && f.geometry ? { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] } : null;
    CACHE[q] = c; return c;
  } catch (e) { return null; } finally { clearTimeout(t); }
}

export default function Reisekarte({ trips, onOpenTrip, items = false, fit = false }) {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const key = (trips || []).map((t) => t.id + ":" + (t.region || "") + ":" + (t.land || "") + ":" + (t.name || "") + (items ? ":" + (t.items || []).filter((i) => i.lat != null && i.lon != null).length : "")).join("|");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const out = [];
      for (const t of trips || []) {
        let coord = null;
        const q = [t.region, t.land].filter(Boolean).join(", ");
        if (q) coord = await geocode(q);
        if (!coord) { const it = (t.items || []).find((i) => i.lat != null && i.lon != null); if (it) coord = { lat: Number(it.lat), lon: Number(it.lon) }; }
        if (!coord && t.name) coord = await geocode(t.name);
        if (coord && isFinite(coord.lat) && isFinite(coord.lon)) out.push({ id: t.id, name: t.name || t.region || "Reise", lat: coord.lat, lon: coord.lon, main: true });
        if (items) {
          for (const it of (t.items || [])) {
            if (it.lat != null && it.lon != null && isFinite(Number(it.lat)) && isFinite(Number(it.lon))) out.push({ id: t.id + "-" + (it.id || Math.random()), name: it.name || "", lat: Number(it.lat), lon: Number(it.lon), main: false });
          }
        }
      }
      if (alive) { setPins(out); setLoading(false); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line
  }, [key]);

  // Kartenausschnitt: Übersicht = Europa; einzelne Reise (fit) = auf Nadeln gezoomt
  let center = [12, 54], scale = 470;
  if (fit && pins.length) {
    const lons = pins.map((p) => p.lon), lats = pins.map((p) => p.lat);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats);
    center = [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
    const span = Math.max(maxLon - minLon, (maxLat - minLat) * 1.6, 2);
    scale = Math.max(350, Math.min(2600, 2600 / (span + 0.4)));
  }

  return (
    <section className="mb-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900">
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100"><MapPin className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> {fit ? "Auf der Karte" : "Meine Reisen auf der Karte"}</div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-stone-400" />}
      </div>
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
        <ComposableMap projection="geoMercator" projectionConfig={{ center, scale }} width={800} height={fit ? 460 : 640} style={{ width: "100%", height: "auto" }}>
          <Geographies geography={GEO}>
            {(props) => (((props && props.geographies) || []).map((geo) => (
              <Geography key={geo.rsmKey} geography={geo} fill="#e7e5e4" stroke="#ffffff" strokeWidth={0.5} style={{ default: { outline: "none" }, hover: { fill: "#d6d3d1", outline: "none" }, pressed: { outline: "none" } }} />
            )))}
          </Geographies>
          {pins.filter((p) => !p.main).map((p) => (
            <Marker key={p.id} coordinates={[p.lon, p.lat]} onClick={() => onOpenTrip && onOpenTrip(p.id.split("-")[0])}>
              <circle r={4} fill="#0ea5e9" stroke="#ffffff" strokeWidth={1.2} style={{ cursor: onOpenTrip ? "pointer" : "default" }}><title>{p.name}</title></circle>
            </Marker>
          ))}
          {pins.filter((p) => p.main).map((p) => (
            <Marker key={p.id} coordinates={[p.lon, p.lat]} onClick={() => onOpenTrip && onOpenTrip(p.id)}>
              <g transform="translate(-9, -26)" style={{ cursor: onOpenTrip ? "pointer" : "default" }}>
                <path d="M9 0C4 0 0 4 0 9c0 6.6 9 17 9 17s9-10.4 9-17c0-5-4-9-9-9z" fill="#047857" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="9" cy="9" r="3.2" fill="#ffffff" />
              </g>
              <text textAnchor="middle" y={-30} style={{ fontSize: "12px", fontWeight: 700, fill: "#1c1917", pointerEvents: "none" }}>{p.name}</text>
            </Marker>
          ))}
        </ComposableMap>
      </div>
      {!loading && pins.length === 0 && <div className="mt-2 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {fit ? "Kein Ort hinterlegt – gib der Reise eine Region/Stadt." : "Noch keine verortbaren Reisen – gib einer Reise eine Region oder Stadt."}</div>}
      <div className="mt-2 text-xs text-stone-400 dark:text-stone-500">{fit ? "Grün = Ziel, blau = Programm-Punkte." : "Tippe eine Nadel an, um die Reise zu öffnen."} Verortung per Photon (frei).</div>
    </section>
  );
}
