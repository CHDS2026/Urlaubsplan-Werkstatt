import React, { useRef, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

// Länderumrisse von einem vertrauenswürdigen CDN (wird nach dem ersten Laden für offline gecacht)
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function WorldMap({ visited, onToggle, onNames }) {
  const namesRef = useRef([]);
  useEffect(() => { if (onNames && namesRef.current.length) onNames(namesRef.current); });
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-sky-100" style={{ touchAction: "none" }}>
      <ComposableMap width={800} height={400} projectionConfig={{ scale: 145 }} style={{ width: "100%", height: "auto" }}>
        <ZoomableGroup center={[12, 30]} zoom={1} minZoom={1} maxZoom={8}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) => {
              namesRef.current = geographies.map((g) => g.properties.name);
              return geographies.map((geo) => {
                const name = geo.properties.name;
                const on = !!visited[name];
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => onToggle(name)}
                    style={{
                      default: { fill: on ? "#059669" : "#e7e5e4", stroke: "#a8a29e", strokeWidth: 0.3, outline: "none" },
                      hover: { fill: on ? "#047857" : "#d6d3d1", stroke: "#a8a29e", strokeWidth: 0.4, outline: "none", cursor: "pointer" },
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
