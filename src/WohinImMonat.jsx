/*
  WohinImMonat.jsx — "Wohin im Monat X?" (eigener Tab)
  ---------------------------------------------------
  Monat + Reisetyp wählen -> die App rankt Ziele nach ECHTEM Klima für diesen Monat.
  Klima live über Open-Meteo Archiv (Bezugsjahr 2024), gratis & ohne Schlüssel.
  Direktflug-Check aus der HAJ-Auswahl, Fahrzeit ab Celle auf Knopfdruck (OSRM).
  Datenschutzfreundlich: keine Geräte-Ortung, kuratierte Zielliste (Koordinaten = Fakten).

  EINBAU: <WohinImMonat onAdd={(s) => onAdd(mkItem(
    { kategorie:"sehenswuerdigkeit", name:s.name, info:s.info, gebiet:s.gebiet, maps_suche:s.name },
    { day:null, order:0, lat:s.lat ?? null, lon:s.lon ?? null }
  ))} />
*/
import React, { useState } from "react";
import { CalendarDays, Loader2, Info, MapPin, Plus, Check, Car, Plane, Thermometer, Droplets } from "lucide-react";

const enc = encodeURIComponent;
const CELLE = { la: 52.6226, lo: 10.0806 };
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

async function jget(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
function hav(aLa, aLo, bLa, bLo) {
  const R = 6371, r = Math.PI / 180, dLa = (bLa - aLa) * r, dLo = (bLo - aLo) * r;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(aLa * r) * Math.cos(bLa * r) * Math.sin(dLo / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}
function hm(min) { const h = Math.floor(min / 60), m = Math.round(min % 60); return h > 0 ? h + " h " + (m < 10 ? "0" + m : m) + " min" : m + " min"; }

const HAJ = [
  { n: "München", la: 48.3538, lo: 11.7861, air: "Lufthansa" }, { n: "Palma", la: 39.5517, lo: 2.7388, air: "TUI fly u. a." },
  { n: "Gran Canaria", la: 27.9319, lo: -15.3866, air: "TUI fly" }, { n: "Teneriffa", la: 28.0445, lo: -16.5725, air: "TUI fly" },
  { n: "Fuerteventura", la: 28.4527, lo: -13.8638, air: "TUI fly" }, { n: "Nizza", la: 43.6584, lo: 7.2159, air: "Eurowings" },
  { n: "Alicante", la: 38.2822, lo: -0.5581, air: "Eurowings" }, { n: "Lissabon", la: 38.7742, lo: -9.1342, air: "Eurowings" },
  { n: "Pula", la: 44.8935, lo: 13.9222, air: "Eurowings" }, { n: "Bozen", la: 46.4602, lo: 11.3264, air: "SkyAlps" },
  { n: "Antalya", la: 36.8987, lo: 30.8005, air: "TUI fly u. a." }, { n: "Hurghada", la: 27.1783, lo: 33.7994, air: "TUI fly u. a." },
];
function flugMatch(c) {
  let best = null; for (const a of HAJ) { const d = hav(c.la, c.lo, a.la, a.lo); if (!best || d < best.d) best = { ...a, d }; }
  return best && best.d <= 150 ? best : null;
}

const ZIELE = [
  { name: "Gardasee", la: 45.66, lo: 10.72 }, { name: "Südtirol", la: 46.50, lo: 11.35 },
  { name: "Tirol (Innsbruck)", la: 47.27, lo: 11.39 }, { name: "Bodensee", la: 47.66, lo: 9.18 },
  { name: "Toskana (Florenz)", la: 43.77, lo: 11.25 }, { name: "Côte d'Azur (Nizza)", la: 43.70, lo: 7.27 },
  { name: "Provence (Avignon)", la: 43.95, lo: 4.81 }, { name: "Mallorca", la: 39.62, lo: 2.99 },
  { name: "Barcelona", la: 41.39, lo: 2.17 }, { name: "Algarve (Faro)", la: 37.02, lo: -7.93 },
  { name: "Andalusien (Sevilla)", la: 37.39, lo: -5.99 }, { name: "Dalmatien (Split)", la: 43.51, lo: 16.44 },
  { name: "Sizilien (Palermo)", la: 38.12, lo: 13.36 }, { name: "Kreta (Heraklion)", la: 35.34, lo: 25.13 },
  { name: "Zypern (Larnaka)", la: 34.92, lo: 33.63 }, { name: "Lissabon", la: 38.72, lo: -9.14 },
  { name: "Teneriffa / Kanaren", la: 28.29, lo: -16.62 }, { name: "Madeira", la: 32.65, lo: -16.91 },
];

const IDEAL = { baden: 26, mild: 20, egal: 22 };
function suit(t) {
  if (t == null) return ["–", "#9ca3af"];
  if (t >= 27) return ["heiß", "#ef4444"]; if (t >= 22) return ["Badewetter", "#f59e0b"];
  if (t >= 17) return ["angenehm", "#10b981"]; if (t >= 12) return ["mild", "#84cc16"];
  if (t >= 6) return ["kühl", "#0ea5e9"]; return ["kalt", "#2563eb"];
}

async function klima(z, mm, last) {
  const j = await jget(`https://archive-api.open-meteo.com/v1/archive?latitude=${z.la}&longitude=${z.lo}&start_date=2024-${mm}-01&end_date=2024-${mm}-${last}&daily=temperature_2m_mean,precipitation_sum&timezone=auto`);
  const d = j.daily; if (!d || !d.time) return { temp: null, precip: null };
  let st = 0, ct = 0, sp = 0;
  for (let i = 0; i < d.time.length; i++) {
    const t = d.temperature_2m_mean[i], p = d.precipitation_sum[i];
    if (t != null) { st += t; ct++; } if (p != null) sp += p;
  }
  return { temp: ct ? st / ct : null, precip: Math.round(sp) };
}

function addTage(iso, n) { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function monatStart(m) { const now = new Date(); const yr = (m >= now.getMonth() + 1) ? now.getFullYear() : now.getFullYear() + 1; return `${yr}-${String(m).padStart(2, "0")}-01`; }

export default function WohinImMonat({ onAdd, onCreateTrip }) {
  const [monat, setMonat] = useState(new Date().getMonth() + 1);
  const [typ, setTyp] = useState("egal");
  const [nurFlug, setNurFlug] = useState(false);
  const [res, setRes] = useState({ loading: false, ran: false, list: [] });
  const [added, setAdded] = useState({});
  const [fahrten, setFahrten] = useState({});

  async function finden() {
    const mm = String(monat).padStart(2, "0");
    const last = String(new Date(2024, monat, 0).getDate()).padStart(2, "0");
    let cands = ZIELE.map((z) => ({ z, flug: flugMatch(z), dist: hav(CELLE.la, CELLE.lo, z.la, z.lo) }));
    if (nurFlug) cands = cands.filter((c) => c.flug);
    setRes({ loading: true, ran: true, list: [] }); setAdded({}); setFahrten({});
    const out = await Promise.all(cands.map(async (c) => {
      try { const k = await klima(c.z, mm, last); return { ...c, ...k }; }
      catch (e) { return { ...c, temp: null, precip: null }; }
    }));
    const list = out.filter((x) => x.temp != null);
    list.forEach((x) => { x.pen = Math.abs(x.temp - IDEAL[typ]) + x.precip / 20; });
    list.sort((a, b) => a.pen - b.pen);
    setRes({ loading: false, ran: true, list: list.slice(0, 12) });
  }

  function add(z, k) {
    if (onAdd) onAdd({ name: z.name, info: k, gebiet: z.name, lat: z.la, lon: z.lo });
    setAdded((a) => ({ ...a, [z.name]: true }));
  }
  async function fahrzeit(z) {
    setFahrten((f) => ({ ...f, [z.name]: { loading: true } }));
    try {
      const j = await jget(`https://router.project-osrm.org/route/v1/driving/${CELLE.lo},${CELLE.la};${z.lo},${z.la}?overview=false`);
      const r = j.routes && j.routes[0];
      setFahrten((f) => ({ ...f, [z.name]: { loading: false, km: Math.round(r.distance / 1000), txt: hm(Math.round(r.duration / 60)) } }));
    } catch (e) { setFahrten((f) => ({ ...f, [z.name]: { loading: false, err: true } })); }
  }

  const chip = (on) => "rounded-full px-3 py-1.5 text-xs font-medium transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200");

  return (
    <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
        <CalendarDays className="h-4 w-4 text-emerald-700" /> Wohin im …
      </div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Monat und Reisetyp wählen – die App rankt Ziele nach dem echten Klima in diesem Monat.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={monat} onChange={(e) => setMonat(Number(e.target.value))}
          className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none">
          {MONATE.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          {[["baden", "Baden-warm"], ["mild", "angenehm mild"], ["egal", "egal"]].map(([k, l]) => (
            <button key={k} onClick={() => setTyp(k)} className={chip(typ === k)}>{l}</button>
          ))}
        </div>
      </div>

      <label className="mt-2 inline-flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
        <input type="checkbox" checked={nurFlug} onChange={(e) => setNurFlug(e.target.checked)} style={{ accentColor: "#047857" }} />
        nur Ziele mit Direktflug ab HAJ
      </label>

      <button onClick={finden} disabled={res.loading}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
        {res.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />} Ziele für {MONATE[monat - 1]} finden
      </button>

      {res.ran && (
        <div className="mt-4 space-y-2">
          {res.loading && <div className="flex items-center gap-2 rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-3 text-sm text-stone-500 dark:text-stone-400"><Loader2 className="h-4 w-4 animate-spin" /> Klimadaten werden geladen …</div>}
          {!res.loading && res.list.length === 0 && <div className="rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-3 text-sm text-stone-500 dark:text-stone-400">Keine Daten – ggf. Filter „Direktflug" abschalten oder erneut versuchen.</div>}
          {res.list.map((x, i) => {
            const z = x.z; const [lab, col] = suit(x.temp); const isAdded = !!added[z.name]; const fz = fahrten[z.name];
            return (
              <div key={i} className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{z.name}</span>
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: col }}>{lab}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                      <span className="inline-flex items-center gap-1"><Thermometer className="h-3.5 w-3.5" /> {Math.round(x.temp)}° Ø</span>
                      <span className="inline-flex items-center gap-1"><Droplets className="h-3.5 w-3.5" /> {x.precip} mm</span>
                      {x.flug && <span className="inline-flex items-center gap-1 text-emerald-700"><Plane className="h-3.5 w-3.5" /> Direktflug ({x.flug.n})</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                      {fz && fz.loading && <span className="inline-flex items-center gap-1 text-stone-400 dark:text-stone-500"><Loader2 className="h-3 w-3 animate-spin" /> …</span>}
                      {fz && fz.km != null && <span className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-300"><Car className="h-3.5 w-3.5" /> {fz.km} km · {fz.txt} ab Celle</span>}
                      {fz && fz.err && <span className="text-rose-500">Fahrzeit n/v</span>}
                      {!fz && <button onClick={() => fahrzeit(z)} className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"><Car className="h-3.5 w-3.5" /> Fahrzeit ab Celle</button>}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${enc(z.name)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"><MapPin className="h-3.5 w-3.5" /> Karte</a>
                    </div>
                  </div>
                  <button onClick={() => add(z, `${MONATE[monat - 1]}: ~${Math.round(x.temp)}°, ${x.precip} mm`)} disabled={isAdded}
                    className={"inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition " + (isAdded ? "bg-emerald-100 text-emerald-700" : "bg-emerald-700 text-white hover:bg-emerald-800")}>
                    {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {isAdded ? "drin" : "Ideen"}
                  </button>
                </div>
                {onCreateTrip && (
                  <button onClick={() => { const st = monatStart(monat); onCreateTrip({ name: z.name, gebiet: z.name, info: `Klima ${MONATE[monat - 1]}: ~${Math.round(x.temp)}° Ø, ${x.precip} mm`, zeit: MONATE[monat - 1], start: st, end: addTage(st, 6) }); }}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 dark:bg-emerald-800">
                    <CalendarDays className="h-4 w-4" /> Reise daraus erstellen
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Klimawerte: Open-Meteo Archiv, Bezugsjahr 2024 (Orientierung, kein Langzeitmittel) · Ø = mittlere Tagestemperatur, mm = Monatsniederschlag · kuratierte Zielliste. Direktflug aus HAJ-Auswahl.</span></div>
    </section>
  );
}
