/*
  Verkehr.jsx — Anreise-Übersicht für den Urlaubsplaner (eigenständiger Baustein)
  --------------------------------------------------------------------------------
  A) Direktflüge ab Hannover (HAJ): kuratierte Auswahl mit Airline + Saison,
     filterbar nach Monat. Fakten (Stand Juli 2026, ohne Gewähr) – Quelle & volle
     Karte: hannover-airport.de. Rechtlich sauber: Fakten + Quellenlink, keine Preise.
  B) Direktzüge ab Celle: LIVE-Übersicht über v6.db.transport.rest (DB-Daten, CORS,
     ohne Key). Zeigt, in welche Richtungen ab Celle direkt Züge fahren (nächste ~10 h).

  EINBAU: eigener Tab/Screen, z. B.
    import Verkehr from "./Verkehr.jsx";
    <Verkehr />
  (Braucht keine Props.)
*/
import React, { useState } from "react";
import {
  Plane, Train, ExternalLink, Loader2, Info, Calendar, ArrowRight, RefreshCw,
} from "lucide-react";

const enc = encodeURIComponent;
const flag = (cc) => (cc || "").toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

async function jget(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

/* ---------- A) Direktflüge ab HAJ (kuratierte Auswahl, Stand Juli 2026) ---------- */
const FLUEGE = [
  { ziel: "Frankfurt", iata: "FRA", land: "DE", airline: "Lufthansa", saison: "ganzjährig", note: "Drehkreuz – weltweite Anschlüsse" },
  { ziel: "München", iata: "MUC", land: "DE", airline: "Lufthansa", saison: "ganzjährig", note: "Drehkreuz · Top-Strecke ab HAJ" },
  { ziel: "London-Heathrow", iata: "LHR", land: "GB", airline: "British Airways", saison: "ganzjährig", note: "Anschlüsse Nordamerika" },
  { ziel: "Kopenhagen", iata: "CPH", land: "DK", airline: "SAS", saison: "ganzjährig", note: "Skandinavien-Hub · 2026 aufgestockt" },
  { ziel: "Istanbul", iata: "IST", land: "TR", airline: "Turkish Airlines", saison: "ganzjährig", note: "Anschlüsse Asien" },
  { ziel: "Palma de Mallorca", iata: "PMI", land: "ES", airline: "TUI fly u. a.", saison: "ganzjährig", note: "Top-Strecke · im Sommer sehr stark" },
  { ziel: "Antalya", iata: "AYT", land: "TR", airline: "TUI fly · SunExpress · Corendon", saison: "ganzjährig", note: "Top-Strecke · Sommer stark" },
  { ziel: "Gran Canaria", iata: "LPA", land: "ES", airline: "TUI fly", saison: "ganzjährig", note: "täglich · Winter stark" },
  { ziel: "Teneriffa", iata: "TFS", land: "ES", airline: "TUI fly", saison: "ganzjährig", note: "täglich · Winter stark" },
  { ziel: "Fuerteventura", iata: "FUE", land: "ES", airline: "TUI fly", saison: "ganzjährig", note: "mehrmals/Woche" },
  { ziel: "Hurghada", iata: "HRG", land: "EG", airline: "TUI fly · Corendon", saison: "ganzjährig", note: "mehrmals/Woche · Winter stark" },
  { ziel: "Nizza", iata: "NCE", land: "FR", airline: "Eurowings", saison: "sommer", note: "neu 2026 · ab 29.04. (Mi/Fr/So)" },
  { ziel: "Alicante", iata: "ALC", land: "ES", airline: "Eurowings", saison: "sommer", note: "neu 2026 · ab 05.05. (Di/Sa)" },
  { ziel: "Lissabon", iata: "LIS", land: "PT", airline: "Eurowings", saison: "sommer", note: "ab Ende März (Di/Do/Sa)" },
  { ziel: "Stockholm", iata: "ARN", land: "SE", airline: "Eurowings", saison: "sommer", note: "2026 aufgestockt" },
  { ziel: "Pula", iata: "PUY", land: "HR", airline: "Eurowings", saison: "sommer", note: "2026 aufgestockt" },
  { ziel: "Bozen", iata: "BZO", land: "IT", airline: "SkyAlps", saison: "saisonal", note: "Südtirol/Dolomiten · Mo/Do" },
  { ziel: "Edremit (Ägäis)", iata: "EDO", land: "TR", airline: "SunExpress", saison: "sommer", note: "2×/Woche" },
];

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
function monate(saison) {
  if (saison === "winter") return [11, 12, 1, 2, 3];
  if (saison === "sommer" || saison === "saisonal") return [4, 5, 6, 7, 8, 9, 10]; // ca. Ende März–Ende Okt
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}
const SAISON_STYLE = {
  ganzjährig: "bg-emerald-100 text-emerald-800",
  sommer: "bg-amber-100 text-amber-800",
  winter: "bg-sky-100 text-sky-800",
  saisonal: "bg-stone-200 text-stone-700 dark:text-stone-200",
};
const SAISON_LABEL = { ganzjährig: "ganzjährig", sommer: "Sommer", winter: "Winter", saisonal: "saisonal" };

/* ---------- B) Direktzüge ab Celle (live) ---------- */
async function ladeBahn(name) {
  const loc = await jget(`https://v6.db.transport.rest/locations?query=${enc(name)}&results=1&stops=true&addresses=false&poi=false`);
  const stop = Array.isArray(loc) ? loc[0] : null;
  if (!stop || !stop.id) throw new Error("Bahnhof nicht gefunden");
  const dep = await jget(`https://v6.db.transport.rest/stops/${stop.id}/departures?duration=600&results=400&language=de`);
  const arr = Array.isArray(dep) ? dep : (dep.departures || []);
  const map = new Map();
  for (const d of arr) {
    const dir = d.direction || (d.destination && d.destination.name) || "—";
    const ln = d.line || {};
    const prefix = (ln.name || "").trim().split(/\s+/)[0] || (ln.productName || "");
    if (!map.has(dir)) map.set(dir, { direction: dir, lines: new Set(), count: 0 });
    const e = map.get(dir); e.count++; if (prefix) e.lines.add(prefix);
  }
  const list = Array.from(map.values())
    .map((e) => ({ direction: e.direction, lines: Array.from(e.lines).slice(0, 4), count: e.count }))
    .sort((a, b) => b.count - a.count);
  return { stopName: stop.name, count: arr.length, list };
}

/* ---------- component ---------- */
export default function Verkehr() {
  const [tab, setTab] = useState("flug");
  const [monat, setMonat] = useState(0); // 0 = alle
  const [bahnhof, setBahnhof] = useState("Celle");
  const [bahn, setBahn] = useState(null);
  const [bLoad, setBLoad] = useState(false);
  const [bErr, setBErr] = useState("");

  const fluege = FLUEGE
    .filter((f) => monat === 0 || monate(f.saison).includes(monat))
    .sort((a, b) => a.ziel.localeCompare(b.ziel, "de"));

  async function bahnLaden(name) {
    setBLoad(true); setBErr(""); setBahn(null);
    try { setBahn(await ladeBahn(name)); }
    catch (e) { setBErr(e.message || String(e)); }
    finally { setBLoad(false); }
  }

  return (
    <div className="space-y-4">
      {/* tabs */}
      <div className="flex gap-2">
        {[{ k: "flug", label: "Flüge ab Hannover", Icon: Plane }, { k: "bahn", label: "Bahn ab Celle", Icon: Train }].map((t) => {
          const A = t.Icon; const on = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={"inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition " +
                (on ? "bg-emerald-700 text-white" : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700")}>
              <A className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ---------- FLÜGE ---------- */}
      {tab === "flug" && (
        <section className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
              <Plane className="h-4 w-4 text-emerald-700" /> Direktflüge ab HAJ
            </div>
            <div className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 text-stone-400 dark:text-stone-500" />
              <select value={monat} onChange={(e) => setMonat(Number(e.target.value))}
                className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1.5 text-sm focus:border-emerald-400 focus:outline-none">
                <option value={0}>Alle Monate</option>
                {MONATE.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-3 divide-y divide-stone-100">
            {fluege.map((f) => (
              <div key={f.iata} className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 text-lg leading-none">{flag(f.land)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-stone-900 dark:text-stone-100">{f.ziel}</span>
                    <span className="rounded bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 text-xs font-mono text-stone-500 dark:text-stone-400">{f.iata}</span>
                    <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (SAISON_STYLE[f.saison] || "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300")}>{SAISON_LABEL[f.saison]}</span>
                  </div>
                  <div className="text-sm text-stone-600 dark:text-stone-300">{f.airline}</div>
                  {f.note && <div className="text-xs text-stone-400 dark:text-stone-500">{f.note}</div>}
                </div>
                <a href={`https://www.google.com/travel/flights?q=${enc("Fluege HAJ " + f.iata)}`} target="_blank" rel="noreferrer"
                  className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800">
                  Flüge <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
            {fluege.length === 0 && <div className="py-4 text-sm text-stone-400 dark:text-stone-500">Für diesen Monat ist in der Auswahl kein Ziel hinterlegt – volle Karte beim Airport prüfen.</div>}
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-2 text-xs text-stone-500 dark:text-stone-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Auswahl (~{FLUEGE.length} von 60+ Zielen) · Stand Juli 2026 · <b>ohne Gewähr</b>. Saison: Sommer ≈ Ende März–Ende Okt, Winter ≈ Ende Okt–Ende März.
              Vollständige, tagesaktuelle Flugzielkarte:{" "}
              <a href="https://www.hannover-airport.de/rund-ums-fliegen/direktziele/" target="_blank" rel="noreferrer" className="font-medium text-emerald-700 hover:text-emerald-800">hannover-airport.de</a>.
            </span>
          </div>
        </section>
      )}

      {/* ---------- BAHN ---------- */}
      {tab === "bahn" && (
        <section className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
              <Train className="h-4 w-4 text-emerald-700" /> Direktzüge ab {bahn ? bahn.stopName : bahnhof}
            </div>
            <div className="inline-flex items-center gap-1">
              {["Celle", "Hannover Hbf"].map((n) => (
                <button key={n} onClick={() => { setBahnhof(n); setBahn(null); setBErr(""); }}
                  className={"rounded-full px-3 py-1 text-xs font-medium " + (bahnhof === n ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400")}>{n}</button>
              ))}
            </div>
          </div>

          {!bahn && !bLoad && !bErr && (
            <button onClick={() => bahnLaden(bahnhof)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
              <Train className="h-4 w-4" /> Direktverbindungen laden
            </button>
          )}
          {bLoad && <div className="mt-3 flex items-center gap-2 rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-3 text-sm text-stone-500 dark:text-stone-400"><Loader2 className="h-4 w-4 animate-spin" /> Abfahrten werden geladen …</div>}
          {bErr && <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {bErr} – der Dienst ist ein Community-Angebot mit niedrigem Limit; kurz warten und erneut versuchen.</div>}

          {bahn && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-stone-400">{bahn.list.length} Richtungen · nächste ~10 h</span>
                <button onClick={() => bahnLaden(bahnhof)} className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800"><RefreshCw className="h-3.5 w-3.5" /> aktualisieren</button>
              </div>
              <div className="divide-y divide-stone-100">
                {bahn.list.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <ArrowRight className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="flex-1 text-sm text-stone-800 dark:text-stone-100">{r.direction}</span>
                    <span className="flex flex-wrap justify-end gap-1">
                      {r.lines.map((l) => <span key={l} className="rounded bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 text-xs font-mono text-stone-600 dark:text-stone-300">{l}</span>)}
                    </span>
                    <span className="w-8 text-right text-xs text-stone-400 dark:text-stone-500">×{r.count}</span>
                  </div>
                ))}
                {bahn.list.length === 0 && <div className="py-4 text-sm text-stone-400 dark:text-stone-500">Gerade keine Abfahrten im Fenster.</div>}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-2 text-xs text-stone-500 dark:text-stone-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Live über v6.db.transport.rest (DB-Daten, <b>ohne FlixTrain</b>) · „Richtung" = Endziel des Zuges, er hält unterwegs an weiteren Stationen · Momentaufnahme, kein voller Tagesfahrplan.</span>
          </div>
        </section>
      )}
    </div>
  );
}
