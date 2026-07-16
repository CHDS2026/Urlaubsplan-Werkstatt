/*
  Rundwege.jsx — Deutschlands schönste Rundwanderwege auf einer Karte
  --------------------------------------------------------------------
  „Die schönsten" ist ein Urteil – deshalb NICHT mein Geschmack, sondern ein belegter,
  objektiver Maßstab: die Publikumswahl „Deutschlands Schönster Wanderweg" (DSW) des
  Wandermagazins (seit 2006; 2026 mit 52.911 Stimmen, Finalisten von einer Fachjury
  aus über 100 Bewerbungen gewählt).

  KURATIERT sind nur NAME + REGION + AUSZEICHNUNG. Alles Zahlenmäßige kommt live:
   • Verlauf & Länge      -> OpenStreetMap/Overpass (aus der Geometrie berechnet)
   • Rundweg ja/nein      -> aus dem Verlauf erkannt (Start ≈ Ziel), nicht aus dem Tag
   • Höhenmeter           -> Open-Meteo Elevation (90-m-Höhenmodell, Copernicus DEM),
                             entlang des Wegs abgetastet und aufsummiert = Schätzung
   • Gehzeit              -> DIN 33466 aus Länge + berechnetem Aufstieg

  Filter fest nach Vorgabe: nur Rundwege, maximal 20 km. Was das nicht erfüllt oder in
  OSM fehlt, wird gezählt und offen benannt – nicht geraten.

  EINBAU: <Rundwege onAdd={…} onCreateTrip={…} trips={…} onAddToTrip={…} />
*/
import React, { useState } from "react";
import { Award, Loader2, Info, Plus, Check, CalendarPlus, X, Clock, Repeat, Ruler, MapPin, TrendingUp, ExternalLink } from "lucide-react";
import Wegkarte from "./Wegkarte.jsx";

const MAX_KM = 20;

/* q = Suchbegriff für OSM (Regex, i). Bewusst der markanteste Namensteil. */
const WEGE = [
  { q: "Wildes.?Wasser.?Weg", n: "Wildes-Wasser-Weg Bodenmais", r: "Bayerischer Wald", a: "DSW-Sieger 2026", top: true },
  { q: "Büsenbachtal", n: "Heideschleife Büsenbachtal", r: "Lüneburger Heide", a: "DSW-Sieger 2025", top: true },
  { q: "Wasserfall-?Erlebnisroute", n: "Wasserfall-Erlebnisroute", r: "Vulkaneifel", a: "DSW 2023, Platz 1", top: true },
  { q: "Auenlandweg", n: "Auenlandweg", r: "Westerwald", a: "DSW 2023, Platz 2" },
  { q: "Lecker Pfädchen", n: "Lecker Pfädchen", r: "Hunsrück", a: "DSW 2023, Platz 3" },
  { q: "hochgehpilgert", n: "Hochgehberge – hochgehpilgert", r: "Schwäbische Alb", a: "DSW-Finalist 2026" },
  { q: "MaareGlück|Maaregluck", n: "HeimatSpur MaareGlück", r: "Eifel", a: "DSW-Finalist 2026" },
  { q: "Felsenwald", n: "Felsenwald", r: "Pfalz", a: "DSW-Finalist 2026" },
  { q: "Eichstätter Panoramaweg", n: "Eichstätter Panoramaweg", r: "Altmühltal", a: "DSW-Finalist 2026" },
  { q: "Pfälzer Hüttentour", n: "Pfälzer Hüttentour", r: "Pfalz", a: "DSW-Finalist 2026" },
  { q: "Wurzacher Ried|Moor-Weg", n: "Moor-Weg – Ried pur erleben", r: "Allgäu", a: "DSW-Finalist 2026" },
  { q: "Tecklenburger Bergpfad", n: "Teutoschleife Tecklenburger Bergpfad", r: "Münsterland", a: "DSW-Finalist 2026" },
  { q: "Altlayer", n: "Traumschleife Altlayer Schweiz", r: "Saar-Hunsrück", a: "DSW-Finalist 2026" },
  { q: "Nehmtener Horn", n: "Rundweg Nehmtener Horn", r: "Holsteinische Schweiz", a: "DSW-Finalist 2026" },
  { q: "hochgehadelt", n: "Hochgehberge – hochgehadelt", r: "Schwäbische Alb", a: "DSW 2023, Platz 4" },
  { q: "Spittergrund", n: "Rundweg Spittergrund", r: "Thüringer Wald", a: "DSW 2023, Platz 5" },
  { q: "Hahnfels", n: "Hahnfels-Tour", r: "Pfalz", a: "DSW 2023, Platz 6" },
  { q: "Blaubeer", n: "Blaubeer-Route", r: "Teutoburger Wald", a: "DSW 2023, Platz 7" },
  { q: "Karlsruher Grat", n: "Genießerpfad Karlsruher Grat", r: "Schwarzwald", a: "DSW 2023, Platz 8" },
  { q: "Extratour Michelsberg", n: "Extratour Michelsberg", r: "Rhön", a: "DSW 2023, Platz 9" },
  { q: "Leitzachtaler", n: "Leitzachtaler Bergblicke", r: "Bayerische Voralpen", a: "DSW 2023, Platz 10" },
  { q: "3-?Schluchten|Drei-?Schluchten", n: "Genießerpfad 3-Schluchten-Tour", r: "Schwarzwald", a: "DSW 2023, Platz 11" },
  { q: "Gipfelwanderweg Suhl", n: "Gipfelwanderweg Suhl", r: "Thüringer Wald", a: "DSW 2023, Platz 12" },
  { q: "Steinway", n: "Steinway-Trail", r: "Harz", a: "DSW 2023, Platz 13" },
  { q: "Durbacher Weitblick", n: "Genießerpfad Durbacher Weitblick", r: "Schwarzwald", a: "DSW 2023, Platz 14" },
  { q: "Treidlerweg", n: "Treidlerweg", r: "Pfalz", a: "DSW 2023, Platz 15" },
];

const ROLLEN_OK = ["", "forward", "backward", "main"];
const havKm = (aLa, aLo, bLa, bLo) => {
  const R = 6371, r = Math.PI / 180, dLa = (bLa - aLa) * r, dLo = (bLo - aLo) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(aLa * r) * Math.cos(bLa * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
function gehzeit(km, hm) {
  if (!km) return null;
  const th = km / 4, tv = hm ? hm / 300 : 0;
  return Math.max(th, tv) + Math.min(th, tv) / 2;
}
const hStr = (t) => { const h = Math.floor(t), m = Math.round((t - h) * 60); return h > 0 ? h + ":" + String(m).padStart(2, "0") + " h" : m + " min"; };

async function jget(url, ms = 20000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function jpost(url, body, ms = 90000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { method: "POST", body, signal: c.signal, headers: { "Content-Type": "text/plain" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

function linienVon(rel) {
  const out = [];
  for (const m of (rel.members || [])) {
    if (m.type !== "way" || !Array.isArray(m.geometry) || m.geometry.length < 2) continue;
    if (!ROLLEN_OK.includes(m.role || "")) continue;
    out.push(m.geometry);
  }
  return out;
}
const laengeVon = (ls) => { let s = 0; for (const g of ls) for (let i = 1; i < g.length; i++) s += havKm(g[i - 1].lat, g[i - 1].lon, g[i].lat, g[i].lon); return s; };
const rundVon = (ls) => { if (ls.length < 2) return false; const a = ls[0][0], g = ls[ls.length - 1], b = g[g.length - 1]; return havKm(a.lat, a.lon, b.lat, b.lon) < 1; };

/* Höhenmeter aus dem Geländemodell: Weg abtasten (max. 100 Punkte = 1 Abruf). */
async function hoehenmeter(ls) {
  const pts = [];
  for (const g of ls) for (const p of g) pts.push(p);
  if (pts.length < 4) return null;
  const N = Math.min(100, pts.length);
  const schritt = (pts.length - 1) / (N - 1);
  const probe = [];
  for (let i = 0; i < N; i++) probe.push(pts[Math.round(i * schritt)]);
  const lat = probe.map((p) => p.lat.toFixed(5)).join(",");
  const lon = probe.map((p) => p.lon.toFixed(5)).join(",");
  const j = await jget(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
  const h = j && j.elevation;
  if (!Array.isArray(h) || h.length < 4) return null;
  let auf = 0;
  for (let i = 1; i < h.length; i++) { const d = h[i] - h[i - 1]; if (d > 0) auf += d; }
  return { auf: Math.round(auf), min: Math.round(Math.min(...h)), max: Math.round(Math.max(...h)), punkte: h.length };
}

async function ladeAlle() {
  const teile = WEGE.map((w) => `rel(area.de)["route"="hiking"]["name"~"${w.q}",i];`).join("");
  const q = `[out:json][timeout:90];area["ISO3166-1"="DE"][admin_level=2]->.de;(${teile});out geom;`;
  const o = await jpost("https://overpass-api.de/api/interpreter", q);
  const els = (o && o.elements) || [];
  const gefunden = [], features = [];
  let zuLang = 0, keinRund = 0, fehlt = 0;
  for (const w of WEGE) {
    const re = new RegExp(w.q, "i");
    const rel = els.find((e) => e.tags && e.tags.name && re.test(e.tags.name));
    if (!rel) { fehlt++; continue; }
    const ls = linienVon(rel);
    if (!ls.length) { fehlt++; continue; }
    const km = Math.round(laengeVon(ls) * 10) / 10;
    const rund = rundVon(ls) || rel.tags.roundtrip === "yes";
    if (!rund) { keinRund++; continue; }
    if (km > MAX_KM) { zuLang++; continue; }
    const mitte = ls[Math.floor(ls.length / 2)][0];
    gefunden.push({ id: rel.id, name: rel.tags.name || w.n, kurz: w.n, region: w.r, auszeichnung: w.a, top: !!w.top, km, rund, lat: mitte.lat, lon: mitte.lon, linien: ls, zeit: gehzeit(km, null) });
    features.push({ type: "Feature", properties: { id: rel.id, name: rel.tags.name }, geometry: { type: "MultiLineString", coordinates: ls.map((g) => g.map((p) => [p.lon, p.lat])) } });
  }
  gefunden.sort((a, b) => (b.top ? 1 : 0) - (a.top ? 1 : 0) || a.name.localeCompare(b.name, "de"));
  return { wege: gefunden, fc: { type: "FeatureCollection", features }, zuLang, keinRund, fehlt };
}

export default function Rundwege({ onAdd, onCreateTrip, trips, onAddToTrip }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [done, setDone] = useState({});
  const [hm, setHm] = useState({});
  const [hmBusy, setHmBusy] = useState(null);

  async function laden() {
    if (busy) return;
    setBusy(true); setErr("");
    try { const d = await ladeAlle(); setData(d); if (!d.wege.length) setErr("Keiner der Wege ist in OpenStreetMap als Rundweg bis 20 km auffindbar."); }
    catch (e) { setErr("Konnte die Wege nicht laden (Overpass): " + (e.message || e)); }
    finally { setBusy(false); }
  }

  async function hoehen(w) {
    if (hmBusy || hm[w.id]) return;
    setHmBusy(w.id);
    try { const h = await hoehenmeter(w.linien); if (h) setHm((o) => ({ ...o, [w.id]: h })); }
    catch (e) { setHm((o) => ({ ...o, [w.id]: { fehler: true } })); }
    finally { setHmBusy(null); }
  }

  const auf = (w) => (hm[w.id] && !hm[w.id].fehler ? hm[w.id].auf : null);
  const zeitVon = (w) => gehzeit(w.km, auf(w));
  const infoText = (w) => ["Rundwanderweg", w.auszeichnung, w.km + " km", auf(w) ? auf(w) + " Hm" : "", zeitVon(w) ? "ca. " + hStr(zeitVon(w)) : ""].filter(Boolean).join(" · ");
  const sug = (w) => ({ name: w.kurz, gebiet: w.region, info: infoText(w), lat: w.lat, lon: w.lon, kategorie: "wanderung" });
  const merke = (w, t) => { setDone((d) => ({ ...d, [w.id]: t })); setMenuFor(null); };
  const nurIdeen = !!onAdd && !onCreateTrip && !(onAddToTrip && trips && trips.length);
  const hatAktion = !!(onAdd || onCreateTrip || (onAddToTrip && trips && trips.length));

  const zeile = "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 transition hover:bg-emerald-50 dark:text-stone-200 dark:hover:bg-stone-800";

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100"><Award className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Schöne Rundwanderwege</div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Ausgezeichnete Tagestouren aus ganz Deutschland – nur Rundwege, maximal {MAX_KM} km. Auf der Karte antippen oder in der Liste öffnen.</p>

      {!data && (
        <button onClick={laden} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />} {busy ? "Wege werden geladen …" : "Wege laden"}
        </button>
      )}
      {err && <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err}</div>}

      {data && data.wege.length > 0 && (
        <>
          <div className="mt-3">
            <Wegkarte geojson={data.fc} name={`${data.wege.length} Rundwege in Deutschland`} selectedId={sel} onSelect={(id) => { setSel(id); setMenuFor(null); }} hoehe="360px" />
          </div>

          <div className="mt-3 space-y-1.5">
            {data.wege.map((w) => {
              const aktiv = sel === w.id;
              const h = hm[w.id];
              return (
                <div key={w.id} className={"rounded-lg px-2.5 py-2 text-sm transition " + (aktiv ? "bg-emerald-50 ring-1 ring-emerald-300 dark:bg-emerald-950 dark:ring-emerald-700" : "bg-stone-50 dark:bg-stone-800")}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSel(aktiv ? null : w.id); setMenuFor(null); }} className="min-w-0 flex-1 text-left">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-stone-800 dark:text-stone-100">{w.kurz}</span>
                        <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (w.top ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300")}>{w.auszeichnung}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300"><Repeat className="h-3 w-3" /> Rundweg</span>
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-stone-500 dark:text-stone-400">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {w.region}</span>
                        <span className="inline-flex items-center gap-1"><Ruler className="h-3 w-3" /> {w.km} km</span>
                        {h && !h.fehler && <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {h.auf} Hm</span>}
                        {zeitVon(w) && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> ca. {hStr(zeitVon(w))}</span>}
                      </span>
                    </button>
                    {done[w.id]
                      ? <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /> {done[w.id]}</span>
                      : hatAktion && <button onClick={() => (nurIdeen ? (onAdd(sug(w)), merke(w, "in Ideen")) : setMenuFor(menuFor === w.id ? null : w.id))} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800">{menuFor === w.id ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {nurIdeen ? "Hinzufügen" : "Übernehmen"}</button>}
                  </div>

                  {aktiv && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {!h && <button onClick={() => hoehen(w)} disabled={hmBusy === w.id} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:border-emerald-300 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300">
                        {hmBusy === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />} Höhenmeter berechnen
                      </button>}
                      {h && h.fehler && <span className="text-xs text-rose-600">Höhenmodell nicht erreichbar.</span>}
                      {h && !h.fehler && <span className="text-xs text-stone-500 dark:text-stone-400">{h.auf} Hm Aufstieg · {h.min}–{h.max} m ü. NN <span className="text-stone-400 dark:text-stone-500">(aus {h.punkte} Messpunkten, 90-m-Modell – Schätzung)</span></span>}
                      <a href={"https://www.openstreetmap.org/relation/" + w.id} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-stone-400 transition hover:text-emerald-700 dark:text-stone-500">auf OpenStreetMap <ExternalLink className="h-3 w-3" /></a>
                    </div>
                  )}

                  {menuFor === w.id && (
                    <div className="mt-2 space-y-1 rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900">
                      {onAddToTrip && trips && trips.length > 0 && (<>
                        <div className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">Zu einer Reise heften</div>
                        {trips.slice(0, 8).map((t) => (
                          <button key={t.id} onClick={() => { onAddToTrip(t.id, sug(w)); merke(w, "zu " + (t.name || "Reise")); }} className={zeile}>
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> <span className="min-w-0 truncate">{t.name || "Reise"}</span>
                          </button>
                        ))}
                      </>)}
                      {onCreateTrip && <button onClick={() => { onCreateTrip({ name: w.kurz, gebiet: w.region, info: infoText(w), anreiseart: "auto", von: "Celle", nach: w.region, items: [sug(w)] }); merke(w, "neue Reise"); }} className={zeile + " font-medium"}><CalendarPlus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> Neue Reise daraus erstellen</button>}
                      {onAdd && <button onClick={() => { onAdd(sug(w)); merke(w, "in Ideen"); }} className={zeile}><Plus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> In Ideen merken</button>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {(data.zuLang > 0 || data.keinRund > 0 || data.fehlt > 0) && (
            <div className="mt-2 text-xs text-stone-400 dark:text-stone-500">
              Nicht dabei: {[data.zuLang ? `${data.zuLang} über ${MAX_KM} km` : "", data.keinRund ? `${data.keinRund} kein Rundweg` : "", data.fehlt ? `${data.fehlt} in OSM nicht gefunden` : ""].filter(Boolean).join(" · ")}.
            </div>
          )}
        </>
      )}

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>
        Auswahl nach der Publikumswahl <b>„Deutschlands Schönster Wanderweg"</b> (Wandermagazin, seit 2006; 2026 mit 52.911 Stimmen, Finalisten von einer Fachjury gewählt) – kuratiert sind nur Name, Region und Auszeichnung.
        Länge und Verlauf: OpenStreetMap/Overpass (aus der Geometrie berechnet, ODbL). Rundweg wird aus dem Verlauf erkannt (Start ≈ Ziel).
        <b> Höhenmeter sind eine Schätzung</b> aus dem 90-m-Höhenmodell (Open-Meteo/Copernicus DEM), entlang des Wegs abgetastet – kurze Anstiege können untergehen.
        Gehzeit nach DIN 33466 (4 km/h, 300 Hm/h, ohne Pausen). Alles frei und ohne Schlüssel. Ohne Gewähr.
      </span></div>
    </section>
  );
}
