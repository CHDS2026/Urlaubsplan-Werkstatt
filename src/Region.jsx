/*
  Region.jsx — "Region-Check": Überblick + Vor Ort in einer Ansicht
  -----------------------------------------------------------------
  Eine Suche, zwei Unter-Reiter:
   • Überblick  -> Reiseberatung (Steckbrief, Fakten, Fahrzeit, Sehenswürdigkeiten …)
   • Vor Ort    -> Bedingungen (14-Tage-Wetter, Licht, Luft & Pollen, Fotos, Feiertage, Touren)
  Beide werden eingebettet (ohne eigene Suche) und laden automatisch die gewählte Region.

  EINBAU: <Region onAdd={…} />
*/
import React, { useState } from "react";
import { Compass, CloudSun, Search, MapPin, Mountain } from "lucide-react";
import Reiseberatung from "./Reiseberatung.jsx";
import Bedingungen from "./Bedingungen.jsx";
import Wandern from "./Wandern.jsx";

export default function Region({ onAdd }) {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("ueber");
  const go = () => { const t = input.trim(); if (t) setQ(t); };
  const tabBtn = (on) => "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300");

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100"><Compass className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Region-Check</div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Eine Region eingeben – Überblick, Vor Ort (Wetter, Luft, Fotos) und Wandern in einem.</p>

      <div className="mt-3 flex items-center gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }}
          placeholder="Region oder Stadt …" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900" />
        <button onClick={go} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"><Search className="h-4 w-4" /> Anzeigen</button>
      </div>

      {!q && <div className="mt-3 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-3 text-sm text-stone-500 dark:bg-stone-800 dark:text-stone-400"><MapPin className="h-4 w-4" /> Region eingeben, um Infos und Vor-Ort-Daten zu sehen.</div>}

      {q && (
        <div className="mt-3">
          <div className="mb-3 flex gap-2">
            <button onClick={() => setTab("ueber")} className={tabBtn(tab === "ueber")}><Compass className="h-4 w-4" /> Überblick</button>
            <button onClick={() => setTab("vorort")} className={tabBtn(tab === "vorort")}><CloudSun className="h-4 w-4" /> Vor Ort</button>
            <button onClick={() => setTab("wandern")} className={tabBtn(tab === "wandern")}><Mountain className="h-4 w-4" /> Wandern</button>
          </div>
          {tab === "ueber" && <Reiseberatung key={"r-" + q} embedded defaultQuery={q} onAdd={onAdd} />}
          {tab === "vorort" && <Bedingungen key={"b-" + q} embedded defaultQuery={q} />}
          {tab === "wandern" && <Wandern key={"w-" + q} embedded defaultQuery={q} />}
        </div>
      )}
    </section>
  );
}
