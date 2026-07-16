/*
  ReiseTools.jsx — Tool-Hub (Übersicht + Detail), von außen steuerbar
  ------------------------------------------------------------------
  Die Navigation (Strukturbaum) liegt jetzt übergeordnet in AppMenu.jsx.
  ReiseTools zeigt nur noch die Übersicht (Menü-Karten) und das geöffnete Tool.
  Steuerbar per Props active/onOpen (sonst interne States als Fallback).

  EINBAU: <ReiseTools active={toolKey} onOpen={setToolKey} onAdd={(s) => onAdd(mkItem(
    { kategorie:"sehenswuerdigkeit", name:s.name, info:s.info, gebiet:s.gebiet, maps_suche:s.name },
    { day:null, order:0, lat:s.lat ?? null, lon:s.lon ?? null }))} />
*/
import React, { useState } from "react";
import { Lightbulb, Sparkles, CalendarDays, CalendarRange, Compass, ArrowLeftRight, Plane, Thermometer, ChevronLeft, ChevronRight, Tag, Car } from "lucide-react";
import Ideenfinder from "./Ideenfinder.jsx";
import Entdecken from "./Entdecken.jsx";
import WohinImMonat from "./WohinImMonat.jsx";
import Region from "./Region.jsx";
import Wochentipps from "./Wochentipps.jsx";
import Anreise from "./Anreise.jsx";
import Verkehr from "./Verkehr.jsx";
import Wetterkarte from "./Wetterkarte.jsx";
import Angebote from "./Angebote.jsx";
import Maut from "./Maut.jsx";

export const GROUPS = [
  {
    g: "1. Ideen finden", gIcon: Lightbulb,
    items: [
      { k: "wochen", label: "Wochen-Tipps", desc: "Was lohnt sich wann ab Celle?", Icon: CalendarRange, C: Wochentipps, add: false, trip: true },
      { k: "ideen", label: "Ideenfinder", desc: "Region nach deinen Vorlieben", Icon: Lightbulb, C: Ideenfinder, add: true, trip: true },
      { k: "entdecken", label: "Entdecken", desc: "Thermen, Burgen, Seen … in der Nähe", Icon: Sparkles, C: Entdecken, add: true },
      { k: "monat", label: "Wohin im Monat?", desc: "Ziele nach Klima im Monat", Icon: CalendarDays, C: WohinImMonat, add: true, trip: true },
    ],
  },
  {
    g: "2. Ziel prüfen", gIcon: Compass,
    items: [
      { k: "region", label: "Region-Check", desc: "Infos, Wetter, Vor Ort & Wanderungen", Icon: Compass, C: Region, add: true, trip: true, attach: true },
      { k: "karte", label: "Wetterkarte", desc: "14 Tage, Land wählbar", Icon: Thermometer, C: Wetterkarte, add: false },
    ],
  },
  {
    g: "3. Anreise & Preise", gIcon: ArrowLeftRight,
    items: [
      { k: "anreise", label: "Anreise", desc: "Auto vs. Bahn vs. Flug + Kosten", Icon: ArrowLeftRight, C: Anreise, add: false },
      { k: "verkehr", label: "Direktverbindungen", desc: "Direktflüge & -züge ab Hannover/Celle", Icon: Plane, C: Verkehr, add: false },
      { k: "angebote", label: "Günstig-Radar", desc: "Günstige Bahn & Flüge ab Celle/Hannover", Icon: Tag, C: Angebote, add: false },
      { k: "maut", label: "Maut & Vignetten", desc: "Was brauchst du in welchem Land?", Icon: Car, C: Maut, add: false },
    ],
  },
];

const ALL = GROUPS.flatMap((grp) => grp.items);

export default function ReiseTools({ onAdd, active, onOpen, onCreateTrip, trips, onAddToTrip }) {
  const [internal, setInternal] = useState(null);
  const controlled = typeof onOpen === "function";
  const key = controlled ? (active ?? null) : internal;
  const setKey = controlled ? onOpen : setInternal;
  const cur = key ? ALL.find((t) => t.k === key) : null;

  if (cur) {
    return (
      <div className="w-full text-stone-800 dark:text-stone-200">
        <div className="mb-3 flex items-center gap-2">
          <button onClick={() => setKey(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:border-emerald-300 hover:text-emerald-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-emerald-700">
            <ChevronLeft className="h-4 w-4" /> Übersicht
          </button>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-800 dark:text-stone-100"><cur.Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> {cur.label}</span>
        </div>
        {(() => { const P = {}; if (cur.add) P.onAdd = onAdd; if (cur.trip) P.onCreateTrip = onCreateTrip; if (cur.attach) { P.trips = trips; P.onAddToTrip = onAddToTrip; } const C = cur.C; return <C {...P} />; })()}
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 text-stone-800 dark:text-stone-200">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
            <div className="text-sm font-bold text-stone-800 dark:text-stone-100">Wobei kann ich helfen?</div>
            <div className="mt-2 grid gap-2">
              <button onClick={() => setKey("ideen")} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-stone-700 transition hover:border-emerald-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"><Lightbulb className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" /> Ich weiß noch nicht, wohin</button>
              <button onClick={() => setKey("region")} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-stone-700 transition hover:border-emerald-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"><Compass className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" /> Ich habe ein Ziel</button>
              <button onClick={() => setKey("angebote")} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-stone-700 transition hover:border-emerald-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"><Tag className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" /> Günstig verreisen</button>
            </div>
          </div>

      {GROUPS.map((grp) => (
        <div key={grp.g}>
          <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">{grp.g}</div>
          <div className="space-y-2">
            {grp.items.map((it) => {
              const Ico = it.Icon;
              return (
                <button key={it.k} onClick={() => setKey(it.k)}
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
  );
}
