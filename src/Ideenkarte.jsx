/*
  Ideenkarte.jsx — gemerkte Ausflugsziele & Wandertouren auf der Karte
  -------------------------------------------------------------------
  Unabhängig von Reisen: alle gemerkten Ziele als Nadeln auf einer interaktiven
  Karte (Karte/Satellit + Wanderwege-Overlay). Jeder Punkt lässt sich später
  einer Reise zuordnen – wahlweise direkt einem TAG oder dem Ideen-Pool der Reise.

  EINBAU:
    <Ideenkarte spots={data.wishlist} trips={data.trips}
      onAddToTrip={(tripId, s, day) => …} onCreateTrip={(wish) => …} onOpenTrip={setActiveId} />
*/
import React, { useState } from "react";
import Reisekarte from "./Reisekarte.jsx";
import { Lightbulb, Plus, Check, X, CalendarPlus, MapPin, Inbox, ChevronLeft } from "lucide-react";

const isValidISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const datesBetween = (start, end) => {
  if (!isValidISO(start) || !isValidISO(end)) return [];
  const out = []; let cur = start, g = 0;
  while (cur <= end && g < 400) { out.push(cur); cur = addDays(cur, 1); g++; }
  return out;
};
const fmtDate = (s) => { const d = new Date(s + "T00:00:00"); return isNaN(d) ? s : d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }); };

export default function Ideenkarte({ spots, trips, onAddToTrip, onCreateTrip, onOpenTrip }) {
  const [sel, setSel] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [tripFor, setTripFor] = useState(null);
  const [done, setDone] = useState({});

  const liste = spots || [];
  const mitKoord = liste.filter((s) => s.lat != null && s.lon != null);
  const reisen = trips || [];

  const oeffne = (id) => { setMenuFor(menuFor === id ? null : id); setTripFor(null); };
  const merke = (id, txt) => { setDone((d) => ({ ...d, [id]: txt })); setMenuFor(null); setTripFor(null); };
  const zuTag = (s, t, day) => {
    if (!onAddToTrip) return;
    onAddToTrip(t.id, { name: s.name, info: s.note || "", gebiet: s.region || "", lat: s.lat, lon: s.lon, kategorie: s.kategorie || "sehenswuerdigkeit" }, day);
    merke(s.id, day ? fmtDate(day) : (t.name || "Reise"));
  };

  const zeile = "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 transition hover:bg-emerald-50 dark:text-stone-200 dark:hover:bg-stone-800";

  return (
    <>
      {mitKoord.length > 0 && (
        <Reisekarte spots={mitKoord} fit titel="Ideen-Karte" onSpotClick={(id) => { setSel(id); setMenuFor(id); setTripFor(null); }} selectedId={sel} />
      )}

      <section className="mb-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900">
        <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
          <Lightbulb className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Gemerkte Ziele {liste.length ? `(${liste.length})` : ""}
        </div>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Ausflugsziele &amp; Wandertouren sammeln – später einer Reise oder direkt einem Tag zuordnen.</p>

        {liste.length === 0 && (
          <div className="mt-3 rounded-xl bg-stone-50 px-3 py-3 text-sm text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            Noch nichts gemerkt. In den Tools (Ideenfinder, Entdecken, Region-Check → Wandern) auf „In Ideen“ tippen.
          </div>
        )}

        <div className="mt-3 space-y-1.5">
          {liste.map((s) => {
            const ausgewaehlt = sel === s.id;
            const auf = menuFor === s.id;
            const t = tripFor ? reisen.find((x) => x.id === tripFor) : null;
            const tage = t ? datesBetween(t.start, t.end) : [];
            return (
              <div key={s.id} className={"rounded-lg px-2.5 py-2 text-sm transition " + (ausgewaehlt ? "bg-emerald-50 dark:bg-emerald-950" : "bg-stone-50 dark:bg-stone-800")}>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSel(ausgewaehlt ? null : s.id)} className="min-w-0 flex-1 text-left">
                    <span className="block font-semibold text-stone-800 dark:text-stone-100">{s.name}</span>
                    <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                      {[s.region, s.land].filter(Boolean).join(", ")}{s.lat == null ? " · kein Ort hinterlegt" : ""}
                    </span>
                  </button>
                  {done[s.id]
                    ? <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /> {done[s.id]}</span>
                    : <button onClick={() => oeffne(s.id)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800">{auf ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} Zuordnen</button>}
                </div>

                {auf && (
                  <div className="mt-2 space-y-1 rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900">
                    {!t ? (
                      <>
                        {reisen.length > 0 && <div className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">Zu welcher Reise?</div>}
                        {reisen.slice(0, 10).map((r) => (
                          <button key={r.id} onClick={() => setTripFor(r.id)} className={zeile}>
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                            <span className="min-w-0 flex-1 truncate">{r.name || "Reise"}</span>
                            <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">{datesBetween(r.start, r.end).length || "–"} Tage</span>
                          </button>
                        ))}
                        {onCreateTrip && (
                          <button onClick={() => { onCreateTrip(s); merke(s.id, "neue Reise"); }} className={zeile + " font-medium"}>
                            <CalendarPlus className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> Neue Reise daraus erstellen
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button onClick={() => setTripFor(null)} className="mb-1 inline-flex items-center gap-1 px-1 text-xs font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"><ChevronLeft className="h-3 w-3" /> zurück</button>
                        <div className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">An welchen Tag? · {t.name || "Reise"}</div>
                        <button onClick={() => zuTag(s, t, null)} className={zeile}>
                          <Inbox className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> Ideen-Pool der Reise (ohne Tag)
                        </button>
                        {tage.map((d, i) => (
                          <button key={d} onClick={() => zuTag(s, t, d)} className={zeile}>
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-700 text-xs font-bold text-white">{i + 1}</span> {fmtDate(d)}
                          </button>
                        ))}
                        {tage.length === 0 && <div className="px-1 py-1 text-xs text-stone-400 dark:text-stone-500">Diese Reise hat noch kein Datum – geht in den Ideen-Pool.</div>}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {liste.length > 0 && mitKoord.length < liste.length && (
          <div className="mt-2 text-xs text-stone-400 dark:text-stone-500">{liste.length - mitKoord.length} Ziel(e) ohne Koordinaten erscheinen nicht auf der Karte, lassen sich aber zuordnen.</div>
        )}
      </section>
    </>
  );
}
