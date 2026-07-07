import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

// Eurostat Nuts2json: echte Geokoordinaten (WGS84), web-optimiert, über jsDelivr (CORS-sicher, gecacht).
const BASE = "https://cdn.jsdelivr.net/gh/eurostat/Nuts2json@master/pub/v2/2021/4326/20M";
const lvlUrl = (l) => `${BASE}/${l}.json`;

// Pro Land die passende NUTS-Ebene: DE=Bundesländer (1), CH=Kantone (3), UK=Regionen (1), Rest=NUTS-2.
const COUNTRY_LEVEL = { DE: 1, CH: 3, UK: 1 };
const levelFor = (cc) => COUNTRY_LEVEL[cc] || 2;

const idOf = (geo) => String(geo.id || (geo.properties && geo.properties.id) || geo.rsmKey || "");
const nameOf = (geo) => (geo.properties && (geo.properties.na || geo.properties.name)) || idOf(geo);

export default function EuropeMap({ visited, onToggle }) {
  const [probe, setProbe] = useState({ status: "loading" });

  useEffect(() => {
    let alive = true;
    fetch(lvlUrl(2))
      .then((r) => (r.ok ? r.json() : Promise.reject("http")))
      .then((j) => { let n = 0; try { const o = j.objects[Object.keys(j.objects)[0]]; n = (o.geometries || []).length; } catch (e) {} if (alive) setProbe({ status: "ok", n }); })
      .catch((e) => { if (alive) setProbe({ status: e === "http" ? "http" : "neterr" }); });
    return () => { alive = false; };
  }, []);

  const geoStyle = (on) => ({
    default: { fill: on ? "#059669" : "#e7e5e4", stroke: "#ffffff", strokeWidth: 0.35, outline: "none" },
    hover: { fill: on ? "#047857" : "#d6d3d1", stroke: "#ffffff", strokeWidth: 0.5, outline: "none", cursor: "pointer" },
    pressed: { fill: "#047857", outline: "none" },
  });

  return (
    <div className="space-y-2">
      {probe.status === "neterr" && <div className="rounded-lg border border-dashed border-stone-300 bg-white p-3 text-xs text-stone-500">Kartendaten nicht erreichbar (Netzwerk). Bitte melden – solange „Liste" nutzen.</div>}
      {probe.status === "http" && <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">Kartenquelle antwortet mit Fehler. Bitte melden.</div>}
      {probe.status === "ok" && <p className="text-center text-xs text-emerald-700">Kartenquelle verbunden{typeof probe.n === "number" ? ` (${probe.n} Regionen)` : ""}.</p>}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-sky-100" style={{ touchAction: "none" }}>
        <ComposableMap projection="geoMercator" projectionConfig={{ center: [8, 49], scale: 560 }} width={800} height={700} style={{ width: "100%", height: "auto" }}>
          <ZoomableGroup center={[8, 49]} zoom={1} minZoom={1} maxZoom={24}>
            {[1, 2, 3].map((lvl) => (
              <Geographies key={lvl} geography={lvlUrl(lvl)}>
                {({ geographies }) => geographies
                  .filter((geo) => levelFor(idOf(geo).slice(0, 2)) === lvl)
                  .map((geo) => {
                    const id = idOf(geo);
                    const on = !!visited[id];
                    return <Geography key={geo.rsmKey} geography={geo} onClick={() => onToggle(id, nameOf(geo))} style={geoStyle(on)} />;
                  })}
              </Geographies>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </div>
  );
}
