/*
  Wetterkarte.jsx — Wetterkarte für ein wählbares Land, nächste 14 Tage
  --------------------------------------------------------------------
  Land auswählen (Deutschland + ~20 europäische Länder inkl. Türkei) -> ein
  Sammelabruf über Open-Meteo (gratis, ohne Schlüssel). Temperatur farbcodiert +
  Wetter-Emoji, Tag-Regler (14 Tage), Aktualisieren-Knopf. Karte skaliert automatisch.
  Datenschutzfreundlich: keine Geräte-Ortung, feste Städtelisten.

  EINBAU: <Wetterkarte /> (keine Props nötig).
*/
import React, { useState, useEffect } from "react";
import { RefreshCw, Loader2, Info, ChevronLeft, ChevronRight, Thermometer, Globe } from "lucide-react";

const enc = encodeURIComponent;

const LAENDER = {
  "Deutschland": [
    { n: "Flensburg", la: 54.78, lo: 9.44 }, { n: "Kiel", la: 54.32, lo: 10.14 }, { n: "Rostock", la: 54.09, lo: 12.14 },
    { n: "Hamburg", la: 53.55, lo: 10.00 }, { n: "Bremen", la: 53.08, lo: 8.80 }, { n: "Berlin", la: 52.52, lo: 13.40 },
    { n: "Celle", la: 52.62, lo: 10.08, home: true }, { n: "Hannover", la: 52.37, lo: 9.74 }, { n: "Münster", la: 51.96, lo: 7.63 },
    { n: "Dortmund", la: 51.51, lo: 7.47 }, { n: "Leipzig", la: 51.34, lo: 12.37 }, { n: "Dresden", la: 51.05, lo: 13.74 },
    { n: "Kassel", la: 51.31, lo: 9.50 }, { n: "Köln", la: 50.94, lo: 6.96 }, { n: "Frankfurt", la: 50.11, lo: 8.68 },
    { n: "Trier", la: 49.76, lo: 6.64 }, { n: "Nürnberg", la: 49.45, lo: 11.08 }, { n: "Stuttgart", la: 48.78, lo: 9.18 },
    { n: "München", la: 48.14, lo: 11.58 }, { n: "Freiburg", la: 47.99, lo: 7.84 },
  ],
  "Österreich": [
    { n: "Bregenz", la: 47.50, lo: 9.75 }, { n: "Innsbruck", la: 47.27, lo: 11.39 }, { n: "Kufstein", la: 47.58, lo: 12.17 },
    { n: "Salzburg", la: 47.80, lo: 13.05 }, { n: "Linz", la: 48.31, lo: 14.29 }, { n: "Wien", la: 48.21, lo: 16.37 },
    { n: "Graz", la: 47.07, lo: 15.44 }, { n: "Klagenfurt", la: 46.62, lo: 14.31 }, { n: "Villach", la: 46.61, lo: 13.85 },
    { n: "Lienz", la: 46.83, lo: 12.77 },
  ],
  "Belgien": [
    { n: "Antwerpen", la: 51.22, lo: 4.40 }, { n: "Gent", la: 51.05, lo: 3.72 }, { n: "Brügge", la: 51.21, lo: 3.22 },
    { n: "Ostende", la: 51.23, lo: 2.92 }, { n: "Brüssel", la: 50.85, lo: 4.35 }, { n: "Lüttich", la: 50.63, lo: 5.57 },
    { n: "Namur", la: 50.47, lo: 4.87 }, { n: "Arlon", la: 49.68, lo: 5.81 },
  ],
  "Dänemark": [
    { n: "Skagen", la: 57.72, lo: 10.58 }, { n: "Aalborg", la: 57.05, lo: 9.92 }, { n: "Aarhus", la: 56.16, lo: 10.20 },
    { n: "Esbjerg", la: 55.47, lo: 8.45 }, { n: "Odense", la: 55.40, lo: 10.39 }, { n: "Kopenhagen", la: 55.68, lo: 12.57 },
    { n: "Rønne", la: 55.10, lo: 14.70 },
  ],
  "Frankreich": [
    { n: "Lille", la: 50.63, lo: 3.06 }, { n: "Paris", la: 48.86, lo: 2.35 }, { n: "Straßburg", la: 48.58, lo: 7.75 },
    { n: "Brest", la: 48.39, lo: -4.49 }, { n: "Nantes", la: 47.22, lo: -1.55 }, { n: "Lyon", la: 45.76, lo: 4.84 },
    { n: "Bordeaux", la: 44.84, lo: -0.58 }, { n: "Grenoble", la: 45.19, lo: 5.72 }, { n: "Toulouse", la: 43.60, lo: 1.44 },
    { n: "Marseille", la: 43.30, lo: 5.37 }, { n: "Nizza", la: 43.70, lo: 7.27 }, { n: "Ajaccio", la: 41.93, lo: 8.74 },
  ],
  "Griechenland": [
    { n: "Thessaloniki", la: 40.64, lo: 22.94 }, { n: "Ioannina", la: 39.67, lo: 20.85 }, { n: "Korfu", la: 39.62, lo: 19.92 },
    { n: "Patras", la: 38.25, lo: 21.73 }, { n: "Athen", la: 37.98, lo: 23.73 }, { n: "Kalamata", la: 37.04, lo: 22.11 },
    { n: "Heraklion", la: 35.34, lo: 25.13 }, { n: "Rhodos", la: 36.43, lo: 28.22 }, { n: "Mytilini", la: 39.11, lo: 26.55 },
  ],
  "Irland": [
    { n: "Sligo", la: 54.27, lo: -8.48 }, { n: "Galway", la: 53.27, lo: -9.05 }, { n: "Dublin", la: 53.35, lo: -6.26 },
    { n: "Limerick", la: 52.66, lo: -8.62 }, { n: "Killarney", la: 52.06, lo: -9.51 }, { n: "Cork", la: 51.90, lo: -8.47 },
    { n: "Waterford", la: 52.26, lo: -7.11 },
  ],
  "Italien": [
    { n: "Bozen", la: 46.50, lo: 11.35 }, { n: "Mailand", la: 45.46, lo: 9.19 }, { n: "Venedig", la: 45.44, lo: 12.32 },
    { n: "Turin", la: 45.07, lo: 7.69 }, { n: "Genua", la: 44.41, lo: 8.93 }, { n: "Bologna", la: 44.49, lo: 11.34 },
    { n: "Florenz", la: 43.77, lo: 11.25 }, { n: "Rom", la: 41.90, lo: 12.50 }, { n: "Neapel", la: 40.85, lo: 14.27 },
    { n: "Bari", la: 41.12, lo: 16.87 }, { n: "Palermo", la: 38.12, lo: 13.36 }, { n: "Cagliari", la: 39.22, lo: 9.12 },
  ],
  "Kroatien": [
    { n: "Zagreb", la: 45.81, lo: 15.98 }, { n: "Rijeka", la: 45.33, lo: 14.44 }, { n: "Pula", la: 44.87, lo: 13.85 },
    { n: "Zadar", la: 44.12, lo: 15.23 }, { n: "Split", la: 43.51, lo: 16.44 }, { n: "Dubrovnik", la: 42.65, lo: 18.09 },
    { n: "Osijek", la: 45.55, lo: 18.69 },
  ],
  "Niederlande": [
    { n: "Groningen", la: 53.22, lo: 6.57 }, { n: "Leeuwarden", la: 53.20, lo: 5.79 }, { n: "Amsterdam", la: 52.37, lo: 4.90 },
    { n: "Den Haag", la: 52.08, lo: 4.31 }, { n: "Rotterdam", la: 51.92, lo: 4.48 }, { n: "Utrecht", la: 52.09, lo: 5.12 },
    { n: "Eindhoven", la: 51.44, lo: 5.48 }, { n: "Maastricht", la: 50.85, lo: 5.69 },
  ],
  "Norwegen": [
    { n: "Oslo", la: 59.91, lo: 10.75 }, { n: "Bergen", la: 60.39, lo: 5.32 }, { n: "Stavanger", la: 58.97, lo: 5.73 },
    { n: "Kristiansand", la: 58.15, lo: 8.00 }, { n: "Lillehammer", la: 61.12, lo: 10.47 }, { n: "Ålesund", la: 62.47, lo: 6.15 },
    { n: "Trondheim", la: 63.43, lo: 10.39 }, { n: "Bodø", la: 67.28, lo: 14.40 }, { n: "Tromsø", la: 69.65, lo: 18.96 },
  ],
  "Polen": [
    { n: "Danzig", la: 54.35, lo: 18.65 }, { n: "Stettin", la: 53.43, lo: 14.55 }, { n: "Posen", la: 52.41, lo: 16.93 },
    { n: "Warschau", la: 52.23, lo: 21.01 }, { n: "Breslau", la: 51.11, lo: 17.04 }, { n: "Lodz", la: 51.76, lo: 19.46 },
    { n: "Lublin", la: 51.25, lo: 22.57 }, { n: "Krakau", la: 50.06, lo: 19.94 }, { n: "Kattowitz", la: 50.26, lo: 19.02 },
  ],
  "Portugal": [
    { n: "Porto", la: 41.15, lo: -8.61 }, { n: "Braga", la: 41.55, lo: -8.43 }, { n: "Coimbra", la: 40.21, lo: -8.43 },
    { n: "Lissabon", la: 38.72, lo: -9.14 }, { n: "Évora", la: 38.57, lo: -7.91 }, { n: "Faro", la: 37.02, lo: -7.93 },
    { n: "Funchal", la: 32.65, lo: -16.91 },
  ],
  "Schweden": [
    { n: "Malmö", la: 55.60, lo: 13.00 }, { n: "Göteborg", la: 57.71, lo: 11.97 }, { n: "Stockholm", la: 59.33, lo: 18.06 },
    { n: "Örebro", la: 59.27, lo: 15.21 }, { n: "Sundsvall", la: 62.39, lo: 17.31 }, { n: "Umeå", la: 63.83, lo: 20.26 },
    { n: "Luleå", la: 65.58, lo: 22.15 }, { n: "Kiruna", la: 67.86, lo: 20.23 }, { n: "Visby", la: 57.64, lo: 18.30 },
  ],
  "Schweiz": [
    { n: "Genf", la: 46.20, lo: 6.14 }, { n: "Lausanne", la: 46.52, lo: 6.63 }, { n: "Bern", la: 46.95, lo: 7.44 },
    { n: "Basel", la: 47.56, lo: 7.59 }, { n: "Zürich", la: 47.37, lo: 8.54 }, { n: "Luzern", la: 47.05, lo: 8.31 },
    { n: "St. Gallen", la: 47.42, lo: 9.38 }, { n: "Chur", la: 46.85, lo: 9.53 }, { n: "Zermatt", la: 46.02, lo: 7.75 },
    { n: "Lugano", la: 46.00, lo: 8.95 },
  ],
  "Slowenien": [
    { n: "Bled", la: 46.37, lo: 14.11 }, { n: "Kranj", la: 46.24, lo: 14.36 }, { n: "Ljubljana", la: 46.06, lo: 14.51 },
    { n: "Maribor", la: 46.55, lo: 15.65 }, { n: "Celje", la: 46.23, lo: 15.27 }, { n: "Koper", la: 45.55, lo: 13.73 },
  ],
  "Spanien": [
    { n: "A Coruña", la: 43.37, lo: -8.40 }, { n: "Bilbao", la: 43.26, lo: -2.93 }, { n: "Barcelona", la: 41.39, lo: 2.17 },
    { n: "Madrid", la: 40.42, lo: -3.70 }, { n: "Valencia", la: 39.47, lo: -0.38 }, { n: "Palma", la: 39.57, lo: 2.65 },
    { n: "Sevilla", la: 37.39, lo: -5.99 }, { n: "Málaga", la: 36.72, lo: -4.42 }, { n: "Alicante", la: 38.35, lo: -0.48 },
    { n: "Las Palmas", la: 28.10, lo: -15.41 }, { n: "Teneriffa", la: 28.47, lo: -16.25 },
  ],
  "Tschechien": [
    { n: "Karlsbad", la: 50.23, lo: 12.87 }, { n: "Prag", la: 50.08, lo: 14.44 }, { n: "Liberec", la: 50.77, lo: 15.06 },
    { n: "Pilsen", la: 49.75, lo: 13.38 }, { n: "Brünn", la: 49.20, lo: 16.61 }, { n: "Ostrava", la: 49.82, lo: 18.26 },
    { n: "Budweis", la: 48.97, lo: 14.47 },
  ],
  "Türkei": [
    { n: "Edirne", la: 41.68, lo: 26.56 }, { n: "Istanbul", la: 41.01, lo: 28.98 }, { n: "Izmir", la: 38.42, lo: 27.14 },
    { n: "Bursa", la: 40.19, lo: 29.06 }, { n: "Ankara", la: 39.93, lo: 32.87 }, { n: "Antalya", la: 36.90, lo: 30.70 },
    { n: "Bodrum", la: 37.03, lo: 27.43 }, { n: "Konya", la: 37.87, lo: 32.48 }, { n: "Adana", la: 37.00, lo: 35.32 },
    { n: "Trabzon", la: 41.00, lo: 39.72 }, { n: "Gaziantep", la: 37.07, lo: 37.38 }, { n: "Erzurum", la: 39.90, lo: 41.27 },
    { n: "Van", la: 38.49, lo: 43.38 },
  ],
  "Ungarn": [
    { n: "Sopron", la: 47.68, lo: 16.58 }, { n: "Győr", la: 47.69, lo: 17.63 }, { n: "Budapest", la: 47.50, lo: 19.04 },
    { n: "Miskolc", la: 48.10, lo: 20.79 }, { n: "Debrecen", la: 47.53, lo: 21.62 }, { n: "Szeged", la: 46.25, lo: 20.15 },
    { n: "Pécs", la: 46.07, lo: 18.23 }, { n: "Balatonfüred", la: 46.96, lo: 17.89 },
  ],
  "Ver. Königreich": [
    { n: "Edinburgh", la: 55.95, lo: -3.19 }, { n: "Glasgow", la: 55.86, lo: -4.25 }, { n: "Newcastle", la: 54.98, lo: -1.61 },
    { n: "Belfast", la: 54.60, lo: -5.93 }, { n: "Manchester", la: 53.48, lo: -2.24 }, { n: "Liverpool", la: 53.41, lo: -2.99 },
    { n: "Birmingham", la: 52.48, lo: -1.90 }, { n: "Cardiff", la: 51.48, lo: -3.18 }, { n: "London", la: 51.51, lo: -0.13 },
    { n: "Bristol", la: 51.45, lo: -2.59 }, { n: "Aberdeen", la: 57.15, lo: -2.09 },
  ],
};

const TZ = {
  "Türkei": "Europe/Istanbul", "Griechenland": "Europe/Athens", "Portugal": "Europe/Lisbon",
  "Irland": "Europe/Dublin", "Ver. Königreich": "Europe/London",
};

const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
async function jget(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
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
const darkText = (t) => t != null && t >= 12 && t < 27;
const LEGEND = [["<5°", "#2563eb"], ["5–10°", "#0ea5e9"], ["10–15°", "#10b981"], ["15–20°", "#84cc16"], ["20–25°", "#f59e0b"], ["25–30°", "#f97316"], [">30°", "#ef4444"]];

function projektion(cities) {
  const las = cities.map((c) => c.la), los = cities.map((c) => c.lo);
  let la0 = Math.min(...las), la1 = Math.max(...las), lo0 = Math.min(...los), lo1 = Math.max(...los);
  const padLa = Math.max(0.3, (la1 - la0) * 0.10), padLo = Math.max(0.3, (lo1 - lo0) * 0.10);
  la0 -= padLa; la1 += padLa; lo0 -= padLo; lo1 += padLo;
  const kx = Math.cos(((la0 + la1) / 2) * Math.PI / 180);
  const xspan = (lo1 - lo0) * kx, yspan = (la1 - la0);
  const S = 580 / Math.max(xspan, yspan), PAD = 30;
  return {
    VW: xspan * S + 2 * PAD, VH: yspan * S + 2 * PAD,
    px: (lo) => PAD + (lo - lo0) * kx * S, py: (la) => PAD + (la1 - la) * S,
  };
}

async function ladenLand(cities, tz) {
  const CHUNK = 7;
  const groups = [];
  for (let i = 0; i < cities.length; i += CHUNK) groups.push(cities.slice(i, i + CHUNK));
  const parts = await Promise.all(groups.map(async (grp) => {
    const lats = grp.map((s) => s.la).join(","), lons = grp.map((s) => s.lo).join(",");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=14&timezone=${enc(tz)}`;
    try { const j = await jget(url); return Array.isArray(j) ? j : [j]; }
    catch (e) { return grp.map(() => null); }
  }));
  const flat = parts.flat();
  let dates = [];
  for (const r of flat) { if (r && r.daily && Array.isArray(r.daily.time)) { dates = r.daily.time; break; } }
  if (!dates.length) throw new Error("Open-Meteo hat keine Daten geliefert – kurz später erneut.");
  const out = cities.map((s, i) => {
    const d = flat[i] && flat[i].daily;
    const days = dates.map((_, k) => (d && d.temperature_2m_max) ? { code: d.weather_code[k], tmax: d.temperature_2m_max[k], tmin: d.temperature_2m_min[k] } : { code: null, tmax: null, tmin: null });
    return { ...s, days };
  });
  return { dates, cities: out, stand: new Date() };
}

export default function Wetterkarte() {
  const [land, setLand] = useState("Deutschland");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tag, setTag] = useState(0);

  async function aktualisieren(l) {
    const ziel = l || land;
    setLoading(true); setErr("");
    try {
      const d = await ladenLand(LAENDER[ziel], TZ[ziel] || "Europe/Berlin");
      setData({ land: ziel, ...d });
      setTag((t) => Math.min(t, d.dates.length - 1));
    } catch (e) { setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { aktualisieren("Deutschland"); /* eslint-disable-next-line */ }, []);
  function wechsle(l) { setLand(l); setTag(0); aktualisieren(l); }

  const proj = data ? projektion(data.cities) : null;
  const dateISO = data && data.dates[tag];
  const label = dateISO ? WT[new Date(dateISO + "T00:00:00").getDay()] + ", " + dateISO.slice(8, 10) + "." + dateISO.slice(5, 7) + "." : "";
  const stand = data ? data.stand.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
          <Thermometer className="h-4 w-4 text-emerald-700" /> Wetterkarte
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 pl-2">
            <Globe className="h-4 w-4 text-stone-400 dark:text-stone-500" />
            <select value={land} onChange={(e) => wechsle(e.target.value)} disabled={loading}
              className="rounded-lg bg-white dark:bg-stone-900 py-2 pr-2 text-sm focus:outline-none disabled:opacity-60">
              {Object.keys(LAENDER).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </span>
          <button onClick={() => aktualisieren()} disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Tageshöchst-Temperatur &amp; Wetter für 14 Tage. {stand && <span>Stand {stand} Uhr.</span>}</p>

      {err && <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err}</div>}

      {data && proj && (
        <>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={() => setTag((t) => Math.max(0, t - 1))} disabled={tag === 0} className="rounded-lg border border-stone-200 dark:border-stone-700 p-1.5 text-stone-500 dark:text-stone-400 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <div className="flex-1"><input type="range" min={0} max={data.dates.length - 1} value={tag} onChange={(e) => setTag(Number(e.target.value))} className="w-full" style={{ accentColor: "#047857" }} /></div>
            <button onClick={() => setTag((t) => Math.min(data.dates.length - 1, t + 1))} disabled={tag >= data.dates.length - 1} className="rounded-lg border border-stone-200 dark:border-stone-700 p-1.5 text-stone-500 dark:text-stone-400 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-1 text-center text-sm font-semibold text-stone-800 dark:text-stone-100">{data.land} · {label} <span className="text-xs font-normal text-stone-400 dark:text-stone-500">(Tag {tag + 1}/{data.dates.length})</span></div>

          <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-2">
            <svg viewBox={`0 0 ${proj.VW.toFixed(0)} ${proj.VH.toFixed(0)}`} className="mx-auto block h-auto w-full" style={{ maxWidth: "440px" }} role="img" aria-label={"Wetterkarte " + data.land}>
              {data.cities.map((c, i) => {
                const d = c.days[tag] || {}; const x = proj.px(c.lo), y = proj.py(c.la); const dark = darkText(d.tmax);
                return (
                  <g key={i}>
                    {c.home && <circle cx={x} cy={y} r={19} fill="none" stroke="#047857" strokeWidth={2} />}
                    <circle cx={x} cy={y} r={14} fill={tcol(d.tmax)} stroke="#ffffff" strokeWidth={1.5} />
                    <text x={x} y={y + 4} textAnchor="middle" style={{ fontSize: "12px", fontWeight: 700, fill: dark ? "#1c1917" : "#ffffff" }}>{d.tmax == null ? "–" : Math.round(d.tmax) + "°"}</text>
                    <text x={x + 12} y={y - 9} textAnchor="middle" style={{ fontSize: "12px" }}>{emoji(d.code)}</text>
                    <text x={x} y={y + 26} textAnchor="middle" style={{ fontSize: "11px", fontWeight: c.home ? 700 : 500, fill: c.home ? "#047857" : "#57534e" }}>{c.n}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {LEGEND.map((l) => (
              <span key={l[0]} className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: l[1] }} /> {l[0]}
              </span>
            ))}
          </div>

          <div className="mt-2 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Quelle: Open-Meteo (frei, ohne Schlüssel) · Städte-Übersicht, Prognose ohne Garantie{data.land === "Deutschland" ? " · Ring = Celle" : ""}.</span></div>
        </>
      )}

      {loading && !data && <div className="mt-4 flex items-center gap-2 rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-6 text-sm text-stone-500 dark:text-stone-400"><Loader2 className="h-4 w-4 animate-spin" /> Karte wird geladen …</div>}
    </section>
  );
}
