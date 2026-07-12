/*
  ReiseTools.jsx — Tool-Hub mit Menü-Strukturbaum + Dark-Mode
  -----------------------------------------------------------
  Oben ein aufklappbares Menü (Strukturbaum: Übersicht -> Gruppen -> Tools),
  darunter die Übersicht mit Menü-Karten. Tool öffnet full-width, Rücksprung
  über Menü oder "Übersicht".

  EINBAU (unverändert): <ReiseTools /> bzw. mit "In Ideen":
    <ReiseTools onAdd={(s) => onAdd(mkItem(
      { kategorie: "sehenswuerdigkeit", name: s.name, info: s.info, gebiet: s.gebiet, maps_suche: s.name },
      { day: null, order: 0, lat: s.lat ?? null, lon: s.lon ?? null }
    ))} />
*/
import React, { useState } from "react";
import { Lightbulb, Sparkles, CalendarDays, Compass, CloudSun, ArrowLeftRight, Plane, Thermometer, ChevronLeft, ChevronRight, Menu, X, LayoutGrid } from "lucide-react";
import Ideenfinder from "./Ideenfinder.jsx";
import Entdecken from "./Entdecken.jsx";
import WohinImMonat from "./WohinImMonat.jsx";
import Reiseberatung from "./Reiseberatung.jsx";
import Anreise from "./Anreise.jsx";
import Verkehr from "./Verkehr.jsx";
import Bedingungen from "./Bedingungen.jsx";
import Wetterkarte from "./Wetterkarte.jsx";

const GROUPS = [
  {
    g: "Wohin? – Inspiration", gIcon: Lightbulb,
    items: [
      { k: "ideen", label: "Ideenfinder", desc: "Passende Region nach deinen Vorlieben", Icon: Lightbulb, C: Ideenfinder, add: true },
      { k: "entdecken", label: "Entdecken", desc: "Themen (Thermen, Burgen, Seen …) im Umkreis", Icon: Sparkles, C: Entdecken, add: true },
      { k: "monat", label: "Wohin im Monat", desc: "Ziele nach echtem Klima für einen Monat", Icon: CalendarDays, C: WohinImMonat, add: true },
    ],
  },
  {
    g: "Region im Detail", gIcon: Compass,
    items: [
      { k: "region", label: "Reiseberatung", desc: "Steckbrief, Fakten, Sehenswürdigkeiten", Icon: Compass, C: Reiseberatung, add: true },
      { k: "vorort", label: "Vor-Ort-Check", desc: "Wetter, Licht, Luft & Pollen, Fotos, Feiertage", Icon: CloudSun, C: Bedingungen, add: false },
    ],
  },
  {
    g: "Anreise & Verkehr", gIcon: ArrowLeftRight,
    items: [
      { k: "anreise", label: "Anreise-Vergleich", desc: "Auto vs. Bahn vs. Flug + Kosten/CO₂", Icon: ArrowLeftRight, C: Anreise, add: false },
      { k: "verkehr", label: "Verkehr ab HAJ / Celle", desc: "Direktflüge ab Hannover & Direktzüge ab Celle", Icon: Plane, C: Verkehr, add: false },
    ],
  },
  {
    g: "Wetter", gIcon: Thermometer,
    items: [
      { k: "karte", label: "Wetterkarte", desc: "14-Tage-Karte, Land wählbar (inkl. Türkei)", Icon: Thermometer, C: Wetterkarte, add: false },
    ],
  },
];
const ALL = GROUPS.flatMap((grp) => grp.items);

export default function ReiseTools({ onAdd }) {
  const [active, setActive] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const cur = active ? ALL.find((t) => t.k === active) : null;
  const go = (k) => { setActive(k); setMenuOpen(false); };

  return (
    <div className="w-full text-stone-800 dark:text-stone-200">
      {/* Menü-Band mit Strukturbaum */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-emerald-700">
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />} Menü
          </button>
          <div className="min-w-0 truncate text-sm text-stone-500 dark:text-stone-400">
            Reise-Tools{cur ? " › " : ""}<span className="font-medium text-stone-700 dark:text-stone-200">{cur ? cur.label : ""}</span>
          </div>
        </div>

        {menuOpen && (
          <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <button onClick={() => go(null)}
              className={"flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition " + (active === null ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800")}>
              <LayoutGrid className="h-4 w-4" /> Übersicht
            </button>
            {GROUPS.map((grp) => {
              const G = grp.gIcon;
              return (
                <div key={grp.g} className="mt-1.5">
                  <div className="flex items-center gap-1.5 px-1 py-0.5 text-xs font-bold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                    <G className="h-3.5 w-3.5" /> {grp.g}
                  </div>
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-stone-200 pl-2 dark:border-stone-700">
                    {grp.items.map((it) => {
                      const Ico = it.Icon; const on = active === it.k;
                      return (
                        <button key={it.k} onClick={() => go(it.k)}
                          className={"flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition " + (on ? "bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800")}>
                          <Ico className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> {it.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail-Ansicht eines Tools */}
      {cur ? (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <button onClick={() => setActive(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:border-emerald-300 hover:text-emerald-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-emerald-700">
              <ChevronLeft className="h-4 w-4" /> Übersicht
            </button>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-800 dark:text-stone-100"><cur.Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> {cur.label}</span>
          </div>
          {cur.add ? <cur.C onAdd={onAdd} /> : <cur.C />}
        </div>
      ) : (
        /* Übersicht (Hub) */
        <div className="space-y-5">
          <div className="rounded-2xl bg-emerald-700 px-4 py-3 text-white shadow-sm dark:bg-emerald-800">
            <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-100"><Compass className="h-4 w-4" /> Reise-Tools</div>
            <p className="mt-0.5 text-sm text-emerald-50">Ideen finden, Regionen prüfen, Anreise &amp; Wetter vergleichen – such dir was aus.</p>
          </div>

          {GROUPS.map((grp) => (
            <div key={grp.g}>
              <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">{grp.g}</div>
              <div className="space-y-2">
                {grp.items.map((it) => {
                  const Ico = it.Icon;
                  return (
                    <button key={it.k} onClick={() => go(it.k)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-emerald-700 dark:hover:bg-stone-800">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Ico className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{it.label}</span>
                        <span className="block text-xs text-stone-500 dark:text-stone-400">{it.desc}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-stone-300 dark:text-stone-600" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
