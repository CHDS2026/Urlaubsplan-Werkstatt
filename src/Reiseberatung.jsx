/*
  Reiseberatung — erweiterter Baustein für den Urlaubsplaner (Ideen-Tab)
  ----------------------------------------------------------------------
  Alle Quellen frei & ohne Schlüssel (läuft auch in der deployten PWA):
    • Wikivoyage/Wikipedia (de) – Steckbrief + Sehenswürdigkeiten (CC BY-SA)
    • Wikidata               – Fakten (Einwohner, Höhe, offizielle Seite)
    • OSRM (Demo)            – echte Auto-Fahrzeit ab Celle
    • Open-Meteo (Archiv)    – beste Reisezeit (Klima-Mittel 2023–2025)
    • Overpass/OSM           – Bergbahnen (Seilbahnen) rund ums Ziel
    • OpenHolidays           – Schulferien Niedersachsen (Reise-Timing)

  EINBAU: siehe frühere Anleitung – in PoolView nach <OsmFinder …/>:
    <Reiseberatung defaultQuery={trip.region || ""} region={regionLabel(trip)}
      onAdd={(s) => onAdd(mkItem(
        { kategorie: "sehenswuerdigkeit", name: s.name, info: s.info, gebiet: s.gebiet, maps_suche: s.name },
        { day: null, order: 0, lat: s.lat ?? null, lon: s.lon ?? null }
      ))} />
*/
import { useState, useEffect, useRef } from "react";
import {
  Compass, Search, BookOpen, MapPin, Plus, ExternalLink, Loader2, Info,
  Landmark, Check, Car, Mountain, CalendarRange, Users, Globe, Sun,
  TrendingUp, ChevronUp, ChevronDown,
} from "lucide-react";

const WV = "https://de.wikivoyage.org";
const WP = "https://de.wikipedia.org";
const enc = encodeURIComponent;
const CELLE = { lat: 52.6226, lon: 10.0806 };
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const INPUT = "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none";
const EMPTY = { loading: false, data: null };

async function jget(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
const nf = (n) => (n == null ? "" : Number(n).toLocaleString("de-DE"));
function fmtDauer(min) { const h = Math.floor(min / 60), m = Math.round(min % 60); return h > 0 ? h + " h " + (m < 10 ? "0" + m : m) + " min" : m + " min"; }
const dm = (iso) => { const p = String(iso).split("-"); return p[2] + "." + p[1] + "."; };

/* ---- wikitext helpers ---- */
function stripWiki(s) {
  return String(s || "")
    .replace(/<ref[\s\S]*?<\/ref>/gi, "").replace(/<[^>]+>/g, "")
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1").replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/\{\{[^{}]*\}\}/g, "").replace(/'''?/g, "").replace(/\s+/g, " ").trim();
}
function param(block, key) {
  const m = block.match(new RegExp("\\|\\s*" + key + "\\s*=\\s*([^\\|\\}\\n]+)", "i"));
  return m ? stripWiki(m[1]) : "";
}
function paramLong(block, key) {
  const m = block.match(new RegExp("\\|\\s*" + key + "\\s*=\\s*([\\s\\S]*?)(?=\\n\\s*\\||\\}\\})", "i"));
  return m ? stripWiki(m[1]) : "";
}
function extractSights(text) {
  const secRe = /^={2,}\s*([^=\n][^\n]*?)\s*={2,}\s*$/gm;
  const secs = []; let mm;
  while ((mm = secRe.exec(text))) secs.push({ idx: mm.index, title: mm[1].trim().toLowerCase() });
  const sectionAt = (i) => { let cur = ""; for (const s of secs) { if (s.idx <= i) cur = s.title; else break; } return cur; };
  const wantedSec = (t) => t.includes("sehenswürdig") || t.includes("aktivit") || t.includes("attraktion");
  const out = []; const seen = new Set();
  ["{{vCard", "{{Marker", "{{Listing", "{{listing"].forEach((needle) => {
    let i = 0;
    while (out.length < 16) {
      const start = text.indexOf(needle, i); if (start < 0) break;
      let depth = 0, j = start, safe = 0;
      while (j < text.length && safe < 40000) {
        if (text[j] === "{" && text[j + 1] === "{") { depth++; j += 2; }
        else if (text[j] === "}" && text[j + 1] === "}") { depth -= 1; j += 2; if (depth === 0) break; }
        else j++;
        safe++;
      }
      const block = text.slice(start, j);
      const type = param(block, "type").toLowerCase();
      if (wantedSec(sectionAt(start)) || /(^|,)\s*(see|do|sight)\b/.test(type)) {
        const name = param(block, "name");
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          out.push({ name, description: paramLong(block, "description"), lat: param(block, "lat"), long: param(block, "long") });
        }
      }
      i = j > start ? j : start + needle.length;
    }
  });
  return out;
}
function sightMaps(s, place) {
  const la = parseFloat(s.lat), lo = parseFloat(s.long);
  if (Number.isFinite(la) && Number.isFinite(lo)) return "https://www.google.com/maps/search/?api=1&query=" + enc(la + "," + lo);
  return "https://www.google.com/maps/search/?api=1&query=" + enc((s.name || "") + " " + (place || ""));
}

/* ---- core: Steckbrief + Sehenswürdigkeiten ---- */
async function beraten(q) {
  let title = q.trim();
  try {
    const s = await jget(`${WV}/w/api.php?action=query&format=json&origin=*&list=search&srlimit=1&srsearch=${enc(q)}`);
    if (s.query && s.query.search && s.query.search.length) title = s.query.search[0].title;
  } catch (e) { /* keep raw */ }

  const [wvR, wpR] = await Promise.allSettled([
    jget(`${WV}/api/rest_v1/page/summary/${enc(title)}`),
    jget(`${WP}/api/rest_v1/page/summary/${enc(title)}`),
  ]);
  const wv = wvR.status === "fulfilled" && wvR.value && wvR.value.extract ? wvR.value : null;
  const wp = wpR.status === "fulfilled" ? wpR.value : null;

  const hasWV = !!wv;
  const intro = (wv && wv.extract) || (wp && wp.extract) || "";
  const desc = (wv && wv.description) || (wp && wp.description) || "";
  const thumb = (wv && wv.thumbnail && wv.thumbnail.source) || (wp && wp.thumbnail && wp.thumbnail.source) || "";
  const coords = (wv && wv.coordinates) || (wp && wp.coordinates) || null;
  const qid = (wv && wv.wikibase_item) || (wp && wp.wikibase_item) || "";
  const sourcePage = hasWV
    ? (wv.content_urls && wv.content_urls.desktop ? wv.content_urls.desktop.page : `${WV}/wiki/${enc(title)}`)
    : (wp && wp.content_urls && wp.content_urls.desktop ? wp.content_urls.desktop.page : `${WP}/wiki/${enc(title)}`);
  const sourceLabel = hasWV ? "Wikivoyage" : "Wikipedia";

  let sights = [];
  if (hasWV) {
    try {
      const wt = await jget(`${WV}/w/api.php?action=parse&format=json&origin=*&prop=wikitext&page=${enc(title)}`);
      sights = extractSights((wt.parse && wt.parse.wikitext ? wt.parse.wikitext["*"] : "") || "");
    } catch (e) { /* none */ }
  }
  if (sights.length < 3 && coords) {
    try {
      const g = await jget(`${WP}/w/api.php?action=query&format=json&origin=*&list=geosearch&gsradius=12000&gslimit=12&gscoord=${coords.lat}|${coords.lon}`);
      const near = ((g.query && g.query.geosearch) || []).filter((p) => p.title.toLowerCase() !== title.toLowerCase())
        .map((p) => ({ name: p.title, description: "", lat: p.lat, long: p.lon, umgebung: true }));
      const have = new Set(sights.map((s) => s.name.toLowerCase()));
      near.forEach((n) => { if (!have.has(n.name.toLowerCase())) { sights.push(n); have.add(n.name.toLowerCase()); } });
    } catch (e) { /* ignore */ }
  }
  if (!intro && sights.length === 0) throw new Error("Zu „" + q + "“ nichts gefunden.");
  return { title, intro, desc, thumb, coords, qid, sourcePage, sourceLabel, hasWV, sights: sights.slice(0, 10) };
}

/* ---- enrichments ---- */
async function ladeWikidata(qid) {
  const j = await jget(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json&origin=*`);
  const ent = j.entities && j.entities[qid]; const cl = ent && ent.claims; if (!cl) return null;
  const qn = (p) => { const c = cl[p]; const v = c && c[0] && c[0].mainsnak && c[0].mainsnak.datavalue && c[0].mainsnak.datavalue.value; return v && v.amount ? parseFloat(v.amount) : null; };
  const qs = (p) => { const c = cl[p]; const v = c && c[0] && c[0].mainsnak && c[0].mainsnak.datavalue && c[0].mainsnak.datavalue.value; return typeof v === "string" ? v : null; };
  return { einwohner: qn("P1082"), hoehe: qn("P2044"), website: qs("P856") };
}
async function ladeFahrzeit(to) {
  const j = await jget(`https://router.project-osrm.org/route/v1/driving/${CELLE.lon},${CELLE.lat};${to.lon},${to.lat}?overview=false`);
  const r = j.routes && j.routes[0]; if (!r) return null;
  return { km: Math.round(r.distance / 1000), min: Math.round(r.duration / 60) };
}
async function ladeKlima(to) {
  const j = await jget(`https://archive-api.open-meteo.com/v1/archive?latitude=${to.lat}&longitude=${to.lon}&start_date=2023-01-01&end_date=2025-12-31&daily=temperature_2m_mean,precipitation_sum&timezone=auto`);
  const d = j.daily; if (!d || !d.time) return null;
  const sumT = Array(12).fill(0), cntT = Array(12).fill(0), sumP = Array(12).fill(0);
  for (let i = 0; i < d.time.length; i++) {
    const mo = parseInt(d.time[i].slice(5, 7), 10) - 1;
    const t = d.temperature_2m_mean[i], p = d.precipitation_sum[i];
    if (t != null) { sumT[mo] += t; cntT[mo]++; }
    if (p != null) sumP[mo] += p;
  }
  const out = [];
  for (let m = 0; m < 12; m++) out.push({ t: cntT[m] ? sumT[m] / cntT[m] : null, precip: sumP[m] / 3 });
  return out;
}
async function ladeBergbahnen(to) {
  const q = `[out:json][timeout:20];(nwr[aerialway~"cable_car|gondola|mixed_lift"](around:25000,${to.lat},${to.lon}););out center 60;`;
  const j = await jget(`https://overpass-api.de/api/interpreter?data=${enc(q)}`);
  const seen = new Set(); const out = [];
  for (const el of (j.elements || [])) {
    const name = el.tags && el.tags.name; if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, lat: el.lat || (el.center && el.center.lat), long: el.lon || (el.center && el.center.lon) });
    if (out.length >= 10) break;
  }
  return out;
}
function tempColor(t) {
  if (t == null) return "#e7e5e4";
  if (t < 3) return "#93c5fd"; if (t < 10) return "#bae6fd"; if (t <= 20) return "#6ee7b7"; if (t <= 26) return "#fcd34d"; return "#fca5a5";
}
function besteZeit(klima) {
  const good = []; klima.forEach((m, i) => { if (m.t != null && m.t >= 13 && m.t <= 25 && m.precip < 110) good.push(i); });
  if (!good.length) return "keine ausgeprägt milde Zeit";
  const runs = []; let s = good[0], p = good[0];
  for (let k = 1; k < good.length; k++) { if (good[k] === p + 1) { p = good[k]; } else { runs.push([s, p]); s = good[k]; p = good[k]; } }
  runs.push([s, p]);
  return runs.map((r) => r[0] === r[1] ? MONATE[r[0]] : MONATE[r[0]] + "–" + MONATE[r[1]]).join(", ");
}

/* ---- component ---- */
export default function Reiseberatung({ onAdd, defaultQuery = "", region = "" }) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState(defaultQuery || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [added, setAdded] = useState({});
  const [facts, setFacts] = useState(EMPTY);
  const [fahr, setFahr] = useState(EMPTY);
  const [klima, setKlima] = useState(EMPTY);
  const [berg, setBerg] = useState({ loading: false, data: [] });
  const [ferien, setFerien] = useState({ loading: true, data: [] });
  const ranRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const von = new Date(), bis = new Date(); bis.setFullYear(bis.getFullYear() + 1);
        const iso = (d) => d.toISOString().slice(0, 10);
        const j = await jget(`https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=DE-NI&languageIsoCode=DE&validFrom=${iso(von)}&validTo=${iso(bis)}`);
        const arr = (Array.isArray(j) ? j : []).map((h) => ({
          name: (h.name && h.name[0] && h.name[0].text) || "Ferien", start: h.startDate, end: h.endDate,
        })).filter((h) => h.start).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5);
        setFerien({ loading: false, data: arr });
      } catch (e) { setFerien({ loading: false, data: [] }); }
    })();
  }, []);

  function enrich(core) {
    const to = core.coords ? { lat: core.coords.lat, lon: core.coords.lon } : null;
    if (core.qid) { setFacts({ loading: true, data: null }); ladeWikidata(core.qid).then((d) => setFacts({ loading: false, data: d })).catch(() => setFacts(EMPTY)); }
    if (to) {
      setFahr({ loading: true, data: null }); ladeFahrzeit(to).then((d) => setFahr({ loading: false, data: d })).catch(() => setFahr(EMPTY));
      setKlima({ loading: true, data: null }); ladeKlima(to).then((d) => setKlima({ loading: false, data: d })).catch(() => setKlima(EMPTY));
      setBerg({ loading: true, data: [] }); ladeBergbahnen(to).then((d) => setBerg({ loading: false, data: d })).catch(() => setBerg({ loading: false, data: [] }));
    }
  }

  async function run(q) {
    const term = (q != null ? q : query).trim();
    if (!term || loading) return;
    setLoading(true); setError(""); setData(null); setAdded({});
    setFacts(EMPTY); setFahr(EMPTY); setKlima(EMPTY); setBerg({ loading: false, data: [] });
    try { const core = await beraten(term); setData(core); enrich(core); }
    catch (e) { setError(e.message || String(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const q = (defaultQuery || "").trim();
    if (q && !ranRef.current) { ranRef.current = true; run(q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function add(s) {
    const la = parseFloat(s.lat), lo = parseFloat(s.long);
    if (onAdd) onAdd({
      name: s.name, info: s.description || (s.umgebung ? "in der Umgebung (Wikipedia)" : ""),
      gebiet: data ? data.title : (region || ""),
      lat: Number.isFinite(la) ? la : null, lon: Number.isFinite(lo) ? lo : null,
    });
    setAdded((a) => ({ ...a, [s.name]: true }));
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800">
          <Compass className="h-4 w-4 text-emerald-700" /> Reiseberatung
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-stone-500">Steckbrief zu Region/Stadt aus Wikivoyage &amp; Wikipedia – mit Fakten, Fahrzeit ab Celle, bester Reisezeit, Bergbahnen und Sehenswürdigkeiten zum Übernehmen. Frei, ohne Schlüssel.</p>

          <div className="flex items-center gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); }}
              placeholder="Region oder Stadt …" className={INPUT} />
            <button onClick={() => run()} disabled={loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Beraten
            </button>
          </div>

          {error && <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}</div>}
          {loading && !data && <div className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-3 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Reiseführer wird geladen …</div>}

          {data && (
            <div className="space-y-3">
              {/* Steckbrief */}
              <div className="overflow-hidden rounded-xl border border-stone-200">
                {data.thumb && <img src={data.thumb} alt={data.title} className="h-40 w-full object-cover" />}
                <div className="p-3">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700"><BookOpen className="h-4 w-4" /> Steckbrief</div>
                  <h4 className="mt-1 text-lg font-bold text-stone-900">{data.title}</h4>
                  {data.desc && <div className="text-xs italic text-stone-500">{data.desc}</div>}

                  {/* Fakten + Fahrzeit */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fahr.loading && <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-xs text-stone-400"><Loader2 className="h-3 w-3 animate-spin" /> Fahrzeit …</span>}
                    {fahr.data && <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800"><Car className="h-3.5 w-3.5" /> {nf(fahr.data.km)} km · {fmtDauer(fahr.data.min)} ab Celle</span>}
                    {facts.data && facts.data.einwohner != null && <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-xs text-stone-600"><Users className="h-3.5 w-3.5" /> {nf(Math.round(facts.data.einwohner))} Einw.</span>}
                    {facts.data && facts.data.hoehe != null && <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-xs text-stone-600"><TrendingUp className="h-3.5 w-3.5" /> {nf(Math.round(facts.data.hoehe))} m</span>}
                    {facts.data && facts.data.website && <a href={facts.data.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"><Globe className="h-3.5 w-3.5" /> Website</a>}
                  </div>

                  {data.intro && <p className="mt-2 text-sm leading-relaxed text-stone-700">{data.intro}</p>}
                  {data.sourcePage && <a href={data.sourcePage} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"><ExternalLink className="h-3.5 w-3.5" /> Ganzer Artikel ({data.sourceLabel})</a>}
                </div>
              </div>

              {/* Beste Reisezeit */}
              {(klima.loading || klima.data) && (
                <div className="rounded-xl border border-stone-200 p-3">
                  <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700"><Sun className="h-4 w-4 text-amber-500" /> Beste Reisezeit</div>
                  {klima.loading && <div className="flex items-center gap-2 text-sm text-stone-400"><Loader2 className="h-4 w-4 animate-spin" /> Klima wird ausgewertet …</div>}
                  {klima.data && (
                    <>
                      <div className="grid grid-cols-6 gap-1">
                        {klima.data.map((m, i) => (
                          <div key={i} className="rounded-md px-1 py-1 text-center" style={{ backgroundColor: tempColor(m.t) }}>
                            <div className="font-medium text-stone-700" style={{ fontSize: "10px" }}>{MONATE[i]}</div>
                            <div className="text-xs font-bold text-stone-800">{m.t == null ? "–" : Math.round(m.t) + "°"}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-stone-500">Angenehm mild: <b className="text-stone-700">{besteZeit(klima.data)}</b> · Ø-Temperatur, Klimamittel 2023–2025.</div>
                    </>
                  )}
                </div>
              )}

              {/* Top-Sehenswürdigkeiten */}
              <div>
                <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700"><Landmark className="h-4 w-4 text-emerald-700" /> Top-Sehenswürdigkeiten</div>
                {data.sights.length === 0 && <p className="text-sm text-stone-400">Keine strukturierten Sehenswürdigkeiten gefunden – schau in den Artikel oben.</p>}
                <ul className="space-y-2">
                  {data.sights.map((s, i) => {
                    const isAdded = !!added[s.name];
                    return (
                      <li key={i} className="flex items-start gap-3 rounded-xl border border-stone-100 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-stone-800">{s.name}</div>
                          {s.description && <div className="mt-0.5 text-xs text-stone-500">{s.description}</div>}
                          <a href={sightMaps(s, data.title)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800"><MapPin className="h-3.5 w-3.5" /> Karte{s.umgebung ? " · Umgebung" : ""}</a>
                        </div>
                        <button onClick={() => add(s)} disabled={isAdded}
                          className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${isAdded ? "bg-emerald-100 text-emerald-700" : "bg-emerald-700 text-white hover:bg-emerald-800"}`}>
                          {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {isAdded ? "drin" : "Ideen"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Bergbahnen */}
              {(berg.loading || (berg.data && berg.data.length > 0)) && (
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700"><Mountain className="h-4 w-4 text-emerald-700" /> Bergbahnen in der Nähe</div>
                  {berg.loading && <div className="flex items-center gap-2 text-sm text-stone-400"><Loader2 className="h-4 w-4 animate-spin" /> Seilbahnen werden gesucht …</div>}
                  <ul className="space-y-2">
                    {berg.data.map((s, i) => {
                      const isAdded = !!added[s.name];
                      return (
                        <li key={i} className="flex items-center gap-3 rounded-xl border border-stone-100 p-3">
                          <span className="flex-1 text-sm font-medium text-stone-800">{s.name}</span>
                          <a href={sightMaps(s, data.title)} target="_blank" rel="noreferrer" className="text-emerald-700" aria-label="Karte"><MapPin className="h-4 w-4" /></a>
                          <button onClick={() => add(s)} disabled={isAdded}
                            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${isAdded ? "bg-emerald-100 text-emerald-700" : "bg-emerald-700 text-white hover:bg-emerald-800"}`}>
                            {isAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-stone-400"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Quellen: {data.hasWV ? "Wikivoyage & Wikipedia" : "Wikipedia"} (CC BY-SA), Wikidata, Open-Meteo, OSM · Fahrzeit über OSRM-Demo (Richtwert).</span></div>
            </div>
          )}

          {/* Schulferien Niedersachsen – Reise-Timing */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700"><CalendarRange className="h-4 w-4 text-emerald-700" /> Schulferien Niedersachsen</div>
            <div className="mt-0.5 text-xs text-stone-400">Fürs Reise-Timing (Andrang &amp; Preise) – Start bei dir zuhause.</div>
            {ferien.loading && <div className="mt-2 flex items-center gap-2 text-sm text-stone-400"><Loader2 className="h-4 w-4 animate-spin" /> lädt …</div>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ferien.data.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-white border border-stone-200 px-2 py-1 text-xs text-stone-600">
                  <b className="text-stone-800">{f.name}</b> {dm(f.start)}–{dm(f.end)}{String(f.end).slice(0, 4)}
                </span>
              ))}
              {!ferien.loading && ferien.data.length === 0 && <span className="text-xs text-stone-400">keine Daten</span>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
