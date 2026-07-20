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
import { Map as MapIcon, Satellite, Footprints, Navigation } from "lucide-react";
import { STYLE_KARTE, STYLE_SAT, addWege, removeWege } from "./Reisekarte.jsx";
import { nadelSVG, nadelInfo } from "./nadeln.js";

const LINIE_SRC = "weg-src", LINIE_1 = "weg-linie", LINIE_2 = "weg-kontur";

const alsSammlung = (g) => (!g ? null : g.type === "FeatureCollection" ? g : { type: "FeatureCollection", features: [g] });
const havM = (aLa, aLo, bLa, bLo) => { const R = 6371000, r = Math.PI / 180; const dLa = (bLa - aLa) * r, dLo = (bLo - aLo) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(aLa * r) * Math.cos(bLa * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(x))); };
/* Kürzeste Distanz (m) von einem Punkt zum Verlauf – Näherung über die Stützpunkte der
   Linie (OSM-Routen sind dicht, daher genau genug für „wie weit vom Weg"). */
function distZuRoute(geojson, lat, lon) {
  const fc = alsSammlung(geojson); if (!fc) return null;
  let best = Infinity;
  for (const feat of (fc.features || [])) {
    if (!feat.geometry) continue;
    for (const c of koordsFlach(feat.geometry.coordinates, [])) { const d = havM(lat, lon, c[1], c[0]); if (d < best) best = d; }
  }
  return isFinite(best) ? Math.round(best) : null;
}
/* Alle [lon,lat]-Punkte einer Geometrie rekursiv einsammeln – egal ob LineString,
   MultiLineString, Polygon … Dadurch kann bounds/Distanz nie an einem unerwarteten
   Geometrietyp abstürzen (genau das war die Ursache für den schwarzen Bildschirm bei
   LineString-Routen: b.extend(Zahl) statt b.extend([lon,lat])). */
const sicher = (fn) => { try { fn(); } catch (e) { if (typeof console !== "undefined") console.warn("Wegkarte-Karte:", e && e.message ? e.message : e); } };
function koordsFlach(coords, out) {
  if (!Array.isArray(coords) || !coords.length) return out;
  if (typeof coords[0] === "number") { if (coords.length >= 2 && isFinite(coords[0]) && isFinite(coords[1])) out.push(coords); return out; }
  for (const c of coords) koordsFlach(c, out);
  return out;
}

function bounds(geojson, nurId) {
  const fc = alsSammlung(geojson); if (!fc) return null;
  const b = new maplibregl.LngLatBounds();
  for (const f of fc.features) {
    if (nurId != null && f.properties && f.properties.id !== nurId) continue;
    if (f.geometry) for (const c of koordsFlach(f.geometry.coordinates, [])) b.extend(c);
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

  // ── Live-Standort (GPS) ──
  const [standort, setStandort] = useState(false);
  const [pos, setPos] = useState(null);        // { lat, lon, acc }
  const [geoErr, setGeoErr] = useState("");
  const watchRef = useRef(null), posMarkRef = useRef(null), ersterFixRef = useRef(true);

  function standortMarker(map, p) {
    if (!posMarkRef.current) {
      const el = document.createElement("div");
      el.style.cssText = "width:18px;height:18px;line-height:0";
      el.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="#2563eb" stroke="#fff" stroke-width="3"/></svg>';
      posMarkRef.current = new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(map);
    } else posMarkRef.current.setLngLat([p.lon, p.lat]);
  }
  function standortWeg() { if (posMarkRef.current) { posMarkRef.current.remove(); posMarkRef.current = null; } }
  function stopWatch() { if (watchRef.current != null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
  function toggleStandort() {
    if (standort) { stopWatch(); standortWeg(); setStandort(false); setPos(null); setGeoErr(""); return; }
    if (!("geolocation" in navigator)) { setGeoErr("Standort wird von diesem Gerät/Browser nicht unterstützt."); return; }
    setGeoErr(""); ersterFixRef.current = true; setStandort(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => { const c = p.coords; setPos({ lat: c.latitude, lon: c.longitude, acc: c.accuracy }); },
      (err) => { setGeoErr(err && err.code === 1 ? "Standort-Freigabe verweigert – in den Browser-Einstellungen erlauben." : "Standort nicht verfügbar – kurz warten oder erneut versuchen."); },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );
  }
  /* Position aktualisieren: Marker setzen/verschieben; beim ERSTEN Fix hinspringen. */
  useEffect(() => {
    const map = mapRef.current; if (!map || !pos) return;
    standortMarker(map, pos);
    if (ersterFixRef.current) { ersterFixRef.current = false; map.flyTo({ center: [pos.lon, pos.lat], zoom: Math.max(map.getZoom(), 15), duration: 800 }); }
    // eslint-disable-next-line
  }, [pos]);
  /* Aufräumen: Tracking beenden, wenn die Karte verschwindet. */
  useEffect(() => () => { stopWatch(); standortWeg(); }, []); // eslint-disable-line
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
      if (geojson) sicher(() => { zeichne(map, geojson, selectedId); const b = bounds(geojson); if (b) map.fitBounds(b, { padding: 40, duration: 0 }); });
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
    const tun = () => sicher(() => { zeichne(map, geojson, selectedId); const b = bounds(geojson); if (b) map.fitBounds(b, { padding: 40, duration: 600 }); });
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
    sicher(() => {
      const b = new maplibregl.LngLatBounds();
      let n = 0;
      for (const p of spots || []) if (p.lat != null && p.lon != null) { b.extend([p.lon, p.lat]); n++; }
      if (n) map.fitBounds(b, { padding: 50, maxZoom: 9, duration: 500 });
    });
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
    sicher(() => map.flyTo({ center: [Number(parts[1]), Number(parts[0])], zoom: Math.max(map.getZoom(), 13.5), duration: 700 }));
  }, [selCoordKey, geojson]); // eslint-disable-line

  /* Auswahl: einfärben und auf den gewählten Weg zoomen */
  useEffect(() => {
    const map = mapRef.current; if (!map || !geojson) return;
    const tun = () => sicher(() => {
      zeichne(map, geojson, selectedId);
      if (selectedId != null) { const b = bounds(geojson, selectedId); if (b) map.fitBounds(b, { padding: 50, duration: 700 }); }
    });
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

  const wegDist = pos && geojson ? distZuRoute(geojson, pos.lat, pos.lon) : null;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold text-stone-600 dark:text-stone-300">{name}</span>
        <span className="flex shrink-0 gap-1.5">
          <button onClick={() => setModus("karte")} className={btn(modus === "karte")}><MapIcon className="h-3 w-3" /> Karte</button>
          <button onClick={() => setModus("sat")} className={btn(modus === "sat")}><Satellite className="h-3 w-3" /> Satellit</button>
          <button onClick={() => setWege((w) => !w)} className={btn(wege)}><Footprints className="h-3 w-3" /> Wege</button>
          <button onClick={toggleStandort} className={btn(standort)}><Navigation className="h-3 w-3" /> Standort</button>
        </span>
      </div>
      <div ref={boxRef} className="w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700" style={{ height: hoehe || "300px" }} />
      {(standort || geoErr) && (
        <div className="mt-1.5 text-xs">
          {geoErr
            ? <span className="text-rose-600 dark:text-rose-400">{geoErr}</span>
            : pos
              ? <span className="text-stone-500 dark:text-stone-400"><span className="font-semibold text-blue-600 dark:text-blue-400">● Live-Standort</span> · Genauigkeit ±{Math.round(pos.acc)} m{wegDist != null ? " · " + wegDist + " m vom Weg entfernt" : ""}</span>
              : <span className="text-stone-400 dark:text-stone-500">Standort wird ermittelt …</span>}
        </div>
      )}
    </div>
  );
}
