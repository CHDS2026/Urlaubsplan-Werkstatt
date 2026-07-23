import React, { useState, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { STYLE_KARTE } from "./lib/karte.js";
import { Navigation, Footprints, Bike, Search, MapPin, Loader2, Info, X, Crosshair, ArrowDownUp } from "lucide-react";
import { navigiere } from "./lib/routing.js";

/* ══════════════════════════ RoutePlaner ══════════════════════════
   Eigenes „Route"-Feld: Ziel per EINGABE (Ortssuche) ODER per KARTE (antippen),
   Start = aktueller GPS-Standort (alternativ per Eingabe). Route über freie Dienste:
   Fuß/Rad via BRouter, Auto via OSRM – jeweils Linie + Distanz + geschätzte Zeit.
   Keine Schlüssel, keine Konten. Ehrlich: A→B-Routing, kein sprechendes Navi; Fuß/Rad
   hängt an BRouters öffentlichem Server (sonst „Auto" nehmen). */

const R_SRC = "rp-src", R_LINE = "rp-line", R_CASE = "rp-case";

async function geoSuche(q) {
  if (!q || q.trim().length < 2) return [];
  try {
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q.trim())}&limit=6&lang=de`);
    const j = await r.json();
    return ((j && j.features) || []).map((f) => {
      const p = f.properties || {};
      const teile = [p.name, p.street, p.city || p.town || p.village, p.state, p.country].filter(Boolean);
      return { name: teile.slice(0, 3).join(", ") || p.name || q, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
    }).filter((x) => isFinite(x.lat) && isFinite(x.lon));
  } catch (e) { return []; }
}

async function reverse(lat, lon) {
  try {
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=de`);
    const j = await r.json();
    const p = (j && j.features && j.features[0] && j.features[0].properties) || {};
    const teile = [p.name, p.street, p.city || p.town || p.village].filter(Boolean);
    return teile.slice(0, 2).join(", ") || null;
  } catch (e) { return null; }
}

const marker = (farbe, glyph) => {
  const el = document.createElement("div");
  el.style.cssText = "line-height:0";
  el.innerHTML = '<svg viewBox="0 0 18 26" width="26" height="38"><path d="M9 0C4 0 0 4 0 9c0 6.6 9 17 9 17s9-10.4 9-17c0-5-4-9-9-9z" fill="' + farbe + '" stroke="#fff" stroke-width="1.5"/>' + glyph + "</svg>";
  return el;
};
const START_GLYPH = '<circle cx="9" cy="9" r="3.4" fill="#fff"/>';
const ZIEL_GLYPH = '<circle cx="9" cy="9" r="4" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="9" cy="9" r="1.4" fill="#fff"/>';

export default function RoutePlaner() {
  const [zielModus, setZielModus] = useState("eingabe"); // "eingabe" | "karte"
  const [startModus, setStartModus] = useState("gps");   // "gps" | "eingabe"
  const [profil, setProfil] = useState("fuss");
  const [start, setStart] = useState(null);              // { lat, lon, name }
  const [ziel, setZiel] = useState(null);                // { lat, lon, name }
  const [zSuche, setZSuche] = useState(""); const [zTreffer, setZTreffer] = useState([]);
  const [sSuche, setSSuche] = useState(""); const [sTreffer, setSTreffer] = useState([]);
  const [route, setRoute] = useState(null); const [info, setInfo] = useState(null); // { km, min } | { err }
  const [busy, setBusy] = useState(false);
  const [gpsErr, setGpsErr] = useState("");

  const boxRef = useRef(null), mapRef = useRef(null);
  const startMk = useRef(null), zielMk = useRef(null), watchRef = useRef(null);
  const modusRef = useRef("eingabe"), startRef = useRef(null), zielRef = useRef(null), profilRef = useRef("fuss");
  const zielInputRef = useRef(null);
  useEffect(() => { modusRef.current = zielModus; }, [zielModus]);
  useEffect(() => { startRef.current = start; }, [start]);
  useEffect(() => { zielRef.current = ziel; }, [ziel]);
  useEffect(() => { profilRef.current = profil; }, [profil]);

  // Karte aufbauen
  useEffect(() => {
    if (!boxRef.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: boxRef.current, style: STYLE_KARTE, center: [10.05, 51.16], zoom: 5, attributionControl: true });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (e) => { if (modusRef.current === "karte") karteGewaehlt(e.lngLat.lat, e.lngLat.lng); });
    return () => { try { map.remove(); } catch (e) {} mapRef.current = null; };
    // eslint-disable-next-line
  }, []);

  // GPS-Standort als Start (wenn startModus = gps)
  useEffect(() => {
    if (startModus !== "gps") { if (watchRef.current != null && navigator.geolocation) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; } return; }
    if (!("geolocation" in navigator)) { setGpsErr("Standort wird nicht unterstützt – Start bitte per Eingabe."); return; }
    setGpsErr("");
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => { setStart({ lat: p.coords.latitude, lon: p.coords.longitude, name: "Mein Standort" }); },
      (err) => { setGpsErr(err && err.code === 1 ? "Standort-Freigabe verweigert – erlauben oder Start per Eingabe." : "Standort nicht verfügbar – kurz warten oder Start per Eingabe."); },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
    return () => { if (watchRef.current != null && navigator.geolocation) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; } };
    // eslint-disable-next-line
  }, [startModus]);

  // Marker + Kartenansicht bei Start/Ziel-Änderung
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const setzeMk = (ref, punkt, farbe, glyph) => {
      if (!punkt) { if (ref.current) { ref.current.remove(); ref.current = null; } return; }
      if (!ref.current) ref.current = new maplibregl.Marker({ element: marker(farbe, glyph), anchor: "bottom" }).setLngLat([punkt.lon, punkt.lat]).addTo(map);
      else ref.current.setLngLat([punkt.lon, punkt.lat]);
    };
    setzeMk(startMk, start, "#2563eb", START_GLYPH);
    setzeMk(zielMk, ziel, "#dc2626", ZIEL_GLYPH);
    try {
      if (start && ziel && !route) { const b = new maplibregl.LngLatBounds().extend([start.lon, start.lat]).extend([ziel.lon, ziel.lat]); map.fitBounds(b, { padding: 70, maxZoom: 14, duration: 600 }); }
      else if (ziel && !start) map.flyTo({ center: [ziel.lon, ziel.lat], zoom: Math.max(map.getZoom(), 12), duration: 600 });
      else if (start && !ziel) map.flyTo({ center: [start.lon, start.lat], zoom: Math.max(map.getZoom(), 12), duration: 600 });
    } catch (e) {}
    // eslint-disable-next-line
  }, [start && start.lat, start && start.lon, ziel && ziel.lat, ziel && ziel.lon]);

  // Route zeichnen
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const tun = () => {
      try {
        if (!route) { if (map.getLayer(R_LINE)) map.removeLayer(R_LINE); if (map.getLayer(R_CASE)) map.removeLayer(R_CASE); if (map.getSource(R_SRC)) map.removeSource(R_SRC); return; }
        if (!map.getSource(R_SRC)) map.addSource(R_SRC, { type: "geojson", data: route });
        else map.getSource(R_SRC).setData(route);
        if (!map.getLayer(R_CASE)) map.addLayer({ id: R_CASE, type: "line", source: R_SRC, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#fff", "line-width": 8 } });
        if (!map.getLayer(R_LINE)) map.addLayer({ id: R_LINE, type: "line", source: R_SRC, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#2563eb", "line-width": 5 } });
        const b = new maplibregl.LngLatBounds();
        const rein = (c) => { if (!Array.isArray(c) || !c.length) return; if (typeof c[0] === "number") { if (c.length >= 2 && isFinite(c[0]) && isFinite(c[1])) b.extend(c); } else c.forEach(rein); };
        route.features.forEach((f) => f.geometry && rein(f.geometry.coordinates));
        if (!b.isEmpty()) map.fitBounds(b, { padding: 60, duration: 700 });
      } catch (e) { if (typeof console !== "undefined") console.warn("RoutePlaner:", e && e.message); }
    };
    if (map.isStyleLoaded()) tun(); else map.once("idle", tun);
    // eslint-disable-next-line
  }, [route]);

  // Ziel-Suche (entprellt)
  useEffect(() => {
    if (zielModus !== "eingabe") { setZTreffer([]); return; }
    const t = setTimeout(async () => setZTreffer(await geoSuche(zSuche)), 300);
    return () => clearTimeout(t);
  }, [zSuche, zielModus]);
  // Start-Suche (entprellt)
  useEffect(() => {
    if (startModus !== "eingabe") { setSTreffer([]); return; }
    const t = setTimeout(async () => setSTreffer(await geoSuche(sSuche)), 300);
    return () => clearTimeout(t);
  }, [sSuche, startModus]);

  async function berechne(s, z, p) {
    if (!s || !z || s.lat == null || z.lat == null) return;
    setBusy(true); setInfo(null); setRoute(null);
    try {
      const res = await navigiere({ lat: s.lat, lon: s.lon }, { lat: z.lat, lon: z.lon }, p);
      setRoute(res.geojson); setInfo({ km: res.km, min: res.min, profil: p });
    } catch (e) {
      setInfo({ err: p === "auto" ? "Route nicht verfügbar – später erneut." : "Fuß-/Rad-Routing gerade nicht erreichbar – „Auto“ versuchen." });
    } finally { setBusy(false); }
  }
  function setZielPunkt(z) { setZiel(z); zielRef.current = z; if (startRef.current) berechne(startRef.current, z, profilRef.current); }
  function setStartPunkt(s) { setStart(s); startRef.current = s; if (zielRef.current) berechne(s, zielRef.current, profilRef.current); }
  function waehleProfil(p) { setProfil(p); profilRef.current = p; if (startRef.current && zielRef.current) berechne(startRef.current, zielRef.current, p); }
  function reset() { setRoute(null); setInfo(null); setZiel(null); zielRef.current = null; setZSuche(""); setZTreffer([]); }
  function karteGewaehlt(lat, lon) {
    const pt = { lat, lon, name: "Kartenpunkt" };
    setZielPunkt(pt);
    reverse(lat, lon).then((name) => { if (name) setZiel((z) => (z && z.lat === lat && z.lon === lon ? { ...z, name } : z)); });
  }
  /* Start und Ziel tauschen – ein Klick statt beides neu eingeben. */
  function tausche() {
    const s = startRef.current, z = zielRef.current;
    if (!s && !z) return;
    setStartModus("eingabe");            // sonst würde GPS den getauschten Start gleich überschreiben
    setStart(z); startRef.current = z; setSSuche(z ? z.name : "");
    setZiel(s); zielRef.current = s; setZSuche(s ? s.name : "");
    if (s && z) berechne(z, s, profilRef.current);
  }
  /* Ziel-Feld automatisch fokussieren, wenn man im Eingabe-Modus ist. */
  useEffect(() => { if (zielModus === "eingabe" && zielInputRef.current) { try { zielInputRef.current.focus(); } catch (e) {} } }, [zielModus]);

  const seg = (on) => "rounded-lg px-3 py-1.5 text-xs font-semibold transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300");
  const feld = "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900";
  const trefferListe = (liste, onPick) => liste.length > 0 && (
    <div className="mt-1 max-h-52 overflow-auto rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
      {liste.map((x, i) => (
        <button key={i} onClick={() => onPick(x)} className="flex w-full items-center gap-2 border-b border-stone-100 px-3 py-2 text-left text-sm text-stone-700 last:border-0 hover:bg-emerald-50 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-800">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-stone-400" /> <span className="min-w-0 truncate">{x.name}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="inline-flex items-center gap-2 text-lg font-bold text-stone-800 dark:text-stone-100"><Navigation className="h-5 w-5 text-emerald-700 dark:text-emerald-300" /> Route</div>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Ziel per Eingabe oder auf der Karte wählen – Start ist dein aktueller Standort. Dann Route zu Fuß, mit Rad oder Auto.</p>

      {/* START */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Start</span>
          <span className="flex gap-1">
            <button onClick={() => setStartModus("gps")} className={seg(startModus === "gps")}><Crosshair className="mr-1 inline h-3 w-3" />Mein Standort</button>
            <button onClick={() => setStartModus("eingabe")} className={seg(startModus === "eingabe")}>Eingabe</button>
          </span>
        </div>
        {startModus === "gps" ? (
          <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm dark:bg-stone-800">
            {gpsErr ? <span className="text-rose-600 dark:text-rose-400">{gpsErr}</span>
              : start ? <span className="inline-flex items-center gap-1.5 text-stone-700 dark:text-stone-200"><span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" /> Mein Standort steht.</span>
                : <span className="inline-flex items-center gap-1.5 text-stone-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Standort wird ermittelt …</span>}
          </div>
        ) : (<>
          <input value={sSuche} onChange={(e) => setSSuche(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && sTreffer[0]) { const x = sTreffer[0]; setStartPunkt(x); setSSuche(x.name); setSTreffer([]); } }} placeholder="Startort suchen …" className={feld} />
          {trefferListe(sTreffer, (x) => { setStartPunkt(x); setSSuche(x.name); setSTreffer([]); })}
        </>)}
      </div>

      {/* TAUSCHEN */}
      <div className="mt-2 flex justify-center">
        <button onClick={tausche} title="Start und Ziel tauschen" className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-500 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"><ArrowDownUp className="h-3.5 w-3.5" /> tauschen</button>
      </div>

      {/* ZIEL */}
      <div className="mt-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Ziel</span>
          <span className="flex gap-1">
            <button onClick={() => setZielModus("eingabe")} className={seg(zielModus === "eingabe")}><Search className="mr-1 inline h-3 w-3" />Eingabe</button>
            <button onClick={() => setZielModus("karte")} className={seg(zielModus === "karte")}><MapPin className="mr-1 inline h-3 w-3" />Karte</button>
          </span>
        </div>
        {zielModus === "eingabe" ? (<>
          <input ref={zielInputRef} value={zSuche} onChange={(e) => setZSuche(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && zTreffer[0]) { const x = zTreffer[0]; setZielPunkt(x); setZSuche(x.name); setZTreffer([]); } }} placeholder="Zielort suchen …" className={feld} />
          {trefferListe(zTreffer, (x) => { setZielPunkt(x); setZSuche(x.name); setZTreffer([]); })}
        </>) : (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {ziel && ziel.name === "Kartenpunkt" ? "Ziel gesetzt – oder erneut auf die Karte tippen, um es zu verschieben." : "Tippe auf die Karte, um dein Ziel zu setzen."}
          </div>
        )}
      </div>

      {/* MODUS + ERGEBNIS */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Weg</span>
        <button onClick={() => waehleProfil("fuss")} className={seg(profil === "fuss")}><Footprints className="mr-1 inline h-3 w-3" />Fuß</button>
        <button onClick={() => waehleProfil("rad")} className={seg(profil === "rad")}><Bike className="mr-1 inline h-3 w-3" />Rad</button>
        <button onClick={() => waehleProfil("auto")} className={seg(profil === "auto")}><Navigation className="mr-1 inline h-3 w-3" />Auto</button>
        {busy && <span className="inline-flex items-center gap-1 text-xs text-stone-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Route wird berechnet …</span>}
        {info && !info.err && <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{info.km != null ? info.km + " km" : ""}{info.min != null ? " · ~" + info.min + " min" : ""}</span>}
        {info && info.err && <span className="text-xs text-rose-600 dark:text-rose-400">{info.err}</span>}
        {(ziel || route) && <button onClick={reset} className="inline-flex items-center gap-1 text-xs text-stone-400 underline hover:text-stone-600 dark:hover:text-stone-200"><X className="h-3 w-3" /> zurücksetzen</button>}
      </div>

      {/* KARTE */}
      <div ref={boxRef} className={"mt-3 w-full overflow-hidden rounded-xl border " + (zielModus === "karte" ? "border-emerald-400 ring-1 ring-emerald-300" : "border-stone-200 dark:border-stone-700")} style={{ height: "420px", cursor: zielModus === "karte" ? "crosshair" : "grab" }} />

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>
        Start = blaue Nadel (dein Standort), Ziel = rote Nadel. Fuß/Rad über BRouter, Auto über OSRM – frei, ohne Schlüssel. A→B-Route mit Distanz und geschätzter Zeit, kein sprechendes Navi. Ist Fuß/Rad gerade nicht erreichbar, „Auto" nehmen. Ortssuche über Photon. Ohne Gewähr.
      </span></div>
    </div>
  );
}
