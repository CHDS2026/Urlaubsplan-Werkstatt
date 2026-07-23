/*
  Startseite.jsx — echte Overview: führt mit deinem Inhalt, nicht mit einem Menü
  -----------------------------------------------------------------------------
  Oben deine nächste/laufende Reise (Countdown, Ort, Zeitraum) als Blickfang,
  dann Schnellaktionen und Kennzahlen, darunter die Bereiche. Die vollständige
  Werkzeugliste liegt bewusst NICHT mehr hier (erreichbar über „Tools“ + Menü) –
  das hält die Startseite übersichtlich. Keine Daten aus dem Netz, alles lokal.

  EINBAU: <Startseite trips={data.trips} ideen={n}
            onGo={({homeTab,toolKey}) => …} onOpenTrip={setActiveId} onCreate={createTrip} />
*/
import React from "react";
import { Calendar, Globe2, Wallet, Compass, ChevronRight, ShieldCheck, Map as MapIcon, Plus, Navigation, ArrowRight, MapPin, Sparkles } from "lucide-react";


function gruss() {
  const h = new Date().getHours();
  if (h < 5) return "Gute Nacht";
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}
const parseD = (iso) => new Date(iso + "T00:00:00");
const heuteISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const tagDiff = (a, b) => Math.round((parseD(a) - parseD(b)) / 86400000);
const fmtD = (iso) => parseD(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
const fmtSpanne = (t) => (t.start && t.end ? `${fmtD(t.start)} – ${fmtD(t.end)} ${parseD(t.end).getFullYear()}` : t.start ? `ab ${fmtD(t.start)}` : "Datum offen");

export default function Startseite({ onGo, trips, ideen, onOpenTrip, onCreate }) {
  const anzR = (trips || []).length;
  const geh = (homeTab, toolKey) => onGo && onGo({ homeTab, toolKey: toolKey || null });
  const neueReise = () => (onCreate ? onCreate() : geh("reisen"));
  const heute = heuteISO();

  const geplant = (trips || []).reduce((n, t) => n + (t.items || []).filter((i) => i.kategorie !== "kosten" && i.day).length, 0);

  const kommend = (trips || []).filter((t) => t.start && t.end && t.end >= heute).sort((a, b) => (a.start < b.start ? -1 : 1));
  const naechste = kommend[0] || null;
  let cd = null;
  if (naechste) {
    if (naechste.start <= heute) {
      const gesamt = tagDiff(naechste.end, naechste.start) + 1;
      const nr = tagDiff(heute, naechste.start) + 1;
      cd = { laeuft: true, text: `Läuft gerade · Tag ${nr} von ${gesamt}` };
    } else {
      const d = tagDiff(naechste.start, heute);
      cd = { laeuft: false, text: d <= 1 ? "Morgen geht’s los" : `Noch ${d} Tage` };
    }
  }

  const aktion = "flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-2 py-3 text-center text-xs font-semibold text-stone-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800 hover:shadow-md dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-emerald-700";
  const chip = "flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";

  return (
    <div className="space-y-4">
      {/* HERO — deine nächste/laufende Reise */}
      <section className="overflow-hidden rounded-2xl border border-emerald-300/40 bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white shadow-sm dark:border-emerald-800/60 dark:from-emerald-800 dark:to-emerald-950">
        {naechste ? (
          <button onClick={() => onOpenTrip && onOpenTrip(naechste.id)} className="block w-full text-left">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100/90">{gruss()} · {cd.laeuft ? "Aktuelle Reise" : "Nächste Reise"}</div>
            <div className="mt-1 text-2xl font-bold leading-tight tracking-tight">{naechste.name || "Reise"}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-emerald-50">
              {(naechste.region || naechste.land) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {[naechste.region, naechste.land].filter(Boolean).join(", ")}</span>}
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {fmtSpanne(naechste)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">{cd.text}</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-50">Öffnen <ArrowRight className="h-4 w-4" /></span>
            </div>
          </button>
        ) : (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-100/90">{gruss()}</div>
            <div className="mt-1 text-2xl font-bold leading-tight tracking-tight">Bereit für die nächste Reise?</div>
            <p className="mt-1 text-sm text-emerald-50">Plane sie Tag für Tag – Programm, Karte, Budget, Packliste.</p>
            <button onClick={neueReise} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50"><Plus className="h-4 w-4" /> Neue Reise</button>
          </div>
        )}
      </section>

      {/* SCHNELLAKTIONEN */}
      <section className="grid grid-cols-3 gap-2">
        <button onClick={neueReise} className={aktion}><span className={chip}><Plus className="h-5 w-5" /></span> Neue Reise</button>
        <button onClick={() => geh("route")} className={aktion}><span className={chip}><Navigation className="h-5 w-5" /></span> Route</button>
        <button onClick={() => geh("ziele")} className={aktion}><span className={chip}><Sparkles className="h-5 w-5" /></span> Ziele &amp; Ideen</button>
      </section>

      {/* KENNZAHLEN */}
      <section className="grid grid-cols-3 gap-2">
        {[
          { n: anzR, l: anzR === 1 ? "Reise" : "Reisen", go: () => geh("reisen") },
          { n: geplant, l: "Programmpunkte", go: () => geh("reisen") },
          { n: ideen || 0, l: "gemerkte Ziele", go: () => geh("ziele") },
        ].map((s, i) => (
          <button key={i} onClick={s.go} className="rounded-2xl border border-stone-200 bg-white px-2 py-3 text-center shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-stone-700 dark:bg-stone-900 dark:hover:border-emerald-700">
            <div className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">{s.n}</div>
            <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{s.l}</div>
          </button>
        ))}
      </section>

      {/* GUT ZU WISSEN */}
      <section>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">Gut zu wissen</div>
        <div className="space-y-1.5 rounded-2xl border border-stone-200 bg-white p-3 text-xs text-stone-500 shadow-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
          <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /><span>Alles liegt <b>nur auf diesem Gerät</b> – kein Konto, keine Cloud. Sicherung unter <button onClick={() => geh("reisen")} className="font-medium text-emerald-700 underline dark:text-emerald-300">Reisen</button> ganz unten.</span></div>
          <div className="flex items-start gap-2"><MapIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /><span>Suche und alle Werkzeuge findest du oben im <b>Menü</b>.</span></div>
        </div>
      </section>
    </div>
  );
}
