/*
  Angebote.jsx — Günstig-Radar (Bahn) + Direktflüge ab HAJ
  --------------------------------------------------------
  Bahn: Startbahnhof (Celle/Hannover) + Datum -> günstigste DB-Sparpreise zu
        ~20 Städten bis ~400 km um Hannover, gefiltert auf DIREKT oder max. 1 Umstieg,
        sortiert nach Preis. (v6.db.transport.rest, tickets=true, ohne Schlüssel.)
  Flug: NUR Direktziele ab HAJ (kuratierte Liste + Airline), passend zum Monat,
        mit Preis-Check-Link je Ziel (Live-Flugpreise gibt's gratis nicht).
  Datenschutzfreundlich: feste Listen, keine Geräte-Ortung.

  Hinweis: DB ist ein Community-Dienst mit niedrigem Limit -> bei Auslastung fehlen
  evtl. einzelne Städte (partielle Ergebnisse werden angezeigt).

  EINBAU: <Angebote /> (keine Props nötig).
*/
import React, { useState } from "react";
import { Train, Plane, Search, Loader2, Info, Calendar, ExternalLink, Tag } from "lucide-react";

const enc = encodeURIComponent;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function jget(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { const r = await fetch(url, { signal: ctrl.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
const hhmm = (d) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
const eur = (n) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const ddmmyyyy = (iso) => { const p = iso.split("-"); return p[2] + "." + p[1] + "." + p[0]; };
function hm(min) { const h = Math.floor(min / 60), m = min % 60; return h > 0 ? h + " h " + (m < 10 ? "0" + m : m) + " min" : m + " min"; }

/* ---------------- BAHN ---------------- */
const STARTS = ["Celle", "Hannover Hbf"];
const ORIG_ID = {};
async function origId(name) {
  if (ORIG_ID[name]) return ORIG_ID[name];
  const l = await jget(`https://v6.db.transport.rest/locations?query=${enc(name)}&results=1&stops=true&addresses=false&poi=false`);
  const s = Array.isArray(l) && l[0]; if (!s || !s.id) throw new Error("Startbahnhof nicht gefunden");
  ORIG_ID[name] = s.id; return s.id;
}
// Ziele bis ~400 km um Hannover (Luftlinie), mit DB-Stations-IDs
const ZIELE = [
  { n: "Hamburg", id: "8002549" }, { n: "Bremen", id: "8000050" }, { n: "Kiel", id: "8000199" },
  { n: "Berlin", id: "8011160" }, { n: "Magdeburg", id: "8010224" }, { n: "Braunschweig", id: "8000049" },
  { n: "Hannover", id: "8000152" }, { n: "Göttingen", id: "8000128" }, { n: "Kassel-Wilhelmshöhe", id: "8003200" },
  { n: "Osnabrück", id: "8000294" }, { n: "Münster", id: "8000263" }, { n: "Bielefeld", id: "8000036" },
  { n: "Dortmund", id: "8000080" }, { n: "Essen", id: "8000098" }, { n: "Düsseldorf", id: "8000085" },
  { n: "Köln", id: "8000207" }, { n: "Leipzig", id: "8010205" }, { n: "Erfurt", id: "8010101" },
  { n: "Frankfurt (Main)", id: "8000105" }, { n: "Dresden", id: "8010085" }, { n: "Nürnberg", id: "8000284" },
];

async function fahrpreis(fromId, destId, dateISO) {
  const jr = await jget(`https://v6.db.transport.rest/journeys?from=${fromId}&to=${destId}&departure=${enc(dateISO + "T00:01:00")}&results=6&tickets=true&stopovers=false&language=de`);
  const journeys = (jr && jr.journeys) || [];
  let best = null;
  for (const j of journeys) {
    if (!(j.price && typeof j.price.amount === "number")) continue;
    const legs = (j.legs || []).filter((l) => !l.walking); if (!legs.length) continue;
    const umst = Math.max(0, legs.length - 1);
    if (umst > 1) continue; // nur direkt oder max. 1 Umstieg
    const dep = new Date(legs[0].departure || legs[0].plannedDeparture);
    const arr = new Date(legs[legs.length - 1].arrival || legs[legs.length - 1].plannedArrival);
    const cand = { price: j.price.amount, min: Math.round((arr - dep) / 60000), umst, dep };
    if (!best || cand.price < best.price) best = cand;
  }
  return best;
}
async function ladeRadar(fromId, dateISO, ziele, onProgress) {
  const out = []; const CH = 5; let done = 0;
  for (let i = 0; i < ziele.length; i += CH) {
    const chunk = ziele.slice(i, i + CH);
    const res = await Promise.all(chunk.map(async (z) => {
      try { const b = await fahrpreis(fromId, z.id, dateISO); return b ? { ...z, ...b } : null; }
      catch (e) { return null; }
    }));
    res.forEach((r) => { if (r) out.push(r); });
    done += chunk.length; if (onProgress) onProgress(done, ziele.length);
    if (i + CH < ziele.length) await sleep(350);
  }
  out.sort((a, b) => a.price - b.price);
  return out;
}
const dbLink = (from, to, dateISO) => "https://www.bahn.de/buchung/fahrplan/suche#sts=true&so=" + enc(from) + "&zo=" + enc(to) + "&hd=" + dateISO + "T06:00:00&hza=D&bp=true";

/* ---------------- FLUG (nur Direktziele ab HAJ) ---------------- */
const HAJ_DIRK = [
  { n: "Frankfurt", iata: "FRA", air: "Lufthansa", saison: "ganzjährig" },
  { n: "München", iata: "MUC", air: "Lufthansa", saison: "ganzjährig" },
  { n: "London-Heathrow", iata: "LHR", air: "British Airways", saison: "ganzjährig" },
  { n: "Kopenhagen", iata: "CPH", air: "SAS", saison: "ganzjährig" },
  { n: "Istanbul", iata: "IST", air: "Turkish Airlines", saison: "ganzjährig" },
  { n: "Palma de Mallorca", iata: "PMI", air: "TUI fly u. a.", saison: "ganzjährig" },
  { n: "Antalya", iata: "AYT", air: "TUI fly · SunExpress", saison: "ganzjährig" },
  { n: "Gran Canaria", iata: "LPA", air: "TUI fly", saison: "ganzjährig" },
  { n: "Teneriffa", iata: "TFS", air: "TUI fly", saison: "ganzjährig" },
  { n: "Fuerteventura", iata: "FUE", air: "TUI fly", saison: "ganzjährig" },
  { n: "Hurghada", iata: "HRG", air: "TUI fly · Corendon", saison: "ganzjährig" },
  { n: "Nizza", iata: "NCE", air: "Eurowings", saison: "sommer" },
  { n: "Alicante", iata: "ALC", air: "Eurowings", saison: "sommer" },
  { n: "Lissabon", iata: "LIS", air: "Eurowings", saison: "sommer" },
  { n: "Stockholm", iata: "ARN", air: "Eurowings", saison: "sommer" },
  { n: "Pula", iata: "PUY", air: "Eurowings", saison: "sommer" },
  { n: "Bozen", iata: "BZO", air: "SkyAlps", saison: "saisonal" },
  { n: "Edremit", iata: "EDO", air: "SunExpress", saison: "sommer" },
];
const SAISON_STYLE = {
  ganzjährig: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  sommer: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  saisonal: "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300",
};
const SAISON_LABEL = { ganzjährig: "ganzjährig", sommer: "Sommer", saisonal: "saisonal", winter: "Winter" };
function fliegtImMonat(saison, m) {
  if (saison === "ganzjährig") return true;
  if (saison === "winter") return [11, 12, 1, 2, 3].includes(m);
  return [4, 5, 6, 7, 8, 9, 10].includes(m);
}
const gflight = (iata, dateISO) => "https://www.google.com/travel/flights?q=" + enc("Flüge HAJ nach " + iata + " am " + ddmmyyyy(dateISO));

export default function Angebote() {
  const def = new Date(); def.setDate(def.getDate() + 14);
  const min = new Date(); min.setDate(min.getDate() + 1);
  const [origin, setOrigin] = useState("Hannover Hbf");
  const [date, setDate] = useState(def.toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [prog, setProg] = useState([0, 0]);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState(null);

  async function suchen() {
    if (loading) return;
    setLoading(true); setErr(""); setRows(null); setProg([0, ZIELE.length]);
    try {
      const fromId = await origId(origin);
      const ziele = ZIELE.filter((z) => !origin.toLowerCase().startsWith(z.n.toLowerCase()));
      const r = await ladeRadar(fromId, date, ziele, (d, t) => setProg([d, t]));
      setRows(r);
      if (!r.length) setErr("Gerade keine passenden Preise abrufbar (Limit oder Datum zu kurzfristig) – später erneut.");
    } catch (e) { setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }

  const cheapest = rows && rows.length ? rows[0].price : null;
  const monat = parseInt(date.slice(5, 7), 10);
  const fluege = HAJ_DIRK.filter((f) => fliegtImMonat(f.saison, monat)).sort((a, b) => a.n.localeCompare(b.n, "de"));

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
        <Tag className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Günstig-Radar
      </div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Günstigste Bahn-Sparpreise ab Celle/Hannover zu Zielen bis ~400 km (direkt oder max. 1 Umstieg) – plus Direktflüge ab HAJ.</p>

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">ab</span>
          {STARTS.map((s) => (
            <button key={s} onClick={() => setOrigin(s)} className={"rounded-full px-3 py-1.5 text-xs font-medium transition " + (origin === s ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300")}>{s}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 dark:border-stone-700 dark:bg-stone-900">
            <Calendar className="h-4 w-4 shrink-0 text-stone-400" />
            <input type="date" value={date} min={min.toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent py-2 text-sm focus:outline-none" />
          </span>
          <button onClick={suchen} disabled={loading} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Günstige Ziele
          </button>
        </div>
      </div>
      {err && <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err}</div>}

      {(loading || rows) && (
        <div className="mt-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200"><Train className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Bahn ab {origin} · {ddmmyyyy(date)}</div>
          {loading && <div className="flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Sparpreise werden gesammelt … ({prog[0]}/{prog[1]})</div>}
          {rows && rows.length > 0 && (
            <div className="space-y-1.5">
              {rows.map((r, i) => (
                <a key={i} href={dbLink(origin, r.n, date)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-stone-50 px-2.5 py-2 text-sm transition hover:bg-emerald-50 dark:bg-stone-800 dark:hover:bg-stone-700">
                  <span className={"inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-bold " + (r.price === cheapest ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300")}>{r.price === cheapest && <Tag className="h-3.5 w-3.5" />}{eur(r.price)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-stone-800 dark:text-stone-100">{r.n}</span>
                    <span className="block text-xs text-stone-500 dark:text-stone-400">ab {hhmm(r.dep)} · {hm(r.min)} · {r.umst === 0 ? "direkt" : "1 Umst."}</span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-stone-300 dark:text-stone-600" />
                </a>
              ))}
              <div className="pt-1 text-xs text-stone-400 dark:text-stone-500">Günstigste Sparpreise, nur direkt oder 1 Umstieg (Richtwert, ohne Gewähr) · nur DB, ohne FlixTrain · tippen öffnet bahn.de.</div>
            </div>
          )}
          {rows && rows.length === 0 && !loading && <div className="text-sm text-stone-500 dark:text-stone-400">Keine passenden Verbindungen gefunden – anderes Datum probieren.</div>}
        </div>
      )}

      {/* Direktflüge ab HAJ */}
      <div className="mt-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200"><Plane className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Direktflüge ab Hannover · {ddmmyyyy(date)}</div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {fluege.map((f) => (
            <div key={f.iata} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-800 dark:text-stone-100">{f.n}</span>
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-mono text-stone-500 dark:bg-stone-800 dark:text-stone-400">{f.iata}</span>
                  <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (SAISON_STYLE[f.saison] || "")}>{SAISON_LABEL[f.saison]}</span>
                </span>
                <span className="block text-xs text-stone-500 dark:text-stone-400">{f.air}</span>
              </span>
              <a href={gflight(f.iata, date)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">Preise <ExternalLink className="h-3.5 w-3.5" /></a>
            </div>
          ))}
          {fluege.length === 0 && <div className="py-2 text-sm text-stone-400 dark:text-stone-500">Für diesen Monat kein Direktziel in der Auswahl.</div>}
        </div>
        <div className="mt-2 text-xs text-stone-400 dark:text-stone-500">Nur Direktziele ab HAJ (Auswahl, passend zum Monat) · Live-Flugpreise gibt's gratis nicht – „Preise" öffnet Google Flights (HAJ → Ziel, Datum). Ohne Gewähr.</div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Bahn: v6.db.transport.rest (DB-Sparpreise, Community-Dienst mit Limit) – bei Auslastung fehlen evtl. einzelne Ziele. Bestpreise nur für künftige Tage. Alle Angaben ohne Gewähr.</span></div>
    </section>
  );
}
