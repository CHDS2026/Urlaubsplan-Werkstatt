import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// OpenFreeMap: kostenlos, ohne API-Schlüssel, ohne Nutzerkonto.
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

export default function DayMap({ punkte }) {
  const box = useRef(null);
  const karte = useRef(null);

  useEffect(() => {
    if (!box.current || karte.current) return;
    const mitKoord = (punkte || []).filter((p) => p.lat != null && p.lon != null);
    const center = mitKoord.length ? [mitKoord[0].lon, mitKoord[0].lat] : [10.45, 51.16];

    karte.current = new maplibregl.Map({
      container: box.current,
      style: STYLE,
      center,
      zoom: mitKoord.length ? 10 : 5,
      attributionControl: true,
    });
    karte.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    return () => { if (karte.current) { karte.current.remove(); karte.current = null; } };
  }, []);

  // Marker bei Änderungen neu setzen
  useEffect(() => {
    const k = karte.current;
    if (!k) return;
    const marker = [];
    const mitKoord = (punkte || []).filter((p) => p.lat != null && p.lon != null);

    mitKoord.forEach((p, i) => {
      const el = document.createElement("div");
      el.style.cssText = "display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#047857;color:#fff;font:600 12px sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)";
      el.textContent = String(i + 1);
      const m = new maplibregl.Marker({ element: el })
        .setLngLat([p.lon, p.lat])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText(p.name || "Punkt"))
        .addTo(k);
      marker.push(m);
    });

    if (mitKoord.length > 1) {
      const b = new maplibregl.LngLatBounds();
      mitKoord.forEach((p) => b.extend([p.lon, p.lat]));
      k.fitBounds(b, { padding: 50, maxZoom: 13, duration: 0 });
    } else if (mitKoord.length === 1) {
      k.setCenter([mitKoord[0].lon, mitKoord[0].lat]);
      k.setZoom(12);
    }

    return () => { marker.forEach((m) => m.remove()); };
  }, [punkte]);

  return <div ref={box} className="h-64 w-full overflow-hidden rounded-xl border border-stone-200" />;
}
