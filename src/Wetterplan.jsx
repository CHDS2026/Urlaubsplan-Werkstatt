/*
  Wetterplan.jsx — schlägt vor, Programmpunkte wetterpassend umzulegen
  --------------------------------------------------------------------
  Nutzt NUR Daten, die die App schon hat: die Tagesvorhersage (wetter[datum].regen,
  .code, .tmax) und das Wetter-Merkmal jedes Punkts (sun = Schönwetter,
  rain = Schlechtwetter, any = egal).

  Einstufung bewusst aus dem Rohwert "regen" (belegt vorhanden), nicht aus einer
  fremden Hilfsfunktion, damit sich die Logik nicht still ändert:
     Regen >= 50 % -> schlecht · <= 20 % -> gut · dazwischen -> durchwachsen

  Zwei Fälle:
   • Problem: Schönwetter-Punkt an einem Regentag  -> besseren Tag vorschlagen
   • Chance:  Schlechtwetter-Punkt an einem Sonnentag -> Regentag vorschlagen
  Ein Tipp verschiebt den Punkt (onApply). Es wird NICHTS automatisch geändert.

  EINBAU: <Wetterplan dayList={dayList} items={items} wetter={wetter} onApply={onApply} />
*/
import React, { useState } from "react";
import { CloudRain, Sun, ArrowRight, Check, Info, Sparkles } from "lucide-react";
import { wetterText } from "./wetter.js";
import { fmtDate } from "./lib/datum.js";


function lageVon(w) {
  if (!w || w.regen == null) return null;
  if (w.regen >= 50) return "schlecht";
  if (w.regen <= 20) return "gut";
  return "durchwachsen";
}

export default function Wetterplan({ dayList, items, wetter, onApply }) {
  const [erledigt, setErledigt] = useState({});
  if (!wetter || !dayList || dayList.length < 2) return null;

  const tage = dayList.map((d, i) => ({ datum: d, nr: i + 1, w: wetter[d] || null, lage: lageVon(wetter[d]) })).filter((t) => t.lage);
  if (tage.length < 2) return null;

  const besterSonnentag = (ausser) => {
    const k = tage.filter((t) => t.lage === "gut" && t.datum !== ausser);
    if (!k.length) return null;
    return k.slice().sort((a, b) => (a.w.regen - b.w.regen) || ((b.w.tmax || 0) - (a.w.tmax || 0)))[0];
  };
  const besterRegentag = (ausser) => {
    const k = tage.filter((t) => t.lage === "schlecht" && t.datum !== ausser);
    if (!k.length) return null;
    return k.slice().sort((a, b) => b.w.regen - a.w.regen)[0];
  };

  const vorschlaege = [];
  for (const it of items) {
    if (!it.day || erledigt[it.id]) continue;
    const tag = tage.find((t) => t.datum === it.day);
    if (!tag) continue;
    if (it.weather === "sun" && tag.lage === "schlecht") {
      const ziel = besterSonnentag(it.day);
      if (ziel) vorschlaege.push({ art: "problem", it, tag, ziel });
    } else if (it.weather === "rain" && tag.lage === "gut") {
      const ziel = besterRegentag(it.day);
      if (ziel) vorschlaege.push({ art: "chance", it, tag, ziel });
    }
  }
  if (!vorschlaege.length) return null;

  const verschiebe = (v) => { onApply({ [v.it.id]: { day: v.ziel.datum, order: 99 } }); setErledigt((e) => ({ ...e, [v.it.id]: true })); };

  return (
    <section className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
        <Sparkles className="h-4 w-4 text-sky-700 dark:text-sky-300" /> Wetter-Vorschläge ({vorschlaege.length})
      </div>
      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">Aus Vorhersage und dem Wetter-Merkmal deiner Punkte. Nichts wird automatisch geändert.</p>

      <div className="mt-2 space-y-1.5">
        {vorschlaege.map((v) => (
          <div key={v.it.id} className="rounded-xl bg-white p-2.5 text-sm dark:bg-stone-900">
            <div className="flex items-start gap-2">
              {v.art === "problem" ? <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /> : <Sun className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-stone-800 dark:text-stone-100">{v.it.name}</div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  {v.art === "problem"
                    ? <>Schönwetter-Punkt an Tag {v.tag.nr} ({fmtDate(v.tag.datum)}) – {v.tag.w.regen}% Regen, {wetterText(v.tag.w.code)}.</>
                    : <>Schlechtwetter-Punkt an Tag {v.tag.nr} ({fmtDate(v.tag.datum)}) – der Tag ist gut ({v.tag.w.regen}% Regen). Schade drum.</>}
                </div>
                <div className="mt-1 inline-flex flex-wrap items-center gap-1 text-xs text-stone-700 dark:text-stone-200">
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                  besser <b>Tag {v.ziel.nr}</b> ({fmtDate(v.ziel.datum)}, {v.ziel.w.regen}% Regen{v.ziel.w.tmax != null ? `, ${v.ziel.w.tmax}°` : ""})
                </div>
              </div>
              <button onClick={() => verschiebe(v)} className="shrink-0 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800">Verschieben</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Einstufung: ab 50 % Regen = schlecht, bis 20 % = gut. Nur Tage mit Vorhersage (max. ~14 Tage voraus) werden betrachtet – Prognosen ändern sich, kurz vor der Reise nochmal schauen.</span></div>
    </section>
  );
}
