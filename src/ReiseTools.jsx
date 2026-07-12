/*
  ReiseTools.jsx — aufgeräumter Tool-Hub für den Urlaubsplaner
  ------------------------------------------------------------
  Übersichtsseite mit den Tools in Gruppen (Menü-Karten). Tippen öffnet das Tool,
  "Alle Tools" springt zurück.
  Enthält: Ideenfinder, Entdecken, WohinImMonat, Reiseberatung (mit "In Ideen")
  sowie Anreise, Verkehr, Bedingungen, Wetterkarte.

  EINBAU (unverändert): <ReiseTools /> bzw. mit "In Ideen":
    <ReiseTools onAdd={(s) => onAdd(mkItem(
      { kategorie: "sehenswuerdigkeit", name: s.name, info: s.info, gebiet: s.gebiet, maps_suche: s.name },
      { day: null, order: 0, lat: s.lat ?? null, lon: s.lon ?? null }
    ))} />
*/
import React, { useState } from "react";
import { Lightbulb, Sparkles, CalendarDays, Compass, CloudSun, ArrowLeftRight, Plane, Thermometer, ChevronLeft, ChevronRight } from "lucide-react";
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
    g: "Wohin? – Inspiration",
    items: [
      { k: "ideen", label: "Ideenfinder", desc: "Passende Region nach deinen Vorlieben", Icon: Lightbulb, C: Ideenfinder, add: true },
      { k: "entdecken", label: "Entdecken", desc: "Themen (Thermen, Burgen, Seen …) im Umkreis", Icon: Sparkles, C: Entdecken, add: true },
      { k: "monat", label: "Wohin im Monat", desc: "Ziele nach echtem Klima für einen Monat", Icon: CalendarDays, C: WohinImMonat, add: true },
    ],
  },
  {
    g: "Region im Detail",
    items: [
      { k: "region", label: "Reiseberatung", desc: "Steckbrief, Fakten, Sehenswürdigkeiten", Icon: Compass, C: Reiseberatung, add: true },
      { k: "vorort", label: "Vor-Ort-Check", desc: "Wetter, Licht, Luft & Pollen, Fotos, Feiertage", Icon: CloudSun, C: Bedingungen, add: false },
    ],
  },
  {
    g: "Anreise & Verkehr",
    items: [
      { k: "anreise", label: "Anreise-Vergleich", desc: "Auto vs. Bahn vs. Flug + Kosten/CO₂", Icon: ArrowLeftRight, C: Anreise, add: false },
      { k: "verkehr", label: "Verkehr ab HAJ / Celle", desc: "Direktflüge ab Hannover & Direktzüge ab Celle", Icon: Plane, C: Verkehr, add: false },
    ],
  },
  {
    g: "Wetter",
    items: [
      { k: "karte", label: "Wetterkarte", desc: "14-Tage-Karte, Land wählbar (inkl. Türkei)", Icon: Thermometer, C: Wetterkarte, add: false },
    ],
  },
];
const ALL = GROUPS.flatMap((grp) => grp.items);

export default function ReiseTools({ onAdd }) {
  const [active, setActive] = useState(null);
  const cur = active ? ALL.find((t) => t.k === active) : null;

  if (cur) {
    const C = cur.C; const Ico = cur.Icon;
    return (
      <div className="w-full">
        <div className="mb-3 flex items-center gap-2">
          <button onClick={() => setActive(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:border-emerald-300 hover:text-emerald-800">
            <ChevronLeft className="h-4 w-4" /> Alle Tools
          </button>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-800"><Ico className="h-4 w-4 text-emerald-700" /> {cur.label}</span>
        </div>
        {cur.add ? <C onAdd={onAdd} /> : <C />}
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="rounded-2xl bg-emerald-700 px-4 py-3 text-white shadow-sm">
        <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-100"><Compass className="h-4 w-4" /> Reise-Tools</div>
        <p className="mt-0.5 text-sm text-emerald-50">Ideen finden, Regionen prüfen, Anreise &amp; Wetter vergleichen – such dir was aus.</p>
      </div>

      {GROUPS.map((grp) => (
        <div key={grp.g}>
          <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-stone-400">{grp.g}</div>
          <div className="space-y-2">
            {grp.items.map((it) => {
              const Ico = it.Icon;
              return (
                <button key={it.k} onClick={() => setActive(it.k)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Ico className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-stone-800">{it.label}</span>
                    <span className="block text-xs text-stone-500">{it.desc}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
