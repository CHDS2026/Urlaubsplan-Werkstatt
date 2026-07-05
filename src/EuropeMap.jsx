import React from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { EUROPEAN_ADMIN } from "./geo.js";

// Offizielle Natural-Earth-Regionen (admin-1). Groß, wird nach dem ersten Laden gecacht.
const GEO_URL = "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_1_states_provinces.geojson";

// Stabiler Schlüssel je Region: ISO-Code, sonst Land|Name
function regionId(p) {
  const iso = p.iso_3166_2;
  if (iso && iso !== "-99" && iso !== "") return iso;
  return `${p.admin || ""}|${p.name || p.name_en || ""}`;
}

export default function EuropeMap({ visited, onToggle }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-sky-100" style={{ touchAction: "none" }}>
      <ComposableMap projection="geoMercator" width={800} height={560} projectionConfig={{ center: [14, 52], scale: 620 }} style={{ width: "100%", height: "auto" }}>
        <ZoomableGroup center={[14, 52]} zoom={1} minZoom={1} maxZoom={12}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies
                .filter((geo) => EUROPEAN_ADMIN.has(geo.properties.admin))
                .map((geo) => {
                  const p = geo.properties;
                  const id = regionId(p);
                  const on = !!visited[id];
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => onToggle(id, p.name || p.name_en || "Region")}
                      style={{
                        default: { fill: on ? "#059669" : "#e7e5e4", stroke: "#ffffff", strokeWidth: 0.4, outline: "none" },
                        hover: { fill: on ? "#047857" : "#d6d3d1", stroke: "#ffffff", strokeWidth: 0.5, outline: "none", cursor: "pointer" },
                        pressed: { fill: "#047857", outline: "none" },
                      }}
                    />
                  );
                })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
