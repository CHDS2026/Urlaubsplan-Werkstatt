/*
  Wandern.jsx — Wanderwege zur Region (OSM) + Komoot-Verknüpfung
  --------------------------------------------------------------
  WICHTIG/ehrlich: Komoot hat KEINE öffentliche API (steht so in Komoots eigener
  Support-Doku). Touren-Daten lassen sich daher nicht in die App holen.
  Lösung:
   • Echte Wanderweg-DATEN kommen aus OpenStreetMap via Overpass (frei, ohne Schlüssel):
     benannte Wanderrouten im Umkreis, mit Netz-Ebene (international/national/regional/lokal),
     Symbol/Ref und Länge, sortiert nach Bedeutung. Jede Route -> Link zu OpenStreetMap.
   • Komoot wird per DEEP-LINK verlinkt (nur verifizierte Seiten von komoot.com):
     Touren-Suche + Kategorien (Wandern, Bergtouren, Fernwanderwege, mit Kindern)
     und Orte (Hütten, Gipfel, Wasserfälle, Seen, Bergpässe, Burgen).
     Die Region tippst du dort ins "Wo?"-Feld – ein Regions-Deep-Link ist bei Komoot
     nicht dokumentiert, deshalb erfinde ich keinen.

  EINBAU: <Wandern /> oder eingebettet: <Wandern embedded defaultQuery="Tirol" />
*/
import React, { useState, useEffect } from "react";
import { Mountain, Search, Loader2, Info, ExternalLink, MapPin, Route as RouteIcon, Plus, Check, CalendarPlus, X } from "lucide-react";

const enc = encodeURIComponent;
async function jget(url, ms = 25000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try { const r = await fetch(url, { signal: ctrl.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function jpost(url, body, ms = 30000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { method: "POST", body, signal: ctrl.signal, headers: { "Content-Type": "text/plain" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

const NETZ = {
  iwn: { label: "international", rang: 4, stil: "bg-emerald-600 text-white" },
  nwn: { label: "national", rang: 3, stil: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  rwn: { label: "regional", rang: 2, stil: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  lwn: { label: "lokal", rang: 1, stil: "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300" },
};

// Nur verifizierte Komoot-Seiten (von komoot.com selbst verlinkt)
const KOMOOT_TOUREN = [
  { l: "Touren-Suche (Karte)", u: "https://www.komoot.com/discover" },
  { l: "Wanderwege", u: "https://www.komoot.com/discover/hiking-trails" },
  { l: "Bergtouren", u: "https://www.komoot.com/discover/mountain-hikes" },
  { l: "Fernwanderwege", u: "https://www.komoot.com/discover/long-distance-hikes" },
  { l: "Wandern mit Kindern", u: "https://www.komoot.com/discover/hiking-with-kids" },
  { l: "Tourenplaner", u: "https://www.komoot.com/plan" },
];
const KOMOOT_ORTE = [
  { l: "Hütten", u: "https://www.komoot.com/places/2/huts" },
  { l: "Gipfel", u: "https://www.komoot.com/places/3/mountain-peaks" },
  { l: "Wasserfälle", u: "https://www.komoot.com/places/4/waterfalls" },
  { l: "Seen", u: "https://www.komoot.com/places/6/lakes" },
  { l: "Bergpässe", u: "https://www.komoot.com/places/7/mountain-passes" },
  { l: "Burgen", u: "https://www.komoot.com/places/11/castles" },
];

async function ladeWege(term, radiusKm) {
  const g = await jget(`https://photon.komoot.io/api/?q=${enc(term)}&limit=1&lang=de`);
  const f = g.features && g.features[0];
  if (!f || !f.geometry) throw new Error("Region nicht gefunden");
  const lon = f.geometry.coordinates[0], lat = f.geometry.coordinates[1];
  const ort = (f.properties && (f.properties.name || term)) || term;
  const q = `[out:json][timeout:25];relation["route"="hiking"]["name"](around:${radiusKm * 1000},${lat},${lon});out center 80;`;
  const o = await jpost("https://overpass-api.de/api/interpreter", q);
  const els = (o && o.elements) || [];
  const wege = els.map((e) => {
    const t = e.tags || {};
    const net = NETZ[t.network] || null;
    const distNum = t.distance ? parseFloat(String(t.distance).replace(",", ".")) : null;
    const c = e.center || null;
    return {
      id: e.id, name: t.name, ref: t.ref || "", netz: net,
      rang: net ? net.rang : 0, km: distNum && isFinite(distNum) ? Math.round(distNum) : null,
      betreiber: t.operator || "", website: t.website || "",
      lat: c ? c.lat : null, lon: c ? c.lon : null,
    };
  });
  wege.sort((a, b) => (b.rang - a.rang) || ((b.km || 0) - (a.km || 0)) || a.name.localeCompare(b.name, "de"));
  return { ort, lat, lon, wege };
}

export default function Wandern({ embedded = false, defaultQuery = "", onAdd, onCreateTrip, trips, onAddToTrip }) {
  const [menuFor, setMenuFor] = useState(null);
  const [done, setDone] = useState({});
  const [input, setInput] = useState(defaultQuery || "");
  const [radius, setRadius] = useState(20);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  async function run(q0) {
    const term = (q0 != null ? q0 : input).trim();
    if (!term || loading) return;
    setLoading(true); setErr(""); setData(null);
    try { setData(await ladeWege(term, radius)); }
    catch (e) { setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { const t = (defaultQuery || "").trim(); if (t) run(t); /* eslint-disable-next-line */ }, []);

  const infoText = (w) => ["Wanderung", w.netz ? w.netz.label : "", w.km ? w.km + " km" : "", w.betreiber].filter(Boolean).join(" · ");
  const sug = (w) => ({ name: w.name, gebiet: (data && data.ort) || "", info: infoText(w), lat: w.lat, lon: w.lon });
  const merke = (w, txt) => { setDone((d) => ({ ...d, [w.id]: txt })); setMenuFor(null); };
  const inIdeen = (w) => { if (onAdd) { onAdd(sug(w)); merke(w, "in Ideen"); } };
  const anReise = (w, t) => { if (onAddToTrip) { onAddToTrip(t.id, { ...sug(w), kategorie: "wanderung" }); merke(w, "zu " + (t.name || "Reise")); } };
  const neueReise = (w) => { if (onCreateTrip) onCreateTrip({ name: w.name, gebiet: (data && data.ort) || w.name, info: infoText(w), anreiseart: "auto", von: "Celle", nach: (data && data.ort) || "", items: [{ ...sug(w), kategorie: "wanderung" }] }); };
  const hatAktion = !!(onAdd || onCreateTrip || (onAddToTrip && trips && trips.length));
  const nurIdeen = !!onAdd && !onCreateTrip && !(onAddToTrip && trips && trips.length);

  const chip = (on) => "rounded-full px-3 py-1.5 text-xs font-medium transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300");
  const linkCls = "inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:border-emerald-300 hover:text-emerald-800 dark:border-stone-700 dark:text-stone-300 dark:hover:border-emerald-700";

  return (
    <section className={embedded ? "space-y-0 text-stone-800 dark:text-stone-200" : "rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900 text-stone-800 dark:text-stone-200"}>
      {!embedded && (<>
        <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100"><Mountain className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Wandern</div>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Wanderwege in der Region (aus OpenStreetMap) – plus Komoot-Links zum Weiterstöbern.</p>
        <div className="mt-3 flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            placeholder="Region oder Stadt …" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900" />
          <button onClick={() => run()} disabled={loading} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Suchen
          </button>
        </div>
      </>)}

      <div className={(embedded ? "" : "mt-3 ") + "flex flex-wrap items-center gap-2"}>
        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Umkreis:</span>
        {[10, 20, 40].map((r) => (
          <button key={r} onClick={() => { setRadius(r); if (data || defaultQuery) run(defaultQuery || input); }} className={chip(radius === r)}>{r} km</button>
        ))}
      </div>

      {err && <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err}</div>}
      {loading && <div className="mt-3 flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Wanderwege werden gesucht …</div>}

      {data && (
        <div className="mt-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200">
            <RouteIcon className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Wanderwege um {data.ort} ({radius} km)
          </div>
          {data.wege.length === 0 && <div className="text-sm text-stone-500 dark:text-stone-400">Keine benannten Wanderrouten gefunden – größeren Umkreis wählen.</div>}
          <div className="space-y-1.5">
            {data.wege.slice(0, 25).map((w) => (
              <div key={w.id} className="rounded-lg bg-stone-50 px-2.5 py-2 text-sm dark:bg-stone-800">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-stone-800 dark:text-stone-100">{w.name}</span>
                      {w.netz && <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + w.netz.stil}>{w.netz.label}</span>}
                      {w.km && <span className="text-xs text-stone-500 dark:text-stone-400">{w.km} km</span>}
                    </span>
                    {w.betreiber && <span className="block text-xs text-stone-400 dark:text-stone-500">{w.betreiber}</span>}
                  </span>
                  <a href={"https://www.openstreetmap.org/relation/" + w.id} target="_blank" rel="noreferrer" title="Auf OpenStreetMap ansehen" className="shrink-0 rounded-lg p-1.5 text-stone-400 transition hover:text-emerald-700 dark:text-stone-500 dark:hover:text-emerald-300"><ExternalLink className="h-4 w-4" /></a>
                  {done[w.id]
                    ? <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /> {done[w.id]}</span>
                    : hatAktion && <button onClick={() => (nurIdeen ? inIdeen(w) : setMenuFor(menuFor === w.id ? null : w.id))} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800">{menuFor === w.id ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {nurIdeen ? "Hinzufügen" : "Übernehmen"}</button>}
                </div>
                {menuFor === w.id && (
                  <div className="mt-2 space-y-1.5 rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900">
                    {onAddToTrip && trips && trips.length > 0 && (<>
                      <div className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">Zu einer Reise heften</div>
                      {trips.slice(0, 8).map((t) => (
                        <button key={t.id} onClick={() => anReise(w, t)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 transition hover:bg-emerald-50 dark:text-stone-200 dark:hover:bg-stone-800">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> <span className="min-w-0 truncate">{t.name || "Reise"}</span>
                        </button>
                      ))}
                    </>)}
                    {onCreateTrip && <button onClick={() => neueReise(w)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-stone-700 transition hover:bg-emerald-50 dark:text-stone-200 dark:hover:bg-stone-800"><CalendarPlus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> Neue Reise daraus erstellen</button>}
                    {onAdd && <button onClick={() => inIdeen(w)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 transition hover:bg-emerald-50 dark:text-stone-200 dark:hover:bg-stone-800"><Plus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> In Ideen merken</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
          {data.wege.length > 25 && <div className="pt-1.5 text-xs text-stone-400 dark:text-stone-500">… und {data.wege.length - 25} weitere.</div>}
        </div>
      )}

      <div className="mt-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200"><MapPin className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Auf Komoot weiterstöbern</div>
        <div className="flex flex-wrap gap-1.5">
          {KOMOOT_TOUREN.map((k) => <a key={k.u} href={k.u} target="_blank" rel="noreferrer" className={linkCls}>{k.l} <ExternalLink className="h-3 w-3" /></a>)}
        </div>
        <div className="mt-2 text-xs font-semibold text-stone-500 dark:text-stone-400">Orte</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {KOMOOT_ORTE.map((k) => <a key={k.u} href={k.u} target="_blank" rel="noreferrer" className={linkCls}>{k.l} <ExternalLink className="h-3 w-3" /></a>)}
        </div>
        <div className="mt-2 text-xs text-stone-400 dark:text-stone-500">
          {data ? <>Region bei Komoot ins „Wo?"-Feld eingeben: <b>{data.ort}</b>. </> : null}
          Komoot bietet keine offene API – die Touren lassen sich daher nicht in die App holen, nur verlinken.
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Wanderwege: OpenStreetMap/Overpass (ODbL), Suche via Photon – beides frei &amp; ohne Schlüssel. Netz-Ebene: international/national/regional/lokal laut OSM-Tag. Längen nur, wenn in OSM hinterlegt. Ohne Gewähr.</span></div>
    </section>
  );
}
