/*
  Anreise.jsx — Auto vs. Bahn vs. Flug für ein Ziel (Start: Celle)
  ---------------------------------------------------------------
  Gratis & ohne Schlüssel, datenschutzfreundlich (fester Start Celle):
    • Photon (komoot)        – Geocoding des Ziels (ODbL)
    • OSRM (Demo)            – echte Auto-Route (Richtwert)
    • v6.db.transport.rest   – DB-Direktverbindung/Umstiege (DB-Daten, ohne FlixTrain)
    • HAJ-Direktflug-Check   – kuratierte Auswahl (nächstgelegener Flughafen)
  Kosten/CO2 sind transparente Schätzungen mit DEINEN Annahmen – keine erfundenen
  Ticket-/Flugpreise.

  EINBAU: eigener Tab -> <Anreise /> (keine Props nötig).
*/
import React, { useState } from "react";
import { Car, Train, Plane, Search, Loader2, Info, ExternalLink, Users, Fuel, Leaf, ArrowLeftRight } from "lucide-react";
import { jget } from "./lib/net.js";

const enc = encodeURIComponent;
const CELLE = { lat: 52.6226, lon: 10.0806 };
const HAJ_APT = { lat: 52.4611, lon: 9.6851 };

function dist(aLat, aLon, bLat, bLon) {
  const R = 6371, r = Math.PI / 180;
  const dLa = (bLat - aLat) * r, dLo = (bLon - aLon) * r;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLo / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}
function hm(min) { const h = Math.floor(min / 60), m = Math.round(min % 60); return h > 0 ? h + " h " + (m < 10 ? "0" + m : m) + " min" : m + " min"; }
const eur = (n) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const kg = (n) => n.toLocaleString("de-DE", { maximumFractionDigits: n < 10 ? 1 : 0 }) + " kg";

const HAJ = [
  { name: "Frankfurt", iata: "FRA", lat: 50.0379, lon: 8.5622, airline: "Lufthansa", saison: "ganzjährig" },
  { name: "München", iata: "MUC", lat: 48.3538, lon: 11.7861, airline: "Lufthansa", saison: "ganzjährig" },
  { name: "London-Heathrow", iata: "LHR", lat: 51.4700, lon: -0.4543, airline: "British Airways", saison: "ganzjährig" },
  { name: "Kopenhagen", iata: "CPH", lat: 55.6180, lon: 12.6508, airline: "SAS", saison: "ganzjährig" },
  { name: "Istanbul", iata: "IST", lat: 41.2753, lon: 28.7519, airline: "Turkish Airlines", saison: "ganzjährig" },
  { name: "Palma de Mallorca", iata: "PMI", lat: 39.5517, lon: 2.7388, airline: "TUI fly u. a.", saison: "ganzjährig" },
  { name: "Antalya", iata: "AYT", lat: 36.8987, lon: 30.8005, airline: "TUI fly · SunExpress · Corendon", saison: "ganzjährig" },
  { name: "Gran Canaria", iata: "LPA", lat: 27.9319, lon: -15.3866, airline: "TUI fly", saison: "ganzjährig" },
  { name: "Teneriffa", iata: "TFS", lat: 28.0445, lon: -16.5725, airline: "TUI fly", saison: "ganzjährig" },
  { name: "Fuerteventura", iata: "FUE", lat: 28.4527, lon: -13.8638, airline: "TUI fly", saison: "ganzjährig" },
  { name: "Hurghada", iata: "HRG", lat: 27.1783, lon: 33.7994, airline: "TUI fly · Corendon", saison: "ganzjährig" },
  { name: "Nizza", iata: "NCE", lat: 43.6584, lon: 7.2159, airline: "Eurowings", saison: "Sommer" },
  { name: "Alicante", iata: "ALC", lat: 38.2822, lon: -0.5581, airline: "Eurowings", saison: "Sommer" },
  { name: "Lissabon", iata: "LIS", lat: 38.7742, lon: -9.1342, airline: "Eurowings", saison: "Sommer" },
  { name: "Stockholm", iata: "ARN", lat: 59.6519, lon: 17.9186, airline: "Eurowings", saison: "Sommer" },
  { name: "Pula", iata: "PUY", lat: 44.8935, lon: 13.9222, airline: "Eurowings", saison: "Sommer" },
  { name: "Bozen", iata: "BZO", lat: 46.4602, lon: 11.3264, airline: "SkyAlps", saison: "saisonal" },
  { name: "Edremit", iata: "EDO", lat: 39.5546, lon: 27.0138, airline: "SunExpress", saison: "Sommer" },
];

async function geocode(q) {
  const j = await jget(`https://photon.komoot.io/api?q=${enc(q)}&limit=1&lang=de`);
  const f = j.features && j.features[0]; if (!f || !f.geometry) throw new Error("Ziel „" + q + "“ nicht gefunden.");
  const [lon, lat] = f.geometry.coordinates; const p = f.properties || {};
  return { lat, lon, label: [p.name, p.state, p.country].filter(Boolean).join(", ") || q };
}
async function ladeAuto(to) {
  const j = await jget(`https://router.project-osrm.org/route/v1/driving/${CELLE.lon},${CELLE.lat};${to.lon},${to.lat}?overview=false`);
  const r = j.routes && j.routes[0]; if (!r) throw new Error("keine Route");
  return { km: Math.round(r.distance / 1000), min: Math.round(r.duration / 60) };
}
async function ladeBahn(to) {
  const cl = await jget(`https://v6.db.transport.rest/locations?query=Celle&results=1&stops=true&addresses=false&poi=false`);
  const from = Array.isArray(cl) && cl[0]; if (!from) throw new Error("Start unklar");
  const nb = await jget(`https://v6.db.transport.rest/stops/nearby?latitude=${to.lat}&longitude=${to.lon}&results=1`);
  const dest = Array.isArray(nb) && nb[0]; if (!dest) throw new Error("kein Bahnhof in Zielnähe");
  const jr = await jget(`https://v6.db.transport.rest/journeys?from=${from.id}&to=${dest.id}&results=4&stopovers=false&language=de`);
  const journeys = (jr && jr.journeys) || [];
  let best = null;
  for (const j of journeys) {
    const legs = (j.legs || []).filter((l) => !l.walking);
    if (!legs.length) continue;
    const dep = new Date(legs[0].departure || legs[0].plannedDeparture);
    const arr = new Date(legs[legs.length - 1].arrival || legs[legs.length - 1].plannedArrival);
    const min = Math.round((arr - dep) / 60000);
    const umst = Math.max(0, legs.length - 1);
    if (!best || min < best.min) best = { min, umst };
  }
  if (!best) throw new Error("keine Verbindung");
  return { station: dest.name, min: best.min, umst: best.umst };
}
function flugCheck(to) {
  let best = null;
  for (const a of HAJ) { const d = dist(to.lat, to.lon, a.lat, a.lon); if (!best || d < best.d) best = { ...a, d }; }
  if (best && best.d <= 150) return { ...best, direkt: true, flugKm: dist(HAJ_APT.lat, HAJ_APT.lon, best.lat, best.lon) };
  return { direkt: false };
}

export default function Anreise() {
  const [q, setQ] = useState("Innsbruck");
  const [dest, setDest] = useState(null);
  const [geoLoad, setGeoLoad] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const [auto, setAuto] = useState({ loading: false, data: null, err: "" });
  const [bahn, setBahn] = useState({ loading: false, data: null, err: "" });
  const [verbrauch, setVerbrauch] = useState(7);
  const [preis, setPreis] = useState(1.75);
  const [personen, setPersonen] = useState(2);

  async function run() {
    const term = q.trim(); if (!term || geoLoad) return;
    setGeoLoad(true); setGeoErr(""); setDest(null);
    setAuto({ loading: false, data: null, err: "" }); setBahn({ loading: false, data: null, err: "" });
    try {
      const d = await geocode(term); setDest(d);
      setAuto({ loading: true, data: null, err: "" });
      ladeAuto(d).then((r) => setAuto({ loading: false, data: r, err: "" })).catch((e) => setAuto({ loading: false, data: null, err: e.message || "n/v" }));
      setBahn({ loading: true, data: null, err: "" });
      ladeBahn(d).then((r) => setBahn({ loading: false, data: r, err: "" })).catch((e) => setBahn({ loading: false, data: null, err: e.message || "n/v" }));
    } catch (e) { setGeoErr(e.message || String(e)); }
    finally { setGeoLoad(false); }
  }

  const flug = dest ? flugCheck(dest) : null;
  const airKm = dest ? dist(CELLE.lat, CELLE.lon, dest.lat, dest.lon) : 0;

  const autoKostenGes = auto.data ? auto.data.km * (verbrauch / 100) * preis : null;
  const autoCO2 = auto.data ? auto.data.km * 0.15 : null;              // kg, ganzes Auto, einfache Strecke
  const bahnCO2 = dest ? airKm * 0.032 : null;                        // kg/Person
  const flugCO2 = flug && flug.direkt ? flug.flugKm * 0.18 : null;     // kg/Person

  const fastest = (() => {
    const opts = [];
    if (auto.data) opts.push(["auto", auto.data.min]);
    if (bahn.data) opts.push(["bahn", bahn.data.min]);
    if (!opts.length) return null;
    return opts.sort((a, b) => a[1] - b[1])[0][0];
  })();
  const greenest = (() => {
    const opts = [];
    if (autoCO2 != null) opts.push(["auto", autoCO2 / personen]);
    if (bahnCO2 != null) opts.push(["bahn", bahnCO2]);
    if (flugCO2 != null) opts.push(["flug", flugCO2]);
    if (!opts.length) return null;
    return opts.sort((a, b) => a[1] - b[1])[0][0];
  })();

  const num = "w-16 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-sm focus:border-emerald-400 focus:outline-none";
  const Badge = ({ show, kind }) => show ? <span style={{ fontSize: "11px" }} className={"ml-2 rounded-full px-2 py-0.5 font-semibold " + (kind === "fast" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>{kind === "fast" ? "am schnellsten" : "am wenigsten CO₂"}</span> : null;

  return (
    <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
        <ArrowLeftRight className="h-4 w-4 text-emerald-700" /> Anreise-Vergleich ab Celle
      </div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Auto, Bahn und Direktflug ab HAJ im Vergleich – mit transparenter Kosten-/CO₂-Schätzung nach deinen Annahmen.</p>

      <div className="mt-3 flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); }}
          placeholder="Ziel (Region oder Stadt) …" className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
        <button onClick={run} disabled={geoLoad}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
          {geoLoad ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Vergleichen
        </button>
      </div>
      {geoErr && <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {geoErr}</div>}

      {/* Annahmen */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-2 text-xs text-stone-600 dark:text-stone-300">
        <span className="inline-flex items-center gap-1"><Fuel className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" /> Verbrauch <input type="number" min={1} step={0.5} value={verbrauch} onChange={(e) => setVerbrauch(Number(e.target.value) || 0)} className={num} /> L/100</span>
        <span className="inline-flex items-center gap-1">Spritpreis <input type="number" min={0} step={0.05} value={preis} onChange={(e) => setPreis(Number(e.target.value) || 0)} className={num} /> €/L</span>
        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" /> Personen <input type="number" min={1} step={1} value={personen} onChange={(e) => setPersonen(Math.max(1, Number(e.target.value) || 1))} className={num} /></span>
      </div>

      {dest && (
        <div className="mt-3 space-y-3">
          <div className="text-xs text-stone-500 dark:text-stone-400">Ziel: <b className="text-stone-800 dark:text-stone-100">{dest.label}</b> · Angaben je <b>einfache Strecke</b>.</div>

          {/* AUTO */}
          <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 font-semibold text-stone-800 dark:text-stone-100"><Car className="h-4 w-4 text-emerald-700" /> Auto<Badge show={fastest === "auto"} kind="fast" /><Badge show={greenest === "auto"} kind="co2" /></span>
              <a href="https://www.google.com/maps/dir/?api=1&origin=Celle&destination=Innsbruck" target="_blank" rel="noreferrer" className="text-xs text-emerald-700 hover:text-emerald-800"><ExternalLink className="inline h-3.5 w-3.5" /></a>
            </div>
            {auto.loading && <div className="mt-1 flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Route …</div>}
            {auto.err && <div className="mt-1 text-sm text-stone-400 dark:text-stone-500">Route nicht ermittelbar ({auto.err}).</div>}
            {auto.data && (
              <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
                <div><div className="text-xs text-stone-400 dark:text-stone-500">Dauer</div><div className="font-semibold text-stone-800 dark:text-stone-100">{hm(auto.data.min)}</div><div className="text-xs text-stone-400 dark:text-stone-500">{auto.data.km} km</div></div>
                <div><div className="text-xs text-stone-400 dark:text-stone-500">Sprit (gesamt)</div><div className="font-semibold text-stone-800 dark:text-stone-100">{eur(autoKostenGes)}</div><div className="text-xs text-stone-400 dark:text-stone-500">{eur(autoKostenGes / personen)}/Person</div></div>
                <div><div className="text-xs text-stone-400 dark:text-stone-500 inline-flex items-center gap-1"><Leaf className="h-3 w-3" />CO₂</div><div className="font-semibold text-stone-800 dark:text-stone-100">{kg(autoCO2)}</div><div className="text-xs text-stone-400 dark:text-stone-500">{kg(autoCO2 / personen)}/Person</div></div>
              </div>
            )}
          </div>

          {/* BAHN */}
          <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
            <span className="inline-flex items-center gap-2 font-semibold text-stone-800 dark:text-stone-100"><Train className="h-4 w-4 text-emerald-700" /> Bahn<Badge show={fastest === "bahn"} kind="fast" /><Badge show={greenest === "bahn"} kind="co2" /></span>
            {bahn.loading && <div className="mt-1 flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Verbindung …</div>}
            {bahn.err && <div className="mt-1 text-sm text-stone-400 dark:text-stone-500">Keine Verbindung ermittelbar ({bahn.err}).</div>}
            {bahn.data && (
              <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
                <div><div className="text-xs text-stone-400 dark:text-stone-500">Schnellste</div><div className="font-semibold text-stone-800 dark:text-stone-100">{hm(bahn.data.min)}</div><div className="text-xs text-stone-400 dark:text-stone-500 truncate">bis {bahn.data.station}</div></div>
                <div><div className="text-xs text-stone-400 dark:text-stone-500">Umstiege</div><div className="font-semibold text-stone-800 dark:text-stone-100">{bahn.data.umst === 0 ? "direkt" : bahn.data.umst}</div></div>
                <div><div className="text-xs text-stone-400 dark:text-stone-500 inline-flex items-center gap-1"><Leaf className="h-3 w-3" />CO₂</div><div className="font-semibold text-stone-800 dark:text-stone-100">{kg(bahnCO2)}</div><div className="text-xs text-stone-400 dark:text-stone-500">/Person</div></div>
              </div>
            )}
            <div className="mt-1 text-xs text-stone-400 dark:text-stone-500">Preis stark variabel – Sparpreis/Deutschland-Ticket auf <a href="https://www.bahn.de" target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-800">bahn.de</a> prüfen.</div>
          </div>

          {/* FLUG */}
          <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
            <span className="inline-flex items-center gap-2 font-semibold text-stone-800 dark:text-stone-100"><Plane className="h-4 w-4 text-emerald-700" /> Flug ab HAJ<Badge show={greenest === "flug"} kind="co2" /></span>
            {flug && flug.direkt ? (
              <div className="mt-1 text-sm">
                <div className="text-stone-800 dark:text-stone-100"><b>Direktflug</b> nach {flug.name} <span className="font-mono text-xs text-stone-500 dark:text-stone-400">{flug.iata}</span> · {flug.airline} <span className="text-stone-400 dark:text-stone-500">({flug.saison})</span></div>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <div><div className="text-xs text-stone-400 dark:text-stone-500">Flughafen</div><div className="text-sm font-semibold text-stone-800 dark:text-stone-100">{flug.iata}</div><div className="text-xs text-stone-400 dark:text-stone-500">~{flug.d} km vom Ziel</div></div>
                  <div><div className="text-xs text-stone-400 dark:text-stone-500 inline-flex items-center gap-1"><Leaf className="h-3 w-3" />CO₂</div><div className="text-sm font-semibold text-stone-800 dark:text-stone-100">{kg(flugCO2)}</div><div className="text-xs text-stone-400 dark:text-stone-500">/Person</div></div>
                  <div className="flex items-end"><a href={`https://www.google.com/travel/flights?q=${enc("Fluege HAJ " + flug.iata)}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-emerald-700 hover:text-emerald-800">Flüge suchen <ExternalLink className="inline h-3 w-3" /></a></div>
                </div>
              </div>
            ) : (
              <div className="mt-1 text-sm text-stone-500 dark:text-stone-400">Kein Direktflug ab HAJ in Zielnähe (in der kuratierten Auswahl). Volle Karte: <a href="https://www.hannover-airport.de/rund-ums-fliegen/direktziele/" target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-800">hannover-airport.de</a>.</div>
            )}
          </div>

          <div className="flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Kosten/CO₂ sind Schätzungen (Auto {"~"}150 g/km, Bahn {"~"}32 g/Pkm, Flug {"~"}180 g/Pkm; Auto-Kosten nach deinen Werten). Bahn-/Flugpreise variabel – bewusst nicht geschätzt. Quellen: OSRM, DB (v6.db.transport.rest), Photon/OSM.</span></div>
        </div>
      )}
    </section>
  );
}
