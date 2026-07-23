/* ── Karten-Grundlagen: Stile und Wanderwege-Overlay ────────────────────────
   Lagen bisher in Reisekarte.jsx und wurden von RoutePlaner/Wegkarte von dort
   importiert – jede Routen-Ansicht hing dadurch an der kompletten Reisekarte.
   Hier zentral, analog zu lib/routing.js. Reisekarte.jsx reicht die Namen
   weiterhin durch, damit bestehende Importe nicht brechen. */

export const STYLE_KARTE = "https://tiles.openfreemap.org/styles/liberty";

export const STYLE_SAT = {
  version: 8,
  sources: {
    sat: {
      type: "raster",
      tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"],
      tileSize: 256,
      maxzoom: 14,
      attribution: 'Sentinel-2 cloudless 2020 &copy; <a href="https://s2maps.eu" target="_blank" rel="noreferrer">EOX</a> (CC BY-NC-SA 4.0), modifizierte Copernicus-Sentinel-Daten',
    },
  },
  layers: [{ id: "sat", type: "raster", source: "sat" }],
};

const WMT_URL = "https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png";
const WMT_ATTR = 'Wanderwege: <a href="https://hiking.waymarkedtrails.org" target="_blank" rel="noreferrer">Waymarked Trails</a> &copy; Sarah Hoffmann (CC BY-SA 3.0), Daten &copy; OpenStreetMap (ODbL)';

export function addWege(map) {
  try {
    if (!map.getSource("wmt")) map.addSource("wmt", { type: "raster", tiles: [WMT_URL], tileSize: 256, maxzoom: 18, attribution: WMT_ATTR });
    if (!map.getLayer("wmt")) map.addLayer({ id: "wmt", type: "raster", source: "wmt", paint: { "raster-opacity": 0.9 } });
  } catch (e) {}
}

export function removeWege(map) {
  try {
    if (map.getLayer("wmt")) map.removeLayer("wmt");
    if (map.getSource("wmt")) map.removeSource("wmt");
  } catch (e) {}
}
