import React, { useState } from "react";
import { Plane, Train, Search, ExternalLink, Globe2, Sparkles, Info } from "lucide-react";

/* Helfer */
const isValidISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const yymmdd = (iso) => (isValidISO(iso) ? iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10) : "");
const fmt = (iso) => { if (!isValidISO(iso)) return ""; const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }); };

/* Ziele im Ausland */
const FLUG_ZIELE = [
  { iata: "cdg", label: "Paris" }, { iata: "ams", label: "Amsterdam" }, { iata: "bcn", label: "Barcelona" },
  { iata: "mad", label: "Madrid" }, { iata: "fco", label: "Rom" }, { iata: "mxp", label: "Mailand" },
  { iata: "vie", label: "Wien" }, { iata: "zrh", label: "Zürich" }, { iata: "prg", label: "Prag" },
  { iata: "cph", label: "Kopenhagen" }, { iata: "lis", label: "Lissabon" }, { iata: "opo", label: "Porto" },
  { iata: "lhr", label: "London" }, { iata: "pmi", label: "Palma de Mallorca" }, { iata: "nce", label: "Nizza" },
  { iata: "vce", label: "Venedig" }, { iata: "ath", label: "Athen" }, { iata: "bud", label: "Budapest" },
  { iata: "dub", label: "Dublin" }, { iata: "arn", label: "Stockholm" }, { iata: "osl", label: "Oslo" },
  { iata: "ist", label: "Istanbul" }, { iata: "agp", label: "Málaga" }, { iata: "fao", label: "Faro" },
];
const ZUG_ZIELE = ["Paris", "Amsterdam", "Brüssel", "Prag", "Wien", "Zürich", "Basel", "Kopenhagen", "Luxemburg", "Straßburg", "Salzburg", "Innsbruck", "Mailand", "Verona", "Warschau"];

/* Flug-URLs */
const kayak = (iata, o, r) => `https://www.kayak.de/flights/HAJ-${iata.toUpperCase()}/${o}/${r}?sort=price_a`;
const skyEverywhere = (o, r) => `https://www.skyscanner.net/transport/flights/haj/everywhere/${yymmdd(o)}/${yymmdd(r)}/`;
const googleFlights = (label, o, r) => "https://www.google.com/travel/flights?q=" + encodeURIComponent(`Flug Hannover nach ${label} ${o} zurück ${r}`);

/* Bahn: interne Bahnhofs-IDs zur Laufzeit holen und Suche vorausfüllen (mit Rückfall) */
async function openBahn(from, to, date) {
  const w = window.open("", "_blank"); // synchron im Klick öffnen (gegen Popup-Blocker)
  const fallback = "https://www.bahn.de/buchung/fahrplan/suche";
  const go = (u) => { if (w) w.location.href = u; else window.location.href = u; };
  try {
    const lookup = async (name) => {
      const r = await fetch(`https://www.bahn.de/web/api/reiseloesung/orte?suchbegriff=${encodeURIComponent(name)}&typ=ALL&limit=1`);
      if (!r.ok) throw new Error("http");
      const j = await r.json();
      const arr = Array.isArray(j) ? j : (j && j.orte) || [];
      return arr[0] && arr[0].id;
    };
    const [sid, zid] = await Promise.all([lookup(from), lookup(to)]);
    if (sid && zid) {
      go(`https://www.bahn.de/buchung/fahrplan/suche#soid=${sid}&zoid=${zid}${isValidISO(date) ? `&hd=${date}T08:00:00&hza=D` : ""}&sts=true&kl=2`);
      return;
    }
  } catch (e) { /* Rückfall unten */ }
  go(fallback);
}

const linkCls = "flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800";
const linkInner = "inline-flex items-center gap-2";

export default function Bestpreis() {
  const [mode, setMode] = useState("flug");
  const [start, setStart] = useState(() => addDays(todayISO(), 30));
  const [end, setEnd] = useState(() => addDays(todayISO(), 34));
  const [flugZiel, setFlugZiel] = useState("cdg");
  const [zugZiel, setZugZiel] = useState("Paris");

  const validRange = isValidISO(start) && isValidISO(end) && end > start;
  const effEnd = validRange ? end : (isValidISO(start) ? addDays(start, 4) : end);
  const flug = FLUG_ZIELE.find((z) => z.iata === flugZiel) || FLUG_ZIELE[0];

  return (
    <div className="space-y-4">
      <header>
        <div className="mb-1 flex items-center gap-2 text-emerald-700"><Sparkles className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-widest">Günstig reisen</span></div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Bestpreis-Suche</h1>
        <p className="mt-1 text-sm text-stone-500">Reisen ins Ausland – Flug ab Hannover, Zug ab Celle. Die günstigsten Preise findet die jeweilige Suche.</p>
      </header>

      <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Kostenfrei: „Suchen" öffnet die vorausgefüllte Suche (Flug: Kayak/Skyscanner, Zug: Deutsche Bahn).</span>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
        <button onClick={() => setMode("flug")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${mode === "flug" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><Plane className="h-4 w-4" /> Flug</button>
        <button onClick={() => setMode("zug")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${mode === "zug" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><Train className="h-4 w-4" /> Zug</button>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Hinreise</span><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Rückreise</span><input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" /></label>
        </div>
        {!validRange && <p className="mt-2 text-xs text-rose-500">Rückreise muss nach der Hinreise liegen.</p>}
      </section>

      {mode === "flug" ? (
        <>
          <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <h3 className="mb-1 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Globe2 className="h-4 w-4 text-emerald-700" /> Günstigste Ziele finden</h3>
            <p className="mb-3 text-xs text-stone-500">Skyscanner „Überallhin": alle Ziele ab Hannover nach Preis sortiert.</p>
            <a href={skyEverywhere(start, effEnd)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"><Search className="h-4 w-4" /> Günstigste Flüge ab Hannover</a>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-800">Gezieltes Ziel</h3>
            <label className="mb-3 block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Ziel (Ausland)</span>
              <select value={flugZiel} onChange={(e) => setFlugZiel(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none">
                {FLUG_ZIELE.map((z) => <option key={z.iata} value={z.iata}>{z.label} ({z.iata.toUpperCase()})</option>)}
              </select>
            </label>
            <div className="space-y-2">
              <a href={kayak(flug.iata, start, effEnd)} target="_blank" rel="noreferrer" className={linkCls}><span className={linkInner}><Plane className="h-4 w-4 text-emerald-600" /> Kayak: Hannover → {flug.label} · {fmt(start)}–{fmt(effEnd)}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
              <a href={googleFlights(flug.label, start, effEnd)} target="_blank" rel="noreferrer" className={linkCls}><span className={linkInner}><Plane className="h-4 w-4 text-emerald-600" /> Google Flights: Hannover → {flug.label}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
            </div>
            <p className="mt-3 text-xs text-stone-400">Kayak übernimmt Strecke und Datum, günstigste zuerst. Für „max. 1 Umstieg" den Filter „Stopps" auf höchstens 1 setzen.</p>
          </section>
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Train className="h-4 w-4 text-emerald-700" /> Zugreise ab Celle</h3>
            <label className="mb-3 block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Ziel (Ausland)</span>
              <select value={zugZiel} onChange={(e) => setZugZiel(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none">
                {ZUG_ZIELE.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </label>
            <div className="space-y-2">
              <button onClick={() => openBahn("Celle", zugZiel, start)} className={linkCls + " w-full"}><span className={linkInner}><Train className="h-4 w-4 text-emerald-600" /> Hinfahrt: Celle → {zugZiel} · {fmt(start)}</span><ExternalLink className="h-4 w-4 text-stone-400" /></button>
              <button onClick={() => openBahn(zugZiel, "Celle", effEnd)} className={linkCls + " w-full"}><span className={linkInner}><Train className="h-4 w-4 text-emerald-600" /> Rückfahrt: {zugZiel} → Celle · {fmt(effEnd)}</span><ExternalLink className="h-4 w-4 text-stone-400" /></button>
            </div>
            <p className="mt-3 text-xs text-stone-400">Öffnet die Bahn-Verbindung mit dem günstigsten Sparpreis für die Tage. Tipp: „max. Umstiege: 1" wählen, früh buchen.</p>
          </section>
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Bei Zügen gibt es keine „Überallhin"-Automatik wie bei Flügen. Öffnet statt der Verbindung nur die DB-Startseite, sag Bescheid – dann stelle ich die Zugsuche um.</span>
          </div>
        </>
      )}

      <p className="text-center text-xs text-stone-400">Preise und Verfügbarkeit immer auf der geöffneten Seite prüfen.</p>
    </div>
  );
}
