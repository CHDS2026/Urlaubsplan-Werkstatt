/*
  Wetterkarte.jsx — Deutschland-Wetterkarte, nächste 14 Tage (eigener Tab/Abschnitt)
  ---------------------------------------------------------------------------------
  Ein einziger Abruf für ~20 Städte über Open-Meteo (gratis, ohne Schlüssel).
  Temperatur farbcodiert + Wetter-Emoji, Tag-Regler (14 Tage) und Aktualisieren-Knopf.
  Datenschutzfreundlich: keine Geräte-Ortung, feste Städteliste.

  EINBAU: <Wetterkarte /> (keine Props nötig).
*/
import { useState, useEffect } from "react";
import { RefreshCw, Loader2, Info, ChevronLeft, ChevronRight, Thermometer } from "lucide-react";

const STAEDTE = [
  { n: "Flensburg", la: 54.78, lo: 9.44 }, { n: "Kiel", la: 54.32, lo: 10.14 },
  { n: "Rostock", la: 54.09, lo: 12.14 }, { n: "Hamburg", la: 53.55, lo: 10.00 },
  { n: "Bremen", la: 53.08, lo: 8.80 }, { n: "Berlin", la: 52.52, lo: 13.40 },
  { n: "Celle", la: 52.62, lo: 10.08, home: true }, { n: "Hannover", la: 52.37, lo: 9.74 },
  { n: "Magdeburg", la: 52.13, lo: 11.63 }, { n: "Münster", la: 51.96, lo: 7.63 },
  { n: "Dortmund", la: 51.51, lo: 7.47 }, { n: "Leipzig", la: 51.34, lo: 12.37 },
  { n: "Kassel", la: 51.31, lo: 9.50 }, { n: "Dresden", la: 51.05, lo: 13.74 },
  { n: "Köln", la: 50.94, lo: 6.96 }, { n: "Frankfurt", la: 50.11, lo: 8.68 },
  { n: "Trier", la: 49.76, lo: 6.64 }, { n: "Nürnberg", la: 49.45, lo: 11.08 },
  { n: "Stuttgart", la: 48.78, lo: 9.18 }, { n: "München", la: 48.14, lo: 11.58 },
  { n: "Freiburg", la: 47.99, lo: 7.84 },
];

const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
async function jget(url) { const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }
function emoji(code) {
  if (code == null) return "";
  if (code === 0) return "☀️"; if (code <= 2) return "🌤️"; if (code === 3) return "☁️";
  if (code <= 48) return "🌫️"; if (code <= 57) return "🌦️"; if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️"; if (code <= 82) return "🌦️"; if (code <= 86) return "🌨️"; return "⛈️";
}
function tcol(t) {
  if (t == null) return "#e5e7eb";
  if (t < 0) return "#4338ca"; if (t < 5) return "#2563eb"; if (t < 10) return "#0ea5e9";
  if (t < 15) return "#10b981"; if (t < 20) return "#84cc16"; if (t < 25) return "#f59e0b";
  if (t < 30) return "#f97316"; if (t < 35) return "#ef4444"; return "#b91c1c";
}
const darkText = (t) => t != null && t >= 12 && t < 27; // helle Flächen -> dunkle Schrift

// Projektion (Bounding-Box Deutschland)
const LA0 = 47.1, LA1 = 55.3, LO0 = 5.6, LO1 = 15.2;
const KX = Math.cos(51.2 * Math.PI / 180);
const S = 70, PAD = 34;
const XSPAN = (LO1 - LO0) * KX, YSPAN = (LA1 - LA0);
const VW = XSPAN * S + 2 * PAD, VH = YSPAN * S + 2 * PAD;
const px = (lo) => PAD + (lo - LO0) * KX * S;
const py = (la) => PAD + (LA1 - la) * S;

const LEGEND = [["<5°", "#2563eb"], ["5–10°", "#0ea5e9"], ["10–15°", "#10b981"], ["15–20°", "#84cc16"], ["20–25°", "#f59e0b"], ["25–30°", "#f97316"], [">30°", "#ef4444"]];

async function laden() {
  const lats = STAEDTE.map((s) => s.la).join(",");
  const lons = STAEDTE.map((s) => s.lo).join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=14&timezone=Europe%2FBerlin`;
  const j = await jget(url);
  const arr = Array.isArray(j) ? j : [j];
  const dates = (arr[0] && arr[0].daily && arr[0].daily.time) || [];
  const cities = STAEDTE.map((s, i) => {
    const d = arr[i] && arr[i].daily;
    const days = dates.map((_, k) => d ? { code: d.weather_code[k], tmax: d.temperature_2m_max[k], tmin: d.temperature_2m_min[k] } : { code: null, tmax: null, tmin: null });
    return { ...s, days };
  });
  return { dates, cities, stand: new Date() };
}

export default function Wetterkarte() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tag, setTag] = useState(0);

  async function aktualisieren() {
    setLoading(true); setErr("");
    try { const d = await laden(); setData(d); setTag((t) => Math.min(t, d.dates.length - 1)); }
    catch (e) { setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { aktualisieren(); /* eslint-disable-next-line */ }, []);

  const dateISO = data && data.dates[tag];
  const label = dateISO ? WT[new Date(dateISO + "T00:00:00").getDay()] + ", " + dateISO.slice(8, 10) + "." + dateISO.slice(5, 7) + "." : "";
  const stand = data ? data.stand.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800">
          <Thermometer className="h-4 w-4 text-emerald-700" /> Wetterkarte Deutschland
        </div>
        <button onClick={aktualisieren} disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Aktualisieren
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-500">Tageshöchst-Temperatur &amp; Wetter für 14 Tage. {stand && <span>Stand {stand} Uhr.</span>}</p>

      {err && <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err} – Open-Meteo evtl. kurz nicht erreichbar, erneut versuchen.</div>}

      {data && (
        <>
          {/* Tag-Regler */}
          <div className="mt-3 flex items-center gap-3">
            <button onClick={() => setTag((t) => Math.max(0, t - 1))} disabled={tag === 0} className="rounded-lg border border-stone-200 p-1.5 text-stone-500 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <div className="flex-1">
              <input type="range" min={0} max={data.dates.length - 1} value={tag} onChange={(e) => setTag(Number(e.target.value))} className="w-full" style={{ accentColor: "#047857" }} />
            </div>
            <button onClick={() => setTag((t) => Math.min(data.dates.length - 1, t + 1))} disabled={tag >= data.dates.length - 1} className="rounded-lg border border-stone-200 p-1.5 text-stone-500 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-1 text-center text-sm font-semibold text-stone-800">{label} <span className="text-xs font-normal text-stone-400">(Tag {tag + 1}/{data.dates.length})</span></div>

          {/* Karte */}
          <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-2">
            <svg viewBox={`0 0 ${VW.toFixed(0)} ${VH.toFixed(0)}`} className="mx-auto block h-auto w-full" style={{ maxWidth: "420px" }} role="img" aria-label="Wetterkarte Deutschland">
              {data.cities.map((c, i) => {
                const d = c.days[tag] || {}; const x = px(c.lo), y = py(c.la);
                const dark = darkText(d.tmax);
                return (
                  <g key={i}>
                    {c.home && <circle cx={x} cy={y} r={20} fill="none" stroke="#047857" strokeWidth={2} />}
                    <circle cx={x} cy={y} r={15} fill={tcol(d.tmax)} stroke="#ffffff" strokeWidth={1.5} />
                    <text x={x} y={y + 4} textAnchor="middle" style={{ fontSize: "13px", fontWeight: 700, fill: dark ? "#1c1917" : "#ffffff" }}>{d.tmax == null ? "–" : Math.round(d.tmax) + "°"}</text>
                    <text x={x + 13} y={y - 10} textAnchor="middle" style={{ fontSize: "13px" }}>{emoji(d.code)}</text>
                    <text x={x} y={y + 27} textAnchor="middle" style={{ fontSize: "11px", fontWeight: c.home ? 700 : 500, fill: c.home ? "#047857" : "#57534e" }}>{c.n}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legende */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {LEGEND.map((l) => (
              <span key={l[0]} className="inline-flex items-center gap-1 text-xs text-stone-500">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: l[1] }} /> {l[0]}
              </span>
            ))}
          </div>

          <div className="mt-2 flex items-start gap-2 text-xs text-stone-400"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Quelle: Open-Meteo (frei, ohne Schlüssel) · Städte-Übersicht, Prognose ohne Garantie · Ring = Celle.</span></div>
        </>
      )}

      {loading && !data && <div className="mt-4 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-6 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Karte wird geladen …</div>}
    </section>
  );
}
