import React, { useState, useEffect, useCallback, Suspense } from "react";
import {
  Plus, Trash2, Check, X, MapPin, Search, Heart, Globe2, Map as MapIcon,
  ChevronDown, ChevronUp, Plane, Link2, ExternalLink, Star, RotateCcw
} from "lucide-react";
import { EUROPE_REGIONS, regionKey, europeCountries, toMapCountry, COUNTRY_DE_EN, normCountry } from "./geo.js";

const WorldMap = React.lazy(() => import("./WorldMap.jsx"));
const EuropeMap = React.lazy(() => import("./EuropeMap.jsx"));

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "wish-" + Date.now() + "-" + Math.round(Math.random() * 1e6);

const inputCls = "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none";
const norm = (s) => (s || "").toString().toLowerCase().trim();

/* Fehlergrenze, falls die Kartendaten nicht geladen werden können */
class MapBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

export default function Reiseziele({ wishlist, setWishlist, visited, setVisited, regions, setRegions, visitedRegions, setVisitedRegions, trips, onCreateTripFromWish, onOpenTrip }) {
  const [tab, setTab] = useState("wunsch");
  const tabs = [
    { key: "wunsch", label: "Wunschliste", icon: Heart },
    { key: "welt", label: "Weltkarte", icon: Globe2 },
    { key: "europa", label: "Europa", icon: MapIcon },
  ];
  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
        {tabs.map((t) => { const Icon = t.icon; const active = tab === t.key; return (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition ${active ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><Icon className="h-4 w-4" /> {t.label}</button>
        ); })}
      </div>
      {tab === "wunsch" && <Wishlist wishlist={wishlist} setWishlist={setWishlist} visited={visited} setVisited={setVisited} trips={trips} onCreateTripFromWish={onCreateTripFromWish} onOpenTrip={onOpenTrip} />}
      {tab === "welt" && <WeltkarteView visited={visited} setVisited={setVisited} />}
      {tab === "europa" && <EuropaView regions={regions} setRegions={setRegions} visitedRegions={visitedRegions} setVisitedRegions={setVisitedRegions} />}
    </div>
  );
}

/* ════════════════════════ Wunschliste ════════════════════════ */

function Wishlist({ wishlist, setWishlist, visited, setVisited, trips, onCreateTripFromWish, onOpenTrip }) {
  const [name, setName] = useState("");
  const [land, setLand] = useState("");
  const [region, setRegion] = useState("");
  const [note, setNote] = useState("");
  const [openAdd, setOpenAdd] = useState(false);

  const toggleCountry = (mapName) => { const next = { ...visited }; if (next[mapName]) delete next[mapName]; else next[mapName] = true; setVisited(next); };
  const wishNorm = new Set();
  wishlist.forEach((w) => {
    if (w.done) return;
    const cands = [];
    if (w.land) cands.push(toMapCountry(w.land));
    if (w.name && COUNTRY_DE_EN[(w.name || "").trim()]) cands.push(COUNTRY_DE_EN[(w.name || "").trim()]);
    cands.forEach((c) => { if (c) wishNorm.add(normCountry(c)); });
  });

  const add = () => {
    if (!name.trim()) return;
    setWishlist([{ id: uid(), name: name.trim(), land: land.trim(), region: region.trim(), note: note.trim(), done: false, tripId: null, created: Date.now() }, ...wishlist]);
    setName(""); setLand(""); setRegion(""); setNote(""); setOpenAdd(false);
  };
  const patch = (id, p) => setWishlist(wishlist.map((w) => (w.id === id ? { ...w, ...p } : w)));
  const remove = (id) => setWishlist(wishlist.filter((w) => w.id !== id));

  const open = wishlist.filter((w) => !w.done);
  const done = wishlist.filter((w) => w.done);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
        <MapBoundary fallback={<div className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">Karte konnte nicht geladen werden – beim ersten Mal ist eine Internetverbindung nötig.</div>}>
          <Suspense fallback={<div className="rounded-xl border border-stone-200 bg-sky-100 p-10 text-center text-sm text-stone-500">Karte lädt …</div>}>
            <WorldMap visited={visited} wish={wishNorm} onToggle={toggleCountry} />
          </Suspense>
        </MapBoundary>
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#059669" }} /> besucht</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#ec4899" }} /> Wunsch (noch nicht besucht)</span>
        </div>
      </section>
      {!openAdd ? (
        <button onClick={() => setOpenAdd(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"><Plus className="h-4 w-4" /> Wunschziel hinzufügen</button>
      ) : (
        <section className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Ziel (z. B. Lofoten, Japan, Toskana)" className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <input value={land} onChange={(e) => setLand(e.target.value)} placeholder="Land (optional)" className={inputCls} />
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region (optional)" className={inputCls} />
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (optional)" className={inputCls} />
          <div className="flex gap-2 pt-1">
            <button onClick={add} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"><Plus className="h-4 w-4" /> Speichern</button>
            <button onClick={() => setOpenAdd(false)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 hover:border-stone-300">Abbrechen</button>
          </div>
        </section>
      )}

      {wishlist.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center"><Star className="mx-auto mb-3 h-8 w-8 text-stone-300" /><p className="text-sm text-stone-500">Noch keine Wunschziele. Sammle hier Orte, die du besuchen möchtest.</p></div>
      ) : (
        <>
          {open.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Offen ({open.length})</h3>
              <ul className="space-y-3">{open.map((w) => <WishItem key={w.id} wish={w} trips={trips} onPatch={(p) => patch(w.id, p)} onRemove={() => remove(w.id)} onCreateTripFromWish={onCreateTripFromWish} onOpenTrip={onOpenTrip} />)}</ul>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Erledigt ({done.length})</h3>
              <ul className="space-y-3">{done.map((w) => <WishItem key={w.id} wish={w} trips={trips} onPatch={(p) => patch(w.id, p)} onRemove={() => remove(w.id)} onCreateTripFromWish={onCreateTripFromWish} onOpenTrip={onOpenTrip} />)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function WishItem({ wish, trips, onPatch, onRemove, onCreateTripFromWish, onOpenTrip }) {
  const linked = trips.find((t) => t.id === wish.tripId) || null;
  const sub = [wish.region, wish.land].filter(Boolean).join(", ");
  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <button onClick={() => onPatch({ done: !wish.done })} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${wish.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white text-transparent"}`} aria-label="Als besucht markieren">{wish.done && <Check className="h-4 w-4" />}</button>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${wish.done ? "text-stone-400 line-through" : "text-stone-900"}`}>{wish.name}</p>
          {sub && <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-500"><MapPin className="h-3.5 w-3.5" /> {sub}</p>}
          {wish.note && <p className="mt-1 text-sm text-stone-600">{wish.note}</p>}
        </div>
        <button onClick={onRemove} className="rounded-lg p-1.5 text-stone-300 transition hover:bg-rose-50 hover:text-rose-500" aria-label="Löschen"><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {linked ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"><Link2 className="h-3.5 w-3.5" /> {linked.name || "Urlaub"}</span>
            <button onClick={() => onOpenTrip(linked.id)} className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-emerald-700"><ExternalLink className="h-3.5 w-3.5" /> öffnen</button>
            <button onClick={() => onPatch({ tripId: null })} className="text-xs font-medium text-stone-400 hover:text-rose-500">lösen</button>
          </>
        ) : (
          <>
            <button onClick={() => onCreateTripFromWish(wish)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800"><Plane className="h-3.5 w-3.5 text-emerald-600" /> Urlaub anlegen</button>
            {trips.length > 0 && (
              <select value="" onChange={(e) => e.target.value && onPatch({ tripId: e.target.value })} className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600 focus:border-emerald-400 focus:outline-none">
                <option value="">Urlaub verknüpfen …</option>
                {trips.map((t) => <option key={t.id} value={t.id}>{t.name || "Ohne Titel"}</option>)}
              </select>
            )}
          </>
        )}
      </div>
    </li>
  );
}

/* ════════════════════════ Weltkarte ════════════════════════ */

function WeltkarteView({ visited, setVisited }) {
  const [names, setNames] = useState([]);
  const [q, setQ] = useState("");
  const handleNames = useCallback((list) => { setNames((prev) => (prev.length === list.length ? prev : list.slice().sort())); }, []);
  const toggle = (name) => { const next = { ...visited }; if (next[name]) delete next[name]; else next[name] = true; setVisited(next); };
  const count = Object.keys(visited).filter((k) => visited[k]).length;
  const results = q.trim() ? names.filter((n) => norm(n).includes(norm(q))).slice(0, 40) : [];
  const reset = () => { if (window.confirm("Alle abgehakten Länder zurücksetzen?")) setVisited({}); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"><Globe2 className="h-4 w-4" /> {count} Länder besucht</span>
        {count > 0 && <button onClick={reset} className="inline-flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-rose-500"><RotateCcw className="h-3.5 w-3.5" /> zurücksetzen</button>}
      </div>

      <MapBoundary fallback={<div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">Kartendaten konnten nicht geladen werden. Beim ersten Mal ist dafür eine Internetverbindung nötig – danach geht es offline. Du kannst Länder unten trotzdem über die Suche abhaken.</div>}>
        <Suspense fallback={<div className="rounded-xl border border-stone-200 bg-sky-100 p-10 text-center text-sm text-stone-500">Karte lädt …</div>}>
          <WorldMap visited={visited} onToggle={toggle} onNames={handleNames} />
        </Suspense>
      </MapBoundary>
      <p className="text-xs text-stone-400">Tippen zum Abhaken · zwei Finger zum Zoomen und Verschieben. Grün = besucht.</p>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2">
          <Search className="h-4 w-4 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Land suchen und abhaken" className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
          {q && <button onClick={() => setQ("")} aria-label="Leeren"><X className="h-4 w-4 text-stone-400" /></button>}
        </div>
        {q.trim() === "" ? (
          <p className="text-sm text-stone-400">{names.length ? "Tippe einen Ländernamen ein." : "Suche verfügbar, sobald die Karte einmal geladen wurde."}</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-stone-400">Keine Treffer.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {results.map((n) => { const on = !!visited[n]; return (
              <li key={n}>
                <button onClick={() => toggle(n)} className="flex w-full items-center gap-3 py-2 text-left">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white text-transparent"}`}>{on && <Check className="h-3.5 w-3.5" />}</span>
                  <span className={`text-sm ${on ? "text-emerald-700" : "text-stone-700"}`}>{n}</span>
                </button>
              </li>
            ); })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ════════════════════════ Europa-Regionen ════════════════════════ */

function EuropaView({ regions, setRegions, visitedRegions, setVisitedRegions }) {
  const [view, setView] = useState("karte");
  const [q, setQ] = useState("");
  const [openLand, setOpenLand] = useState(null);
  const toggle = (land, region) => { const key = regionKey(land, region); const next = { ...regions }; if (next[key]) delete next[key]; else next[key] = true; setRegions(next); };
  const isOn = (land, region) => !!regions[regionKey(land, region)];
  const totalCount = Object.keys(regions).filter((k) => regions[k]).length;

  const toggleMap = (id) => { const next = { ...(visitedRegions || {}) }; if (next[id]) delete next[id]; else next[id] = true; setVisitedRegions(next); };
  const mapCount = Object.keys(visitedRegions || {}).filter((k) => visitedRegions[k]).length;
  const resetMap = () => { if (window.confirm("Alle auf der Karte markierten Regionen zurücksetzen?")) setVisitedRegions({}); };

  const query = norm(q);
  const matches = [];
  if (query) europeCountries.forEach((land) => { EUROPE_REGIONS[land].forEach((r) => { if (norm(r).includes(query) || norm(land).includes(query)) matches.push({ land, region: r }); }); });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
        <button onClick={() => setView("karte")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${view === "karte" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><MapIcon className="h-4 w-4" /> Karte</button>
        <button onClick={() => setView("liste")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${view === "liste" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><Check className="h-4 w-4" /> Liste</button>
      </div>

      {view === "karte" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"><MapIcon className="h-4 w-4" /> {mapCount} Regionen auf der Karte</span>
            {mapCount > 0 && <button onClick={resetMap} className="inline-flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-rose-500"><RotateCcw className="h-3.5 w-3.5" /> zurücksetzen</button>}
          </div>
          <MapBoundary fallback={<div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">Die Regionen-Karte konnte nicht geladen werden. Beim ersten Mal ist dafür eine Internetverbindung nötig – danach geht es offline. Über „Liste" kannst du Regionen trotzdem abhaken.</div>}>
            <Suspense fallback={<div className="rounded-xl border border-stone-200 bg-sky-100 p-10 text-center text-sm text-stone-500">Regionen-Karte lädt … (kann beim ersten Mal etwas dauern)</div>}>
              <EuropeMap visited={visitedRegions || {}} onToggle={toggleMap} />
            </Suspense>
          </MapBoundary>
          <p className="text-xs text-stone-400">Region antippen zum Abhaken · zwei Finger zum Zoomen. Hinweis: Karte und „Liste" werden vorerst getrennt gezählt.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" /> {totalCount} Regionen abgehakt</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Region oder Land suchen" className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
            {q && <button onClick={() => setQ("")} aria-label="Leeren"><X className="h-4 w-4 text-stone-400" /></button>}
          </div>
          {query ? (
            <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              {matches.length === 0 ? <p className="text-sm text-stone-400">Keine Treffer.</p> : (
                <ul className="divide-y divide-stone-100">
                  {matches.slice(0, 60).map(({ land, region }) => { const on = isOn(land, region); return (
                    <li key={land + region}>
                      <button onClick={() => toggle(land, region)} className="flex w-full items-center gap-3 py-2 text-left">
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white text-transparent"}`}>{on && <Check className="h-3.5 w-3.5" />}</span>
                        <span className={`text-sm ${on ? "text-emerald-700" : "text-stone-700"}`}>{region}</span>
                        <span className="ml-auto text-xs text-stone-400">{land}</span>
                      </button>
                    </li>
                  ); })}
                </ul>
              )}
            </section>
          ) : (
            <div className="space-y-3">
              {europeCountries.map((land) => {
                const list = EUROPE_REGIONS[land];
                const c = list.filter((r) => isOn(land, r)).length;
                const isOpen = openLand === land;
                return (
                  <section key={land} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <button onClick={() => setOpenLand(isOpen ? null : land)} className="flex w-full items-center justify-between px-4 py-3">
                      <span className="font-semibold text-stone-900">{land}</span>
                      <span className="flex items-center gap-2"><span className="text-xs text-stone-400">{c}/{list.length}</span>{isOpen ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}</span>
                    </button>
                    {isOpen && (
                      <ul className="border-t border-stone-100 px-2 pb-2">
                        {list.map((r) => { const on = isOn(land, r); return (
                          <li key={r}>
                            <button onClick={() => toggle(land, r)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-stone-50">
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white text-transparent"}`}>{on && <Check className="h-3.5 w-3.5" />}</span>
                              <span className={`text-sm ${on ? "text-emerald-700" : "text-stone-700"}`}>{r}</span>
                            </button>
                          </li>
                        ); })}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
