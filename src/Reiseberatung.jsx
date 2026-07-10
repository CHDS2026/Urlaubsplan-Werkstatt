/*
  Reiseberatung — freier Baustein für den Urlaubsplaner (fügt sich in den Ideen-Tab ein)
  ------------------------------------------------------------------------------------
  Nutzt NUR offene, schlüsselfreie Schnittstellen (funktioniert daher auch in der
  deployten Cloudflare-PWA – kein Claude-Key nötig):
    • Wikivoyage (de) – REST-Summary + action=parse (vCard-Listings der Sehenswürdigkeiten)
    • Wikipedia (de)  – REST-Summary + GeoSearch (Fallback ohne Reiseführer-Listing)
  Inhalte sind CC BY-SA – Quelle wird angezeigt und verlinkt.

  EINBAU in App.jsx (siehe Anleitung im Chat):
    import Reiseberatung from "./Reiseberatung.jsx";
    // in PoolView, direkt nach <OsmFinder .../>:
    <Reiseberatung
      defaultQuery={trip.region || ""}
      region={regionLabel(trip)}
      onAdd={(s) => onAdd(mkItem(
        { kategorie: "sehenswuerdigkeit", name: s.name, info: s.info, gebiet: s.gebiet, maps_suche: s.name },
        { day: null, order: 0, lat: s.lat ?? null, lon: s.lon ?? null }
      ))}
    />
  Der Baustein gibt neutrale Treffer { name, info, gebiet, lat, lon } aus; das Mapping
  auf euer Item-Modell passiert oben über euer vorhandenes mkItem.
*/
import { useState, useEffect, useRef } from "react";
import {
  Compass, Search, BookOpen, MapPin, Plus, ExternalLink, Loader2,
  Info, Landmark, Check, ChevronDown, ChevronUp,
} from "lucide-react";

const WV = "https://de.wikivoyage.org";
const WP = "https://de.wikipedia.org";
const enc = encodeURIComponent;
const INPUT = "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none";

async function jget(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

/* ---- wikitext helpers ---- */
function stripWiki(s) {
  return String(s || "")
    .replace(/<ref[\s\S]*?<\/ref>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/'''?/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
      const inWanted = wantedSec(sectionAt(start)) || /(^|,)\s*(see|do|sight)\b/.test(type);
      if (inWanted) {
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
  if (Number.isFinite(la) && Number.isFinite(lo))
    return "https://www.google.com/maps/search/?api=1&query=" + enc(la + "," + lo);
  return "https://www.google.com/maps/search/?api=1&query=" + enc((s.name || "") + " " + (place || ""));
}

/* ---- data flow: Wikivoyage first, Wikipedia as fill/fallback ---- */
async function beraten(q) {
  let title = q.trim();
  try {
    const s = await jget(`${WV}/w/api.php?action=query&format=json&origin=*&list=search&srlimit=1&srsearch=${enc(q)}`);
    if (s.query && s.query.search && s.query.search.length) title = s.query.search[0].title;
  } catch (e) { /* keep raw q */ }

  let wv = null;
  try { wv = await jget(`${WV}/api/rest_v1/page/summary/${enc(title)}`); } catch (e) { wv = null; }

  let intro = "", desc = "", thumb = "", coords = null, sourcePage = "", sourceLabel = "", hasWV = false;
  let sights = [];

  if (wv && wv.extract) {
    hasWV = true;
    intro = wv.extract; desc = wv.description || ""; thumb = (wv.thumbnail && wv.thumbnail.source) || "";
    coords = wv.coordinates || null;
    sourcePage = wv.content_urls && wv.content_urls.desktop ? wv.content_urls.desktop.page : `${WV}/wiki/${enc(title)}`;
    sourceLabel = "Wikivoyage";
    try {
      const wt = await jget(`${WV}/w/api.php?action=parse&format=json&origin=*&prop=wikitext&page=${enc(title)}`);
      const text = wt.parse && wt.parse.wikitext ? wt.parse.wikitext["*"] : "";
      sights = extractSights(text || "");
    } catch (e) { /* no listings */ }
  }

  if (!intro || !thumb || !coords) {
    try {
      const wp = await jget(`${WP}/api/rest_v1/page/summary/${enc(title)}`);
      if (!intro && wp.extract) intro = wp.extract;
      if (!desc && wp.description) desc = wp.description;
      if (!thumb && wp.thumbnail) thumb = wp.thumbnail.source;
      if (!coords && wp.coordinates) coords = wp.coordinates;
      if (!sourcePage) { sourcePage = wp.content_urls && wp.content_urls.desktop ? wp.content_urls.desktop.page : `${WP}/wiki/${enc(title)}`; sourceLabel = sourceLabel || "Wikipedia"; }
    } catch (e) { /* ignore */ }
  }

  if (sights.length < 3 && coords) {
    try {
      const g = await jget(`${WP}/w/api.php?action=query&format=json&origin=*&list=geosearch&gsradius=12000&gslimit=12&gscoord=${coords.lat}|${coords.lon}`);
      const near = ((g.query && g.query.geosearch) || [])
        .filter((p) => p.title.toLowerCase() !== title.toLowerCase())
        .map((p) => ({ name: p.title, description: "", lat: p.lat, long: p.lon, umgebung: true }));
      const have = new Set(sights.map((s) => s.name.toLowerCase()));
      near.forEach((n) => { if (!have.has(n.name.toLowerCase())) { sights.push(n); have.add(n.name.toLowerCase()); } });
    } catch (e) { /* ignore */ }
  }

  if (!intro && sights.length === 0) throw new Error("Zu „" + q + "“ nichts gefunden.");
  return { title, intro, desc, thumb, coords, sourcePage, sourceLabel, hasWV, sights: sights.slice(0, 10) };
}

/* ---- embeddable component ---- */
export default function Reiseberatung({ onAdd, defaultQuery = "", region = "" }) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState(defaultQuery || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [added, setAdded] = useState({});
  const ranRef = useRef(false);

  async function run(q) {
    const term = (q != null ? q : query).trim();
    if (!term || loading) return;
    setLoading(true); setError(""); setData(null); setAdded({});
    try { setData(await beraten(term)); }
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
    const sight = {
      name: s.name,
      info: s.description || (s.umgebung ? "in der Umgebung (Wikipedia)" : ""),
      gebiet: data ? data.title : (region || ""),
      lat: Number.isFinite(la) ? la : null,
      lon: Number.isFinite(lo) ? lo : null,
    };
    if (onAdd) onAdd(sight);
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
          <p className="text-xs text-stone-500">Kompakter Steckbrief zu Region oder Stadt aus Wikivoyage &amp; Wikipedia – Top-Sehenswürdigkeiten per „+" in die Ideen. Frei, ohne Schlüssel.</p>

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
              <div className="overflow-hidden rounded-xl border border-stone-200">
                {data.thumb && <img src={data.thumb} alt={data.title} className="h-40 w-full object-cover" />}
                <div className="p-3">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700"><BookOpen className="h-4 w-4" /> Steckbrief</div>
                  <h4 className="mt-1 text-lg font-bold text-stone-900">{data.title}</h4>
                  {data.desc && <div className="text-xs italic text-stone-500">{data.desc}</div>}
                  {data.intro && <p className="mt-1.5 text-sm leading-relaxed text-stone-700">{data.intro}</p>}
                  {data.sourcePage && <a href={data.sourcePage} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"><ExternalLink className="h-3.5 w-3.5" /> Ganzer Artikel ({data.sourceLabel})</a>}
                </div>
              </div>

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

              <div className="flex items-start gap-2 text-xs text-stone-400"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Inhalte: {data.hasWV ? "Wikivoyage & Wikipedia" : "Wikipedia"} · CC BY-SA. Sehenswürdigkeiten aus den Reiseführer-Listings{data.sights.some((x) => x.umgebung) ? " bzw. der Wikipedia-Umgebungssuche" : ""}.</span></div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
