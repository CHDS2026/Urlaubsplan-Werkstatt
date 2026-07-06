import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

// Fertige Regionskarten über dasselbe CDN wie die Weltkarte (jsDelivr / npm), Land für Land.
const BASE = "https://cdn.jsdelivr.net/npm/@highcharts/map-collection@2/countries";
const url = (cc) => `${BASE}/${cc}/${cc}-all.topo.json`;

// Deutschland=Bundesländer, Schweiz=Kantone, Österreich=Bundesländer, u. a.
const COUNTRIES = ["de", "at", "ch", "fr", "es", "nl", "be"];

export default function EuropeMap({ visited, onToggle }) {
  const [probe, setProbe] = useState({ status: "loading" });

  useEffect(() => {
    let alive = true;
    fetch(url("de"))
      .then((r) => (r.ok ? r.json() : Promise.reject("http")))
      .then((j) => {
        let n = 0;
        try { const obj = j.objects[Object.keys(j.objects)[0]]; n = (obj.geometries || []).length; } catch (e) {}
        if (alive) setProbe({ status: "ok", n });
      })
      .catch((e) => { if (alive) setProbe({ status: e === "http" ? "http" : "neterr" }); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-2">
      {probe.status === "neterr" && <div className="rounded-lg border border-dashed border-stone-300 bg-white p-3 text-xs text-stone-500">Kartendaten nicht erreichbar (Netzwerk/CORS). Bitte melden – solange „Liste" nutzen.</div>}
      {probe.status === "http" && <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">Kartenquelle antwortet mit Fehler. Bitte melden.</div>}
      {probe.status === "ok" && <p className="text-center text-xs text-emerald-700">Kartenquelle verbunden{typeof probe.n === "number" ? ` (Test „DE": ${probe.n} Regionen)` : ""}.</p>}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-sky-100" style={{ touchAction: "none" }}>
        <ComposableMap projection="geoMercator" projectionConfig={{ center: [4, 46], scale: 1000 }} width={800} height={640} style={{ width: "100%", height: "auto" }}>
          <ZoomableGroup center={[4, 46]} zoom={1} minZoom={1} maxZoom={20}>
            {COUNTRIES.map((cc) => (
              <Geographies key={cc} geography={url(cc)}>
                {({ geographies }) => geographies.map((geo) => {
                  const p = geo.properties || {};
                  const id = p["hc-key"] || `${cc}-${p.name || geo.rsmKey}`;
                  const on = !!visited[id];
                  return (
                    <Geography key={geo.rsmKey} geography={geo} onClick={() => onToggle(id, p.name || "Region")}
                      style={{
                        default: { fill: on ? "#059669" : "#e7e5e4", stroke: "#ffffff", strokeWidth: 0.3, outline: "none" },
                        hover: { fill: on ? "#047857" : "#d6d3d1", stroke: "#ffffff", strokeWidth: 0.4, outline: "none", cursor: "pointer" },
                        pressed: { fill: "#047857", outline: "none" },
                      }} />
                  );
                })}
              </Geographies>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </div>
  );
}
