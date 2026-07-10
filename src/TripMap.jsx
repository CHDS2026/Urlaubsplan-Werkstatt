import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";

// Farbpalette pro Tag (wiederholt sich bei sehr langen Reisen)
export const TAG_FARBEN = ["#047857", "#0284c7", "#d97706", "#be123c", "#7c3aed", "#0f766e", "#c2410c", "#4d7c0f", "#9333ea", "#0891b2"];
export const farbeFuerTag = (i) => TAG_FARBEN[i % TAG_FARBEN.length];

export default function TripMap({ punkte, mitLinie = true, klickModus = false, onKarteKlick }) {
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
      zoom: mitKoord.length ? 8 : 4,
      attributionControl: true,
    });
    karte.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    return () => { if (karte.current) { karte.current.remove(); karte.current = null; } };
  }, []);

  // Tippen auf die Karte (nur im Setz-Modus)
  const klickRef = useRef(null);
  useEffect(() => { klickRef.current = { klickModus, onKarteKlick }; }, [klickModus, onKarteKlick]);
  useEffect(() => {
    const k = karte.current;
    if (!k) return;
    const handler = (e) => {
      const cfg = klickRef.current;
      if (cfg && cfg.klickModus && cfg.onKarteKlick) cfg.onKarteKlick(e.lngLat.lat, e.lngLat.lng);
    };
    k.on("click", handler);
    return () => { try { k.off("click", handler); } catch (err) {} };
  }, []);

  useEffect(() => {
    const k = karte.current;
    if (!k || !k.getCanvas) return;
    try { k.getCanvas().style.cursor = klickModus ? "crosshair" : ""; } catch (e) {}
  }, [klickModus]);

  useEffect(() => {
    const k = karte.current;
    if (!k) return;
    const marker = [];
    const mitKoord = (punkte || []).filter((p) => p.lat != null && p.lon != null);

    const zeichne = () => {
      // Linien je Tag (grobe Verbindung in Reihenfolge)
      if (mitLinie) {
        const proTag = {};
        mitKoord.forEach((p) => { const k2 = p.tagIndex ?? 0; (proTag[k2] = proTag[k2] || []).push(p); });
        Object.keys(proTag).forEach((tag) => {
          const liste = proTag[tag];
          if (liste.length < 2) return;
          const id = `route-${tag}`;
          if (k.getLayer(id)) k.removeLayer(id);
          if (k.getSource(id)) k.removeSource(id);
          k.addSource(id, { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: liste.map((p) => [p.lon, p.lat]) } } });
          k.addLayer({ id, type: "line", source: id, paint: { "line-color": liste[0].farbe || "#047857", "line-width": 2, "line-opacity": 0.6, "line-dasharray": [2, 1] } });
        });
      }

      mitKoord.forEach((p) => {
        const el = document.createElement("div");
        el.style.cssText = `display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${p.farbe || "#047857"};color:#fff;font:600 11px sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)`;
        el.textContent = p.label != null ? String(p.label) : "•";
        const text = [p.name || "Punkt", p.tagText ? `(${p.tagText})` : ""].filter(Boolean).join(" ");
        marker.push(new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).setPopup(new maplibregl.Popup({ offset: 16 }).setText(text)).addTo(k));
      });

      if (mitKoord.length > 1) {
        const b = new maplibregl.LngLatBounds();
        mitKoord.forEach((p) => b.extend([p.lon, p.lat]));
        k.fitBounds(b, { padding: 50, maxZoom: 12, duration: 0 });
      } else if (mitKoord.length === 1) {
        k.setCenter([mitKoord[0].lon, mitKoord[0].lat]); k.setZoom(11);
      }
    };

    if (k.isStyleLoaded()) zeichne(); else k.once("load", zeichne);

    return () => {
      marker.forEach((m) => m.remove());
      if (!k || !k.getStyle) return;
      try {
        const tage = new Set((punkte || []).map((p) => p.tagIndex ?? 0));
        tage.forEach((t) => { const id = `route-${t}`; if (k.getLayer(id)) k.removeLayer(id); if (k.getSource(id)) k.removeSource(id); });
      } catch (e) { /* Karte bereits entfernt */ }
    };
  }, [punkte, mitLinie]);

  return <div ref={box} className="h-96 w-full overflow-hidden rounded-xl border border-stone-200" />;
}
