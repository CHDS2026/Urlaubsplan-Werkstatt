/*
  Wochentipps.jsx — Wochen-Kalender mit Tipps ab Celle (+ direkt Reise planen)
  ---------------------------------------------------------------------------
  Nächste Wochen bis Ende 2027. Pro Woche: MotoGP-Highlights (2026 offiziell,
  2027 VORLÄUFIG), Schul-/Feiertage LIVE (OpenHolidays DE-NI), Saison-Tipp.
  Jeder Tipp hat einen "Planen"-Knopf -> erstellt direkt eine Reise (Datum, Ort,
  Anreise-Hinweis vorbefüllt) über onCreateTrip.
  Anreise nach Vorgaben: Auto ≤ 800 km; Direktflug nur EU ab HAJ; Direktzug nur ab Hannover.
  Keine erfundenen Fahrzeiten. Gratis, ohne Schlüssel.

  EINBAU: <Wochentipps onCreateTrip={createTripFromSuggestion} />
*/
import React, { useState, useEffect } from "react";
import { CalendarRange, Flag, Loader2, Info, Sparkles, CalendarDays, ExternalLink, CalendarPlus } from "lucide-react";

const enc = encodeURIComponent;
async function jget(url, ms = 15000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try { const r = await fetch(url, { signal: ctrl.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
const isoD = (d) => d.toISOString().slice(0, 10);
const fmtDM = (d) => String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0");
function mondayOf(dd) { const x = new Date(dd); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
function addDays(dd, n) { const x = new Date(dd); x.setDate(x.getDate() + n); return x; }
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const fd = (firstThu.getUTCDay() + 6) % 7; firstThu.setUTCDate(firstThu.getUTCDate() - fd + 3);
  return 1 + Math.round((d - firstThu) / (7 * 86400000));
}
const mapsDir = (place) => "https://www.google.com/maps/dir/?api=1&origin=" + enc("Celle") + "&destination=" + enc(place);

const CIRCUITS = {
  mugello:     { title: "MotoGP Italien – Mugello",        ort: "Mugello", mode: null,   note: "über 800 km, kein Direktflug ab HAJ – aufwändig" },
  balaton:     { title: "MotoGP Ungarn – Balaton Park",    ort: "Balatonfüred", mode: null, note: "über 800 km, kein Direktflug/-zug – aufwändig" },
  brno:        { title: "MotoGP Tschechien – Brünn",       ort: "Brünn", mode: "auto", note: "mit dem Auto (unter 800 km)" },
  assen:       { title: "MotoGP Dutch TT – Assen",         ort: "Assen", mode: "auto", note: "nah – ideal mit dem Auto ab Celle" },
  sachsenring: { title: "MotoGP Deutschland – Sachsenring", ort: "Hohenstein-Ernstthal", mode: "auto", note: "nah – ideal mit dem Auto" },
  silverstone: { title: "MotoGP Großbritannien – Silverstone", ort: "Silverstone", mode: null, note: "UK (außerhalb EU), kein Direktflug-Ziel – aufwändig" },
  aragon:      { title: "MotoGP Aragón",                   ort: "Alcañiz", mode: null,   note: "über 800 km, kein Direktflug ab HAJ – aufwändig" },
  misano:      { title: "MotoGP San Marino – Misano",      ort: "Misano", mode: null,   note: "über 800 km, kein Direktflug ab HAJ – aufwändig" },
  spielberg:   { title: "MotoGP Österreich – Red Bull Ring", ort: "Spielberg", mode: "auto", note: "lange Fahrt, grob an der 800-km-Grenze" },
};
const RENNEN = [
  { c: "mugello", start: "2026-05-29", end: "2026-05-31" }, { c: "balaton", start: "2026-06-05", end: "2026-06-07" },
  { c: "brno", start: "2026-06-19", end: "2026-06-21" }, { c: "assen", start: "2026-06-26", end: "2026-06-28" },
  { c: "sachsenring", start: "2026-07-10", end: "2026-07-12" }, { c: "silverstone", start: "2026-08-07", end: "2026-08-09" },
  { c: "aragon", start: "2026-08-28", end: "2026-08-30" }, { c: "misano", start: "2026-09-11", end: "2026-09-13" },
  { c: "spielberg", start: "2026-09-18", end: "2026-09-20" },
  { c: "mugello", start: "2027-05-28", end: "2027-05-30", v: true }, { c: "balaton", start: "2027-06-04", end: "2027-06-06", v: true },
  { c: "brno", start: "2027-06-18", end: "2027-06-20", v: true }, { c: "assen", start: "2027-06-25", end: "2027-06-27", v: true },
  { c: "sachsenring", start: "2027-07-09", end: "2027-07-11", v: true }, { c: "silverstone", start: "2027-08-06", end: "2027-08-08", v: true },
  { c: "aragon", start: "2027-08-27", end: "2027-08-29", v: true }, { c: "misano", start: "2027-09-10", end: "2027-09-12", v: true },
  { c: "spielberg", start: "2027-09-17", end: "2027-09-19", v: true },
];
const EVENTS = RENNEN.map((r) => ({ ...CIRCUITS[r.c], start: r.start, end: r.end, vorlaeufig: !!r.v }));

const SEASON = {
  1: { title: "Skisaison in den Alpen", place: "Tirol / Südtirol", mode: "auto" }, 2: { title: "Ski & Winterwandern", place: "Alpen", mode: "auto" },
  3: { title: "Städtetrip vor der Saison", place: "Prag / Wien", mode: "zug" }, 4: { title: "Frühling am See", place: "Gardasee / Südtirol", mode: "auto" },
  5: { title: "Alpen-Roadtrip", place: "Dolomiten", mode: "auto" }, 6: { title: "Lange Tage & Lavendel", place: "Provence / Skandinavien", mode: "auto" },
  7: { title: "Bergseen & Küste", place: "Kärnten / Kroatien", mode: "auto" }, 8: { title: "Norden & Alpen", place: "Norwegen / Tirol", mode: "flug" },
  9: { title: "Weinlese & Toskana", place: "Toskana / Südtirol", mode: "auto" }, 10: { title: "Indian Summer", place: "Harz / Alpen", mode: "auto" },
  11: { title: "Therme & Städtetrip", place: "Budapest / Wien", mode: "flug" }, 12: { title: "Weihnachtsmärkte & Ski", place: "Nürnberg / Wien / Alpen", mode: "zug" },
};

function holName(h) { const a = h.name; if (Array.isArray(a) && a.length) return a[0].text; return h.name || "Feiertag"; }

export default function Wochentipps({ onCreateTrip }) {
  const [hol, setHol] = useState({ loading: true, pub: [], school: [] });
  const [onlyHi, setOnlyHi] = useState(true);

  useEffect(() => {
    const from = isoD(new Date()); const to = "2027-12-31";
    const base = "https://openholidaysapi.org";
    const p = `${base}/PublicHolidays?countryIsoCode=DE&languageIsoCode=DE&validFrom=${from}&validTo=${to}&subdivisionCode=DE-NI`;
    const sc = `${base}/SchoolHolidays?countryIsoCode=DE&languageIsoCode=DE&validFrom=${from}&validTo=${to}&subdivisionCode=DE-NI`;
    Promise.allSettled([jget(p), jget(sc)]).then(([a, b]) => {
      setHol({ loading: false, pub: a.status === "fulfilled" && Array.isArray(a.value) ? a.value : [], school: b.status === "fulfilled" && Array.isArray(b.value) ? b.value : [] });
    }).catch(() => setHol({ loading: false, pub: [], school: [] }));
  }, []);

  const MON = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const ENDE = new Date("2027-12-31T00:00:00");
  const weeks = [];
  const mon0 = mondayOf(new Date());
  for (let i = 0; i < 130; i++) {
    const mon = addDays(mon0, i * 7);
    if (mon > ENDE) break;
    const sun = addDays(mon, 6);
    const a = isoD(mon), b = isoD(sun);
    const events = EVENTS.filter((e) => e.start <= b && e.end >= a);
    const pubs = hol.pub.filter((h) => (h.startDate || "") >= a && (h.startDate || "") <= b);
    const ferien = hol.school.filter((h) => (h.startDate || "") <= b && (h.endDate || "") >= a);
    const ferienNeu = hol.school.filter((h) => (h.startDate || "") >= a && (h.startDate || "") <= b);
    const hi = events.length > 0 || pubs.length > 0 || ferienNeu.length > 0;
    weeks.push({ mon, sun, kw: isoWeek(mon), a, b, events, pubs, ferien, hi, season: SEASON[mon.getMonth() + 1], monat: mon.getMonth(), jahr: mon.getFullYear() });
  }
  const shown = weeks.filter((w) => !onlyHi || w.hi);
  let lastKey = "";
  shown.forEach((w) => { const k = w.jahr + "-" + w.monat; w.header = k !== lastKey ? MON[w.monat] + " " + w.jahr : null; lastKey = k; });
  const hiCount = weeks.filter((w) => w.hi).length;
  const chip = (on) => "rounded-full px-3 py-1.5 text-xs font-medium transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300");

  const shiftISO = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const planEvent = (e) => {
    const art = e.mode === "auto" ? "auto" : "flug";
    onCreateTrip && onCreateTrip({ name: e.title, gebiet: e.ort, info: "Anreise: " + e.note + " · inkl. Puffertage (Do–Mo)" + (e.vorlaeufig ? " · Termin 2027 noch vorläufig" : ""), start: shiftISO(e.start, -1), end: shiftISO(e.end, 1), anreiseart: art, von: art === "auto" ? "Celle" : "Hannover", nach: e.ort });
  };
  const planSeason = (w) => {
    const art = w.season.mode || "auto";
    onCreateTrip && onCreateTrip({ name: w.season.title, gebiet: w.season.place, info: "Saison-Tipp ab Celle", start: w.a, end: w.b, anreiseart: art, von: art === "auto" ? "Celle" : "Hannover", nach: w.season.place });
  };
  const PlanBtn = ({ onClick }) => (
    <button onClick={onClick} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-2 py-1 text-xs font-semibold text-white transition hover:bg-emerald-800"><CalendarPlus className="h-3.5 w-3.5" /> Planen</button>
  );

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100"><CalendarRange className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Wochen-Tipps</div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Was lohnt sich wann ab Celle – bis Ende 2027. „Planen" erstellt direkt eine Reise mit Datum & Ort. Anreise nach deinen Vorgaben (Auto ≤ 800 km, Direktflug nur EU ab HAJ, Direktzug nur ab Hannover).</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Zeigen:</span>
        <button onClick={() => setOnlyHi(true)} className={chip(onlyHi)}>Nur Highlights{hiCount ? " (" + hiCount + ")" : ""}</button>
        <button onClick={() => setOnlyHi(false)} className={chip(!onlyHi)}>Alle Wochen</button>
      </div>

      {hol.loading && <div className="mt-3 flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Ferien & Feiertage werden geladen …</div>}

      <div className="mt-3 space-y-2">
        {shown.map((w) => (
          <React.Fragment key={w.a}>
            {w.header && <div className="pt-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">{w.header}</div>}
            <div className={"rounded-xl border p-3 " + (w.hi ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950" : "border-stone-200 dark:border-stone-700")}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-bold text-stone-800 dark:text-stone-100">KW {w.kw}</span>
                <span className="text-xs text-stone-500 dark:text-stone-400">{fmtDM(w.mon)}–{fmtDM(w.sun)}</span>
              </div>
              <div className="space-y-1.5">
                {w.events.map((e, i) => (
                  <div key={"e" + i} className="flex items-start gap-2 text-sm">
                    <Flag className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-stone-800 dark:text-stone-100">{e.title}</span>
                      {e.vorlaeufig && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">vorläufig</span>}
                      <span className="block text-xs text-stone-500 dark:text-stone-400">{e.note}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {e.mode === "auto" && <a href={mapsDir(e.ort)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">Route <ExternalLink className="h-3 w-3" /></a>}
                      {onCreateTrip && <PlanBtn onClick={() => planEvent(e)} />}
                    </span>
                  </div>
                ))}
                {w.pubs.map((h, i) => (
                  <div key={"p" + i} className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 shrink-0 text-rose-500" />
                    <span className="text-stone-700 dark:text-stone-200">Feiertag: {holName(h)} <span className="text-stone-400 dark:text-stone-500">– langes Wochenende möglich</span></span>
                  </div>
                ))}
                {w.ferien.map((h, i) => (
                  <div key={"f" + i} className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="text-stone-700 dark:text-stone-200">{holName(h)} <span className="text-stone-400 dark:text-stone-500">(NI-Schulferien)</span></span>
                  </div>
                ))}
                {w.season && (
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
                    <span className="min-w-0 flex-1 text-stone-500 dark:text-stone-400"><span className="font-medium text-stone-600 dark:text-stone-300">Saison-Tipp:</span> {w.season.title} <span className="text-stone-400 dark:text-stone-500">· {w.season.place}</span></span>
                    {onCreateTrip && <PlanBtn onClick={() => planSeason(w)} />}
                  </div>
                )}
              </div>
            </div>
          </React.Fragment>
        ))}
        {shown.length === 0 && !hol.loading && <div className="rounded-xl bg-stone-50 px-3 py-3 text-sm text-stone-500 dark:bg-stone-800 dark:text-stone-400">Keine Highlights im Zeitraum – auf „Alle Wochen" umschalten.</div>}
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Bis Ende 2027. MotoGP 2026 offiziell, <b>2027 vorläufig</b> (offizieller Kalender noch nicht veröffentlicht). Anreise: Auto nur bis ~800 km; Direktflüge nur EU ab HAJ, Direktzüge nur ab Hannover – bei diesen Rennstrecken meist keine Direktverbindung. Ferien/Feiertage live (OpenHolidays). „Planen" legt eine Reise mit vorbefülltem Datum/Ort an. Ohne Gewähr.</span></div>
    </section>
  );
}
