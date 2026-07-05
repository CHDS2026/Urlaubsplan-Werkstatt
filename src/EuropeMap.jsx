import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

// Natural-Earth-Regionen (admin-1) aus mehreren Quellen; die erste mit echtem Europa-Inhalt gewinnt.
const SOURCES = [
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_1_states_provinces.geojson",
  "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/50m/cultural/ne_50m_admin_1_states_provinces.json",
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_10m_admin_1_states_provinces.geojson",
  "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/10m/cultural/ne_10m_admin_1_states_provinces.json",
];

// Ländercodes Europas (ISO 3166-1 alpha-2)
const EUR_ISO2 = new Set(["AD","AL","AT","BA","BE","BG","BY","CH","CY","CZ","DE","DK","EE","ES","FI","FR","GB","GR","HR","HU","IE","IS","IT","LI","LT","LU","LV","MC","MD","ME","MK","MT","NL","NO","PL","PT","RO","RS","SE","SI","SK","SM","UA","VA","XK"]);

const getCC = (p) => {
  const iso = p.iso_3166_2 || p.ISO_3166_2 || "";
  if (iso && iso.indexOf("-") > 0) return iso.split("-")[0].toUpperCase();
  return (p.iso_a2 || p.ISO_A2 || p.iso_a2_eh || "").toUpperCase();
};
const getName = (p) => p.name || p.name_en || p.NAME || p.name_local || p.gn_name || "Region";
const getIso = (p) => p.iso_3166_2 || p.ISO_3166_2 || "";
const isEuro = (p) => EUR_ISO2.has(getCC(p));

let CACHE = null; // über Tab-Wechsel behalten

export default function EuropeMap({ visited, onToggle }) {
  const [state, setState] = useState(CACHE ? { status: "ok" } : { status: "loading" });

  useEffect(() => {
    if (CACHE) return;
    let alive = true;
    (async () => {
      for (const url of SOURCES) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const json = await res.json();
          const feats = (json.features || []).filter((f) => f && f.properties && f.geometry);
          if (!feats.length) continue;
          const euro = feats.filter((f) => isEuro(f.properties));
          if (euro.length < 50) continue; // Quelle ohne echtes Europa -> nächste probieren
          CACHE = euro;
          if (alive) setState({ status: "ok" });
          return;
        } catch (e) { /* nächste Quelle */ }
      }
      if (alive) setState({ status: "error" });
    })();
    return () => { alive = false; };
  }, []);

  if (state.status === "loading") return <div className="rounded-xl border border-stone-200 bg-sky-100 p-10 text-center text-sm text-stone-500">Regionen-Karte lädt … (großer Datensatz – beim ersten Mal etwas Geduld)</div>;
  if (state.status === "error") return <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">Die Regionen-Daten konnten nicht geladen werden. Internetverbindung prüfen und Karte erneut öffnen – oder „Liste" nutzen.</div>;

  const fc = { type: "FeatureCollection", features: CACHE };
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-sky-100" style={{ touchAction: "none" }}>
      <ComposableMap width={800} height={560} style={{ width: "100%", height: "auto" }}>
        <ZoomableGroup center={[14, 52]} zoom={4} minZoom={3} maxZoom={40}>
          <Geographies geography={fc}>
            {({ geographies }) => geographies.map((geo) => {
              const p = geo.properties;
              const iso = getIso(p);
              const id = (iso && iso !== "-99") ? iso : `${getCC(p)}|${getName(p)}`;
              const on = !!visited[id];
              return (
                <Geography key={geo.rsmKey} geography={geo} onClick={() => onToggle(id, getName(p))}
                  style={{
                    default: { fill: on ? "#059669" : "#e7e5e4", stroke: "#ffffff", strokeWidth: 0.2, outline: "none" },
                    hover: { fill: on ? "#047857" : "#d6d3d1", stroke: "#ffffff", strokeWidth: 0.3, outline: "none", cursor: "pointer" },
                    pressed: { fill: "#047857", outline: "none" },
                  }} />
              );
            })}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
