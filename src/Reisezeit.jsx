import React, { useState, useEffect } from "react";
import { Thermometer, Droplets, Loader2, Info, Search, Check, Sun } from "lucide-react";
import { ladeKlimaJahr, koordinatenGemerkt, bewerteMonat, MONATSNAMEN } from "./klima.js";
import { findeKoordinaten } from "./overpass.js";
import { ladeSchulferien, ferienAnzahl } from "./ferien.js";

const MONATE_KURZ = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const inputCls = "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none";

const suchbegriff = (w) => [w.region, w.land].filter(Boolean).join(", ") || w.name;

const farbe = (stufe) => {
  if (stufe === "gut") return "bg-emerald-500 text-white";
  if (stufe === "mittel") return "bg-amber-300 text-amber-900";
  if (stufe === "schlecht") return "bg-stone-200 text-stone-500";
  return "bg-stone-100 text-stone-300";
};

export default function Reisezeit({ wishlist }) {
  const [daten, setDaten] = useState({});      // { wishId: { monate } }
  const [busy, setBusy] = useState(false);
  const [fortschritt, setFortschritt] = useState(0);
  const [fehler, setFehler] = useState("");
  const [minTemp, setMinTemp] = useState(18);
  const [maxRegen, setMaxRegen] = useState(9);
  const [monatFilter, setMonatFilter] = useState(0); // 0 = alle
  const [ferienMonate, setFerienMonate] = useState(null);
  const [detail, setDetail] = useState(null);

  const ziele = (wishlist || []).filter((w) => !w.done);

  /* Schulferien der nächsten 12 Monate -> je Monat: an wie vielen Tagen hat mindestens ein Land Ferien */
  useEffect(() => {
    let aktiv = true;
    const heute = new Date();
    const von = heute.toISOString().slice(0, 10);
    const bisD = new Date(heute); bisD.setUTCFullYear(bisD.getUTCFullYear() + 1);
    const bis = bisD.toISOString().slice(0, 10);
    ladeSchulferien(von, bis).then((f) => {
      if (!aktiv || !f) return;
      const zaehler = {};
      Object.keys(f.tage || {}).forEach((tag) => {
        const m = Number(tag.slice(5, 7));
        if (ferienAnzahl(f, tag) > 0) zaehler[m] = (zaehler[m] || 0) + 1;
      });
      setFerienMonate(zaehler);
    });
    return () => { aktiv = false; };
  }, []);

  const laden = async () => {
    if (!ziele.length) return;
    setBusy(true); setFehler(""); setFortschritt(0);
    const neu = { ...daten };
    let i = 0;
    for (const w of ziele) {
      i++;
      setFortschritt(Math.round((i / ziele.length) * 100));
      if (neu[w.id]) continue;
      const koord = await koordinatenGemerkt(suchbegriff(w), findeKoordinaten);
      if (!koord) continue;
      const monate = await ladeKlimaJahr(koord[0], koord[1]);
      if (monate) neu[w.id] = monate;
      await new Promise((r) => setTimeout(r, 900)); // schonend für die freien Dienste
    }
    setDaten(neu); setBusy(false);
    if (!Object.keys(neu).length) setFehler("Keine Klimadaten gefunden. Prüfe, ob deine Wunschziele Land oder Region enthalten.");
  };

  const kriterien = { minTemp, maxRegentage: maxRegen };

  /* Beste Monate eines Ziels */
  const besteMonate = (monate) => {
    if (!monate) return [];
    const gut = [];
    for (let m = 1; m <= 12; m++) if (bewerteMonat(monate[m], kriterien) === "gut") gut.push(m);
    return gut;
  };

  /* Filter „Wohin im Monat X?" */
  const passendeZiele = monatFilter
    ? ziele.filter((w) => daten[w.id] && bewerteMonat(daten[w.id][monatFilter], kriterien) === "gut")
    : [];

  const geladen = Object.keys(daten).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Vergleicht deine Wunschziele über das ganze Jahr – anhand echter Messwerte der letzten 5 Jahre. Grün = erfüllt deine Kriterien.</span>
      </div>

      {ziele.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">Leg zuerst Wunschziele an (mit Land oder Region), dann kann die App die beste Reisezeit berechnen.</div>
      ) : (
        <>
          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-800">Deine Kriterien</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Mind. Tagestemperatur</span>
                <select value={minTemp} onChange={(e) => setMinTemp(Number(e.target.value))} className={inputCls}>
                  {[10, 14, 16, 18, 20, 22, 25].map((t) => <option key={t} value={t}>{t} °C</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Max. Regentage / Monat</span>
                <select value={maxRegen} onChange={(e) => setMaxRegen(Number(e.target.value))} className={inputCls}>
                  {[4, 6, 8, 9, 12, 15].map((t) => <option key={t} value={t}>{t} Tage</option>)}
                </select>
              </label>
            </div>

            {geladen < ziele.length && (
              <button onClick={laden} disabled={busy} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50">
                {busy ? <><Loader2 className="h-4 w-4" /> lädt … {fortschritt}%</> : <><Search className="h-4 w-4" /> Klimadaten laden ({ziele.length} Ziele)</>}
              </button>
            )}
            {fehler && <p className="mt-2 text-xs text-amber-700">{fehler}</p>}
            <p className="mt-2 text-xs text-stone-400">Wird einmal geladen und bleibt danach offline verfügbar.</p>
          </section>

          {geladen > 0 && (
            <>
              <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-800">Jahresübersicht</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="w-28 pb-1 text-left font-medium text-stone-400">Ziel</th>
                        {MONATE_KURZ.map((m, i) => <th key={i} className="pb-1 text-center font-medium text-stone-400">{m}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {ziele.map((w) => {
                        const monate = daten[w.id];
                        return (
                          <tr key={w.id}>
                            <td className="max-w-28 truncate py-1 pr-2 text-stone-700">{w.name}</td>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                              const werte = monate ? monate[m] : null;
                              const stufe = bewerteMonat(werte, kriterien);
                              return (
                                <td key={m} className="p-0.5">
                                  <button onClick={() => werte && setDetail({ ziel: w.name, monat: m, werte })} className={`flex h-7 w-full items-center justify-center rounded text-xs font-semibold ${farbe(stufe)}`}>
                                    {werte ? werte.tmax : "–"}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                  <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" /> passt</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-amber-300" /> teilweise</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-stone-200" /> passt nicht</span>
                  <span className="ml-auto text-stone-400">Zahl = Ø Höchsttemperatur</span>
                </div>
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-800">Beste Reisezeit</h3>
                <ul className="space-y-2">
                  {ziele.filter((w) => daten[w.id]).map((w) => {
                    const gut = besteMonate(daten[w.id]);
                    return (
                      <li key={w.id} className="rounded-xl border border-stone-200 p-3">
                        <p className="text-sm font-semibold text-stone-900">{w.name}</p>
                        {gut.length === 0 ? (
                          <p className="mt-0.5 text-xs text-stone-400">Kein Monat erfüllt deine Kriterien – Werte lockern?</p>
                        ) : (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {gut.map((m) => {
                              const ferienDicht = ferienMonate && ferienMonate[m] >= 20;
                              return (
                                <span key={m} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ferienDicht ? "bg-rose-100 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                                  {MONATSNAMEN[m - 1]}{ferienDicht ? " · Ferienzeit" : ""}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {ferienMonate && <p className="mt-2 text-xs text-stone-400">Rot = Monat liegt größtenteils in deutschen Schulferien (teurer, voller).</p>}
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Sun className="h-4 w-4 text-amber-500" /> Wohin im …?</h3>
                <select value={monatFilter} onChange={(e) => setMonatFilter(Number(e.target.value))} className={inputCls}>
                  <option value={0}>Monat wählen …</option>
                  {MONATSNAMEN.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                {monatFilter > 0 && (
                  passendeZiele.length ? (
                    <ul className="mt-3 space-y-1.5">
                      {passendeZiele.map((w) => {
                        const werte = daten[w.id][monatFilter];
                        return (
                          <li key={w.id} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                            <span className="text-sm font-medium text-emerald-900">{w.name}</span>
                            <span className="text-xs text-emerald-700">{werte.tmax}° · {werte.regentage} Regentage</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : <p className="mt-3 text-sm text-stone-400">Kein Wunschziel erfüllt im {MONATSNAMEN[monatFilter - 1]} deine Kriterien.</p>
                )}
              </section>
            </>
          )}
        </>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setDetail(null)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold text-stone-900">{detail.ziel}</h4>
            <p className="mb-3 text-xs text-stone-500">{MONATSNAMEN[detail.monat - 1]} · Mittel der letzten 5 Jahre</p>
            <div className="space-y-1.5 text-sm text-stone-700">
              <p className="flex items-center gap-2"><Thermometer className="h-4 w-4 text-emerald-600" /> {detail.werte.tmax}° tagsüber, {detail.werte.tmin}° nachts</p>
              <p className="flex items-center gap-2"><Droplets className="h-4 w-4 text-sky-600" /> {detail.werte.regentage} Regentage im Monat</p>
              <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> an {detail.werte.anteilWarm}% der Tage über 20°</p>
              {detail.werte.anteilTrocken != null && <p className="flex items-center gap-2"><Sun className="h-4 w-4 text-amber-500" /> {detail.werte.anteilTrocken}% trockene Tage</p>}
            </div>
            <p className="mt-3 text-xs text-stone-400">Messwerte der Vergangenheit, keine Vorhersage.</p>
          </div>
        </div>
      )}
    </div>
  );
}
