/*
  Maut.jsx — Maut & Vignetten für Autoreisen ab Celle
  ---------------------------------------------------
  EHRLICH: Es gibt keine freie, schlüssellose Maut-API. Alles hier ist KURATIERT.
  Vignettenpreise ändern sich JÄHRLICH – deshalb steht an jedem Preis ein Stand und
  ein Link zur amtlichen Stelle. Beim Schweizer Preis wird bewusst KEIN Euro-Betrag
  genannt: dieselben 40 CHF werden je nach Quelle als 42 / 43 / 44,50 / 46 € angegeben.
  Preise sind Richtwerte zur Planung, keine Zusage – vor der Fahrt amtlich prüfen.

  EINBAU: <Maut /> · in einer Reise: <Maut land="Österreich" />
*/
import React, { useState } from "react";
import { Car, ExternalLink, Info, AlertTriangle, Ticket, Route as RouteIcon, Search } from "lucide-react";

const STAND = "Stand 2026";

const LAENDER = [
  {
    n: "Deutschland", art: "frei",
    kurz: "Für Pkw mautfrei – keine Vignette, keine Streckenmaut.",
    preise: [], link: null, hinweise: [],
  },
  {
    n: "Österreich", art: "vignette",
    kurz: "Vignette auf allen Autobahnen (A) und Schnellstraßen (S). Klebe- oder digitale Vignette.",
    preise: [["1 Tag", "9,60 €"], ["10 Tage", "12,80 €"], ["2 Monate", "32,00 €"], ["Jahr", "106,80 €"]],
    link: { l: "asfinag.at (amtlich)", u: "https://www.asfinag.at/" },
    hinweise: [
      { t: "warn", x: "2026 ist das LETZTE Jahr der Klebevignette – ab 2027 nur noch digital." },
      { t: "warn", x: "Online gekauft gilt die 2-Monats- und Jahresvignette erst nach 18 Tagen (Widerrufsrecht). 1-Tages- und 10-Tages-Vignette gelten sofort. An einer Verkaufsstelle (ÖAMTC/ARBÖ/ADAC, Tankstelle) gilt alles sofort." },
      { t: "info", x: "Ohne Vignette: Ersatzmaut 120 €, sonst Strafe bis 3.000 €." },
      { t: "info", x: "Vignette deckt NICHT die Sondermautstrecken ab (siehe unten)." },
    ],
  },
  {
    n: "Schweiz", art: "vignette",
    kurz: "Nur Jahresvignette – keine Tages- oder Wochenvariante. Auch für die reine Durchfahrt fällig.",
    preise: [["Jahr", "40 CHF"]],
    link: { l: "via.admin.ch (amtlich)", u: "https://via.admin.ch/" },
    hinweise: [
      { t: "info", x: "Preis seit vielen Jahren unverändert bei 40 CHF. Euro-Betrag bewusst nicht genannt – Quellen nennen 42 bis 46 €, je nach Kurs." },
      { t: "info", x: "Gültig 1.12. des Vorjahres bis 31.1. des Folgejahres (14 Monate). Klebe- und E-Vignette, beide sofort gültig." },
      { t: "info", x: "Großer-St.-Bernhard-Tunnel kostet extra." },
    ],
  },
  {
    n: "Tschechien", art: "vignette",
    kurz: "Rein digitale E-Vignette (seit 2021, keine Klebevignette mehr). Sofort gültig.",
    preise: [], link: { l: "edalnice.cz (amtlich)", u: "https://edalnice.cz/" },
    hinweise: [
      { t: "warn", x: "NUR über die amtliche Stelle kaufen. Das tschechische Verkehrsministerium warnt vor privaten Seiten mit Aufschlägen – manche sind illegal. Im Ausland (z. B. ADAC) gibt es sie nicht." },
      { t: "info", x: "Preise wurden zum Jahreswechsel 2026 um bis zu 9,5 % erhöht – aktuelle Beträge auf edalnice.cz." },
      { t: "info", x: "Jahresvignette ist nicht ans Kalenderjahr gebunden, Zeitraum frei wählbar." },
    ],
  },
  {
    n: "Slowenien", art: "vignette",
    kurz: "E-Vignette auf Autobahnen, ans Kennzeichen gebunden.",
    preise: [["7 Tage", "16,00 €"], ["1 Monat", "32,00 €"], ["Jahr", "117,50 €"]],
    link: { l: "evinjeta.dars.si (amtlich)", u: "https://evinjeta.dars.si/de" },
    hinweise: [{ t: "info", x: "Beginn der Jahresvignette frei wählbar – gilt dann 12 Monate." }],
  },
  {
    n: "Italien", art: "strecke",
    kurz: "Streckenmaut: Ticket ziehen, bei der Ausfahrt zahlen. Keine Vignette.",
    preise: [], link: { l: "autostrade.it", u: "https://www.autostrade.it/" },
    hinweise: [{ t: "warn", x: "ZTL-Zonen in Altstädten (Rom, Florenz, Bologna …): Einfahrverbot für Nicht-Anwohner, Bußgeld je Verstoß. Auto außerhalb parken." }],
  },
  {
    n: "Frankreich", art: "strecke",
    kurz: "Streckenmaut, abschnittsweise abgerechnet. Keine Vignette.",
    preise: [], link: { l: "autoroutes.fr", u: "https://www.autoroutes.fr/" },
    hinweise: [{ t: "info", x: "Mont-Blanc-Tunnel nach Italien kostet extra (deutlich zweistellig)." }],
  },
  {
    n: "Niederlande", art: "frei", kurz: "Keine Vignette, keine allgemeine Pkw-Maut.", preise: [], link: null,
    hinweise: [{ t: "info", x: "Einzelne Tunnel können kostenpflichtig sein (z. B. Westerscheldetunnel)." }],
  },
  { n: "Belgien", art: "frei", kurz: "Keine Vignette, keine Pkw-Maut auf Autobahnen.", preise: [], link: null, hinweise: [] },
  { n: "Luxemburg", art: "frei", kurz: "Keine Vignette, keine Pkw-Maut.", preise: [], link: null, hinweise: [] },
  {
    n: "Dänemark", art: "frei", kurz: "Keine Vignette – aber die großen Brücken kosten.", preise: [], link: { l: "storebaelt.dk", u: "https://www.storebaelt.dk/" },
    hinweise: [{ t: "info", x: "Storebælt- und Öresundbrücke sind kostenpflichtig." }],
  },
  {
    n: "Polen", art: "strecke", kurz: "Streckenmaut auf einigen Autobahnabschnitten, sonst frei.", preise: [], link: { l: "etoll.gov.pl", u: "https://www.etoll.gov.pl/" }, hinweise: [],
  },
  {
    n: "Kroatien", art: "strecke", kurz: "Streckenmaut (Ticket ziehen, bei Ausfahrt zahlen).", preise: [], link: { l: "hac.hr", u: "https://hac.hr/" },
    hinweise: [{ t: "warn", x: "Kroatien plant ab Herbst 2026 die Umstellung auf eine E-Vignette – vor der Fahrt prüfen, was dann gilt." }],
  },
  { n: "Ungarn", art: "vignette", kurz: "E-Vignette, ans Kennzeichen gebunden.", preise: [], link: { l: "nemzetiutdij.hu", u: "https://nemzetiutdij.hu/" }, hinweise: [] },
  { n: "Slowakei", art: "vignette", kurz: "E-Vignette, ans Kennzeichen gebunden.", preise: [], link: { l: "eznamka.sk", u: "https://eznamka.sk/" }, hinweise: [] },
];

const SONDERMAUT = [
  { n: "Brenner (A13)", land: "Österreich", p: "ca. 11,50 €", w: "Tirol → Südtirol" },
  { n: "Tauern (A10)", land: "Österreich", p: "ca. 15 €", w: "Salzburg → Kärnten" },
  { n: "Arlberg (S16)", land: "Österreich", p: "ca. 11,50 €", w: "Tirol → Vorarlberg" },
  { n: "Karawankentunnel", land: "Österreich", p: "ca. 8 €", w: "Kärnten → Slowenien" },
  { n: "Felbertauernstraße", land: "Österreich", p: "ca. 12–15 € (saisonal)", w: "Osttirol → Pinzgau" },
  { n: "Großglockner Hochalpenstraße", land: "Österreich", p: "46,50 € (E-Pkw 40 €, Motorrad 36,50 €)", w: "Panoramastraße, keine Transitstrecke" },
  { n: "Silvretta Hochalpenstraße", land: "Österreich", p: "19,50 €", w: "Bielerhöhe", warn: "Sommer 2026 wegen Felssturz-Sicherung gesperrt. Bielerhöhe über Galtür oder Vermuntbahn erreichbar." },
  { n: "Großer-St.-Bernhard-Tunnel", land: "Schweiz", p: "extra", w: "Wallis → Aostatal" },
  { n: "Mont-Blanc-Tunnel", land: "Frankreich/Italien", p: "extra (zweistellig)", w: "Chamonix → Aosta" },
];

const STIL = {
  vignette: { l: "Vignette", c: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  strecke: { l: "Streckenmaut", c: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  frei: { l: "mautfrei", c: "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300" },
};

export default function Maut({ land }) {
  const [q, setQ] = useState("");
  const [offen, setOffen] = useState(land || null);
  const treffer = LAENDER.filter((l) => !q.trim() || l.n.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100"><Car className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Maut &amp; Vignetten</div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Was brauchst du wo? Land antippen für Details. Preise: {STAND}, Richtwerte – amtliche Seite prüfen.</p>

      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 dark:border-stone-700 dark:bg-stone-900">
          <Search className="h-4 w-4 shrink-0 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Land filtern …" className="w-full bg-transparent py-2 text-sm focus:outline-none" />
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        {treffer.map((l) => {
          const st = STIL[l.art];
          const auf = offen === l.n;
          return (
            <div key={l.n} className={"rounded-xl border transition " + (auf ? "border-emerald-300 dark:border-emerald-700" : "border-stone-200 dark:border-stone-700")}>
              <button onClick={() => setOffen(auf ? null : l.n)} className="flex w-full items-center gap-2 p-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-stone-800 dark:text-stone-100">{l.n}</span>
                    <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + st.c}>{st.l}</span>
                    {l.hinweise.some((h) => h.t === "warn") && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                  </span>
                  <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{l.kurz}</span>
                </span>
              </button>

              {auf && (
                <div className="space-y-2 border-t border-stone-100 p-3 dark:border-stone-800">
                  {l.preise.length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">Pkw bis 3,5 t · {STAND}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {l.preise.map((p) => (
                          <span key={p[0]} className="inline-flex items-center gap-1 rounded-lg bg-stone-50 px-2.5 py-1.5 text-sm dark:bg-stone-800">
                            <Ticket className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                            <span className="text-stone-500 dark:text-stone-400">{p[0]}</span> <b className="text-stone-800 dark:text-stone-100">{p[1]}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {l.hinweise.map((h, i) => (
                    <div key={i} className={"flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs " + (h.t === "warn" ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-stone-50 text-stone-600 dark:bg-stone-800 dark:text-stone-300")}>
                      {h.t === "warn" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                      <span>{h.x}</span>
                    </div>
                  ))}
                  {l.link && <a href={l.link.u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">{l.link.l} <ExternalLink className="h-3.5 w-3.5" /></a>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-200"><RouteIcon className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Sondermaut: Tunnel &amp; Alpenstraßen</div>
        <p className="mb-2 text-xs text-stone-400 dark:text-stone-500">Kommt ZUSÄTZLICH zur Vignette. {STAND}, Richtwerte pro Pkw und Fahrt.</p>
        <div className="space-y-1.5">
          {SONDERMAUT.map((s) => (
            <div key={s.n} className="rounded-lg bg-stone-50 px-2.5 py-2 text-sm dark:bg-stone-800">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="font-semibold text-stone-800 dark:text-stone-100">{s.n}</span>
                  <span className="block text-xs text-stone-500 dark:text-stone-400">{s.land} · {s.w}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-stone-700 dark:text-stone-200">{s.p}</span>
              </div>
              {s.warn && <div className="mt-1.5 flex items-start gap-1.5 rounded bg-amber-100 px-2 py-1 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {s.warn}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Alles kuratiert – eine freie Maut-Schnittstelle gibt es nicht. <b>Vignettenpreise werden jährlich angepasst</b>, deshalb überall {STAND} und Link zur amtlichen Stelle. Landstraßen sind fast überall mautfrei – wer die Autobahn meidet, braucht meist keine Vignette. Ohne Gewähr.</span></div>
    </section>
  );
}
