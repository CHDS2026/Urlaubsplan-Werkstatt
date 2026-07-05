import React, { useRef, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { normCountry, NE_ALIAS } from "./geo.js";

// Höher aufgelöste Länderumrisse (50m) inkl. kleiner Staaten; nach dem ersten Laden gecacht
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

export default function WorldMap({ visited, wish, onToggle, onNames }) {
  const namesRef = useRef([]);
  useEffect(() => { if (onNames && namesRef.current.length) onNames(namesRef.current); });
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-sky-100" style={{ touchAction: "none" }}>
      <ComposableMap width={800} height={400} projectionConfig={{ scale: 145 }} style={{ width: "100%", height: "auto" }}>
        <ZoomableGroup center={[12, 30]} zoom={1} minZoom={1} maxZoom={10}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) => {
              namesRef.current = geographies.map((g) => g.properties.name);
              return geographies.map((geo) => {
                const raw = geo.properties.name;
                const on = !!visited[raw];
                const canon = NE_ALIAS[raw] || raw;
                const isWish = !on && wish && wish.has(normCountry(canon));
                const fill = on ? "#059669" : isWish ? "#ec4899" : "#e7e5e4";
                const fillHover = on ? "#047857" : isWish ? "#db2777" : "#d6d3d1";
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => onToggle(raw)}
                    style={{
                      default: { fill, stroke: "#a8a29e", strokeWidth: 0.3, outline: "none" },
                      hover: { fill: fillHover, stroke: "#a8a29e", strokeWidth: 0.4, outline: "none", cursor: "pointer" },
                      pressed: { fill: "#047857", outline: "none" },
                    }}
                  />
                );
              });
            }}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
