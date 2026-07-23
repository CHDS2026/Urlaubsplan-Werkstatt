/*
  Reisekarte.jsx — interaktive Karte mit Stecknadeln (Übersicht ODER einzelne Reise)
  ---------------------------------------------------------------------------------
  Echtes Zoomen/Verschieben (MapLibre GL) + Umschalter Karte / Satellit.
    Karte    = OpenFreeMap "liberty" (Vektor, frei, ohne Schlüssel)
    Satellit = Sentinel-2 cloudless © EOX, CC BY-NC-SA 4.0 (frei, ohne Schlüssel,
               NICHT-kommerziell, ~10 m Auflösung -> Landschaft ja, Straßenlevel nein)

  Übersicht:      <Reisekarte trips={data.trips} onOpenTrip={setActiveId} />
  Einzelne Reise: <Reisekarte trips={[trip]} items fit />
  Verortung per Photon (frei, ohne Schlüssel).
*/
import React, { useState, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Loader2, Info, Map as MapIcon, Satellite, Footprints } from "lucide-react";
import { KATEGORIEN, nadelInfo, nadelSVG } from "./nadeln.js";

const enc = encodeURIComponent;
export { NADEL, nadelFuer };
export const STYLE_KARTE = "https://tiles.openfreemap.org/styles/liberty";
export const STYLE_SAT = {
  version: 8,
  sources: {
    sat: {
      type: "raster",
      tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"],
      tileSize: 256,
      maxzoom: 14,
      attribution: 'Sentinel-2 cloudless 2020 &copy; <a href="https://s2maps.eu" target="_blank" rel="noreferrer">EOX</a> (CC BY-NC-SA 4.0), modifizierte Copernicus-Sentinel-Daten',
    },
  },
  layers: [{ id: "sat", type: "raster", source: "sat" }],
};

const WMT_URL = "https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png";
const WMT_ATTR = 'Wanderwege: <a href="https://hiking.waymarkedtrails.org" target="_blank" rel="noreferrer">Waymarked Trails</a> &copy; Sarah Hoffmann (CC BY-SA 3.0), Daten &copy; OpenStreetMap (ODbL)';
export function addWege(map) {
  try {
    if (!map.getSource("wmt")) map.addSource("wmt", { type: "raster", tiles: [WMT_URL], tileSize: 256, maxzoom: 18, attribution: WMT_ATTR });
    if (!map.getLayer("wmt")) map.addLayer({ id: "wmt", type: "raster", source: "wmt", paint: { "raster-opacity": 0.9 } });
  } catch (e) {}
}
export function removeWege(map) {
  try {
    if (map.getLayer("wmt")) map.removeLayer("wmt");
    if (map.getSource("wmt")) map.removeSource("wmt");
  } catch (e) {}
}

/* Nadel-Design kommt jetzt zentral aus nadeln.js (eine Quelle für alle Karten). NADEL
   und nadelFuer bleiben nur als rückwärtskompatibler Export bestehen, falls andere Module
   Farbe/Label von hier beziehen – die Werte werden aus nadeln.js abgeleitet. */
const NADEL = Object.fromEntries(KATEGORIEN.map((k) => [k.key, { farbe: k.farbe, label: k.label, pfad: "" }]));
const nadelFuer = (k) => NADEL[k] || NADEL.sehenswuerdigkeit;

/* Reise-Marker: bewusst ANDERS als die Aktivitäts-Nadeln – runder Fähnchen-Badge statt
   Tropfen, damit „eine Reise" und „eine Aktivität" auf der Karte nie verwechselt werden. */
function reiseMarker(gewaehlt, farbe) {
  const c = farbe || "#334155";
  const schein = gewaehlt ? ' style="filter:drop-shadow(0 0 6px #be123c)"' : "";
  return '<svg viewBox="0 0 28 28" width="28" height="28"' + schein + ">" +
    '<circle cx="14" cy="14" r="11.5" fill="' + c + '" stroke="#fff" stroke-width="2"/>' +
    '<path d="M11 8.4 V19.6 M11 8.8 H18.4 L16.2 11.2 L18.4 13.6 H11" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";
}

const CACHE = {};
async function geocodeCache(q) {
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

/* Farb-Palette für die Übersicht: jede Reise bekommt eine eigene Farbe (nach Position),
   damit man ihre Aktivitäten am Farbton der Reise zuordnen kann. */
const REISE_PALETTE = ["#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777", "#0f766e", "#4f46e5", "#c026d3", "#65a30d"];
const farbeFuerReise = (idx) => REISE_PALETTE[((idx % REISE_PALETTE.length) + REISE_PALETTE.length) % REISE_PALETTE.length];

export default function Reisekarte({ trips, onOpenTrip, items = false, fit = false, spots, onSpotClick, selectedId, titel, farbeProReise = false }) {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modus, setModus] = useState("karte");
  const [wege, setWege] = useState(false);
  const wegeRef = useRef(false);
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const key = (trips || []).map((t) => t.id + ":" + (t.region || "") + ":" + (t.land || "") + ":" + (t.name || "") + (items ? ":" + (t.items || []).filter((i) => i.lat != null && i.lon != null).length : "")).join("|");

  useEffect(() => { wegeRef.current = wege; }, [wege]);

  // 1) Orte auflösen (bei "spots" liegen die Koordinaten schon vor)
  useEffect(() => {
    if (spots) {
      setPins((spots || []).filter((p) => p.lat != null && p.lon != null && isFinite(Number(p.lat)) && isFinite(Number(p.lon))).map((p) => ({ id: p.id, name: p.name || "", lat: Number(p.lat), lon: Number(p.lon), rolle: "aktivitaet", kategorie: p.kategorie })));
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      const out = [];
      const alle = trips || [];
      for (let idx = 0; idx < alle.length; idx++) {
        const t = alle[idx];
        const farbe = farbeProReise ? farbeFuerReise(idx) : null;
        let coord = null;
        const q = [t.region, t.land].filter(Boolean).join(", ");
        if (q) coord = await geocodeCache(q);
        if (!coord) { const it = (t.items || []).find((i) => i.lat != null && i.lon != null); if (it) coord = { lat: Number(it.lat), lon: Number(it.lon) }; }
        if (!coord && t.name) coord = await geocodeCache(t.name);
        if (coord && isFinite(coord.lat) && isFinite(coord.lon)) out.push({ id: t.id, name: t.name || t.region || "Reise", lat: coord.lat, lon: coord.lon, rolle: "reise", farbe });
        if (items) {
          for (const it of (t.items || [])) {
            if (it.lat != null && it.lon != null && isFinite(Number(it.lat)) && isFinite(Number(it.lon))) out.push({ id: t.id, name: it.name || "", lat: Number(it.lat), lon: Number(it.lon), rolle: "aktivitaet", kategorie: it.kategorie, farbe });
          }
        }
      }
      if (alive) { setPins(out); setLoading(false); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line
  }, [key, spots, farbeProReise]);

  // 2) Karte anlegen
  useEffect(() => {
    if (mapRef.current || !boxRef.current) return;
    const map = new maplibregl.Map({
      container: boxRef.current,
      style: STYLE_KARTE,
      center: [12, 54],
      zoom: 3.2,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.touchZoomRotate.disableRotation();
    map.on("load", () => { if (wegeRef.current) addWege(map); });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // 3) Stil umschalten (Overlay danach neu setzen – setStyle entfernt eigene Layer)
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    map.setStyle(modus === "sat" ? STYLE_SAT : STYLE_KARTE);
    map.once("idle", () => { if (wegeRef.current) addWege(map); });
  }, [modus]);

  // 3b) Wanderwege-Overlay an/aus
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const apply = () => { if (wege) addWege(map); else removeWege(map); };
    if (map.isStyleLoaded()) apply(); else map.once("idle", apply);
  }, [wege]);

  // 4) Nadeln setzen + Ausschnitt anpassen
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    pins.forEach((p) => {
      const el = document.createElement("div");
      const istReise = p.rolle === "reise";
      const gewaehlt = !!(selectedId && p.id === selectedId);
      const klickbar = onSpotClick || onOpenTrip;
      el.style.cssText = "line-height:0;cursor:" + (klickbar ? "pointer" : "default") + (istReise ? ";z-index:10" : "");
      if (istReise) {
        el.innerHTML = reiseMarker(gewaehlt, p.farbe);
        el.title = p.name || "Reise";
      } else {
        const proReise = !!p.farbe;   // Übersicht: klein + in Reisefarbe; sonst Typ-Farbe, normal
        el.innerHTML = nadelSVG(p.kategorie, { aktiv: gewaehlt, size: proReise ? 20 : 28, farbe: p.farbe || undefined });
        el.title = (p.name || "") + " · " + nadelInfo(p.kategorie).label;
      }
      if (onSpotClick) el.addEventListener("click", () => onSpotClick(p.id));
      else if (onOpenTrip) el.addEventListener("click", () => onOpenTrip(p.id));
      const mk = new maplibregl.Marker({ element: el, anchor: istReise ? "center" : "bottom" }).setLngLat([p.lon, p.lat]).addTo(map);
      markersRef.current.push(mk);
    });
    if (pins.length) {
      const b = new maplibregl.LngLatBounds();
      pins.forEach((p) => b.extend([p.lon, p.lat]));
      map.fitBounds(b, { padding: 50, maxZoom: fit ? 10 : 6, duration: 600 });
    }
  }, [pins, fit, onOpenTrip, onSpotClick, selectedId]);

  const btn = (on) => "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300");

  return (
    <section className="mb-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100"><MapPin className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> {titel || (fit ? "Auf der Karte" : "Meine Reisen auf der Karte")}</div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-stone-400" />}
          <button onClick={() => setModus("karte")} className={btn(modus === "karte")}><MapIcon className="h-3.5 w-3.5" /> Karte</button>
          <button onClick={() => setModus("sat")} className={btn(modus === "sat")}><Satellite className="h-3.5 w-3.5" /> Satellit</button>
          <button onClick={() => setWege((w) => !w)} className={btn(wege)} title="Markierte Wanderwege einblenden"><Footprints className="h-3.5 w-3.5" /> Wege</button>
        </div>
      </div>

      <div ref={boxRef} className="w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700" style={{ height: fit ? "340px" : "420px" }} />

      {farbeProReise && (trips || []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {(trips || []).map((t, idx) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: farbeFuerReise(idx) }} />
              <span className="truncate">{t.name || t.region || "Reise"}</span>
            </span>
          ))}
        </div>
      )}

      {!loading && pins.length === 0 && <div className="mt-2 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {fit ? "Kein Ort hinterlegt – gib der Reise eine Region/Stadt." : "Noch keine verortbaren Reisen – gib einer Reise eine Region oder Stadt."}</div>}
      <div className="mt-2 text-xs text-stone-400 dark:text-stone-500">
        {farbeProReise
          ? "Farbe = Reise · kleine Symbole = deren Aktivitäten. Tippen öffnet die Reise."
          : (fit ? "Reise = grauer Fähnchen-Punkt, Aktivitäten mit eigenem Symbol je Art." : "Tippe eine Reise an, um sie zu öffnen.")}
        {wege ? " „Wege“ zeigt markierte Wanderrouten (Waymarked Trails, ab ca. Zoom 8)." : ""}{modus === "sat" ? " Satellit: Sentinel-2 (© EOX, CC BY-NC-SA 4.0), ca. 10 m." : ""}
      </div>
    </section>
  );
}
