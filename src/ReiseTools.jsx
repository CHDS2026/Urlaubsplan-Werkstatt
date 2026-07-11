/*
  ReiseTools.jsx — alle Reise-Bausteine in einem Tab-Container
  ------------------------------------------------------------
  Bündelt: Ideenfinder, Entdecken, WohinImMonat, Reiseberatung (mit "In Ideen")
  sowie Anreise, Verkehr, Bedingungen, Wetterkarte (ohne "In Ideen").

  EINBAU – so wenig wie möglich:
  1) Alle .jsx-Dateien in denselben Ordner legen (src/):
       ReiseTools, Ideenfinder, Entdecken, WohinImMonat, Reiseberatung,
       Anreise, Verkehr, Bedingungen, Wetterkarte
  2) In App.jsx importieren und EINMAL rendern, z. B. als eigener Screen/Tab:
       import ReiseTools from "./ReiseTools.jsx";
       ...
       <ReiseTools />

  "In Ideen" scharf schalten (optional): ReiseTools DORT rendern, wo eine Reise
  aktiv ist (in PoolView), und onAdd auf euer Modell mappen:
       <ReiseTools onAdd={(s) => onAdd(mkItem(
         { kategorie: "sehenswuerdigkeit", name: s.name, info: s.info, gebiet: s.gebiet, maps_suche: s.name },
         { day: null, order: 0, lat: s.lat ?? null, lon: s.lon ?? null }
       ))} />
  Ohne onAdd funktioniert alles (Suchen/Vergleichen/Entdecken) – nur der
  "Ideen"-Knopf legt dann nichts in eine Reise ab.
*/
import { useState } from "react";
import { Lightbulb, Sparkles, CalendarDays, Compass, ArrowLeftRight, Plane, CloudSun, Thermometer } from "lucide-react";
import Ideenfinder from "./Ideenfinder.jsx";
import Entdecken from "./Entdecken.jsx";
import WohinImMonat from "./WohinImMonat.jsx";
import Reiseberatung from "./Reiseberatung.jsx";
import Anreise from "./Anreise.jsx";
import Verkehr from "./Verkehr.jsx";
import Bedingungen from "./Bedingungen.jsx";
import Wetterkarte from "./Wetterkarte.jsx";

const TABS = [
  { k: "ideen", label: "Ideenfinder", Icon: Lightbulb, C: Ideenfinder, add: true },
  { k: "entdecken", label: "Entdecken", Icon: Sparkles, C: Entdecken, add: true },
  { k: "monat", label: "Im Monat", Icon: CalendarDays, C: WohinImMonat, add: true },
  { k: "region", label: "Region", Icon: Compass, C: Reiseberatung, add: true },
  { k: "anreise", label: "Anreise", Icon: ArrowLeftRight, C: Anreise, add: false },
  { k: "verkehr", label: "Verkehr", Icon: Plane, C: Verkehr, add: false },
  { k: "vorort", label: "Vor Ort", Icon: CloudSun, C: Bedingungen, add: false },
  { k: "karte", label: "Wetterkarte", Icon: Thermometer, C: Wetterkarte, add: false },
];

export default function ReiseTools({ onAdd }) {
  const [tab, setTab] = useState("ideen");
  const cur = TABS.find((t) => t.k === tab) || TABS[0];
  const C = cur.C;
  return (
    <div className="mx-auto w-full max-w-2xl p-3">
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const A = t.Icon; const on = t.k === tab;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={"inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition " + (on ? "bg-emerald-700 text-white" : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50")}>
              <A className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>
      {cur.add ? <C onAdd={onAdd} /> : <C />}
    </div>
  );
}
