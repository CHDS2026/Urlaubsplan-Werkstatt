/*
  Angebote.jsx — Günstige Angebote: Bahn-Sparpreise ab Celle + Flugsuche ab HAJ
  ----------------------------------------------------------------------------
  Ziel + Datum eingeben ->
   • Bahn: günstigste Verbindungen LIVE über v6.db.transport.rest (tickets=true,
     echte Sparpreise, ohne Schlüssel, CORS). "Bestpreis" nur für künftige Tage.
   • Flug: kein gratis Live-Preis möglich -> vorbefüllter Google-Flights-Link
     (HAJ -> Ziel, Datum) + Hinweis auf Direktflug ab HAJ.
  Datenschutzfreundlich: fester Start Celle/Hannover, keine Geräte-Ortung.

  EINBAU: <Angebote /> (keine Props nötig).
*/
import React, { useState, useRef } from "react";
import { Train, Plane, Search, Loader2, Info, Calendar, ExternalLink, Tag } from "lucide-react";

const enc = encodeURIComponent;
async function jget(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { const r = await fetch(url, { signal: ctrl.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
function hav(aLa, aLo, bLa, bLo) {
  const R = 6371, r = Math.PI / 180, dLa = (bLa - aLa) * r, dLo = (bLo - aLo) * r;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(aLa * r) * Math.cos(bLa * r) * Math.sin(dLo / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}
const hhmm = (d) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
const eur = (n) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const ddmmyyyy = (iso) => { const p = iso.split("-"); return p[2] + "." + p[1] + "." + p[0]; };
function hm(min) { const h = Math.floor(min / 60), m = min % 60; return h > 0 ? h + " h " + (m < 10 ? "0" + m : m) + " min" : m + " min"; }

// Direktflug-Ziele ab HAJ (Auswahl) – nur für den Hinweis "fliegt direkt dahin"
const HAJ = [
  { n: "Frankfurt", la: 50.0379, lo: 8.5622, air: "Lufthansa" }, { n: "München", la: 48.3538, lo: 11.7861, air: "Lufthansa" },
  { n: "London", la: 51.4700, lo: -0.4543, air: "British Airways" }, { n: "Kopenhagen", la: 55.6180, lo: 12.6508, air: "SAS" },
  { n: "Istanbul", la: 41.2753, lo: 28.7519, air: "Turkish Airlines" }, { n: "Palma", la: 39.5517, lo: 2.7388, air: "TUI fly u. a." },
  { n: "Antalya", la: 36.8987, lo: 30.8005, air: "TUI fly u. a." }, { n: "Gran Canaria", la: 27.9319, lo: -15.3866, air: "TUI fly" },
  { n: "Teneriffa", la: 28.0445, lo: -16.5725, air: "TUI fly" }, { n: "Fuerteventura", la: 28.4527, lo: -13.8638, air: "TUI fly" },
  { n: "Nizza", la: 43.6584, lo: 7.2159, air: "Eurowings" }, { n: "Alicante", la: 38.2822, lo: -0.5581, air: "Eurowings" },
  { n: "Lissabon", la: 38.7742, lo: -9.1342, air: "Eurowings" }, { n: "Pula", la: 44.8935, lo: 13.9222, air: "Eurowings" },
  { n: "Bozen", la: 46.4602, lo: 11.3264, air: "SkyAlps" }, { n: "Hurghada", la: 27.1783, lo: 33.7994, air: "TUI fly u. a." },
];
function flugMatch(la, lo) {
  if (la == null || lo == null) return null;
  let best = null; for (const a of HAJ) { const d = hav(la, lo, a.la, a.lo); if (!best || d < best.d) best = { ...a, d }; }
  return best && best.d <= 150 ? best : null;
}

async function bahnSuche(q, dateISO, celleIdRef) {
  if (!celleIdRef.current) {
    const cl = await jget(`https://v6.db.transport.rest/locations?query=Celle&results=1&stops=true&addresses=false&poi=false`);
    celleIdRef.current = (Array.isArray(cl) && cl[0] && cl[0].id) || null;
  }
  if (!celleIdRef.current) throw new Error("Start Celle nicht gefunden");
  const dl = await jget(`https://v6.db.transport.rest/locations?query=${enc(q)}&results=1&stops=true&addresses=false&poi=false`);
  const to = Array.isArray(dl) && dl[0]; if (!to || !to.id) throw new Error("Ziel-Bahnhof nicht gefunden");
  const jr = await jget(`https://v6.db.transport.rest/journeys?from=${celleIdRef.current}&to=${to.id}&departure=${enc(dateISO + "T06:00:00")}&results=12&tickets=true&stopovers=false&language=de`);
  const journeys = (jr && jr.journeys) || [];
  const rows = [];
  for (const j of journeys) {
    const legs = (j.legs || []).filter((l) => !l.walking); if (!legs.length) continue;
    const price = j.price && typeof j.price.amount === "number" ? j.price.amount : null;
    const dep = new Date(legs[0].departure || legs[0].plannedDeparture);
    const arr = new Date(legs[legs.length - 1].arrival || legs[legs.length - 1].plannedArrival);
    const lines = Array.from(new Set(legs.map((l) => l.line && (l.line.name || "").trim().split(/\s+/)[0]).filter(Boolean)));
    rows.push({ price, dep, min: Math.round((arr - dep) / 60000), umst: Math.max(0, legs.length - 1), lines });
  }
  const priced = rows.filter((r) => r.price != null).sort((a, b) => a.price - b.price);
  const coords = to.location ? { la: to.location.latitude, lo: to.location.longitude } : null;
  return { station: to.name, cheap: priced.slice(0, 5), anyCount: rows.length, pricedCount: priced.length, flug: coords ? flugMatch(coords.la, coords.lo) : null };
}

const dbLink = (to, dateISO) => "https://www.bahn.de/buchung/fahrplan/suche#sts=true&so=Celle&zo=" + enc(to) + "&hd=" + dateISO + "T06:00:00&hza=D&bp=true";
const gflights = (dest, dateISO) => "https://www.google.com/travel/flights?q=" + enc("Flüge Hannover HAJ nach " + dest + " am " + ddmmyyyy(dateISO));

export default function Angebote() {
  const def = new Date(); def.setDate(def.getDate() + 14);
  const min = new Date(); min.setDate(min.getDate() + 1);
  const [q, setQ] = useState("");
  const [date, setDate] = useState(def.toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [bahn, setBahn] = useState(null);
  const [flugDest, setFlugDest] = useState(null);
  const celleIdRef = useRef(null);

  async function suchen() {
    const term = q.trim(); if (!term || loading) return;
    setLoading(true); setErr(""); setBahn(null); setFlugDest({ name: term, date });
    try { setBahn(await bahnSuche(term, date, celleIdRef)); }
    catch (e) { setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }

  const INPUT = "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900";

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
        <Tag className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Günstige Angebote
      </div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Ziel + Datum wählen: günstigste Bahnverbindungen ab Celle (echte Sparpreise) und Flugsuche ab Hannover.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") suchen(); }} placeholder="Ziel (Stadt/Bahnhof) …" className={INPUT + " min-w-0 flex-1"} />
        <span className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 dark:border-stone-700 dark:bg-stone-900">
          <Calendar className="h-4 w-4 text-stone-400" />
          <input type="date" value={date} min={min.toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="bg-transparent py-2 text-sm focus:outline-none" />
        </span>
        <button onClick={suchen} disabled={loading} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Suchen
        </button>
      </div>
      {err && <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err}</div>}

      {(loading || bahn) && (
        <div className="mt-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200"><Train className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Bahn-Sparpreise{bahn ? " · " + bahn.station : ""}</div>
          {loading && <div className="flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> günstigste Verbindungen …</div>}
          {bahn && bahn.cheap.length > 0 && (
            <div className="space-y-1.5">
              {bahn.cheap.map((r, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-stone-50 px-2.5 py-2 text-sm dark:bg-stone-800">
                  <span className={"inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-bold " + (i === 0 ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300")}>{i === 0 && <Tag className="h-3.5 w-3.5" />}{eur(r.price)}</span>
                  <span className="flex-1 text-stone-700 dark:text-stone-200">ab {hhmm(r.dep)} · {hm(r.min)} · {r.umst === 0 ? "direkt" : r.umst + " Umst."}</span>
                  <span className="flex flex-wrap justify-end gap-1">{r.lines.slice(0, 3).map((l) => <span key={l} className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-mono text-stone-600 dark:bg-stone-700 dark:text-stone-300">{l}</span>)}</span>
                </div>
              ))}
              <div className="pt-1 text-xs text-stone-400 dark:text-stone-500">Günstigste aus {bahn.anyCount} Verbindungen ab 06:00 · Preise ohne Gewähr.</div>
            </div>
          )}
          {bahn && bahn.cheap.length === 0 && (
            <div className="text-sm text-stone-500 dark:text-stone-400">
              {bahn.anyCount === 0 ? "Keine direkte Zug-Verbindung gefunden." : "Für diesen Tag sind keine Preise abrufbar (z. B. zu kurzfristig – Bestpreise gibt's nur für künftige Tage)."}
            </div>
          )}
          <a href={dbLink(bahn ? bahn.station : q, date)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"><ExternalLink className="h-3.5 w-3.5" /> Auf bahn.de buchen</a>
        </div>
      )}

      {flugDest && (
        <div className="mt-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
          <div className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200"><Plane className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Flug ab Hannover</div>
          {bahn && bahn.flug
            ? <div className="text-sm text-stone-700 dark:text-stone-200"><b>Direktflug</b> ab HAJ nach {bahn.flug.n} · {bahn.flug.air}</div>
            : <div className="text-sm text-stone-500 dark:text-stone-400">Kein Direktflug ab HAJ in Zielnähe (in der Auswahl) – Umsteigeverbindungen zeigt die Suche.</div>}
          <div className="mt-1 text-xs text-stone-400 dark:text-stone-500">Live-Flugpreise gibt es leider nicht gratis/ohne Schlüssel – hier der vorbefüllte Preisvergleich:</div>
          <a href={gflights(flugDest.name, flugDest.date)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"><ExternalLink className="h-4 w-4" /> Flüge HAJ → {flugDest.name} am {ddmmyyyy(flugDest.date)}</a>
        </div>
      )}

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Bahn: v6.db.transport.rest (DB-Sparpreise, ohne FlixTrain, Community-Dienst mit Limit). Flug: nur vorbefüllte Suche, keine Live-Preise. Alle Angaben ohne Gewähr.</span></div>
    </section>
  );
}
