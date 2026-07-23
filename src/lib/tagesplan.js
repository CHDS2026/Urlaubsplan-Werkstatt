import { abstandKmPunkte } from "./abstand.js";
/* ── Auto-Verteilung: verplante/unverplante Punkte geografisch auf die Reisetage legen ──
   Ergänzt das vorhandene „nach Nähe" (das nur INNERHALB eines Tages ordnet). Idee:
   alle verorteten Punkte per Nearest-Neighbor zu EINER Route ordnen, diese Route in etwa
   gleich große, zusammenhängende Blöcke schneiden – ein Block je Tag. Zusammenhängende
   Route-Blöcke liegen geografisch beieinander → wenig Kreuz-und-quer zwischen den Tagen.

   Bewusst OHNE erfundene Daten: nur echte Koordinaten, keine Fahrzeiten/Distanzen geschätzt
   (die rechnet weiterhin OSRM auf Knopfdruck). Rückgabe = Patch-Map { id: { day, order } },
   die exakt wie bei Drag&Drop/„nach Nähe" via onApply(...) angewandt wird.

   Punkte ohne Koordinaten und Kosten-Einträge bleiben unangetastet.
   Optionen: { startOrt?: {lat,lon}, nurUnverplant?: boolean } */


/* Nearest-Neighbor-Route. Startpunkt: der zu startOrt nächste Punkt, sonst der erste. */
function nnRoute(punkte, startOrt) {
  if (punkte.length < 2) return [...punkte];
  const rest = [...punkte];
  let startIdx = 0;
  if (startOrt && startOrt.lat != null && startOrt.lon != null) {
    let bd = Infinity;
    rest.forEach((p, i) => { const d = abstandKmPunkte(startOrt, p); if (d < bd) { bd = d; startIdx = i; } });
  }
  const route = [rest.splice(startIdx, 1)[0]];
  while (rest.length) {
    const letzter = route[route.length - 1];
    let bi = 0, bd = Infinity;
    rest.forEach((p, i) => { const d = abstandKmPunkte(letzter, p); if (d < bd) { bd = d; bi = i; } });
    route.push(rest.splice(bi, 1)[0]);
  }
  return route;
}

/* n möglichst gleich große, zusammenhängende Blöcke (frühere Blöcke ggf. um 1 größer). */
function splitEven(arr, n) {
  const out = [];
  const len = arr.length;
  let start = 0;
  for (let i = 0; i < n; i++) {
    const size = Math.floor(len / n) + (i < len % n ? 1 : 0);
    out.push(arr.slice(start, start + size));
    start += size;
  }
  return out;
}

export function verteileAufTage(items, dayList, opts = {}) {
  const tage = (dayList || []).filter(Boolean);
  if (!tage.length) return {};
  let geo = (items || []).filter((i) => i && i.kategorie !== "kosten" && i.lat != null && i.lon != null);
  if (opts.nurUnverplant) geo = geo.filter((i) => !i.day);
  if (geo.length < 2) return {};

  const route = nnRoute(geo, opts.startOrt);
  const bloecke = splitEven(route, tage.length);

  const patches = {};
  bloecke.forEach((block, d) => {
    if (!block.length) return;
    const geordnet = nnRoute(block, block[0]); // innerhalb des Tages sauber ordnen
    geordnet.forEach((it, k) => { patches[it.id] = { day: tage[d], order: k }; });
  });
  return patches;
}

export const __test = { abstandKmPunkte, nnRoute, splitEven };
