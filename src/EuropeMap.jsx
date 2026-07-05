import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { EUROPEAN_ADMIN } from "./geo.js";

// Mehrere Quellen für Natural-Earth-Regionen (admin-1). Nacheinander probiert.
const SOURCES = [
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_1_states_provinces.geojson",
  "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/50m/cultural/ne_50m_admin_1_states_provinces.json",
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson",
];

// Feldnamen können je nach Konvertierung variieren -> defensiv auslesen
const getAdmin = (p) => p.admin || p.ADMIN || p.adm0name || p.geonunit || p.sov_a3 || "";
const getName = (p) => p.name || p.name_en || p.NAME || p.NAME_1 || p.gn_name || p.woe_name || "Region";
const getIso = (p) => p.iso_3166_2 || p.ISO_3166_2 || "";

let CACHE = null; // über Tab-Wechsel hinweg behalten

export default function EuropeMap({ visited, onToggle }) {
  const [state, setState] = useState(CACHE ? { status: "ok", data: CACHE } : { status: "loading" });

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
          CACHE = { all: feats.length, features: feats };
          if (alive) setState({ status: "ok", data: CACHE });
          return;
        } catch (e) { /* nächste Quelle */ }
      }
      if (alive) setState({ status: "error" });
    })();
    return () => { alive = false; };
  }, []);

  if (state.status === "loading") return <div className="rounded-xl border border-stone-200 bg-sky-100 p-10 text-center text-sm text-stone-500">Regionen-Karte lädt … (großer Datensatz – beim ersten Mal etwas Geduld)</div>;
  if (state.status === "error") return <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">Die Regionen-Daten konnten nicht geladen werden. Internetverbindung prüfen und Karte erneut öffnen – oder „Liste" nutzen.</div>;

  const euro = state.data.features.filter((f) => EUROPEAN_ADMIN.has(getAdmin(f.properties)));

  if (euro.length === 0) {
    const first = state.data.features[0];
    const keys = first ? Object.keys(first.properties).slice(0, 16).join(", ") : "—";
    const sampleAdmin = state.data.features.slice(0, 4).map((f) => getAdmin(f.properties) || "?").join(" · ");
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
        <p className="font-semibold">Daten geladen ({state.data.all} Regionen), aber keine europäischen erkannt.</p>
        <p className="mt-1">Verfügbare Felder: {keys}</p>
        <p className="mt-1">Beispiel-Länderwerte: {sampleAdmin}</p>
        <p className="mt-1">Bitte diesen Text an den Entwickler geben – dann wird die Zuordnung angepasst.</p>
      </div>
    );
  }

  const fc = { type: "FeatureCollection", features: euro };
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-sky-100" style={{ touchAction: "none" }}>
      <ComposableMap width={800} height={560} style={{ width: "100%", height: "auto" }}>
        <ZoomableGroup center={[14, 52]} zoom={4} minZoom={3} maxZoom={40}>
          <Geographies geography={fc}>
            {({ geographies }) => geographies.map((geo) => {
              const p = geo.properties;
              const iso = getIso(p);
              const id = (iso && iso !== "-99") ? iso : `${getAdmin(p)}|${getName(p)}`;
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
