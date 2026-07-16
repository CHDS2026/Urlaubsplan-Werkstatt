/*
  Wegkarte.jsx — einen Wanderweg IN der App auf der Karte zeigen
  --------------------------------------------------------------
  Bekommt die Geometrie einer OSM-Wanderroute als GeoJSON und zeichnet sie als Linie
  auf eine interaktive Karte (MapLibre). Karte/Satellit + Wanderwege-Overlay wie in
  der Reisekarte – die Bausteine werden von dort importiert, nicht kopiert.
  Kein Absprung zu openstreetmap.org nötig.

  EINBAU: <Wegkarte geojson={f} name="Heidschnuckenweg" />
*/
import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapIcon, Satellite, Footprints } from "lucide-react";
import { STYLE_KARTE, STYLE_SAT, addWege, removeWege } from "./Reisekarte.jsx";

const LINIE_SRC = "weg-src", LINIE_1 = "weg-linie", LINIE_2 = "weg-kontur";

function bounds(geojson) {
  const b = new maplibregl.LngLatBounds();
  const cs = geojson && geojson.geometry ? geojson.geometry.coordinates : [];
  for (const line of cs) for (const c of line) b.extend(c);
  return b.isEmpty() ? null : b;
}
function zeichne(map, geojson) {
  try {
    if (!map.getSource(LINIE_SRC)) map.addSource(LINIE_SRC, { type: "geojson", data: geojson });
    else map.getSource(LINIE_SRC).setData(geojson);
    if (!map.getLayer(LINIE_2)) map.addLayer({ id: LINIE_2, type: "line", source: LINIE_SRC, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.9 } });
    if (!map.getLayer(LINIE_1)) map.addLayer({ id: LINIE_1, type: "line", source: LINIE_SRC, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#be123c", "line-width": 3.5 } });
  } catch (e) {}
}

export default function Wegkarte({ geojson, name }) {
  const boxRef = useRef(null), mapRef = useRef(null), wegeRef = useRef(false);
  const [modus, setModus] = useState("karte");
  const [wege, setWege] = useState(false);
  useEffect(() => { wegeRef.current = wege; }, [wege]);

  useEffect(() => {
    if (mapRef.current || !boxRef.current) return;
    const map = new maplibregl.Map({ container: boxRef.current, style: STYLE_KARTE, center: [10, 52], zoom: 5, attributionControl: { compact: true } });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.touchZoomRotate.disableRotation();
    map.on("load", () => { if (wegeRef.current) addWege(map); if (geojson) { zeichne(map, geojson); const b = bounds(geojson); if (b) map.fitBounds(b, { padding: 40, duration: 0 }); } });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map || !geojson) return;
    const tun = () => { zeichne(map, geojson); const b = bounds(geojson); if (b) map.fitBounds(b, { padding: 40, duration: 600 }); };
    if (map.isStyleLoaded()) tun(); else map.once("idle", tun);
  }, [geojson]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    map.setStyle(modus === "sat" ? STYLE_SAT : STYLE_KARTE);
    map.once("idle", () => { if (wegeRef.current) addWege(map); if (geojson) zeichne(map, geojson); });
  }, [modus]); // eslint-disable-line

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const tun = () => { if (wege) addWege(map); else removeWege(map); if (geojson) zeichne(map, geojson); };
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
      <div ref={boxRef} className="w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700" style={{ height: "300px" }} />
    </div>
  );
}
