import React, { useState } from "react";
import { Plane, Train, Search, ExternalLink, Globe2, Sparkles, Info } from "lucide-react";

/* Helfer */
const isValidISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const yymmdd = (iso) => (isValidISO(iso) ? iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10) : "");
const fmt = (iso) => { if (!isValidISO(iso)) return ""; const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }); };

/* Vorschläge (frei überschreibbar) + Stadt->IATA für die vorausgefüllten Anbieter */
const FLUG_ZIELE = [
  { iata: "cdg", label: "Paris" }, { iata: "ams", label: "Amsterdam" }, { iata: "bcn", label: "Barcelona" },
  { iata: "mad", label: "Madrid" }, { iata: "fco", label: "Rom" }, { iata: "mxp", label: "Mailand" },
  { iata: "vie", label: "Wien" }, { iata: "zrh", label: "Zürich" }, { iata: "prg", label: "Prag" },
  { iata: "cph", label: "Kopenhagen" }, { iata: "lis", label: "Lissabon" }, { iata: "opo", label: "Porto" },
  { iata: "lhr", label: "London" }, { iata: "pmi", label: "Palma de Mallorca" }, { iata: "nce", label: "Nizza" },
  { iata: "vce", label: "Venedig" }, { iata: "ath", label: "Athen" }, { iata: "bud", label: "Budapest" },
  { iata: "dub", label: "Dublin" }, { iata: "arn", label: "Stockholm" }, { iata: "osl", label: "Oslo" },
  { iata: "ist", label: "Istanbul" }, { iata: "agp", label: "Málaga" }, { iata: "fao", label: "Faro" },
  { iata: "tfs", label: "Teneriffa" }, { iata: "lpa", label: "Gran Canaria" }, { iata: "hel", label: "Helsinki" },
];
const ZUG_ZIELE = ["Paris", "Amsterdam", "Brüssel", "Prag", "Wien", "Zürich", "Basel", "Kopenhagen", "Luxemburg", "Straßburg", "Salzburg", "Innsbruck", "Mailand", "Verona", "Warschau"];

const FLUG_PORTALE = [
  { key: "lh", label: "Lufthansa", url: "https://www.lufthansa.com/de/de/flight-search" },
  { key: "ew", label: "Eurowings", url: "https://www.eurowings.com/de/booking/flights.html" },
  { key: "tui", label: "TUI fly", url: "https://www.tuifly.com/de/flug/fluege-buchen.html" },
  { key: "c24", label: "Check24", url: "https://flug.check24.de/" },
  { key: "bkg", label: "Booking", url: "https://flights.booking.com/" },
];

const resolveIata = (text) => {
  const t = (text || "").trim();
  if (/^[A-Za-z]{3}$/.test(t)) return t.toLowerCase();
  const hit = FLUG_ZIELE.find((z) => z.label.toLowerCase() === t.toLowerCase());
  return hit ? hit.iata : null;
};

/* Flug-URLs (Hannover = HAJ) */
const kayak = (iata, o, r) => `https://www.kayak.de/flights/HAJ-${iata.toUpperCase()}/${o}/${r}?sort=price_a`;
const skyDest = (iata, o, r) => `https://www.skyscanner.de/transport/fluge/haj/${iata}/${yymmdd(o)}/${yymmdd(r)}/`;
const skyEverywhere = (o, r) => `https://www.skyscanner.net/transport/flights/haj/everywhere/${yymmdd(o)}/${yymmdd(r)}/`;
const googleFlights = (text, o, r) => "https://www.google.com/travel/flights?q=" + encodeURIComponent(`Flug Hannover nach ${text} ${o} zurück ${r}`);

/* Bahn: interne Bahnhofs-IDs zur Laufzeit holen und Suche vorausfüllen (mit Rückfall) */
async function openBahn(from, to, date) {
  const w = window.open("", "_blank");
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
    if (sid && zid) { go(`https://www.bahn.de/buchung/fahrplan/suche#soid=${sid}&zoid=${zid}${isValidISO(date) ? `&hd=${date}T08:00:00&hza=D` : ""}&sts=true&kl=2`); return; }
  } catch (e) { /* Rückfall */ }
  go(fallback);
}

const linkCls = "flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800";
const inner = "inline-flex items-center gap-2";
const inputCls = "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none";

export default function Bestpreis() {
  const [mode, setMode] = useState("flug");
  const [start, setStart] = useState(() => addDays(todayISO(), 30));
  const [end, setEnd] = useState(() => addDays(todayISO(), 34));
  const [flugText, setFlugText] = useState("Rom");
  const [zugText, setZugText] = useState("Paris");

  const validRange = isValidISO(start) && isValidISO(end) && end > start;
  const effEnd = validRange ? end : (isValidISO(start) ? addDays(start, 4) : end);
  const iata = resolveIata(flugText);

  return (
    <div className="space-y-4">
      <header>
        <div className="mb-1 flex items-center gap-2 text-emerald-700"><Sparkles className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-widest">Günstig reisen</span></div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Bestpreis-Suche</h1>
        <p className="mt-1 text-sm text-stone-500">Ins Ausland – Flug ab Hannover, Zug ab Celle. Die günstigsten Preise findet die jeweilige Suche.</p>
      </header>

      <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Kostenfrei: „Suchen" öffnet die vorausgefüllte Suche beim jeweiligen Anbieter.</span>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
        <button onClick={() => setMode("flug")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${mode === "flug" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><Plane className="h-4 w-4" /> Flug</button>
        <button onClick={() => setMode("zug")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${mode === "zug" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><Train className="h-4 w-4" /> Zug</button>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Hinreise</span><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Rückreise</span><input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={inputCls} /></label>
        </div>
        {!validRange && <p className="mt-2 text-xs text-rose-500">Rückreise muss nach der Hinreise liegen.</p>}
      </section>

      {mode === "flug" ? (
        <>
          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Ziel (frei eingeben oder wählen)</span>
              <input list="flugziele" value={flugText} onChange={(e) => setFlugText(e.target.value)} placeholder="z. B. Rom oder FCO" className={inputCls} />
              <datalist id="flugziele">{FLUG_ZIELE.map((z) => <option key={z.iata} value={z.label} />)}</datalist>
            </label>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <h3 className="mb-1 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Globe2 className="h-4 w-4 text-emerald-700" /> Günstigste Ziele finden</h3>
            <p className="mb-3 text-xs text-stone-500">Skyscanner „Überallhin": alle Ziele ab Hannover nach Preis sortiert.</p>
            <a href={skyEverywhere(start, effEnd)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"><Search className="h-4 w-4" /> Günstigste Flüge ab Hannover</a>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-800">Mit Strecke & Datum</h3>
            <div className="space-y-2">
              {iata && <a href={kayak(iata, start, effEnd)} target="_blank" rel="noreferrer" className={linkCls}><span className={inner}><Plane className="h-4 w-4 text-emerald-600" /> Kayak → {flugText} · {fmt(start)}–{fmt(effEnd)}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>}
              {iata && <a href={skyDest(iata, start, effEnd)} target="_blank" rel="noreferrer" className={linkCls}><span className={inner}><Plane className="h-4 w-4 text-emerald-600" /> Skyscanner → {flugText}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>}
              <a href={googleFlights(flugText, start, effEnd)} target="_blank" rel="noreferrer" className={linkCls}><span className={inner}><Plane className="h-4 w-4 text-emerald-600" /> Google Flights → {flugText || "Ziel"}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
            </div>
            {!iata && flugText.trim() && <p className="mt-2 text-xs text-stone-400">Für Kayak/Skyscanner mit Vorbefüllung ein Ziel aus der Liste wählen oder das 3-stellige Flughafen-Kürzel eingeben (z. B. FCO).</p>}
            <p className="mt-3 text-xs text-stone-400">Kayak sortiert nach Preis; für „max. 1 Umstieg" den Stopps-Filter setzen.</p>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-800">Direkt bei Airlines & Portalen</h3>
            <div className="space-y-2">
              {FLUG_PORTALE.map((p) => <a key={p.key} href={p.url} target="_blank" rel="noreferrer" className={linkCls}><span className={inner}><Plane className="h-4 w-4 text-emerald-600" /> {p.label}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>)}
            </div>
            <p className="mt-3 text-xs text-stone-400">Diese öffnen die Buchungsseite – Strecke ({flugText || "Ziel"}) und Datum dort eingeben.</p>
          </section>
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Train className="h-4 w-4 text-emerald-700" /> Zugreise ab Celle</h3>
            <label className="mb-3 block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Ziel (frei eingeben oder wählen)</span>
              <input list="zugziele" value={zugText} onChange={(e) => setZugText(e.target.value)} placeholder="z. B. Paris" className={inputCls} />
              <datalist id="zugziele">{ZUG_ZIELE.map((z) => <option key={z} value={z} />)}</datalist>
            </label>
            <div className="space-y-2">
              <button onClick={() => openBahn("Celle", zugText, start)} disabled={!zugText.trim()} className={linkCls + " w-full disabled:opacity-50"}><span className={inner}><Train className="h-4 w-4 text-emerald-600" /> DB Hinfahrt: Celle → {zugText || "Ziel"} · {fmt(start)}</span><ExternalLink className="h-4 w-4 text-stone-400" /></button>
              <button onClick={() => openBahn(zugText, "Celle", effEnd)} disabled={!zugText.trim()} className={linkCls + " w-full disabled:opacity-50"}><span className={inner}><Train className="h-4 w-4 text-emerald-600" /> DB Rückfahrt: {zugText || "Ziel"} → Celle · {fmt(effEnd)}</span><ExternalLink className="h-4 w-4 text-stone-400" /></button>
              <a href="https://www.flixtrain.de/" target="_blank" rel="noreferrer" className={linkCls}><span className={inner}><Train className="h-4 w-4 text-emerald-600" /> FlixTrain / FlixBus</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
            </div>
            <p className="mt-3 text-xs text-stone-400">DB öffnet die Verbindung mit dem günstigsten Sparpreis. FlixTrain deckt nur bestimmte Strecken ab – dort Ziel und Datum eingeben.</p>
          </section>
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Öffnet die DB statt der Verbindung nur die Startseite, sag Bescheid – dann stelle ich die Zugsuche auf einen anderen Anbieter um.</span>
          </div>
        </>
      )}

      <p className="text-center text-xs text-stone-400">Preise und Verfügbarkeit immer auf der geöffneten Seite prüfen.</p>
    </div>
  );
}
