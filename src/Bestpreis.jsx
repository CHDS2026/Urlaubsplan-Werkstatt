import React, { useState } from "react";
import { Plane, Train, Search, ExternalLink, Globe2, Sparkles, ArrowRight, Info } from "lucide-react";

/* kleine Helfer */
const isValidISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
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

/* URL-Bauer */
const skyEverywhere = (o, r) => (isValidISO(o) && isValidISO(r))
  ? `https://www.skyscanner.net/transport/flights/haj/everywhere/${yymmdd(o)}/${yymmdd(r)}/`
  : "https://www.skyscanner.net/transport/flights/haj/everywhere/";
const skyDest = (iata, o, r) => (isValidISO(o) && isValidISO(r))
  ? `https://www.skyscanner.de/transport/fluge/haj/${iata}/${yymmdd(o)}/${yymmdd(r)}/?preferdirects=true&adultsv2=1`
  : `https://www.skyscanner.de/transport/fluge/haj/${iata}/`;
const googleFlights = (label, o, r) => "https://www.google.com/travel/flights?q=" + encodeURIComponent(`Flüge von Hannover nach ${label}${isValidISO(o) ? " am " + o : ""}${isValidISO(r) ? " zurück " + r : ""}`);
const bahn = (city, o) => "https://www.bahn.de/buchung/fahrplan/suche#soid=O=Celle&zoid=O=" + encodeURIComponent(city) + (isValidISO(o) ? "&hd=" + o + "T08:00:00&hza=D" : "");

const linkCls = "flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800";

export default function Bestpreis() {
  const [mode, setMode] = useState("flug");
  const [out, setOut] = useState("");
  const [len, setLen] = useState(4);
  const [flugZiel, setFlugZiel] = useState("cdg");
  const [zugZiel, setZugZiel] = useState("Paris");

  const ret = isValidISO(out) ? addDays(out, len) : "";
  const flug = FLUG_ZIELE.find((z) => z.iata === flugZiel) || FLUG_ZIELE[0];

  return (
    <div className="space-y-4">
      <header>
        <div className="mb-1 flex items-center gap-2 text-emerald-700"><Sparkles className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-widest">Günstig reisen</span></div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Bestpreis-Suche</h1>
        <p className="mt-1 text-sm text-stone-500">Kurztrips ins Ausland – Flug ab Hannover, Zug ab Celle. Die günstigsten Reisen findet die jeweilige Suche für dich.</p>
      </header>

      <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Kostenfrei: Auf „Suchen" öffnet sich die vorausgefüllte Suche bei Skyscanner/Google Flights bzw. der Bahn – dort läuft die eigentliche Bestpreis-Suche.</span>
      </div>

      {/* Modus */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
        <button onClick={() => setMode("flug")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${mode === "flug" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><Plane className="h-4 w-4" /> Flug</button>
        <button onClick={() => setMode("zug")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${mode === "zug" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><Train className="h-4 w-4" /> Zug</button>
      </div>

      {/* Reisezeitraum */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Abreise</span><input type="date" value={out} onChange={(e) => setOut(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Dauer</span>
            <select value={len} onChange={(e) => setLen(Number(e.target.value))} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none">
              <option value={3}>3 Tage</option><option value={4}>4 Tage</option><option value={5}>5 Tage</option>
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-stone-500">{isValidISO(out) ? <>Rückreise: <span className="font-semibold text-stone-700">{fmt(ret)}</span> · Hin und zurück {len} Tage auseinander.</> : "Abreisedatum wählen (oder bei Flügen ohne Datum die günstigsten Ziele suchen)."}</p>
      </section>

      {mode === "flug" ? (
        <>
          <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <h3 className="mb-1 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Globe2 className="h-4 w-4 text-emerald-700" /> Günstigste Ziele finden</h3>
            <p className="mb-3 text-xs text-stone-500">Zeigt ab Hannover alle Ziele nach Preis sortiert („Überallhin"). Ohne Datum wählst du dort den günstigsten Monat.</p>
            <a href={skyEverywhere(out, ret)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"><Search className="h-4 w-4" /> Günstigste Flüge ab Hannover suchen</a>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-800">Gezieltes Ziel</h3>
            <label className="mb-3 block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Ziel (Ausland)</span>
              <select value={flugZiel} onChange={(e) => setFlugZiel(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none">
                {FLUG_ZIELE.map((z) => <option key={z.iata} value={z.iata}>{z.label} ({z.iata.toUpperCase()})</option>)}
              </select>
            </label>
            <div className="space-y-2">
              <a href={skyDest(flug.iata, out, ret)} target="_blank" rel="noreferrer" className={linkCls}><span className="inline-flex items-center gap-2"><Plane className="h-4 w-4 text-emerald-600" /> Skyscanner: Hannover → {flug.label}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
              <a href={googleFlights(flug.label, out, ret)} target="_blank" rel="noreferrer" className={linkCls}><span className="inline-flex items-center gap-2"><Plane className="h-4 w-4 text-emerald-600" /> Google Flights: Hannover → {flug.label}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
            </div>
            <p className="mt-3 text-xs text-stone-400">Tipp: In der Suche links „Direkt" oder „max. 1 Stopp" filtern – Skyscanner öffnet bereits mit Direkt-Vorauswahl.</p>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Train className="h-4 w-4 text-emerald-700" /> Zugreise ab Celle</h3>
          <label className="mb-3 block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Ziel (Ausland)</span>
            <select value={zugZiel} onChange={(e) => setZugZiel(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none">
              {ZUG_ZIELE.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </label>
          <div className="space-y-2">
            <a href={bahn(zugZiel, out)} target="_blank" rel="noreferrer" className={linkCls}><span className="inline-flex items-center gap-2"><Train className="h-4 w-4 text-emerald-600" /> Bahn: Celle → {zugZiel}{isValidISO(out) ? " · " + fmt(out) : ""}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
            {isValidISO(ret) && <a href={"https://www.bahn.de/buchung/fahrplan/suche#soid=O=" + encodeURIComponent(zugZiel) + "&zoid=O=Celle&hd=" + ret + "T08:00:00&hza=D"} target="_blank" rel="noreferrer" className={linkCls}><span className="inline-flex items-center gap-2"><Train className="h-4 w-4 text-emerald-600" /> Rückfahrt: {zugZiel} → Celle · {fmt(ret)}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>}
          </div>
          <p className="mt-3 text-xs text-stone-400">Tipp: Auf bahn.de unter „Verbindungsoptionen" die maximalen Umstiege auf 1 setzen. Sparpreise sind kontingentiert – früh buchen lohnt.</p>
        </section>
      )}

      <p className="text-center text-xs text-stone-400">Preise und Verfügbarkeit immer auf der geöffneten Seite prüfen.</p>
    </div>
  );
}
