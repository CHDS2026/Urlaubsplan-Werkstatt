/*
  Suche.jsx — intelligente Suche innerhalb der App
  ------------------------------------------------
  EHRLICH: kein Sprachmodell (das ginge nur mit Schlüssel/Konto und online).
  Stattdessen ein Stichwort- und Synonym-Index über alle Bereiche und Werkzeuge,
  mit Fragenerkennung ("wo ist es günstig?" -> Günstig-Radar). Läuft sofort,
  offline und ohne Schlüssel.

  EINBAU: <Suche onGo={({homeTab, toolKey}) => {…}} />
*/
import React, { useState } from "react";
import { Search, X, ArrowRight, Calendar, Globe2, Wallet, Compass, LayoutGrid } from "lucide-react";
import { GROUPS } from "./ReiseTools.jsx";

/* Umlaute/ß vereinheitlichen, damit "Fahrzeit" auch "fahrzeiten" findet */
const norm = (x) => String(x || "").toLowerCase()
  .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss")
  .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/* Frageworte & Füllwörter raus – "wo finde ich günstige tickets?" -> "gunstige tickets" */
const STOPP = new Set(["wo","wie","was","wann","warum","wer","welche","welcher","welches","kann","ich","man","mir","mich","finde","find","gibt","es","der","die","das","ein","eine","einen","und","oder","fur","zu","in","auf","mit","von","am","im","ist","sind","hat","habe","brauche","brauch","suche","such","zeig","zeige","mal","bitte","denn","noch","schon","bei","nach","aus"]);

const BEREICHE = [
  { tab: "start", label: "Start – Übersicht", desc: "Legende: was gibt es und wo liegt es", Icon: LayoutGrid,
    w: ["start","startseite","ubersicht","legende","hilfe","menu","inhalt","was gibt es","wo finde ich","home","anfang"] },
  { tab: "reisen", label: "Reisen", desc: "Deine geplanten Reisen, Tage & Programm", Icon: Calendar,
    w: ["reise","urlaub","trip","planung","tag","tage","programm","punkt","budget","kosten","packen","packliste","dokument","foto","pdf","drucken","kalender","ics","sicherung","backup","datensicherung","fahrzeit","offnungszeit","eintritt","wetter vorschlag","verschieben","datum andern"] },
  { tab: "ziele", label: "Ziele & Ideen", desc: "Gemerkte Ziele auf der Ideen-Karte", Icon: Globe2,
    w: ["idee","ideen","merken","gemerkt","wunschliste","wunsch","besucht","region","ideenkarte","stecknadel","nadel","karte","sammeln","zuordnen"] },
  { tab: "bestpreis", label: "Bestpreis", desc: "Preisübersicht deiner Reisen", Icon: Wallet,
    w: ["bestpreis","preis","preise","sparen","vergleich"] },
  { tab: "tools", toolKey: null, label: "Tools – Übersicht", desc: "Alle Werkzeuge in drei Schritten", Icon: Compass,
    w: ["tool","tools","werkzeug","ubersicht","hilfe","alles"] },
];

/* Synonyme je Werkzeug – Titel/Beschreibung kommen automatisch aus GROUPS */
const WORTE = {
  wochen: ["woche","wochen","wann","termin","motogp","moto gp","rennen","feiertag","ferien","bruckentag","langes wochenende","kalender","highlight","was steht an","saison"],
  ideen: ["idee","inspiration","wohin","wo hin","vorschlag","empfehlung","region finden","urlaubsidee","passende region","vorlieben","interessen"],
  entdecken: ["therme","burg","schloss","see","wasserfall","aussichtsturm","turm","alpenpass","pass","bergbahn","nationalpark","ausflug","ausflugsziel","umkreis","in der nahe","nahe","thema","themen"],
  monat: ["monat","klima","warm","baden","sonne","sonnig","mai","juni","juli","august","winter","sommer","wo ist es warm","badewetter"],
  region: ["region","stadt","ort","info","infos","steckbrief","sehenswurdigkeit","sehenswurdigkeiten","vor ort","pollen","luft","luftqualitat","foto","fotos","feiertag","wandern","wanderung","wanderweg","wanderwege","tour","touren","rundweg","rundwanderweg","rundwanderwege","schonste","schonster","ausgezeichnet","premiumweg","traumschleife","hohenmeter","favorit","favoriten","bundesland","rad","fahrrad","radweg","radfernweg","radtour","radeln","adfc","elberadweg","weser","mtb","hutte","gipfel","komoot","strecke","verlauf","wandertour"],
  karte: ["wetterkarte","wetter","temperatur","vorhersage","prognose","regen","land","turkei","europa","14 tage"],
  anreise: ["anreise","auto","bahn","zug","flug","fliegen","vergleich","vergleichen","co2","spritkosten","kosten","dauer","fahrzeit"],
  verkehr: ["direktflug","direktfluge","direktzug","direktzuge","haj","hannover airport","flughafen","abflug","ziele ab hannover","nonstop"],
  angebote: ["gunstig","gunstige","billig","billige","sparpreis","angebot","angebote","radar","ticket","tickets","schnappchen","deal","preis","preise","ice","bahnticket"],
  touren: ["schone touren","favorit","favoriten","rundweg","rundwanderweg","rundwanderwege","schonste","schonster","ausgezeichnet","premiumweg","traumschleife","bundesland","deutschlandkarte","wanderkarte","rad","fahrrad","radweg","radfernweg","radtour","radeln","adfc","elberadweg","weser","dsw","hohenmeter","tagestour","tour"],
  offline: ["offline","ohne netz","kein netz","funkloch","roaming","vorladen","herunterladen","download","karte speichern","unterwegs","flugmodus","ausland"],
  maut: ["maut","vignette","pickerl","brenner","tauern","arlberg","karawanken","tunnel","asfinag","autobahn","gebuhr","gebuhren","grossglockner","streckenmaut","osterreich","schweiz","tschechien","slowenien"],
};

const EINTRAEGE = [
  ...BEREICHE.map((b) => ({ ...b, art: "bereich", text: norm([b.label, b.desc, b.w.join(" ")].join(" ")) })),
  ...GROUPS.flatMap((g) => g.items.map((it) => ({
    art: "tool", tab: "tools", toolKey: it.k, label: it.label, desc: it.desc, Icon: it.Icon, gruppe: g.g,
    text: norm([it.label, it.desc, (WORTE[it.k] || []).join(" ")].join(" ")),
  }))),
];

function treffer(q) {
  const nq = norm(q);
  if (!nq) return [];
  const tokens = nq.split(" ").filter((t) => t.length > 1 && !STOPP.has(t));
  const suchTokens = tokens.length ? tokens : nq.split(" ").filter(Boolean);
  return EINTRAEGE.map((e) => {
    let p = 0;
    const nl = norm(e.label);
    if (nl === nq) p += 120;
    else if (nl.includes(nq)) p += 70;
    if (e.text.includes(nq)) p += 40;
    for (const t of suchTokens) {
      if (nl.includes(t)) p += 30;
      else if (e.text.includes(" " + t + " ") || e.text.startsWith(t + " ") || e.text.endsWith(" " + t)) p += 22;
      else if (e.text.includes(t)) p += 10;
    }
    return { e, p };
  }).filter((x) => x.p > 0).sort((a, b) => b.p - a.p).slice(0, 6).map((x) => x.e);
}

export default function Suche({ onGo }) {
  const [auf, setAuf] = useState(false);
  const [q, setQ] = useState("");
  const res = treffer(q);

  const geh = (e) => { onGo({ homeTab: e.tab, toolKey: e.art === "tool" ? e.toolKey : null }); setQ(""); setAuf(false); };

  if (!auf) {
    return (
      <button onClick={() => setAuf(true)} aria-label="Suchen" title="In der App suchen"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-emerald-700">
        <Search className="h-4 w-4" /> Suche
      </button>
    );
  }

  return (
    <div className="relative min-w-0 flex-1">
      <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-2 dark:border-emerald-700 dark:bg-stone-900">
        <Search className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && res[0]) geh(res[0]); if (e.key === "Escape") { setQ(""); setAuf(false); } }}
          placeholder="Stichwort oder Frage – z. B. „günstige Tickets“" className="w-full bg-transparent py-2 text-sm focus:outline-none" />
        <button onClick={() => { setQ(""); setAuf(false); }} aria-label="Schließen" className="shrink-0 rounded p-1 text-stone-400 hover:text-stone-600"><X className="h-4 w-4" /></button>
      </div>

      {q.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {res.length === 0 && <div className="px-3 py-3 text-sm text-stone-500 dark:text-stone-400">Nichts gefunden. Versuch’s mit „Wetter“, „Maut“, „Wandern“, „günstig“ oder „Ideen“.</div>}
          {res.map((e, i) => {
            const Ico = e.Icon || Compass;
            return (
              <button key={e.art + (e.toolKey || e.tab) + i} onClick={() => geh(e)}
                className="flex w-full items-center gap-2.5 border-b border-stone-100 px-3 py-2.5 text-left transition last:border-0 hover:bg-emerald-50 dark:border-stone-800 dark:hover:bg-stone-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Ico className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{e.label}{i === 0 && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">beste Übereinstimmung</span>}</span>
                  <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{e.gruppe ? e.gruppe + " · " : ""}{e.desc}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-stone-300 dark:text-stone-600" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
