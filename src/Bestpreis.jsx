import React, { useState, useEffect } from "react";
import { Plane, Train, Search, ExternalLink, Globe2, Sparkles, Info, CalendarDays, Sun, Tag, Check, X } from "lucide-react";
import { db } from "./db.js";

/* ─── Datum & Helfer (alles lokal, keine externen Daten) ─── */
const isValidISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const yymmdd = (iso) => (isValidISO(iso) ? iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10) : "");
const fmt = (iso) => { if (!isValidISO(iso)) return ""; const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }); };
const fmtKurz = (iso) => { const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }); };
const wochentag = (iso) => new Date(iso + "T00:00:00Z").getUTCDay(); // 0=So .. 6=Sa
const tagNr = (iso) => new Date(iso + "T00:00:00Z").getUTCDate();
const monatName = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { month: "long", year: "numeric" });

/* Feiertage rein rechnerisch (Gauß/Osterformel) – keine externe Quelle nötig */
function ostersonntag(jahr) {
  const a = jahr % 19, b = Math.floor(jahr / 100), c = jahr % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}
function feiertage(jahr) {
  const o = ostersonntag(jahr);
  const map = {};
  const setz = (iso, name) => { map[iso] = name; };
  setz(`${jahr}-01-01`, "Neujahr");
  setz(addDays(o, -2), "Karfreitag");
  setz(addDays(o, 1), "Ostermontag");
  setz(`${jahr}-05-01`, "Tag der Arbeit");
  setz(addDays(o, 39), "Christi Himmelfahrt");
  setz(addDays(o, 50), "Pfingstmontag");
  setz(`${jahr}-10-03`, "Tag der Dt. Einheit");
  setz(`${jahr}-10-31`, "Reformationstag");
  setz(`${jahr}-12-25`, "1. Weihnachtstag");
  setz(`${jahr}-12-26`, "2. Weihnachtstag");
  return map;
}
const feiertagName = (iso) => feiertage(Number(iso.slice(0, 4)))[iso] || null;

/* ─── Ziele ─── */
const FLUG_ZIELE = [
  { iata: "cdg", label: "Paris" }, { iata: "ams", label: "Amsterdam" }, { iata: "bcn", label: "Barcelona" },
  { iata: "mad", label: "Madrid" }, { iata: "fco", label: "Rom" }, { iata: "mxp", label: "Mailand" },
  { iata: "vie", label: "Wien" }, { iata: "zrh", label: "Zürich" }, { iata: "prg", label: "Prag" },
  { iata: "cph", label: "Kopenhagen" }, { iata: "lis", label: "Lissabon" }, { iata: "opo", label: "Porto" },
  { iata: "lhr", label: "London" }, { iata: "pmi", label: "Palma de Mallorca" }, { iata: "nce", label: "Nizza" },
  { iata: "vce", label: "Venedig" }, { iata: "ath", label: "Athen" }, { iata: "bud", label: "Budapest" },
  { iata: "dub", label: "Dublin" }, { iata: "arn", label: "Stockholm" }, { iata: "osl", label: "Oslo" },
  { iata: "ist", label: "Istanbul" }, { iata: "agp", label: "Málaga" }, { iata: "fao", label: "Faro" },
  { iata: "tfs", label: "Teneriffa" }, { iata: "lpa", label: "Gran Canaria" },
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

/* ─── Deep-Links (öffnen die Suche beim Anbieter, keine Daten von dir) ─── */
const kayak = (iata, o, r) => `https://www.kayak.de/flights/HAJ-${iata.toUpperCase()}/${o}/${r}?sort=price_a`;
const skyDest = (iata, o, r) => `https://www.skyscanner.de/transport/fluge/haj/${iata}/${yymmdd(o)}/${yymmdd(r)}/`;
const skyEverywhereMonat = (jahrMonat) => `https://www.skyscanner.net/transport/flights/haj/everywhere/${jahrMonat}/`;
const googleFlights = (text, o, r) => "https://www.google.com/travel/flights?q=" + encodeURIComponent(`Flug Hannover nach ${text} ${o} zurück ${r}`);

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

/* ─── Preisgedächtnis: nur lokal in IndexedDB ─── */
const PREIS_KEY = "preisnotizen";
async function ladePreise() {
  try { const r = await db.kv.get(PREIS_KEY); return (r && r.value) || {}; } catch (e) { return {}; }
}
async function speicherePreise(obj) {
  try { await db.kv.put({ key: PREIS_KEY, value: obj }); } catch (e) {}
}
const preisKey = (mode, ziel, datum) => `${mode}|${(ziel || "").toLowerCase()}|${datum}`;

/* ─── Styles ─── */
const linkCls = "flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800";
const inner = "inline-flex items-center gap-2";
const inputCls = "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none";

export default function Bestpreis() {
  const [tab, setTab] = useState("suche");
  const [mode, setMode] = useState("flug");
  const [flugText, setFlugText] = useState("Rom");
  const [zugText, setZugText] = useState("Paris");
  const [preise, setPreise] = useState({});

  useEffect(() => { ladePreise().then(setPreise); }, []);
  const setzePreis = async (key, wert) => {
    const next = { ...preise };
    if (wert == null || wert === "") delete next[key]; else next[key] = Number(wert);
    setPreise(next); await speicherePreise(next);
  };

  const ziel = mode === "flug" ? flugText : zugText;
  const tabs = [
    { key: "suche", label: "Suche", icon: Search },
    { key: "kalender", label: "Kalender", icon: CalendarDays },
    { key: "wochenende", label: "Wochenende", icon: Sun },
  ];

  return (
    <div className="space-y-4">
      <header>
        <div className="mb-1 flex items-center gap-2 text-emerald-700"><Sparkles className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-widest">Günstig reisen</span></div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Bestpreis-Suche</h1>
        <p className="mt-1 text-sm text-stone-500">Flug ab Hannover, Zug ab Celle. Nächste 4 Wochen.</p>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
        <button onClick={() => setMode("flug")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${mode === "flug" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><Plane className="h-4 w-4" /> Flug</button>
        <button onClick={() => setMode("zug")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${mode === "zug" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><Train className="h-4 w-4" /> Zug</button>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Ziel (frei eingeben oder wählen)</span>
          {mode === "flug" ? (
            <>
              <input list="flugziele" value={flugText} onChange={(e) => setFlugText(e.target.value)} placeholder="z. B. Rom oder FCO" className={inputCls} />
              <datalist id="flugziele">{FLUG_ZIELE.map((z) => <option key={z.iata} value={z.label} />)}</datalist>
            </>
          ) : (
            <>
              <input list="zugziele" value={zugText} onChange={(e) => setZugText(e.target.value)} placeholder="z. B. Paris" className={inputCls} />
              <datalist id="zugziele">{ZUG_ZIELE.map((z) => <option key={z} value={z} />)}</datalist>
            </>
          )}
        </label>
      </section>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
        {tabs.map((t) => { const I = t.icon; const a = tab === t.key; return (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition ${a ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><I className="h-4 w-4" /> {t.label}</button>
        ); })}
      </div>

      {tab === "suche" && <SucheView mode={mode} ziel={ziel} />}
      {tab === "kalender" && <KalenderView mode={mode} ziel={ziel} preise={preise} setzePreis={setzePreis} />}
      {tab === "wochenende" && <WochenendeView mode={mode} ziel={ziel} preise={preise} />}

      <p className="text-center text-xs text-stone-400">Preise immer auf der geöffneten Seite prüfen · Notierte Preise bleiben nur auf diesem Gerät.</p>
    </div>
  );
}

/* ─── 1) Suche ─── */
function SucheView({ mode, ziel }) {
  const [start, setStart] = useState(() => addDays(todayISO(), 30));
  const [end, setEnd] = useState(() => addDays(todayISO(), 34));
  const gueltig = isValidISO(start) && isValidISO(end) && end > start;
  const effEnd = gueltig ? end : addDays(start, 4);
  const iata = resolveIata(ziel);
  const monat = start.slice(0, 7);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Hinreise</span><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Rückreise</span><input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={inputCls} /></label>
        </div>
        {!gueltig && <p className="mt-2 text-xs text-rose-500">Rückreise muss nach der Hinreise liegen.</p>}
      </section>

      {mode === "flug" ? (
        <>
          <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <h3 className="mb-1 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Globe2 className="h-4 w-4 text-emerald-700" /> Billigste Ziele ab Hannover</h3>
            <p className="mb-3 text-xs text-stone-500">Skyscanner „Überallhin" für {monatName(start)} – alle Ziele nach Preis sortiert.</p>
            <a href={skyEverywhereMonat(monat)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"><Search className="h-4 w-4" /> Günstigste Ziele im {monatName(start).split(" ")[0]}</a>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-800">Mit Strecke & Datum</h3>
            <div className="space-y-2">
              {iata && <a href={kayak(iata, start, effEnd)} target="_blank" rel="noreferrer" className={linkCls}><span className={inner}><Plane className="h-4 w-4 text-emerald-600" /> Kayak → {ziel} · {fmt(start)}–{fmt(effEnd)}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>}
              {iata && <a href={skyDest(iata, start, effEnd)} target="_blank" rel="noreferrer" className={linkCls}><span className={inner}><Plane className="h-4 w-4 text-emerald-600" /> Skyscanner → {ziel}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>}
              <a href={googleFlights(ziel, start, effEnd)} target="_blank" rel="noreferrer" className={linkCls}><span className={inner}><Plane className="h-4 w-4 text-emerald-600" /> Google Flights → {ziel || "Ziel"}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
            </div>
            {!iata && ziel.trim() && <p className="mt-2 text-xs text-stone-400">Für Kayak/Skyscanner ein Ziel aus der Liste wählen oder das Flughafen-Kürzel eingeben (z. B. FCO).</p>}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-800">Airlines & Portale</h3>
            <div className="space-y-2">{FLUG_PORTALE.map((p) => <a key={p.key} href={p.url} target="_blank" rel="noreferrer" className={linkCls}><span className={inner}><Plane className="h-4 w-4 text-emerald-600" /> {p.label}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>)}</div>
            <p className="mt-3 text-xs text-stone-400">Öffnen die Buchungsseite – Strecke und Datum dort eingeben.</p>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Train className="h-4 w-4 text-emerald-700" /> Zugreise ab Celle</h3>
          <div className="space-y-2">
            <button onClick={() => openBahn("Celle", ziel, start)} disabled={!ziel.trim()} className={linkCls + " w-full disabled:opacity-50"}><span className={inner}><Train className="h-4 w-4 text-emerald-600" /> DB Hinfahrt: Celle → {ziel || "Ziel"} · {fmt(start)}</span><ExternalLink className="h-4 w-4 text-stone-400" /></button>
            <button onClick={() => openBahn(ziel, "Celle", effEnd)} disabled={!ziel.trim()} className={linkCls + " w-full disabled:opacity-50"}><span className={inner}><Train className="h-4 w-4 text-emerald-600" /> DB Rückfahrt: {ziel || "Ziel"} → Celle · {fmt(effEnd)}</span><ExternalLink className="h-4 w-4 text-stone-400" /></button>
            <a href="https://www.flixtrain.de/" target="_blank" rel="noreferrer" className={linkCls}><span className={inner}><Train className="h-4 w-4 text-emerald-600" /> FlixTrain / FlixBus</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── 2) Kalender-Heatmap (4 Wochen) ─── */
function KalenderView({ mode, ziel, preise, setzePreis }) {
  const [notiz, setNotiz] = useState(null); // Datum, für das ein Preis eingetragen wird
  const [wert, setWert] = useState("");
  const start = todayISO();
  const tage = Array.from({ length: 28 }, (_, i) => addDays(start, i));

  const werte = tage.map((t) => preise[preisKey(mode, ziel, t)]).filter((v) => typeof v === "number");
  const min = werte.length ? Math.min(...werte) : null;
  const max = werte.length ? Math.max(...werte) : null;

  const farbe = (p) => {
    if (typeof p !== "number") return "bg-white text-stone-600";
    if (min === max) return "bg-emerald-600 text-white";
    const q = (p - min) / (max - min);
    if (q <= 0.25) return "bg-emerald-600 text-white";
    if (q <= 0.5) return "bg-emerald-300 text-emerald-900";
    if (q <= 0.75) return "bg-amber-300 text-amber-900";
    return "bg-rose-300 text-rose-900";
  };

  const oeffne = (tag) => {
    if (!ziel.trim()) return;
    if (mode === "zug") { openBahn("Celle", ziel, tag); return; }
    const iata = resolveIata(ziel);
    const rueck = addDays(tag, 4);
    window.open(iata ? kayak(iata, tag, rueck) : googleFlights(ziel, tag, rueck), "_blank");
  };

  const speichern = async () => { await setzePreis(preisKey(mode, ziel, notiz), wert); setNotiz(null); setWert(""); };

  // Führende Leerfelder, damit Montag links steht
  const ersterWt = (wochentag(tage[0]) + 6) % 7;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Tag antippen öffnet die Suche für dieses Datum. Gefundene Preise kannst du notieren – der Kalender färbt sich dann nach <strong>deinen</strong> Preisen. Alles bleibt auf dem Gerät.</span>
      </div>

      {!ziel.trim() && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Bitte oben ein Ziel eingeben.</p>}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-stone-800">{ziel || "Ziel"} · nächste 4 Wochen</h3>
          {min != null && <span className="text-xs text-stone-500">ab {min} €</span>}
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-stone-400">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: ersterWt }).map((_, i) => <span key={"l" + i} />)}
          {tage.map((t) => {
            const p = preise[preisKey(mode, ziel, t)];
            const ft = feiertagName(t);
            const we = wochentag(t) === 0 || wochentag(t) === 6;
            return (
              <button key={t} onClick={() => oeffne(t)} onContextMenu={(e) => { e.preventDefault(); setNotiz(t); setWert(p != null ? String(p) : ""); }}
                className={`flex h-14 flex-col items-center justify-center rounded-lg border text-xs transition ${farbe(p)} ${we ? "border-emerald-300" : "border-stone-200"} hover:border-emerald-400`}>
                <span className="font-semibold">{tagNr(t)}</span>
                {typeof p === "number" ? <span className="text-xs">{p}€</span> : ft ? <span className="text-xs text-rose-500">FT</span> : null}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-600" /> günstig</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-amber-300" /> mittel</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-rose-300" /> teuer</span>
          <span className="ml-auto text-stone-400">FT = Feiertag</span>
        </div>
        <p className="mt-2 text-xs text-stone-400">Preis notieren: Tag lange drücken bzw. rechtsklicken. Oder unten auswählen.</p>
        <div className="mt-2 flex items-center gap-2">
          <select value={notiz || ""} onChange={(e) => { setNotiz(e.target.value || null); const p = preise[preisKey(mode, ziel, e.target.value)]; setWert(p != null ? String(p) : ""); }} className={inputCls}>
            <option value="">Preis für Tag notieren …</option>
            {tage.map((t) => <option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </div>
      </section>

      {notiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setNotiz(null)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-stone-900">Preis am {fmtKurz(notiz)}</h4>
              <button onClick={() => setNotiz(null)} aria-label="Schließen"><X className="h-5 w-5 text-stone-400" /></button>
            </div>
            <p className="mb-2 text-xs text-stone-500">{ziel} · {mode === "flug" ? "Flug ab Hannover" : "Zug ab Celle"}</p>
            <input type="number" inputMode="decimal" autoFocus value={wert} onChange={(e) => setWert(e.target.value)} placeholder="z. B. 89" className={inputCls} />
            <div className="mt-3 flex gap-2">
              <button onClick={speichern} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"><Check className="h-4 w-4" /> Speichern</button>
              <button onClick={() => { setzePreis(preisKey(mode, ziel, notiz), ""); setNotiz(null); }} className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:border-rose-300 hover:text-rose-600">Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 3) Wochenend-Trips (inkl. Brückentage) ─── */
function WochenendeView({ mode, ziel, preise }) {
  const start = todayISO();
  const tage = Array.from({ length: 28 }, (_, i) => addDays(start, i));
  const freitage = tage.filter((t) => wochentag(t) === 5);

  const trips = freitage.map((fr) => {
    const so = addDays(fr, 2);
    const mo = addDays(fr, 3);
    const do_ = addDays(fr, -1);
    const moFeiertag = feiertagName(mo);
    const frFeiertag = feiertagName(fr);
    const ende = moFeiertag ? mo : so;
    const beginn = frFeiertag ? do_ : fr;
    const naechte = Math.round((new Date(ende + "T00:00:00Z") - new Date(beginn + "T00:00:00Z")) / 86400000);
    const anlass = moFeiertag ? `langes Wochenende (${moFeiertag})` : frFeiertag ? `langes Wochenende (${frFeiertag})` : "Wochenende";
    return { beginn, ende, naechte, anlass, lang: Boolean(moFeiertag || frFeiertag) };
  });

  const oeffnen = (t) => {
    if (!ziel.trim()) return;
    if (mode === "zug") { openBahn("Celle", ziel, t.beginn); return; }
    const iata = resolveIata(ziel);
    window.open(iata ? kayak(iata, t.beginn, t.ende) : googleFlights(ziel, t.beginn, t.ende), "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Alle Wochenenden der nächsten 4 Wochen – lange Wochenenden durch Feiertage sind markiert. Antippen öffnet die Suche.</span>
      </div>

      {!ziel.trim() && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Bitte oben ein Ziel eingeben.</p>}

      <div className="space-y-2">
        {trips.map((t) => {
          const p = preise[preisKey(mode, ziel, t.beginn)];
          return (
            <button key={t.beginn} onClick={() => oeffnen(t)} disabled={!ziel.trim()} className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition disabled:opacity-50 ${t.lang ? "border-emerald-300" : "border-stone-200"} hover:border-emerald-400`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900">{fmtKurz(t.beginn)} – {fmtKurz(t.ende)}</p>
                  <p className="mt-0.5 text-xs text-stone-500">{t.naechte} Nächte · {t.anlass}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {t.lang && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">lang</span>}
                  {typeof p === "number" && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"><Tag className="h-3 w-3" />{p} €</span>}
                  <ExternalLink className="h-4 w-4 text-stone-400" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-stone-400">Feiertage sind bundesweite Termine plus Reformationstag (Niedersachsen), rechnerisch ermittelt.</p>
    </div>
  );
}
