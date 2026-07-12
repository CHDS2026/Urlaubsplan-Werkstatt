/*
  Bedingungen.jsx — Vor-Ort-Check für eine Region (eigener Tab)
  ------------------------------------------------------------
  Alles gratis & ohne Schlüssel, datenschutzfreundlich (keine Geräte-Ortung):
    • Photon (komoot)         – Geocoding (ODbL)
    • Open-Meteo Forecast     – 14-Tage-Wetter + Sonnenauf-/untergang + Tageslänge
    • Open-Meteo Air-Quality  – Luftqualität (EAQI) + Pollen
    • Wikimedia Commons       – Foto-Galerie (Lizenzen je Bild, verlinkt)
    • OpenHolidays            – Feiertage am Ziel (Öffnungszeiten/Andrang)
    • Overpass / OSM          – Wander- & Radrouten (ODbL)

  EINBAU: <Bedingungen /> (keine Props nötig).
*/
import React, { useState } from "react";
import { Search, Loader2, Info, CloudSun, Sunrise, Sunset, Wind, Flower2, Camera, CalendarDays, Route } from "lucide-react";

const enc = encodeURIComponent;
async function jget(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
const hhmm = (iso) => (iso ? String(iso).slice(11, 16) : "");
const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function wmo(code) {
  const m = {
    0: ["☀️", "klar"], 1: ["🌤️", "heiter"], 2: ["⛅", "wolkig"], 3: ["☁️", "bedeckt"],
    45: ["🌫️", "Nebel"], 48: ["🌫️", "Nebel"], 51: ["🌦️", "Niesel"], 53: ["🌦️", "Niesel"], 55: ["🌦️", "Niesel"],
    61: ["🌧️", "Regen"], 63: ["🌧️", "Regen"], 65: ["🌧️", "Starkregen"], 66: ["🌧️", "Regen"], 67: ["🌧️", "Regen"],
    71: ["🌨️", "Schnee"], 73: ["🌨️", "Schnee"], 75: ["🌨️", "Schneefall"], 77: ["🌨️", "Schnee"],
    80: ["🌦️", "Schauer"], 81: ["🌦️", "Schauer"], 82: ["⛈️", "Starkschauer"], 85: ["🌨️", "Schnee"], 86: ["🌨️", "Schnee"],
    95: ["⛈️", "Gewitter"], 96: ["⛈️", "Gewitter"], 99: ["⛈️", "Gewitter"],
  };
  return m[code] || ["·", ""];
}
function aqi(v) {
  if (v == null) return null;
  if (v <= 20) return ["sehr gut", "#059669"]; if (v <= 40) return ["gut", "#16a34a"];
  if (v <= 60) return ["mäßig", "#ca8a04"]; if (v <= 80) return ["schlecht", "#ea580c"];
  if (v <= 100) return ["sehr schlecht", "#dc2626"]; return ["extrem", "#7e22ce"];
}
async function geocode(q) {
  const j = await jget(`https://photon.komoot.io/api?q=${enc(q)}&limit=1&lang=de`);
  const f = j.features && j.features[0]; if (!f || !f.geometry) throw new Error("Ort „" + q + "“ nicht gefunden.");
  const [lon, lat] = f.geometry.coordinates; const p = f.properties || {};
  return { lat, lon, label: [p.name, p.state, p.country].filter(Boolean).join(", ") || q, cc: (p.countrycode || "").toUpperCase() };
}
async function ladeWetter(c) {
  const j = await jget(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,daylight_duration&forecast_days=14&timezone=auto`);
  const d = j.daily; if (!d || !d.time) return null;
  const days = d.time.map((t, i) => ({
    date: t, code: d.weather_code[i], tmax: d.temperature_2m_max[i], tmin: d.temperature_2m_min[i], pop: d.precipitation_probability_max[i],
  }));
  return { days, sunrise: hhmm(d.sunrise[0]), sunset: hhmm(d.sunset[0]), daylightH: d.daylight_duration ? (d.daylight_duration[0] / 3600) : null };
}
async function ladeLuft(c) {
  const j = await jget(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${c.lat}&longitude=${c.lon}&current=european_aqi,pm2_5,pm10,alder_pollen,birch_pollen,grass_pollen,ragweed_pollen&timezone=auto`);
  const cur = j.current; if (!cur) return null;
  const pollen = [
    ["Erle", cur.alder_pollen], ["Birke", cur.birch_pollen], ["Gräser", cur.grass_pollen], ["Ambrosia", cur.ragweed_pollen],
  ].filter((p) => p[1] != null && p[1] > 0).sort((a, b) => b[1] - a[1]);
  return { eaqi: cur.european_aqi, pm25: cur.pm2_5, pm10: cur.pm10, pollen };
}
async function ladeFotos(c) {
  const j = await jget(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggscoord=${c.lat}|${c.lon}&ggsradius=10000&ggslimit=12&ggsnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=240`);
  const pages = j.query && j.query.pages; if (!pages) return [];
  return Object.values(pages).map((p) => {
    const ii = p.imageinfo && p.imageinfo[0]; if (!ii || !ii.thumburl) return null;
    return { title: (p.title || "").replace(/^File:/, ""), thumb: ii.thumburl, page: ii.descriptionurl || ii.url };
  }).filter(Boolean).slice(0, 9);
}
async function ladeFeiertage(cc) {
  if (!cc) return [];
  const von = new Date(), bis = new Date(); bis.setDate(bis.getDate() + 90);
  const iso = (d) => d.toISOString().slice(0, 10);
  const j = await jget(`https://openholidaysapi.org/PublicHolidays?countryIsoCode=${cc}&languageIsoCode=DE&validFrom=${iso(von)}&validTo=${iso(bis)}`);
  return (Array.isArray(j) ? j : []).map((h) => ({
    name: (h.name && (h.name.find((n) => n.language === "DE") || h.name[0]) || {}).text || "Feiertag", date: h.startDate,
  })).filter((h) => h.date).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
}
async function ladeRouten(c) {
  const q = `[out:json][timeout:25];(relation["route"="hiking"]["name"](around:15000,${c.lat},${c.lon});relation["route"="bicycle"]["name"](around:15000,${c.lat},${c.lon}););out tags 60;`;
  const j = await jget(`https://overpass-api.de/api/interpreter?data=${enc(q)}`);
  const seen = new Set(); const out = [];
  for (const el of (j.elements || [])) {
    const t = el.tags || {}; const name = t.name; if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, typ: t.route === "bicycle" ? "Rad" : "Wandern" });
    if (out.length >= 10) break;
  }
  return out;
}

const dmy = (iso) => { const p = String(iso).split("-"); return p[2] + "." + p[1] + "."; };

export default function Bedingungen() {
  const [q, setQ] = useState("Innsbruck");
  const [geoLoad, setGeoLoad] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const [place, setPlace] = useState(null);
  const [wetter, setWetter] = useState({ loading: false, data: null });
  const [luft, setLuft] = useState({ loading: false, data: null });
  const [fotos, setFotos] = useState({ loading: false, data: [] });
  const [feier, setFeier] = useState({ loading: false, data: [] });
  const [routen, setRouten] = useState({ loading: false, data: [] });

  async function run() {
    const term = q.trim(); if (!term || geoLoad) return;
    setGeoLoad(true); setGeoErr(""); setPlace(null);
    const reset = { loading: true, data: null };
    setWetter(reset); setLuft(reset); setFotos({ loading: true, data: [] }); setFeier({ loading: true, data: [] }); setRouten({ loading: true, data: [] });
    try {
      const c = await geocode(term); setPlace(c);
      ladeWetter(c).then((d) => setWetter({ loading: false, data: d })).catch(() => setWetter({ loading: false, data: null }));
      ladeLuft(c).then((d) => setLuft({ loading: false, data: d })).catch(() => setLuft({ loading: false, data: null }));
      ladeFotos(c).then((d) => setFotos({ loading: false, data: d })).catch(() => setFotos({ loading: false, data: [] }));
      ladeFeiertage(c.cc).then((d) => setFeier({ loading: false, data: d })).catch(() => setFeier({ loading: false, data: [] }));
      ladeRouten(c).then((d) => setRouten({ loading: false, data: d })).catch(() => setRouten({ loading: false, data: [] }));
    } catch (e) { setGeoErr(e.message || String(e)); }
    finally { setGeoLoad(false); }
  }

  const aqL = luft.data ? aqi(luft.data.eaqi) : null;

  return (
    <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
        <CloudSun className="h-4 w-4 text-emerald-700" /> Vor-Ort-Check
      </div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Wetter, Tageslicht, Luft & Pollen, Fotos, Feiertage und Touren für eine Region.</p>

      <div className="mt-3 flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); }}
          placeholder="Region oder Stadt …" className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
        <button onClick={run} disabled={geoLoad}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
          {geoLoad ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Prüfen
        </button>
      </div>
      {geoErr && <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {geoErr}</div>}

      {place && (
        <div className="mt-3 space-y-3">
          <div className="text-xs text-stone-500 dark:text-stone-400">Für <b className="text-stone-800 dark:text-stone-100">{place.label}</b></div>

          {/* Wetter + Tageslicht */}
          {(wetter.loading || wetter.data) && (
            <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200"><CloudSun className="h-4 w-4 text-amber-500" /> 14-Tage-Prognose</span>
                {wetter.data && (
                  <span className="inline-flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                    <span className="inline-flex items-center gap-1"><Sunrise className="h-3.5 w-3.5 text-amber-500" />{wetter.data.sunrise}</span>
                    <span className="inline-flex items-center gap-1"><Sunset className="h-3.5 w-3.5 text-orange-500" />{wetter.data.sunset}</span>
                    {wetter.data.daylightH != null && <span>· {wetter.data.daylightH.toLocaleString("de-DE", { maximumFractionDigits: 1 })} h hell</span>}
                  </span>
                )}
              </div>
              {wetter.loading && <div className="flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> lädt …</div>}
              {wetter.data && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {wetter.data.days.map((d, i) => {
                    const [emo] = wmo(d.code); const wd = WT[new Date(d.date + "T00:00:00").getDay()];
                    return (
                      <div key={i} className="shrink-0 rounded-lg bg-stone-50 dark:bg-stone-800 px-2 py-1.5 text-center" style={{ minWidth: "44px" }}>
                        <div className="text-xs text-stone-400 dark:text-stone-500">{wd}</div>
                        <div className="text-base leading-tight">{emo}</div>
                        <div className="text-xs font-semibold text-stone-800 dark:text-stone-100">{Math.round(d.tmax)}°</div>
                        <div className="text-xs text-stone-400 dark:text-stone-500">{Math.round(d.tmin)}°</div>
                        {d.pop != null && <div className="text-xs text-sky-600" style={{ fontSize: "10px" }}>{d.pop}%</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Luft & Pollen */}
          {(luft.loading || luft.data) && (
            <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200"><Wind className="h-4 w-4 text-emerald-700" /> Luft & Pollen</span>
              {luft.loading && <div className="mt-1 flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> lädt …</div>}
              {luft.data && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  {aqL && <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-white" style={{ backgroundColor: aqL[1] }}>Luft: {aqL[0]} (EAQI {Math.round(luft.data.eaqi)})</span>}
                  {luft.data.pm25 != null && <span className="rounded-lg bg-stone-100 dark:bg-stone-800 px-2 py-1 text-stone-600 dark:text-stone-300">PM2,5 {Math.round(luft.data.pm25)}</span>}
                  {luft.data.pollen.length === 0 && <span className="text-stone-400 dark:text-stone-500">keine relevanten Pollen</span>}
                  {luft.data.pollen.map((p) => (
                    <span key={p[0]} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-amber-800"><Flower2 className="h-3.5 w-3.5" />{p[0]}: {Math.round(p[1])}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fotos */}
          {(fotos.loading || (fotos.data && fotos.data.length > 0)) && (
            <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200"><Camera className="h-4 w-4 text-emerald-700" /> Fotos aus der Gegend</span>
              {fotos.loading && <div className="mt-1 flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> lädt …</div>}
              {fotos.data && fotos.data.length > 0 && (
                <>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {fotos.data.map((f, i) => (
                      <a key={i} href={f.page} target="_blank" rel="noreferrer" title={f.title} className="block overflow-hidden rounded-lg">
                        <img src={f.thumb} alt={f.title} className="h-20 w-full object-cover transition hover:opacity-90" loading="lazy" />
                      </a>
                    ))}
                  </div>
                  <div className="mt-1 text-xs text-stone-400 dark:text-stone-500">Wikimedia Commons · Lizenzen je Bild (aufs Bild tippen).</div>
                </>
              )}
            </div>
          )}

          {/* Feiertage */}
          {(feier.loading || (feier.data && feier.data.length > 0)) && (
            <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200"><CalendarDays className="h-4 w-4 text-emerald-700" /> Feiertage am Ziel {place.cc ? "(" + place.cc + ")" : ""}</span>
              <div className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">Nächste ~90 Tage – für Öffnungszeiten & Andrang.</div>
              {feier.loading && <div className="mt-1 flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> lädt …</div>}
              {feier.data && feier.data.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {feier.data.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2 py-1 text-xs text-stone-600 dark:text-stone-300"><b className="text-stone-800 dark:text-stone-100">{dmy(f.date)}</b> {f.name}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Routen */}
          {(routen.loading || (routen.data && routen.data.length > 0)) && (
            <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200"><Route className="h-4 w-4 text-emerald-700" /> Wander- & Radrouten</span>
              {routen.loading && <div className="mt-1 flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> lädt …</div>}
              {routen.data && routen.data.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {routen.data.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="rounded bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 text-xs font-medium text-stone-500 dark:text-stone-400">{r.typ}</span>
                      <span className="text-stone-800 dark:text-stone-100">{r.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Wetter/Luft/Pollen: Open-Meteo · Fotos: Wikimedia Commons · Feiertage: OpenHolidays · Routen: OSM/Overpass. Prognose ist Vorhersage, keine Garantie.</span></div>
        </div>
      )}
    </section>
  );
}
