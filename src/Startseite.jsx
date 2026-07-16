/*
  Startseite.jsx — Übersicht & Legende mit Sprung zu jedem Punkt
  --------------------------------------------------------------
  Die erste Seite der App: zeigt auf einen Blick, was es gibt und wo es liegt.
  Jeder Eintrag springt direkt dorthin. Bewusst schlicht – nur Bereiche + Werkzeuge,
  keine Daten, kein Laden, kein Netz.

  EINBAU: <Startseite onGo={({homeTab, toolKey}) => …} trips={data.trips} ideen={n} />
*/
import React from "react";
import { GROUPS } from "./ReiseTools.jsx";
import { Calendar, Globe2, Wallet, Compass, ChevronRight, Search, ShieldCheck, Map as MapIcon } from "lucide-react";

const BEREICHE = [
  { k: "reisen", label: "Reisen", Icon: Calendar, txt: "Deine Reisen planen: Tage & Programm, Karte, Budget, Packliste, Dokumente, PDF – und die Datensicherung." },
  { k: "ziele", label: "Ziele & Ideen", Icon: Globe2, txt: "Gemerkte Ausflugsziele und Touren auf der Ideen-Karte – später einer Reise oder einem Tag zuordnen." },
  { k: "bestpreis", label: "Bestpreis", Icon: Wallet, txt: "Preisübersicht zu deinen Reisen." },
  { k: "tools", label: "Tools", Icon: Compass, txt: "Alle Werkzeuge in drei Schritten: Ideen finden · Ziel prüfen · Anreise & Preise." },
];

export default function Startseite({ onGo, trips, ideen }) {
  const anzR = (trips || []).length;
  const geh = (homeTab, toolKey) => onGo && onGo({ homeTab, toolKey: toolKey || null });

  const karte = "flex w-full items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left transition hover:border-emerald-300 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-emerald-700";
  const zeile = "flex w-full items-center gap-2.5 border-b border-stone-100 px-3 py-2.5 text-left transition last:border-0 hover:bg-emerald-50 dark:border-stone-800 dark:hover:bg-stone-800";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
        <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100">Urlaubsplaner</h1>
        <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
          Alles auf einen Blick – tippe einen Punkt an, um direkt dorthin zu springen.
          Oben gibt es außerdem <span className="inline-flex items-center gap-1 font-medium"><Search className="h-3 w-3" />Suche</span>: Stichwort oder Frage eintippen, die App findet den passenden Bereich.
        </p>
      </section>

      <section>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">Bereiche</div>
        <div className="grid gap-2">
          {BEREICHE.map((b) => (
            <button key={b.k} onClick={() => geh(b.k)} className={karte}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><b.Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">{b.label}</span>
                  {b.k === "reisen" && anzR > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">{anzR}</span>}
                  {b.k === "ziele" && ideen > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">{ideen}</span>}
                </span>
                <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{b.txt}</span>
              </span>
              <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-stone-300 dark:text-stone-600" />
            </button>
          ))}
        </div>
      </section>

      {GROUPS.map((g) => (
        <section key={g.g}>
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">{g.g}</div>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
            {g.items.map((it) => (
              <button key={it.k} onClick={() => geh("tools", it.k)} className={zeile}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"><it.Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-stone-800 dark:text-stone-100">{it.label}</span>
                  <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{it.desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-stone-300 dark:text-stone-600" />
              </button>
            ))}
          </div>
        </section>
      ))}

      <section>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">Gut zu wissen</div>
        <div className="space-y-1.5 rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
          <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /><span>Alles liegt <b>nur auf diesem Gerät</b> – kein Konto, keine Cloud. Sicherung unter <button onClick={() => geh("reisen")} className="font-medium text-emerald-700 underline dark:text-emerald-300">Reisen</button> ganz unten.</span></div>
          <div className="flex items-start gap-2"><MapIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /><span>Karten: zoomen &amp; verschieben mit den Fingern, umschaltbar zwischen Karte, Satellit und Wanderwegen.</span></div>
          <div className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /><span>Die Zurück-Taste geht eine Ebene hoch, statt die App zu schließen.</span></div>
        </div>
      </section>
    </div>
  );
}
