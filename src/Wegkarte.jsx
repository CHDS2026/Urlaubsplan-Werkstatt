/*
  Wegkarte.jsx — einen Wanderweg IN der App auf der Karte zeigen
  --------------------------------------------------------------
  Bekommt die Geometrie einer OSM-Wanderroute als GeoJSON und zeichnet sie als Linie
  auf eine interaktive Karte (MapLibre). Karte/Satellit + Wanderwege-Overlay wie in
  der Reisekarte – die Bausteine werden von dort importiert, nicht kopiert.
  Kein Absprung zu openstreetmap.org nötig.

  EINBAU: <Wegkarte geojson={f} name="Heidschnuckenweg" />
          Nadeln: <Wegkarte spots={[{ id, name, lat, lon, kategorie }]} selectedId onSelect />
          Die Nadel-Designs (Farbe + Form je Kategorie) kommen aus Reisekarte.jsx – damit
          eine Wandertour hier genauso aussieht wie auf der Ideen- und der Reisekarte.
*/
import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapIcon, Satellite, Footprints } from "lucide-react";
import { STYLE_KARTE, STYLE_SAT, addWege, removeWege } from "./Reisekarte.jsx";
import { nadelSVG, nadelInfo } from "./nadeln.js";

const LINIE_SRC = "weg-src", LINIE_1 = "weg-linie", LINIE_2 = "weg-kontur";

const alsSammlung = (g) => (!g ? null : g.type === "FeatureCollection" ? g : { type: "FeatureCollection", features: [g] });
function bounds(geojson, nurId) {
  const fc = alsSammlung(geojson); if (!fc) return null;
  const b = new maplibregl.LngLatBounds();
  for (const f of fc.features) {
    if (nurId != null && f.properties && f.properties.id !== nurId) continue;
    const cs = (f.geometry && f.geometry.coordinates) || [];
    for (const line of cs) for (const c of line) b.extend(c);
  }
  return b.isEmpty() ? null : b;
}
/* Farbe datengesteuert: ausgewählter Weg rot, die anderen blau. */
const FARBE = (sel) => (sel == null ? "#be123c" : ["case", ["==", ["get", "id"], sel], "#be123c", "#0284c7"]);
const BREITE = (sel) => (sel == null ? 3.5 : ["case", ["==", ["get", "id"], sel], 4.5, 2.5]);
function zeichne(map, geojson, sel) {
  try {
    const fc = alsSammlung(geojson); if (!fc) return;
    if (!map.getSource(LINIE_SRC)) map.addSource(LINIE_SRC, { type: "geojson", data: fc });
    else map.getSource(LINIE_SRC).setData(fc);
    if (!map.getLayer(LINIE_2)) map.addLayer({ id: LINIE_2, type: "line", source: LINIE_SRC, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.85 } });
    if (!map.getLayer(LINIE_1)) map.addLayer({ id: LINIE_1, type: "line", source: LINIE_SRC, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": FARBE(sel), "line-width": BREITE(sel) } });
    else { map.setPaintProperty(LINIE_1, "line-color", FARBE(sel)); map.setPaintProperty(LINIE_1, "line-width", BREITE(sel)); }
  } catch (e) {}
}

export default function Wegkarte({ geojson, name, selectedId, onSelect, hoehe, spots }) {
  const boxRef = useRef(null), mapRef = useRef(null), wegeRef = useRef(false), markRef = useRef([]);
  const [modus, setModus] = useState("karte");
  const [wege, setWege] = useState(false);
  useEffect(() => { wegeRef.current = wege; }, [wege]);
  /* spots ist bei jedem Render ein NEUES Array. Als Effekt-Abhängigkeit würde die Karte
     deshalb ständig neu einpassen – man könnte sie nicht verschieben, sie spränge zurück.
     Dieser Schlüssel ändert sich nur, wenn sich die Nadeln tatsächlich ändern. */
  const spotKey = (spots || []).map((p) => String(p.id) + ":" + p.lat + ":" + p.lon + ":" + (p.kategorie || "")).join("|");

  useEffect(() => {
    if (mapRef.current || !boxRef.current) return;
    const map = new maplibregl.Map({ container: boxRef.current, style: STYLE_KARTE, center: [10, 52], zoom: 5, attributionControl: { compact: true } });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.touchZoomRotate.disableRotation();
    map.on("load", () => {
      if (wegeRef.current) addWege(map);
      if (geojson) { zeichne(map, geojson, selectedId); const b = bounds(geojson); if (b) map.fitBounds(b, { padding: 40, duration: 0 }); }
    });
    map.on("click", LINIE_1, (e) => { const f = e.features && e.features[0]; if (f && f.properties && onSelect) onSelect(f.properties.id); });
    map.on("mouseenter", LINIE_1, () => { if (onSelect) map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", LINIE_1, () => { map.getCanvas().style.cursor = ""; });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map || !geojson) return;
    const tun = () => { zeichne(map, geojson, selectedId); const b = bounds(geojson); if (b) map.fitBounds(b, { padding: 40, duration: 600 }); };
    if (map.isStyleLoaded()) tun(); else map.once("idle", tun);
  }, [geojson]); // eslint-disable-line

  /* Stecknadeln (Übersicht) im Design der jeweiligen Kategorie – Wandertour, Gipfel und
     Radroute sind so auf den ersten Blick auseinanderzuhalten. Antippen wählt aus. */
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    markRef.current.forEach((m) => m.remove());
    markRef.current = [];
    for (const p of spots || []) {
      if (p.lat == null || p.lon == null) continue;
      const aktiv = selectedId != null && p.id === selectedId;
      const el = document.createElement("div");
      el.style.cssText = "cursor:pointer;line-height:0";
      el.title = (p.name || "") + " · " + nadelInfo(p.kategorie).label;
      el.innerHTML = nadelSVG(p.kategorie, { aktiv, size: 28 });
      if (onSelect) el.addEventListener("click", (ev) => { ev.stopPropagation(); onSelect(p.id); });
      markRef.current.push(new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lon, p.lat]).addTo(map));
    }
  }, [spotKey, selectedId]); // eslint-disable-line

  /* Ohne Linie: einmal auf alle Nadeln einpassen – nur wenn die Nadel-Menge neu ist. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || geojson || !spotKey) return;
    const b = new maplibregl.LngLatBounds();
    let n = 0;
    for (const p of spots || []) if (p.lat != null && p.lon != null) { b.extend([p.lon, p.lat]); n++; }
    if (n) map.fitBounds(b, { padding: 50, maxZoom: 9, duration: 500 });
  }, [spotKey]); // eslint-disable-line

  /* Ohne Linie: auf die gewählte Nadel springen. Hängt an der KOORDINATE der Auswahl,
     nicht nur an der Auswahl selbst – so springt die Karte auch dann hin, wenn die Nadel
     erst nach einer Verortung (Favoriten) auftaucht, nicht erst wenn der Verlauf lädt. */
  const selCoord = selectedId != null ? (spots || []).find((x) => x.id === selectedId) : null;
  const selCoordKey = selCoord && selCoord.lat != null && selCoord.lon != null ? selCoord.lat + "," + selCoord.lon : "";
  useEffect(() => {
    const map = mapRef.current;
    if (!map || geojson || !selCoordKey) return;
    const parts = selCoordKey.split(",");
    map.flyTo({ center: [Number(parts[1]), Number(parts[0])], zoom: Math.max(map.getZoom(), 13.5), duration: 700 });
  }, [selCoordKey, geojson]); // eslint-disable-line

  /* Auswahl: einfärben und auf den gewählten Weg zoomen */
  useEffect(() => {
    const map = mapRef.current; if (!map || !geojson) return;
    const tun = () => {
      zeichne(map, geojson, selectedId);
      if (selectedId != null) { const b = bounds(geojson, selectedId); if (b) map.fitBounds(b, { padding: 50, duration: 700 }); }
    };
    if (map.isStyleLoaded()) tun(); else map.once("idle", tun);
  }, [selectedId]); // eslint-disable-line

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    map.setStyle(modus === "sat" ? STYLE_SAT : STYLE_KARTE);
    map.once("idle", () => { if (wegeRef.current) addWege(map); if (geojson) zeichne(map, geojson, selectedId); });
  }, [modus]); // eslint-disable-line

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const tun = () => { if (wege) addWege(map); else removeWege(map); if (geojson) zeichne(map, geojson, selectedId); };
    if (map.isStyleLoaded()) tun(); else map.once("idle", tun);
  }, [wege]); // eslint-disable-line

  const btn = (on) => "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300");

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold text-stone-600 dark:text-stone-300">{name}</span>
        <span className="flex shrink-0 gap-1.5">
          <button onClick={() => setModus("karte")} className={btn(modus === "karte")}><MapIcon className="h-3 w-3" /> Karte</button>
          <button onClick={() => setModus("sat")} className={btn(modus === "sat")}><Satellite className="h-3 w-3" /> Satellit</button>
          <button onClick={() => setWege((w) => !w)} className={btn(wege)}><Footprints className="h-3 w-3" /> Wege</button>
        </span>
      </div>
      <div ref={boxRef} className="w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700" style={{ height: hoehe || "300px" }} />
    </div>
  );
}
