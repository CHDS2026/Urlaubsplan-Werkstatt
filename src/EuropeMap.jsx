import React, { useState, useEffect, useRef } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

// Eurostat Nuts2json: ECHTE Geokoordinaten (WGS84), web-optimiert, über jsDelivr (CORS-sicher).
// Wichtig: Highcharts-Karten haben ein eigenes Koordinatensystem und werden hier falsch dargestellt.
const BASE = "https://cdn.jsdelivr.net/gh/eurostat/Nuts2json@master/pub/v2/2021/4326/20M";
const lvlUrl = (l) => `${BASE}/${l}.json`;

// Passende NUTS-Ebene je Land: DE=Bundesländer(1), AT=Bundesländer(2), CH=Kantone(3),
// PL=Woiwodschaften(2), IT/FR/ES/NL/BE=Regionen bzw. Provinzen(2), UK=Regionen(1)
const COUNTRY_LEVEL = { DE: 1, CH: 3, UK: 1 };
const levelFor = (cc) => COUNTRY_LEVEL[cc] || 2;

const idOf = (geo) => String(geo.id || (geo.properties && geo.properties.id) || geo.rsmKey || "");
const nameOf = (geo) => (geo.properties && (geo.properties.na || geo.properties.name)) || idOf(geo);

export default function EuropeMap({ visited, wish, onSingle, onDouble }) {
  const [probe, setProbe] = useState({ status: "loading" });
  const klickTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch(lvlUrl(2))
      .then((r) => (r.ok ? r.json() : Promise.reject("http")))
      .then((j) => {
        let n = 0;
        try { const o = j.objects[Object.keys(j.objects)[0]]; n = (o.geometries || []).length; } catch (e) {}
        if (alive) setProbe({ status: "ok", n });
      })
      .catch((e) => { if (alive) setProbe({ status: e === "http" ? "http" : "neterr" }); });
    return () => { alive = false; if (klickTimer.current) clearTimeout(klickTimer.current); };
  }, []);

  // Einfacher Tipp = Wunsch (pink), Doppeltipp = besucht (grün)
  const klick = (id, name) => {
    if (klickTimer.current) {
      clearTimeout(klickTimer.current);
      klickTimer.current = null;
      onDouble(id, name);
      return;
    }
    klickTimer.current = setTimeout(() => {
      klickTimer.current = null;
      onSingle(id, name);
    }, 280);
  };

  if (probe.status === "loading") return <div className="rounded-xl border border-stone-200 bg-sky-100 p-10 text-center text-sm text-stone-500">Regionen-Karte lädt …</div>;
  if (probe.status !== "ok") return <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">Die Regionen-Daten konnten nicht geladen werden. Internetverbindung prüfen – oder „Liste" nutzen.</div>;

  return (
    <div className="space-y-2">
      <p className="text-center text-xs text-emerald-700">Kartenquelle verbunden ({probe.n} Regionen).</p>
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-sky-100" style={{ touchAction: "none" }}>
        <ComposableMap projection="geoMercator" projectionConfig={{ center: [8, 49], scale: 560 }} width={800} height={700} style={{ width: "100%", height: "auto" }}>
          <ZoomableGroup center={[8, 49]} zoom={1} minZoom={1} maxZoom={24}>
            {[1, 2, 3].map((lvl) => (
              <Geographies key={lvl} geography={lvlUrl(lvl)}>
                {({ geographies }) => geographies
                  .filter((geo) => levelFor(idOf(geo).slice(0, 2)) === lvl)
                  .map((geo) => {
                    const id = idOf(geo);
                    const name = nameOf(geo);
                    const besucht = !!visited[id];
                    const wunsch = !besucht && wish && !!wish[id];
                    const fill = besucht ? "#059669" : wunsch ? "#ec4899" : "#e7e5e4";
                    const fillHover = besucht ? "#047857" : wunsch ? "#db2777" : "#d6d3d1";
                    return (
                      <Geography key={geo.rsmKey} geography={geo} onClick={() => klick(id, name)}
                        style={{
                          default: { fill, stroke: "#ffffff", strokeWidth: 0.35, outline: "none" },
                          hover: { fill: fillHover, stroke: "#ffffff", strokeWidth: 0.5, outline: "none", cursor: "pointer" },
                          pressed: { fill: besucht ? "#047857" : "#db2777", outline: "none" },
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
