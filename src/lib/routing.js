/* ── Routing: Route von A nach B über freie Dienste ──────────────────────────
   Zentral für RoutePlaner und Wegkarte (früher in beiden Dateien doppelt gepflegt –
   ein Fix musste zuletzt zweimal gemacht werden, das war der Anlass zusammenzuführen).
   Fuß/Rad über BRouter (frei, für Wandern/Rad gemacht), Auto über OSRM (CORS-sicher,
   wie die Fahrzeiten in der App). Ergebnis jeweils: Geometrie + km + Minuten.

   navigiere() ist die öffentliche Funktion. Fuß nutzt bevorzugt „hiking-mountain";
   kennt der öffentliche BRouter-Server dieses Profil nicht, wird automatisch auf
   „trekking" ausgewichen (dort sicher vorhanden) statt zu scheitern. Ist BRouter gar
   nicht erreichbar, schlägt auch das fehl → die aufrufende Stelle zeigt „Auto". */

export async function routeBRouter(von, nach, profil) {
  const url = `https://brouter.de/brouter?lonlats=${von.lon.toFixed(5)},${von.lat.toFixed(5)}|${nach.lon.toFixed(5)},${nach.lat.toFixed(5)}&profile=${profil}&alternativeidx=0&format=geojson`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("BRouter " + r.status);
  const j = await r.json();
  const feat = j.features && j.features[0];
  if (!feat || !feat.geometry) throw new Error("keine Route");
  const pr = feat.properties || {};
  const km = pr["track-length"] != null ? Math.round(Number(pr["track-length"]) / 100) / 10 : null;
  const min = pr["total-time"] != null ? Math.round(Number(pr["total-time"]) / 60) : null;
  return { geojson: { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: feat.geometry }] }, km, min };
}

export async function routeOSRM(von, nach) {
  const url = `https://router.project-osrm.org/route/v1/driving/${von.lon.toFixed(5)},${von.lat.toFixed(5)};${nach.lon.toFixed(5)},${nach.lat.toFixed(5)}?overview=full&geometries=geojson`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("OSRM " + r.status);
  const j = await r.json();
  const rt = j.routes && j.routes[0];
  if (!rt || !rt.geometry) throw new Error("keine Route");
  return { geojson: { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: rt.geometry }] }, km: Math.round(rt.distance / 100) / 10, min: Math.round(rt.duration / 60) };
}

export async function navigiere(von, nach, profil) {
  if (profil === "auto") return routeOSRM(von, nach);
  if (profil === "rad") return routeBRouter(von, nach, "trekking");
  try { return await routeBRouter(von, nach, "hiking-mountain"); }
  catch (_) { return await routeBRouter(von, nach, "trekking"); }
}
