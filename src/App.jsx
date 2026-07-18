import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Trash2, MapPin, Camera, Mountain, Utensils, Hotel as HotelIcon,
  Landmark, Eye, ChevronLeft, Calendar, CalendarRange, Wallet, X, Compass,
  Sun, Moon, CloudRain, Clock, Car, Inbox, Download, Upload, Copy, Check,
  ChevronDown, ChevronUp, Info, Bed, Ticket, ShoppingBag, GripVertical,
  Briefcase, Train, Plane, ExternalLink, Lightbulb, Eraser, MapPinned,
  Paperclip, FileText, Image as ImageIcon, Globe2, Search, Map as MapIcon, Route, Thermometer, Droplets, Loader2, CalendarPlus, PartyPopper, Crosshair, ChevronRight, ShieldAlert, LayoutGrid, MountainSnow, Bike
} from "lucide-react";
import { loadState, saveState, addDoc, listDocsByScope, listDocsByTrip, getBlob, deleteDoc, deleteDocsByScope, deleteDocsByTrip } from "./db.js";
import { getSuggestions, suggestPacking } from "./data/suggestions.js";
import { POI_KATEGORIEN, findeKoordinaten, ladePOIs, osmMapsUrl, sucheOrte, reverseSuche } from "./overpass.js";
import { ladeWetter, wetterText, wetterLage, inVorhersage } from "./wetter.js";
import { ladeKlima, MONATSNAMEN } from "./klima.js";
import { ladeFeiertageLand } from "./ferien.js";
import { downloadICS } from "./ics.js";

const DayMap = React.lazy(() => import("./DayMap.jsx"));
const TripMap = React.lazy(() => import("./TripMap.jsx"));
const TAG_FARBEN = ["#047857", "#0284c7", "#d97706", "#be123c", "#7c3aed", "#0f766e", "#c2410c", "#4d7c0f", "#9333ea", "#0891b2"];
const farbeFuerTag = (i) => TAG_FARBEN[i % TAG_FARBEN.length];
import Reiseziele from "./Reiseziele.jsx";
import Bestpreis from "./Bestpreis.jsx";
import ReiseTools from "./ReiseTools.jsx";
import AppMenu from "./AppMenu.jsx";
import Reisekarte from "./Reisekarte.jsx";
import Wandern from "./Wandern.jsx";
import Ideenkarte from "./Ideenkarte.jsx";
import Sicherung, { tageSeitSicherung, WARN_TAGE } from "./Sicherung.jsx";
import Wetterplan from "./Wetterplan.jsx";
import Reisedruck from "./Reisedruck.jsx";
import Startseite from "./Startseite.jsx";

/* ════════════════════════ Konstanten & Helfer ════════════════════════ */

const CATEGORIES = [
  { key: "sehenswuerdigkeit", label: "Sehenswürdigkeit", icon: Landmark },
  { key: "fotospot", label: "Fotospot", icon: Camera },
  { key: "aussicht", label: "Aussichtspunkt", icon: Eye },
  { key: "wanderung", label: "Wandertour", icon: Mountain },
  { key: "gipfel", label: "Gipfeltour", icon: MountainSnow },
  { key: "radtour", label: "Radtour", icon: Bike },
  { key: "restaurant", label: "Restaurant", icon: Utensils },
  { key: "hotel", label: "Unterkunft", icon: HotelIcon },
];
const catByKey = (k) => CATEGORIES.find((c) => c.key === k) || CATEGORIES[0];

const COST_CATS = [
  { key: "anfahrt", label: "Anfahrt", icon: Car },
  { key: "unterkunft", label: "Unterkunft", icon: Bed },
  { key: "essen", label: "Essen", icon: Utensils },
  { key: "aktivitaet", label: "Aktivitäten", icon: Ticket },
  { key: "sonstiges", label: "Sonstiges", icon: ShoppingBag },
];
const costCatByKey = (k) => COST_CATS.find((c) => c.key === k) || COST_CATS[4];
const KAT_TO_COST = { wanderung: "aktivitaet", restaurant: "essen", hotel: "unterkunft", sehenswuerdigkeit: "aktivitaet", fotospot: "aktivitaet", aussicht: "aktivitaet" };

const PRIORITIES = [
  { key: "must", label: "Must-see", tone: "bg-rose-100 text-rose-700" },
  { key: "wenn", label: "Wenn Zeit", tone: "bg-stone-100 text-stone-500" },
];

const WEATHER = {
  any: { label: "Egal", icon: Calendar, chip: "bg-stone-100 text-stone-600" },
  sun: { label: "Schönwetter", icon: Sun, chip: "bg-amber-100 text-amber-800" },
  rain: { label: "Schlechtwetter", icon: CloudRain, chip: "bg-sky-100 text-sky-800" },
};

const COUNTRIES = [
  { key: "Deutschland", regions: ["Bayern", "München", "Allgäu", "Schwarzwald", "Bodensee", "Harz", "Sächsische Schweiz", "Berchtesgadener Land", "Nordsee", "Ostsee", "Rügen", "Berlin", "Hamburg", "Mosel", "Rheintal"] },
  { key: "Österreich", regions: ["Tirol", "Zillertal", "Ötztal", "Stubaital", "Salzburger Land", "Salzburg", "Kärnten", "Steiermark", "Vorarlberg", "Wien", "Wachau", "Achensee"] },
  { key: "Schweiz", regions: ["Graubünden", "Engadin", "Wallis", "Zermatt", "Berner Oberland", "Interlaken", "Tessin", "Luzern / Vierwaldstättersee", "Zürich", "Jungfrau-Region"] },
  { key: "Italien", regions: ["Südtirol", "Dolomiten", "Gardasee", "Comer See", "Toskana", "Amalfiküste", "Ligurien / Cinque Terre", "Rom", "Venedig", "Florenz", "Sizilien", "Sardinien"] },
  { key: "Spanien", regions: ["Mallorca", "Teneriffa", "Gran Canaria", "Lanzarote", "Fuerteventura", "La Palma", "Ibiza", "Andalusien", "Barcelona / Katalonien", "Costa Brava", "Madrid", "Valencia"] },
  { key: "Portugal", regions: ["Algarve", "Lissabon", "Porto / Douro", "Madeira", "Azoren", "Sintra"] },
  { key: "Frankreich", regions: ["Provence", "Côte d'Azur", "Elsass", "Paris", "Bretagne", "Normandie", "Korsika", "Französische Alpen", "Loiretal"] },
  { key: "Griechenland", regions: ["Kreta", "Rhodos", "Santorini", "Korfu", "Kos", "Naxos", "Athen", "Chalkidiki", "Zakynthos"] },
  { key: "Niederlande", regions: ["Amsterdam", "Zeeland", "Texel", "Nordseeküste", "Rotterdam", "Den Haag"] },
];
const countryByKey = (k) => COUNTRIES.find((c) => c.key === k);
const regionLabel = (t) => [t.region, t.land].filter(Boolean).join(", ");

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "id-" + Date.now() + "-" + Math.round(Math.random() * 1e6);

const isValidISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const todayISO = () => new Date().toISOString().slice(0, 10);

const fmtDate = (s) => { if (!s) return ""; const d = new Date(s + "T00:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }); };
const fmtDateFull = (s) => { if (!s) return ""; const d = new Date(s + "T00:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); };
const fmtRange = (t) => t.start && t.end ? `${fmtDateFull(t.start)} – ${fmtDateFull(t.end)}` : t.start ? `ab ${fmtDateFull(t.start)}` : "kein Datum";
const weekdayName = (iso) => { const d = new Date(iso + "T00:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("de-DE", { weekday: "long" }); };

const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dateDiff = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000);
const datesBetween = (start, end) => { if (!start || !end) return []; const out = []; let cur = start, guard = 0; while (cur <= end && guard < 400) { out.push(cur); cur = addDays(cur, 1); guard++; } return out; };

/* Luftlinie in km (für Sortierung nach Nähe) */
const haversine = (a, b) => {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
/* Reihenfolge nach Nähe (Nearest Neighbor), Startpunkt bleibt vorn */
function sortiereNachNaehe(punkte) {
  const mit = punkte.filter((p) => p.lat != null && p.lon != null);
  const ohne = punkte.filter((p) => p.lat == null || p.lon == null);
  if (mit.length < 3) return punkte;
  const rest = mit.slice(1);
  const route = [mit[0]];
  while (rest.length) {
    const letzter = route[route.length - 1];
    let bi = 0, bd = Infinity;
    rest.forEach((p, i) => { const d = haversine(letzter, p); if (d < bd) { bd = d; bi = i; } });
    route.push(rest.splice(bi, 1)[0]);
  }
  return [...route, ...ohne];
}

/* Fahrzeiten via OSRM (frei, ohne Schlüssel, fair use). Eine Anfrage mit allen
   Wegpunkten liefert legs[] – je ein Teilstück zwischen zwei aufeinanderfolgenden Punkten. */
async function osrmLegs(punkte, ms = 15000) {
  const coords = punkte.map((p) => p.lon + "," + p.lat).join(";");
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const legs = j && j.routes && j.routes[0] && j.routes[0].legs;
    if (!legs || !legs.length) throw new Error("keine Route");
    return legs;
  } finally { clearTimeout(t); }
}
const fahrzeitText = (leg) => {
  const min = Math.round(leg.duration / 60), km = Math.round(leg.distance / 1000);
  const h = Math.floor(min / 60), m = min % 60;
  return (h > 0 ? `${h} h ${m < 10 ? "0" + m : m} Min` : `${min} Min`) + ` · ${km} km`;
};
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

/* Öffnungszeiten & Eintritt aus OpenStreetMap (Overpass, frei, ohne Schlüssel).
   Eine Sammelabfrage für alle Punkte eines Tages: am Ort des Punkts wird nach einem
   Objekt gleichen Namens gesucht. Was OSM nicht hat, bleibt leer – nichts wird geraten. */
const osmEsc = (x) => String(x).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
async function ladeOsmDetails(punkte, ms = 25000) {
  const teile = punkte.map((p) => `nwr(around:150,${p.lat},${p.lon})["name"="${osmEsc(p.name)}"];`).join("");
  const q = `[out:json][timeout:25];(${teile});out tags center 60;`;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: q, signal: ctrl.signal, headers: { "Content-Type": "text/plain" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    return (j && j.elements) || [];
  } finally { clearTimeout(t); }
}
const OH_TAGE = { Mo: "Mo", Tu: "Di", We: "Mi", Th: "Do", Fr: "Fr", Sa: "Sa", Su: "So", PH: "Feiertage", SH: "Ferien" };
/* Nur Beschriftungen übersetzen – KEIN Öffnungszeiten-Parser. "Jetzt geöffnet?" wäre
   ohne echten Parser oft falsch, deshalb zeigen wir die Angabe, statt sie zu deuten. */
function ohDeutsch(x) {
  if (!x) return "";
  if (/^\s*24\/7\s*$/.test(x)) return "durchgehend geöffnet";
  return String(x)
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH|SH)\b/g, (m) => OH_TAGE[m] || m)
    .replace(/\boff\b/gi, "geschlossen")
    .replace(/\bclosed\b/gi, "geschlossen")
    .replace(/\bopen\b/gi, "geöffnet");
}
function eintrittText(t) {
  if (t.charge) return t.charge;
  if (t.fee === "no") return "Eintritt frei";
  if (t.fee === "yes") return "Eintritt kostenpflichtig";
  if (t.fee) return String(t.fee);
  return "";
}

const eur = (n) => (Number(n) || 0).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";

const allItems = (t) => t.items || [];
const planTotal = (t) => allItems(t).reduce((s, i) => s + (Number(i.kosten) || 0), 0);
const istTotal = (t) => allItems(t).reduce((s, i) => s + (Number(i.kostenIst) || 0), 0);

const mapsUrl = (q, region) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([q, region].filter(Boolean).join(", "));
const dirUrl = (from, to, region) => "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent([from, region].filter(Boolean).join(", ")) + "&destination=" + encodeURIComponent([to, region].filter(Boolean).join(", "));
const ddmmyyyy = (iso) => { if (!isValidISO(iso)) return ""; const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; };
// Deeplinks: auf Android öffnen diese https-Links die jeweilige App automatisch,
// sofern sie installiert ist (Android App Links) – sonst die mobile Website.
const iataLike = (s) => /^[A-Za-z]{3}$/.test((s || "").trim());
const yymmdd = (iso) => (isValidISO(iso) ? iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10) : "");

// Bahn: neue bahn.de-Verbindungssuche – öffnet den DB Navigator, Start/Ziel vorbefüllt
const dbNavLink = (from, to, dateISO) => {
  let u = "https://www.bahn.de/buchung/fahrplan/suche#soid=O=" + encodeURIComponent(from || "") + "&zoid=O=" + encodeURIComponent(to || "");
  if (isValidISO(dateISO)) u += "&hd=" + dateISO + "T08:00:00&hza=D";
  return u;
};
// Skyscanner: präziser Treffer nur mit IATA-Codes (z. B. HAJ/TFS), sonst Flugsuche-Start
const skyscannerLink = (von, nach, start, end) => {
  if (iataLike(von) && iataLike(nach) && isValidISO(start)) {
    let u = "https://www.skyscanner.de/transport/fluge/" + von.toLowerCase() + "/" + nach.toLowerCase() + "/" + yymmdd(start) + "/";
    if (isValidISO(end)) u += yymmdd(end) + "/";
    return u;
  }
  return "https://www.skyscanner.de/";
};
// Booking Hotelsuche mit Zielort + Datum vorbefüllt
const bookingHotelLink = (dest, checkin, checkout) => {
  const p = new URLSearchParams();
  if (dest) p.set("ss", dest);
  if (isValidISO(checkin)) p.set("checkin", checkin);
  if (isValidISO(checkout)) p.set("checkout", checkout);
  p.set("group_adults", "2"); p.set("no_rooms", "1"); p.set("group_children", "0");
  return "https://www.booking.com/searchresults.de.html?" + p.toString();
};

const AIRLINES = [
  { key: "lufthansa", label: "Lufthansa", url: "https://www.lufthansa.com/de/de/flight-search" },
  { key: "eurowings", label: "Eurowings", url: "https://www.eurowings.com/de/booking/flights.html" },
  { key: "tuifly", label: "TUI fly", url: "https://www.tuifly.com/de/flug/fluege-buchen.html" },
];

const VALID_KATS = CATEGORIES.map((c) => c.key);
const VALID_W = ["sun", "rain", "any"];
const VALID_PRIO = ["must", "wenn"];

const mkItem = (s, extra = {}) => ({
  id: uid(),
  kategorie: VALID_KATS.includes(s.kategorie) ? s.kategorie : "sehenswuerdigkeit",
  name: s.name || "Punkt", gebiet: s.gebiet || "", info: s.info || "", notiz: "",
  mapsSuche: s.maps_suche || s.name || "", kostenHinweis: s.kosten_ca || "", kosten: null, kostenIst: null,
  prio: VALID_PRIO.includes(s.prio) ? s.prio : null, zeit: s.zeit || "", fahrzeit: s.fahrzeit || "",
  season: s.saison || "", weather: VALID_W.includes(s.wetter) ? s.wetter : "any", ...extra,
});

/* sichere Datumsverschiebung: alle Tage/Items um delta verschieben */
function shiftTripByDays(trip, delta) {
  const start = addDays(trip.start, delta);
  const end = isValidISO(trip.end) ? addDays(trip.end, delta) : trip.end;
  const items = (trip.items || []).map((i) => (i.day && isValidISO(i.day) ? { ...i, day: addDays(i.day, delta) } : i));
  const days = {};
  Object.entries(trip.days || {}).forEach(([d, meta]) => { days[isValidISO(d) ? addDays(d, delta) : d] = meta; });
  return { start, end, items, days };
}

/* ════════════════════════ UI-Bausteine ════════════════════════ */

function Pill({ children, className = "bg-stone-100 text-stone-600" }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}
function PrimaryButton({ children, onClick, className = "", disabled }) {
  return <button onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50 ${className}`}>{children}</button>;
}
function GhostButton({ children, onClick, className = "", disabled }) {
  return <button onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50 ${className}`}>{children}</button>;
}
function IconBtn({ children, onClick, label, tone = "text-stone-400 hover:bg-emerald-50 hover:text-emerald-700" }) {
  return <button onClick={onClick} aria-label={label} title={label} className={`rounded-lg p-1.5 transition ${tone}`}>{children}</button>;
}
function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</span>{children}</label>;
}
const inputCls = "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none";

function ThemeToggle() {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  const toggle = () => { const n = !dark; setDark(n); document.documentElement.classList.toggle("dark", n); try { localStorage.setItem("up-theme", n ? "dark" : "light"); } catch (e) {} };
  return <IconBtn onClick={toggle} label={dark ? "Hell" : "Dunkel"}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</IconBtn>;
}

/* ════════════════════════ Dokumente ════════════════════════ */

function emitDocsChanged(tripId) { try { window.dispatchEvent(new CustomEvent("up-docs", { detail: { tripId } })); } catch (e) {} }
const fmtSize = (n) => (n / 1024 < 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

function useScopeDocs(tripId, scope) {
  const [docs, setDocs] = useState([]);
  const load = useCallback(() => { listDocsByScope(tripId, scope).then(setDocs); }, [tripId, scope]);
  useEffect(() => { load(); const h = (e) => { if (!e.detail || e.detail.tripId === tripId) load(); }; window.addEventListener("up-docs", h); return () => window.removeEventListener("up-docs", h); }, [load, tripId]);
  return docs;
}
function useTripDocs(tripId) {
  const [docs, setDocs] = useState([]);
  const load = useCallback(() => { listDocsByTrip(tripId).then(setDocs); }, [tripId]);
  useEffect(() => { load(); const h = (e) => { if (!e.detail || e.detail.tripId === tripId) load(); }; window.addEventListener("up-docs", h); return () => window.removeEventListener("up-docs", h); }, [load, tripId]);
  return docs;
}

function DocAdd({ tripId, scope, small }) {
  const [busy, setBusy] = useState(false);
  const onFiles = async (files) => {
    setBusy(true);
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024 && !window.confirm(`„${f.name}" ist ${(f.size / 1048576).toFixed(1)} MB groß und liegt nur lokal auf diesem Gerät. Trotzdem hinzufügen?`)) continue;
      await addDoc(tripId, scope, f);
    }
    emitDocsChanged(tripId); setBusy(false);
  };
  return (
    <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white font-medium text-stone-600 transition hover:border-emerald-300 hover:text-emerald-800 ${small ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"}`}>
      <Paperclip className={small ? "h-3.5 w-3.5" : "h-4 w-4"} /> {busy ? "lädt …" : "Datei"}
      <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length) onFiles(fs); e.target.value = ""; }} />
    </label>
  );
}

function DocThumb({ doc, onOpen, onDelete }) {
  const isImg = (doc.type || "").startsWith("image/");
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let u = null, alive = true;
    if (isImg) getBlob(doc.id).then((b) => { if (b && alive) { u = URL.createObjectURL(b); setUrl(u); } });
    return () => { alive = false; if (u) URL.revokeObjectURL(u); };
  }, [doc.id, isImg]);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-2">
      <button onClick={() => onOpen(doc)} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
        {isImg ? (url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-stone-300" />) : <FileText className="h-5 w-5 text-rose-500" />}
      </button>
      <button onClick={() => onOpen(doc)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm text-stone-700">{doc.name}</p>
        <p className="text-xs text-stone-400">{fmtSize(doc.size || 0)}{isImg ? "" : " · PDF"}</p>
      </button>
      <IconBtn onClick={() => onDelete(doc)} label="Löschen" tone="text-stone-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></IconBtn>
    </div>
  );
}

function DocViewer({ doc, onClose }) {
  const [url, setUrl] = useState(null);
  const isImg = (doc && doc.type || "").startsWith("image/");
  useEffect(() => {
    let u = null, alive = true;
    if (doc) getBlob(doc.id).then((b) => { if (b && alive) { u = URL.createObjectURL(b); setUrl(u); } });
    return () => { alive = false; if (u) URL.revokeObjectURL(u); };
  }, [doc]);
  if (!doc) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ backgroundColor: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5">
          <p className="min-w-0 truncate text-sm font-semibold text-stone-800">{doc.name}</p>
          <div className="flex items-center gap-1">
            {url && <a href={url} target="_blank" rel="noreferrer" download={doc.name} className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-emerald-700" aria-label="Öffnen / Speichern"><Download className="h-4 w-4" /></a>}
            <IconBtn onClick={onClose} label="Schließen" tone="text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></IconBtn>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-stone-100">
          {!url ? <div className="p-8 text-center text-sm text-stone-400">lädt …</div> : isImg ? <img src={url} alt={doc.name} className="mx-auto block w-auto" style={{ maxHeight: "80vh" }} /> : <iframe title={doc.name} src={url} className="w-full" style={{ height: "80vh" }} />}
        </div>
        {!isImg && url && <div className="border-t border-stone-100 p-2 text-center"><a href={url} target="_blank" rel="noreferrer" className="text-xs font-medium text-emerald-700 hover:underline">PDF in neuem Tab öffnen</a></div>}
      </div>
    </div>
  );
}

// Dokumente an einem konkreten Ort (Anreise, Unterkunft, einzelner Punkt)
function DocSection({ tripId, scope, title }) {
  const docs = useScopeDocs(tripId, scope);
  const [view, setView] = useState(null);
  const del = async (doc) => { if (!window.confirm(`„${doc.name}" löschen?`)) return; await deleteDoc(doc.id); emitDocsChanged(tripId); };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">{title || "Dokumente"}{docs.length ? ` (${docs.length})` : ""}</span>
        <DocAdd tripId={tripId} scope={scope} small />
      </div>
      {docs.length > 0 && <div className="space-y-1.5">{docs.map((d) => <DocThumb key={d.id} doc={d} onOpen={setView} onDelete={del} />)}</div>}
      {view && <DocViewer doc={view} onClose={() => setView(null)} />}
    </div>
  );
}

// Sammelansicht aller Dokumente einer Reise
function TripDocsCard({ trip }) {
  const docs = useTripDocs(trip.id);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const del = async (doc) => { if (!window.confirm(`„${doc.name}" löschen?`)) return; await deleteDoc(doc.id); emitDocsChanged(trip.id); };
  const labelFor = (scope) => {
    if (scope === "general") return "Allgemein";
    if (scope === "anreise") return "Anreise";
    if (scope === "stay") return "Unterkunft";
    const it = (trip.items || []).find((i) => i.id === scope);
    return it ? (it.name || "Programmpunkt") : "Programmpunkt";
  };
  const groups = {};
  docs.forEach((d) => { (groups[d.scope] = groups[d.scope] || []).push(d); });
  const totalMB = docs.reduce((s, d) => s + (d.size || 0), 0) / 1048576;
  return (
    <section className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Paperclip className="h-4 w-4 text-emerald-700" /> Dokumente{docs.length ? ` (${docs.length})` : ""}</span>
        {open ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Allgemeine Belege</span>
            <DocAdd tripId={trip.id} scope="general" small />
          </div>
          {docs.length === 0 ? (
            <p className="text-sm text-stone-400">Noch keine Dokumente. Leg hier allgemeine Belege ab – oder direkt an Anreise, Unterkunft und einzelnen Programmpunkten (z. B. Ticket-QR-Code, Hotelbeleg).</p>
          ) : (
            Object.keys(groups).map((scope) => (
              <div key={scope}>
                <p className="mb-1 text-xs font-semibold text-stone-500">{labelFor(scope)}</p>
                <div className="space-y-1.5">{groups[scope].map((d) => <DocThumb key={d.id} doc={d} onOpen={setView} onDelete={del} />)}</div>
              </div>
            ))
          )}
          <p className="text-xs text-stone-400">Nur auf diesem Gerät gespeichert und <strong>nicht</strong> im JSON-Backup enthalten. Wichtige Belege zusätzlich woanders sichern{totalMB > 0 ? ` · belegt ca. ${totalMB.toFixed(1)} MB` : ""}.</p>
          {view && <DocViewer doc={view} onClose={() => setView(null)} />}
        </div>
      )}
    </section>
  );
}

/* ════════════════════════ Hauptkomponente ════════════════════════ */


export default function App() {
  const [data, setData] = useState({ trips: [], wishlist: [], visited: {}, regions: {}, visitedRegions: {}, wishRegions: {} });
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [homeTab, setHomeTab] = useState("start");
  const [toolKey, setToolKey] = useState(null);

  /* Pinch-Zoom erlauben: PWAs sperren das Vergrößern meist über das viewport-Meta
     (user-scalable=no / maximum-scale=1). Hier zur Laufzeit aufheben, damit man
     kleinteilige Stellen aufziehen und dann verschieben kann. */
  useEffect(() => {
    try {
      let m = document.querySelector('meta[name="viewport"]');
      if (!m) { m = document.createElement("meta"); m.setAttribute("name", "viewport"); document.head.appendChild(m); }
      m.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
    } catch (e) {}
  }, []);

  /* Zurück-Taste (Android / PWA): eine Ebene hoch, statt die App zu schließen.
     Solange man tiefer als die Startansicht ist, liegt genau EIN Platzhalter im
     Verlauf. Zurück verbraucht ihn, wir gehen eine Ebene hoch – ist es dann immer
     noch tiefer, wird ein neuer Platzhalter gelegt. Auf der Startebene schließt
     Zurück die App wie gewohnt. */
  const tiefe = activeId ? 3 : toolKey ? 2 : homeTab !== "start" ? 1 : 0;
  const marke = useRef(false);
  useEffect(() => {
    if (tiefe > 0 && !marke.current) {
      try { window.history.pushState({ upPlatzhalter: true }, ""); marke.current = true; } catch (e) {}
    }
    if (tiefe === 0) marke.current = false;
  }, [tiefe]);
  useEffect(() => {
    const zurueck = () => {
      marke.current = false;
      if (activeId) setActiveId(null);
      else if (toolKey) setToolKey(null);
      else if (homeTab !== "start") setHomeTab("start");
    };
    window.addEventListener("popstate", zurueck);
    return () => window.removeEventListener("popstate", zurueck);
  }, [activeId, toolKey, homeTab]);

  useEffect(() => { loadState().then((d) => { setData({ trips: d.trips || [], wishlist: d.wishlist || [], visited: d.visited || {}, regions: d.regions || {}, visitedRegions: d.visitedRegions || {}, wishRegions: d.wishRegions || {} }); setReady(true); }); }, []);

  const save = (next) => { setData(next); saveState(next); };
  const activeTrip = data.trips.find((t) => t.id === activeId) || null;
  const updateTrip = (id, patch) => save({ ...data, trips: data.trips.map((t) => (t.id === id ? { ...t, ...patch } : t)) });

  const createTrip = () => {
    const t = { id: uid(), name: "Neue Reise", region: "", land: "", anreiseart: "", von: "", nach: "", hinweise: "", auto: { km: "", preis: 1.8, verbrauch: 9 }, stay: { name: "", adresse: "", checkin: "", checkout: "" }, start: "", end: "", items: [], days: {}, packing: [] };
    save({ ...data, trips: [t, ...data.trips] });
    setActiveId(t.id);
  };
  const createTripFromWish = (wish) => {
    const t = { id: uid(), name: wish.name || "Neue Reise", region: wish.region || "", land: wish.land || "", anreiseart: "", von: "", nach: "", hinweise: wish.note || "", auto: { km: "", preis: 1.8, verbrauch: 9 }, stay: { name: "", adresse: "", checkin: "", checkout: "" }, start: "", end: "", items: [], days: {}, packing: [] };
    save({ ...data, trips: [t, ...data.trips], wishlist: (data.wishlist || []).map((w) => (w.id === wish.id ? { ...w, tripId: t.id } : w)) });
    setActiveId(t.id);
  };
  const addToTrip = (tripId, s, day) => {
    const item = mkItem({ kategorie: s.kategorie || "sehenswuerdigkeit", name: s.name, info: s.info, gebiet: s.gebiet, maps_suche: s.name }, { day: isValidISO(day) ? day : null, order: 0, lat: s.lat ?? null, lon: s.lon ?? null });
    save({ ...data, trips: data.trips.map((t) => (t.id === tripId ? { ...t, items: [...(t.items || []), item] } : t)) });
  };
  const createTripFromSuggestion = (s) => {
    const hinweise = [s.info, s.tage ? `Empfohlene Dauer: ab ${s.tage} Tagen` : "", s.zeit ? `Beste Reisezeit: ${s.zeit}` : ""].filter(Boolean).join(" · ");
    const items = (s.items || []).map((x) => mkItem({ kategorie: x.kategorie || "sehenswuerdigkeit", name: x.name, info: x.info, gebiet: x.gebiet, maps_suche: x.name }, { day: null, order: 0, lat: x.lat ?? null, lon: x.lon ?? null }));
    const t = { id: uid(), name: s.name || "Neue Reise", region: s.gebiet || s.name || "", land: "", anreiseart: s.anreiseart || "", von: s.von || "", nach: s.nach || "", hinweise, auto: { km: "", preis: 1.8, verbrauch: 9 }, stay: { name: "", adresse: "", checkin: "", checkout: "" }, start: s.start || "", end: s.end || "", items, days: {}, packing: [] };
    save({ ...data, trips: [t, ...data.trips] });
    setActiveId(t.id);
  };
  const duplicateTrip = (id) => {
    const t = data.trips.find((x) => x.id === id); if (!t) return;
    const clone = JSON.parse(JSON.stringify(t));
    clone.id = uid(); clone.name = (t.name || "Reise") + " (Kopie)";
    clone.items = (clone.items || []).map((it) => ({ ...it, id: uid() }));
    clone.packing = (clone.packing || []).map((p) => ({ ...p, id: uid() }));
    save({ ...data, trips: [clone, ...data.trips] });
  };
  const deleteTrip = (id) => {
    if (!window.confirm("Diese Reise wirklich löschen?")) return;
    save({ ...data, trips: data.trips.filter((t) => t.id !== id) });
    deleteDocsByTrip(id);
    if (activeId === id) setActiveId(null);
  };
  const exportAll = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "urlaubsplaner-backup.json"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { window.alert("Export fehlgeschlagen."); }
  };
  const importAll = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const trips = Array.isArray(parsed.trips) ? parsed.trips : (Array.isArray(parsed) ? parsed : null);
        if (!trips) { window.alert("Datei nicht erkannt."); return; }
        const withIds = trips.map((t) => ({ ...t, id: uid(), items: (t.items || []).map((it) => ({ ...it, id: uid() })), packing: (t.packing || []).map((p) => ({ ...p, id: uid() })) }));
        save({ ...data, trips: [...withIds, ...data.trips] });
        window.alert(withIds.length + " Reise(n) importiert.");
      } catch (e) { window.alert("Import fehlgeschlagen: ungültige Datei."); }
    };
    reader.readAsText(file);
  };

  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-500">Lädt …</div>;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <div className="safe-top mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
        {activeTrip ? (
          <TripView trip={activeTrip} onBack={() => setActiveId(null)} onChange={(patch) => updateTrip(activeTrip.id, patch)} onDelete={() => deleteTrip(activeTrip.id)} onDuplicate={() => duplicateTrip(activeTrip.id)} />
        ) : (
          <>
            <AppMenu homeTab={homeTab} setHomeTab={setHomeTab} toolKey={toolKey} setToolKey={setToolKey} />
            {homeTab !== "reisen" && (tageSeitSicherung() === null || tageSeitSicherung() >= WARN_TAGE) && (
              <button onClick={() => setHomeTab("reisen")} className="mb-3 flex w-full items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-left text-xs font-medium text-amber-800">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">{tageSeitSicherung() === null ? "Noch nie gesichert – alles liegt nur auf diesem Gerät." : `Letzte Sicherung vor ${tageSeitSicherung()} Tagen.`} Tippen für Datensicherung.</span>
              </button>
            )}
            <div className="mb-4 grid grid-cols-5 gap-1 rounded-xl bg-stone-100 p-1">
              {[
                { k: "start", l: "Start", I: LayoutGrid },
                { k: "reisen", l: "Reisen", I: Calendar },
                { k: "ziele", l: "Ziele", I: Globe2 },
                { k: "bestpreis", l: "Preis", I: Wallet },
                { k: "tools", l: "Tools", I: Compass },
              ].map((t) => (
                <button key={t.k} onClick={() => { setHomeTab(t.k); if (t.k !== "tools") setToolKey(null); }}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-xs font-medium transition ${homeTab === t.k ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
                  <t.I className="h-4 w-4" /> {t.l}
                </button>
              ))}
            </div>
            {homeTab === "start" && (
              <Startseite trips={data.trips} ideen={(data.wishlist || []).length} onGo={(z) => { setHomeTab(z.homeTab); setToolKey(z.toolKey || null); }} />
            )}
            {homeTab === "reisen" && (
              <>
                <Reisekarte trips={data.trips} items onOpenTrip={setActiveId} />
                <TripList trips={data.trips} onOpen={setActiveId} onCreate={createTrip} onDelete={deleteTrip} onDuplicate={duplicateTrip} onExportAll={exportAll} onImportAll={importAll} />
                <Sicherung data={data} onRestore={save} />
              </>
            )}
            {homeTab === "ziele" && (
              <>
              <Ideenkarte spots={data.wishlist || []} trips={data.trips} onAddToTrip={addToTrip} onCreateTrip={createTripFromWish} onOpenTrip={setActiveId} />
              <Reiseziele
                wishlist={data.wishlist || []} setWishlist={(wl) => save({ ...data, wishlist: wl })}
                visited={data.visited || {}} setVisited={(v) => save({ ...data, visited: v })}
                regions={data.regions || {}} setRegions={(r) => save({ ...data, regions: r })}
                visitedRegions={data.visitedRegions || {}} setVisitedRegions={(vr) => save({ ...data, visitedRegions: vr })}
                wishRegions={data.wishRegions || {}} setWishRegions={(wr) => save({ ...data, wishRegions: wr })}
                trips={data.trips} onCreateTripFromWish={createTripFromWish} onOpenTrip={setActiveId}
              />
              </>
            )}
            {homeTab === "bestpreis" && <Bestpreis trips={data.trips} onOpenTrip={setActiveId} />}
            {homeTab === "tools" && (
              <ReiseTools active={toolKey} onOpen={setToolKey} onCreateTrip={createTripFromSuggestion} trips={data.trips} onAddToTrip={addToTrip} onAdd={(s) => save({ ...data, wishlist: [...(data.wishlist || []), { id: uid(), name: s.name, region: s.gebiet || "", land: "", note: s.info || "", lat: s.lat ?? null, lon: s.lon ?? null, kategorie: s.kategorie || "sehenswuerdigkeit" }] })} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════ Suche über alle Reisen ════════════════════════ */

const normText = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Durchsucht Reisen, Programmpunkte, Ideen, Notizen und Packlisten */
function sucheAlles(trips, frage) {
  const q = normText(frage).trim();
  if (q.length < 2) return [];
  const treffer = [];

  (trips || []).forEach((t) => {
    const reiseInfo = [t.name, t.region, t.land, t.stay && t.stay.name, t.hinweise].filter(Boolean);
    if (reiseInfo.some((x) => normText(x).includes(q))) {
      treffer.push({ tripId: t.id, tripName: t.name || "Ohne Titel", art: "Reise", text: [t.region, t.land].filter(Boolean).join(", ") || fmtRange(t), datum: t.start });
    }

    (t.items || []).forEach((i) => {
      if (i.kategorie === "kosten") return;
      const felder = [i.name, i.gebiet, i.info, i.notiz, i.season].filter(Boolean);
      if (felder.some((x) => normText(x).includes(q))) {
        treffer.push({
          tripId: t.id, tripName: t.name || "Ohne Titel",
          art: i.day ? `Tag · ${fmtDate(i.day)}` : "Idee",
          text: i.name || "(unbenannt)",
          zusatz: [i.gebiet, i.info].filter(Boolean).join(" · "),
          kategorie: i.kategorie, datum: i.day,
        });
      }
    });

    (t.packing || []).forEach((pk) => {
      if (normText(pk.text).includes(q)) {
        treffer.push({ tripId: t.id, tripName: t.name || "Ohne Titel", art: "Packliste", text: pk.text });
      }
    });
  });

  return treffer.slice(0, 60);
}

function SucheAlleReisen({ trips, onOpen }) {
  const [q, setQ] = useState("");
  const ergebnisse = sucheAlles(trips, q);
  const aktiv = normText(q).trim().length >= 2;

  return (
    <section className="mb-4">
      <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-stone-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Alle Reisen durchsuchen (Spots, Notizen, Packliste)" className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
        {q && <button onClick={() => setQ("")} aria-label="Leeren"><X className="h-4 w-4 text-stone-400" /></button>}
      </div>

      {aktiv && (
        <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
          {ergebnisse.length === 0 ? (
            <p className="py-2 text-center text-sm text-stone-400">Keine Treffer für „{q}".</p>
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">{ergebnisse.length} Treffer</p>
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {ergebnisse.map((r, i) => {
                  const Icon = r.kategorie ? catByKey(r.kategorie).icon : Compass;
                  return (
                    <li key={i}>
                      <button onClick={() => onOpen(r.tripId)} className="flex w-full items-start gap-2 rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-left transition hover:border-emerald-300">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-700"><Icon className="h-3.5 w-3.5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-stone-900">{r.text}</span>
                          <span className="block truncate text-xs text-stone-500">{r.tripName} · {r.art}{r.zusatz ? ` · ${r.zusatz}` : ""}</span>
                        </span>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-stone-300" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ════════════════════════ Reise-Liste ════════════════════════ */

function TripList({ trips, onOpen, onCreate, onDelete, onDuplicate, onExportAll, onImportAll }) {
  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-emerald-700"><Compass className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-widest">Urlaubsplaner</span></div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Deine Reisen</h1>
          <p className="mt-1 text-sm text-stone-500">Tag für Tag planen – Spots, Budget, Packliste, Anreise. Offline nutzbar.</p>
        </div>
        <ThemeToggle />
      </header>

      <PrimaryButton onClick={onCreate} className="mb-4 w-full"><Plus className="h-4 w-4" /> Neue Reise anlegen</PrimaryButton>

      {trips.length > 0 && <SucheAlleReisen trips={trips} onOpen={onOpen} />}

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center"><Mountain className="mx-auto mb-3 h-8 w-8 text-stone-300" /><p className="text-sm text-stone-500">Noch keine Reise. Leg oben deine erste an.</p></div>
      ) : (
        <ul className="space-y-3">
          {[...trips].sort((a, b) => {
            const av = isValidISO(a.start), bv = isValidISO(b.start);
            if (av && bv) return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
            if (av) return -1;
            if (bv) return 1;
            return 0;
          }).map((t) => {
            const days = datesBetween(t.start, t.end);
            const planned = allItems(t).filter((i) => i.kategorie !== "kosten" && i.day).length;
            const pool = allItems(t).filter((i) => i.kategorie !== "kosten" && !i.day).length;
            return (
              <li key={t.id}>
                <div className="w-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => onOpen(t.id)} className="min-w-0 flex-1 text-left">
                      <h2 className="truncate text-lg font-semibold text-stone-900">{t.name || "Ohne Titel"}</h2>
                      {regionLabel(t) && <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-stone-500"><MapPin className="h-3.5 w-3.5 shrink-0" /> {regionLabel(t)}</p>}
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <IconBtn onClick={() => onDuplicate(t.id)} label="Duplizieren"><Copy className="h-4 w-4" /></IconBtn>
                      <IconBtn onClick={() => onDelete(t.id)} label="Löschen" tone="text-stone-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></IconBtn>
                    </div>
                  </div>
                  <button onClick={() => onOpen(t.id)} className="mt-3 flex w-full flex-wrap items-center gap-2 text-left">
                    <Pill><Calendar className="h-3 w-3" /> {fmtRange(t)}{days.length ? ` · ${days.length} Tg.` : ""}</Pill>
                    <Pill className="bg-amber-100 text-amber-800"><Wallet className="h-3 w-3" /> {eur(planTotal(t))}</Pill>
                    <Pill className="bg-emerald-50 text-emerald-700">{planned} verplant{pool ? ` · ${pool} offen` : ""}</Pill>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-stone-800">Backup</h3>
        <p className="mb-3 text-xs text-stone-500">Alle Reisen als Datei sichern oder wiederherstellen.</p>
        <div className="flex flex-wrap gap-2">
          <GhostButton onClick={onExportAll}><Download className="h-4 w-4 text-emerald-600" /> Exportieren</GhostButton>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800">
            <Upload className="h-4 w-4 text-emerald-600" /> Importieren
            <input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onImportAll(f); e.target.value = ""; }} />
          </label>
        </div>
      </section>
    </div>
  );
}

/* ════════════════════════ Land / Region ════════════════════════ */

function LocationPicker({ trip, onChange }) {
  const known = countryByKey(trip.land);
  const [customLand, setCustomLand] = useState(Boolean(trip.land) && !known);
  const [customRegion, setCustomRegion] = useState(Boolean(trip.region) && Boolean(known) && !known.regions.includes(trip.region));
  const regions = known ? known.regions : [];
  const onLand = (val) => { if (val === "__other__") { setCustomLand(true); setCustomRegion(false); onChange({ land: "", region: "" }); } else { setCustomLand(false); setCustomRegion(false); onChange({ land: val, region: "" }); } };
  const onRegion = (val) => { if (val === "__other__") { setCustomRegion(true); onChange({ region: "" }); } else { setCustomRegion(false); onChange({ region: val }); } };
  const landVal = customLand ? "__other__" : (known ? trip.land : "");
  const regionVal = customRegion ? "__other__" : (regions.includes(trip.region) ? trip.region : "");
  return (
    <div className="grid grid-cols-1 gap-3">
      <Field label="Land">
        <select value={landVal} onChange={(e) => onLand(e.target.value)} className={inputCls}>
          <option value="">Land wählen …</option>
          {COUNTRIES.map((c) => <option key={c.key} value={c.key}>{c.key}</option>)}
          <option value="__other__">Anderes Land …</option>
        </select>
        {customLand && <input value={trip.land || ""} onChange={(e) => onChange({ land: e.target.value })} placeholder="Land eingeben" className={inputCls + " mt-2"} />}
      </Field>
      <Field label="Region / Insel / Stadt">
        {known ? (
          <select value={regionVal} onChange={(e) => onRegion(e.target.value)} className={inputCls}>
            <option value="">Auswählen …</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="__other__">Andere …</option>
          </select>
        ) : (
          <input value={trip.region || ""} onChange={(e) => onChange({ region: e.target.value })} placeholder="z. B. Tirol, Teneriffa" className={inputCls} />
        )}
        {known && customRegion && <input value={trip.region || ""} onChange={(e) => onChange({ region: e.target.value })} placeholder="Region / Ort eingeben" className={inputCls + " mt-2"} />}
      </Field>
    </div>
  );
}

/* ════════════════════════ Reise-Detail ════════════════════════ */

function TripView({ trip, onBack, onChange, onDelete, onDuplicate }) {
  const [tab, setTab] = useState("tage");
  const items = allItems(trip);

  const addItem = (item) => onChange({ items: [...items, item] });
  const addItems = (arr) => onChange({ items: [...items, ...arr] });
  const removeItem = (id) => { onChange({ items: items.filter((i) => i.id !== id) }); deleteDocsByScope(trip.id, id); emitDocsChanged(trip.id); };
  const patchItem = (id, patch) => onChange({ items: items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const applyUpdates = (m) => onChange({ items: items.map((i) => (m[i.id] ? { ...i, ...m[i.id] } : i)) });
  const updateDays = (days) => onChange({ days });
  /* Einen Tag umdatieren – Programmpunkte & Tages-Infos wandern mit.
     Ist das Zieldatum schon ein Tag der Reise, werden beide Tage getauscht.
     Liegt es außerhalb, wird der Reisezeitraum erweitert. */
  const moveDay = (from, to) => {
    if (!isValidISO(to) || !isValidISO(from) || from === to) return;
    const days = { ...(trip.days || {}) };
    const metaFrom = days[from], metaTo = days[to];
    const nextItems = items.map((i) => {
      if (i.kategorie === "kosten") return i;
      if (i.day === from) return { ...i, day: to };
      if (i.day === to) return { ...i, day: from };
      return i;
    });
    if (metaFrom) days[to] = metaFrom; else delete days[to];
    if (metaTo) days[from] = metaTo; else delete days[from];
    const patch = { items: nextItems, days };
    if (isValidISO(trip.start) && to < trip.start) patch.start = to;
    if (isValidISO(trip.end) && to > trip.end) patch.end = to;
    onChange(patch);
  };

  /* sichere Datums-Änderung */
  const handleStart = (newStart) => {
    if (!isValidISO(newStart)) { onChange({ start: newStart }); return; }
    if (isValidISO(trip.start)) {
      const delta = dateDiff(trip.start, newStart);
      if (delta !== 0) { onChange(shiftTripByDays(trip, delta)); return; }
      onChange({ start: newStart });
    } else {
      const patch = { start: newStart };
      if (!isValidISO(trip.end) || newStart > trip.end) patch.end = newStart;
      onChange(patch);
    }
  };
  const handleEnd = (newEnd) => {
    if (!isValidISO(newEnd)) { onChange({ end: newEnd }); return; }
    let start = trip.start;
    if (isValidISO(start) && newEnd < start) start = newEnd;
    const valid = new Set(datesBetween(start, newEnd));
    const nextItems = (trip.items || []).map((i) => (i.day && i.kategorie !== "kosten" && !valid.has(i.day) ? { ...i, day: null, order: 0 } : i));
    onChange({ start, end: newEnd, items: nextItems });
  };

  /* Drag & Drop */
  const [drag, setDrag] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const dropRef = useRef(null);
  useEffect(() => { dropRef.current = dropTarget; }, [dropTarget]);
  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const zone = el && el.closest ? el.closest("[data-drop-day]") : null;
      if (zone) setDropTarget({ day: zone.getAttribute("data-drop-day"), index: Number(zone.getAttribute("data-drop-index")) });
    };
    const onUp = () => {
      const t = dropRef.current;
      if (t && drag) { const patches = reorderForMove(items, drag.id, t.day, t.index); if (Object.keys(patches).length) applyUpdates(patches); }
      setDrag(null); setDropTarget(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp); };
  }, [drag, items]);

  const dayList = datesBetween(trip.start, trip.end);
  const tabs = [
    { key: "tage", label: "Tage", icon: Calendar },
    { key: "plan", label: "Übersicht", icon: CalendarRange },
    { key: "karte", label: "Karte", icon: MapIcon },
    { key: "pool", label: "Ideen", icon: Inbox },
    { key: "budget", label: "Budget", icon: Wallet },
    { key: "packen", label: "Packen", icon: Briefcase },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-emerald-700"><ChevronLeft className="h-4 w-4" /> Alle Reisen</button>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <IconBtn onClick={() => downloadICS(trip)} label="In Kalender exportieren (.ics)"><CalendarPlus className="h-4 w-4" /></IconBtn>
          <Reisedruck trip={trip} />
          <ExportButton trip={trip} />
          <IconBtn onClick={onDuplicate} label="Duplizieren"><Copy className="h-4 w-4" /></IconBtn>
          <IconBtn onClick={onDelete} label="Löschen" tone="text-stone-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></IconBtn>
        </div>
      </div>

      <section className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <input value={trip.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Name der Reise" className="w-full bg-transparent text-2xl font-bold tracking-tight text-stone-900 placeholder-stone-300 focus:outline-none" />
        <div className="mt-3 grid grid-cols-1 gap-3">
          <LocationPicker trip={trip} onChange={onChange} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Von"><input type="date" value={trip.start} onChange={(e) => handleStart(e.target.value)} className={inputCls} /></Field>
            <Field label="Bis"><input type="date" value={trip.end} onChange={(e) => handleEnd(e.target.value)} className={inputCls} /></Field>
          </div>
          <p className="text-xs text-stone-400">Datum verschieben ist sicher: Änderst du „Von", wandert die ganze Reise mit – nichts geht verloren.</p>
        </div>
      </section>

      <Reisekarte trips={[trip]} items fit />

      <AnreiseCard trip={trip} onChange={onChange} />
      <StayCard trip={trip} onChange={onChange} />
      <TripDocsCard trip={trip} />

      <section className="mb-4 flex items-center justify-between rounded-2xl bg-emerald-700 px-4 py-3 text-white shadow-sm">
        <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-emerald-200" /><span className="text-sm font-medium text-emerald-100">Kosten</span></div>
        <div className="text-right">
          <span className="text-xl font-bold tabular-nums">{eur(planTotal(trip))}</span>
          <span className="ml-2 text-xs text-emerald-200">geplant</span>
          {istTotal(trip) > 0 && <div className="text-xs text-emerald-200">Ist: {eur(istTotal(trip))}</div>}
        </div>
      </section>

      <div className="mb-4 grid grid-cols-6 gap-1 rounded-xl bg-stone-100 p-1">
        {tabs.map((t) => {
          const Icon = t.icon; const active = tab === t.key;
          return <button key={t.key} onClick={() => setTab(t.key)} className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition ${active ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><Icon className="h-4 w-4" /> {t.label}</button>;
        })}
      </div>

      {tab === "tage" && <DaysView trip={trip} dayList={dayList} items={items} onAdd={addItem} onAddMany={addItems} onRemove={removeItem} onPatch={patchItem} onApply={applyUpdates} onUpdateDays={updateDays} onMoveDay={moveDay} dragId={drag ? drag.id : null} dropTarget={dropTarget} onDragStart={(id) => setDrag({ id })} />}
      {tab === "plan" && <Overview trip={trip} dayList={dayList} onGoDays={() => setTab("tage")} />}
      {tab === "karte" && <TripMapView trip={trip} dayList={dayList} items={items} onPatch={patchItem} onAdd={addItem} />}
      {tab === "pool" && <PoolView trip={trip} items={items} onAdd={addItem} onRemove={removeItem} onPatch={patchItem} />}
      {tab === "budget" && <BudgetView trip={trip} items={items} onAdd={addItem} onRemove={removeItem} onPatch={patchItem} />}
      {tab === "packen" && <PackingView trip={trip} onChange={onChange} />}

      <p className="mt-6 text-center text-xs text-stone-400">Alles lokal gespeichert · offline nutzbar</p>
    </div>
  );
}

function reorderForMove(items, id, targetDay, targetIndex) {
  const moving = items.find((i) => i.id === id); if (!moving) return {};
  const day = targetDay === "null" ? null : targetDay;
  const sourceDay = moving.day || null;
  const targetList = items.filter((i) => i.id !== id && i.day === day && i.kategorie !== "kosten").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const idx = Math.max(0, Math.min(targetIndex, targetList.length));
  targetList.splice(idx, 0, moving);
  const patches = {};
  targetList.forEach((it, k) => { patches[it.id] = { day, order: k }; });
  if (sourceDay !== day) {
    const srcList = items.filter((i) => i.id !== id && i.day === sourceDay && i.kategorie !== "kosten").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    srcList.forEach((it, k) => { patches[it.id] = { ...(patches[it.id] || {}), order: k }; });
  }
  return patches;
}

/* ════════════════════════ Anreise ════════════════════════ */

function AnreiseCard({ trip, onChange }) {
  const [open, setOpen] = useState(Boolean(trip.anreiseart));
  const art = trip.anreiseart || "";
  const setArt = (a) => onChange({ anreiseart: art === a ? "" : a });
  const modes = [{ key: "zug", label: "Zug", icon: Train }, { key: "auto", label: "Auto", icon: Car }, { key: "flug", label: "Flug", icon: Plane }];
  const auto = trip.auto || { km: "", preis: 1.8, verbrauch: 9 };
  const setAuto = (patch) => onChange({ auto: { ...auto, ...patch } });
  const km = Number(auto.km) || 0, preis = Number(auto.preis) || 0, verbrauch = Number(auto.verbrauch) || 0;
  const spritEinfach = (km / 100) * verbrauch * preis;
  const spritHinRueck = spritEinfach * 2;
  const addSpritToBudget = () => {
    if (!spritHinRueck) return;
    const it = { id: uid(), kategorie: "kosten", costCat: "anfahrt", name: `Sprit (Auto, ${km} km × 2)`, gebiet: "", info: "", mapsSuche: "", kostenHinweis: "", kosten: Math.round(spritHinRueck), kostenIst: null, day: null };
    onChange({ items: [...(trip.items || []), it] });
  };
  const headIcon = art === "flug" ? <Plane className="h-4 w-4 text-emerald-700" /> : art === "auto" ? <Car className="h-4 w-4 text-emerald-700" /> : <Train className="h-4 w-4 text-emerald-700" />;

  return (
    <section className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800">{headIcon} Anreise{art ? "" : " (optional)"}</span>
        {open ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            {modes.map((m) => { const Icon = m.icon; const active = art === m.key; return (
              <button key={m.key} onClick={() => setArt(m.key)} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${active ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-stone-200 bg-white text-stone-600 hover:border-emerald-300"}`}><Icon className="h-4 w-4" /> {m.label}</button>
            ); })}
          </div>
          {art && (
            <div className="grid grid-cols-2 gap-2">
              <Field label={art === "flug" ? "Ab (Flughafen/Stadt)" : "Von"}><input value={trip.von || ""} onChange={(e) => onChange({ von: e.target.value })} placeholder={art === "flug" ? "z. B. Hannover" : "z. B. Celle"} className={inputCls} /></Field>
              <Field label={art === "flug" ? "Ziel" : "Nach"}><input value={trip.nach || ""} onChange={(e) => onChange({ nach: e.target.value })} placeholder={art === "flug" ? "z. B. Teneriffa" : "z. B. Gardasee"} className={inputCls} /></Field>
            </div>
          )}
          {art === "auto" && (
            <div className="space-y-3 rounded-xl bg-stone-50 p-3">
              <a href={dirUrl(trip.von, trip.nach, "")} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:border-emerald-300 hover:text-emerald-800"><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> Route & km auf Google Maps</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
              <div className="grid grid-cols-3 gap-2">
                <Field label="km (einfach)"><input type="number" inputMode="decimal" value={auto.km} onChange={(e) => setAuto({ km: e.target.value })} placeholder="750" className={inputCls} /></Field>
                <Field label="€/Liter"><input type="number" inputMode="decimal" value={auto.preis} onChange={(e) => setAuto({ preis: e.target.value })} className={inputCls} /></Field>
                <Field label="l/100 km"><input type="number" inputMode="decimal" value={auto.verbrauch} onChange={(e) => setAuto({ verbrauch: e.target.value })} className={inputCls} /></Field>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"><span className="text-stone-500">Spritkosten</span><span className="text-right"><span className="font-semibold tabular-nums text-stone-900">{eur(spritEinfach)}</span><span className="text-stone-400"> einfach · </span><span className="font-semibold tabular-nums text-stone-900">{eur(spritHinRueck)}</span><span className="text-stone-400"> hin/zurück</span></span></div>
              <GhostButton onClick={addSpritToBudget} disabled={!spritHinRueck} className="w-full"><Plus className="h-4 w-4 text-emerald-600" /> Hin/zurück ins Budget (Anfahrt)</GhostButton>
              <p className="text-xs text-stone-400">km über den Maps-Link ablesen · Spritpreis & Verbrauch frei änderbar.</p>
            </div>
          )}
          {art === "zug" && (
            <div className="space-y-2">
              <a href={dbNavLink(trip.von, trip.nach, trip.start)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800"><span className="inline-flex items-center gap-2"><Train className="h-4 w-4 text-emerald-600" /> Hinfahrt im DB Navigator{trip.start ? ` · ${fmtDate(trip.start)}` : ""}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
              <a href={dbNavLink(trip.nach, trip.von, trip.end)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800"><span className="inline-flex items-center gap-2"><Train className="h-4 w-4 text-emerald-600" /> Rückfahrt im DB Navigator{trip.end ? ` · ${fmtDate(trip.end)}` : ""}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
              <p className="text-xs text-stone-400">Öffnet auf dem Handy den DB Navigator (falls installiert) mit vorausgefüllter Strecke – sonst bahn.de. Datum dort kurz prüfen.</p>
            </div>
          )}
          {art === "flug" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Direkt bei den Airlines</p>
                <div className="grid grid-cols-1 gap-2">
                  {AIRLINES.map((a) => <a key={a.key} href={a.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800"><span className="inline-flex items-center gap-2"><Plane className="h-4 w-4 text-emerald-600" /> {a.label}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>)}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Vergleichsportale</p>
                <div className="grid grid-cols-1 gap-2">
                  <a href={skyscannerLink(trip.von, trip.nach, trip.start, trip.end)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800"><span className="inline-flex items-center gap-2"><Plane className="h-4 w-4 text-emerald-600" /> Skyscanner{iataLike(trip.von) && iataLike(trip.nach) ? " · Strecke vorbefüllt" : ""}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
                  <a href="https://flug.check24.de/" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800"><span className="inline-flex items-center gap-2"><Plane className="h-4 w-4 text-emerald-600" /> Check24</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
                  <a href="https://flights.booking.com/" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800"><span className="inline-flex items-center gap-2"><Plane className="h-4 w-4 text-emerald-600" /> Booking</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
                </div>
              </div>
              <p className="text-xs text-stone-400">Auf Android öffnet sich die jeweilige App, falls installiert. Tipp: Trägst du bei „Ab"/„Ziel" die IATA-Codes ein (z. B. HAJ, TFS), füllt Skyscanner die Strecke direkt vor. Sonst {[trip.von, trip.nach].filter(Boolean).join(" → ") || "Strecke"} und Datum kurz eingeben.</p>
            </div>
          )}
          <DocSection tripId={trip.id} scope="anreise" title="Tickets & Belege" />
          {trip.hinweise && <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-stone-700"><Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span className="whitespace-pre-wrap">{trip.hinweise}</span></div>}
        </div>
      )}
    </section>
  );
}

/* ════════════════════════ Unterkunft ════════════════════════ */

function StayCard({ trip, onChange }) {
  const stay = trip.stay || { name: "", adresse: "", checkin: "", checkout: "" };
  const [open, setOpen] = useState(Boolean(stay.name));
  const setStay = (patch) => onChange({ stay: { ...stay, ...patch } });
  return (
    <section className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Bed className="h-4 w-4 text-emerald-700" /> Unterkunft{stay.name ? "" : " (optional)"}</span>
        <span className="flex items-center gap-2">{stay.name && !open && <span className="max-w-32 truncate text-xs text-stone-500">{stay.name}</span>}{open ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <Field label="Name"><input value={stay.name} onChange={(e) => setStay({ name: e.target.value })} placeholder="z. B. Hotel Schwarzbrunn" className={inputCls} /></Field>
          <Field label="Adresse"><input value={stay.adresse} onChange={(e) => setStay({ adresse: e.target.value })} placeholder="Straße, Ort" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in"><input type="date" value={stay.checkin} onChange={(e) => setStay({ checkin: e.target.value })} className={inputCls} /></Field>
            <Field label="Check-out"><input type="date" value={stay.checkout} onChange={(e) => setStay({ checkout: e.target.value })} className={inputCls} /></Field>
          </div>
          {(stay.name || stay.adresse) && (
            <a href={mapsUrl(stay.adresse || stay.name, regionLabel(trip))} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800"><span className="inline-flex items-center gap-2"><MapPinned className="h-4 w-4 text-emerald-600" /> Unterkunft auf Google Maps</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
          )}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Suchen & buchen</p>
            <a href={bookingHotelLink(stay.adresse || stay.name || regionLabel(trip), stay.checkin || trip.start, stay.checkout || trip.end)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800"><span className="inline-flex items-center gap-2"><Bed className="h-4 w-4 text-emerald-600" /> Auf Booking suchen{(stay.checkin || trip.start) ? " · Datum vorbefüllt" : ""}</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
            <a href="https://hotel.check24.de/" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800"><span className="inline-flex items-center gap-2"><Bed className="h-4 w-4 text-emerald-600" /> Auf Check24 suchen</span><ExternalLink className="h-4 w-4 text-stone-400" /></a>
            <p className="text-xs text-stone-400">Auf Android öffnet sich die App, falls installiert. Booking übernimmt Zielort und Reisedatum automatisch.</p>
          </div>
          <DocSection tripId={trip.id} scope="stay" title="Buchungsbeleg" />
        </div>
      )}
    </section>
  );
}

/* ════════════════════════ Tab: Tage ════════════════════════ */

function DaysView({ trip, dayList, items, onAdd, onAddMany, onRemove, onPatch, onApply, onUpdateDays, onMoveDay, dragId, dropTarget, onDragStart }) {
  const [wetter, setWetter] = useState(null);
  const region = regionLabel(trip);

  useEffect(() => {
    let aktiv = true;
    setWetter(null);
    if (!region || !trip.start) return;
    findeKoordinaten(region).then((koord) => {
      if (!aktiv || !koord) return;
      ladeWetter(koord[0], koord[1], trip.start, trip.end).then((w) => { if (aktiv) setWetter(w); });
    });
    return () => { aktiv = false; };
  }, [region, trip.start, trip.end]);

  if (!trip.start || !trip.end) return <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">Trag oben „Von" und „Bis" ein, dann erscheinen hier deine Tage.</div>;
  return (
    <div className="space-y-4">
      <Wetterplan dayList={dayList} items={items} wetter={wetter} onApply={onApply} />
      {dayList.map((date, idx) => (
        <DayCard key={date} trip={trip} date={date} index={idx + 1} items={items.filter((i) => i.day === date)} wetter={wetter ? wetter[date] : null} onAdd={onAdd} onAddMany={onAddMany} onRemove={onRemove} onPatch={onPatch} onApply={onApply} onUpdateDays={onUpdateDays} onMoveDay={onMoveDay} dragId={dragId} dropTarget={dropTarget} onDragStart={onDragStart} />
      ))}
    </div>
  );
}

function DropZone({ day, index, active, dragging }) {
  const h = dragging ? "my-1 h-7" : "h-0";
  const look = active ? "bg-emerald-400" : dragging ? "border border-dashed border-emerald-300 bg-emerald-50" : "";
  return <div data-drop-day={day === null ? "null" : day} data-drop-index={index} className={`rounded transition-all ${h} ${look}`} />;
}

function DayCard({ trip, date, index, items, wetter, onAdd, onAddMany, onRemove, onPatch, onApply, onUpdateDays, onMoveDay, dragId, dropTarget, onDragStart }) {
  const [open, setOpen] = useState(true);
  const [datAuf, setDatAuf] = useState(false);
  const [karteAuf, setKarteAuf] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [fzBusy, setFzBusy] = useState(false);
  const [fzErr, setFzErr] = useState("");
  const [ohBusy, setOhBusy] = useState(false);
  const [ohErr, setOhErr] = useState("");
  const meta = (trip.days || {})[date] || {};
  const region = regionLabel(trip);
  const setMeta = (patch) => onUpdateDays({ ...(trip.days || {}), [date]: { ...meta, ...patch } });
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const dayCost = items.reduce((s, i) => s + (Number(i.kosten) || 0), 0);
  const dragging = Boolean(dragId);
  const isActive = (i) => dropTarget && dropTarget.day === date && dropTarget.index === i;

  /* Fahrzeiten für den Tag berechnen. Haben ALLE Punkte Koordinaten, reicht eine
     einzige OSRM-Anfrage (legs 1:1). Sonst nur die Paare rechnen, bei denen beide
     Punkte einen Ort haben – sonst landete die Fahrzeit beim falschen Punkt. */
  async function fahrzeitenBerechnen() {
    if (fzBusy) return;
    setFzBusy(true); setFzErr("");
    try {
      const hatAlle = sorted.length >= 2 && sorted.every((i) => i.lat != null && i.lon != null);
      const m = {};
      if (hatAlle) {
        const legs = await osrmLegs(sorted);
        for (let i = 1; i < sorted.length; i++) if (legs[i - 1]) m[sorted[i].id] = { fahrzeit: fahrzeitText(legs[i - 1]) };
      } else {
        let paare = 0;
        for (let i = 1; i < sorted.length && paare < 8; i++) {
          const a = sorted[i - 1], b = sorted[i];
          if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) continue;
          try { const legs = await osrmLegs([a, b]); if (legs[0]) m[b.id] = { fahrzeit: fahrzeitText(legs[0]) }; } catch (e) {}
          paare++; await warte(250);
        }
      }
      if (Object.keys(m).length) {
        onApply(m);
        const offen = sorted.length - 1 - Object.keys(m).length;
        if (offen > 0) setFzErr(`${offen} Teilstück(e) ohne Fahrzeit – dort fehlt einem Punkt der Ort („verorten“).`);
      } else setFzErr("Keine Fahrzeit berechenbar – haben die Punkte einen Ort?");
    } catch (e) { setFzErr("OSRM nicht erreichbar – später erneut."); }
    finally { setFzBusy(false); }
  }

  async function detailsLaden() {
    if (ohBusy) return;
    setOhBusy(true); setOhErr("");
    try {
      const ziel = sorted.filter((i) => i.lat != null && i.lon != null && i.name);
      if (!ziel.length) { setOhErr("Keine verorteten Punkte – erst „verorten“."); return; }
      const els = await ladeOsmDetails(ziel);
      const m = {};
      for (const it of ziel) {
        const tr = els.find((e) => e.tags && e.tags.name === it.name && (e.tags.opening_hours || e.tags.fee || e.tags.charge));
        if (!tr) continue;
        const p = {};
        if (tr.tags.opening_hours) p.oeffnung = tr.tags.opening_hours;
        const et = eintrittText(tr.tags);
        if (et) p.eintritt = et;
        if (Object.keys(p).length) m[it.id] = p;
      }
      if (Object.keys(m).length) {
        onApply(m);
        const ohne = ziel.length - Object.keys(m).length;
        setOhErr(ohne > 0 ? `${ohne} Punkt(e): in OSM ist dazu nichts hinterlegt.` : "");
      } else setOhErr("In OSM sind zu diesen Punkten keine Öffnungszeiten/Eintritt hinterlegt.");
    } catch (e) { setOhErr("Overpass nicht erreichbar – später erneut."); }
    finally { setOhBusy(false); }
  }

  const move = (i, dir) => { const arr = [...sorted]; const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; const m = {}; arr.forEach((it, k) => { m[it.id] = { order: k }; }); onApply(m); };
  const duplicateDay = () => {
    const base = sorted.length;
    const copies = sorted.map((it, k) => ({ ...it, id: uid(), order: base + k }));
    if (copies.length) onAddMany(copies);
  };
  const clearDay = () => {
    if (!sorted.length) return;
    if (!window.confirm(`Alle ${sorted.length} Punkte an ${fmtDate(date)} nach „Ideen" verschieben?`)) return;
    const m = {}; sorted.forEach((it) => { m[it.id] = { day: null, order: 0 }; }); onApply(m);
  };

  const mitKoord = sorted.filter((i) => i.lat != null && i.lon != null);
  const ohneKoord = sorted.filter((i) => i.lat == null || i.lon == null);

  const nachNaehe = () => {
    if (mitKoord.length < 3) return;
    const neu = sortiereNachNaehe(sorted);
    const m = {}; neu.forEach((it, k) => { m[it.id] = { order: k }; }); onApply(m);
  };

  // Fehlende Koordinaten über Photon nachtragen (nacheinander, schonend)
  const koordNachtragen = async () => {
    if (!ohneKoord.length) return;
    setGeoBusy(true);
    const region = regionLabel(trip);
    for (const it of ohneKoord) {
      if (!it.name) continue;
      const koord = await findeKoordinaten(`${it.name}, ${region}`);
      if (koord) onPatch(it.id, { lat: koord[0], lon: koord[1] });
      await new Promise((r) => setTimeout(r, 1100)); // Fair-Use: max. 1 Abfrage/Sekunde
    }
    setGeoBusy(false);
  };

  const lage = wetterLage(wetter);
  const regenRisiko = wetter && wetter.regen != null && wetter.regen >= 50;
  const outdoor = sorted.some((i) => ["wanderung", "gipfel", "radtour", "aussicht", "fotospot"].includes(i.kategorie));

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-stone-100 bg-stone-50 px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 items-center gap-3 text-left">
          <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-700 text-white"><span className="text-xs font-medium leading-none opacity-80">Tag</span><span className="text-sm font-bold leading-none">{index}</span></span>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">{fmtDate(date)}</p>
            <p className="truncate text-xs text-stone-500">{meta.title || `${items.length} Programmpunkte`}{dayCost ? ` · ${eur(dayCost)}` : ""}</p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          {wetter && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${lage === "schlecht" ? "bg-sky-100 text-sky-800" : lage === "durchwachsen" ? "bg-stone-100 text-stone-600" : "bg-amber-100 text-amber-800"}`} title={wetterText(wetter.code)}>
              <Thermometer className="h-3 w-3" />{wetter.tmax}°
              {wetter.regen != null && wetter.regen > 0 && <><Droplets className="ml-0.5 h-3 w-3" />{wetter.regen}%</>}
            </span>
          )}
          {onMoveDay && <button onClick={() => setDatAuf((d) => !d)} aria-label="Datum ändern" title="Datum ändern" className="rounded-lg p-1.5 text-stone-400 transition hover:bg-emerald-50 hover:text-emerald-700"><Calendar className="h-4 w-4" /></button>}
          <WeatherToggle value={meta.weather || "any"} onChange={(w) => setMeta({ weather: w })} />
          <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
        </div>
      </div>
      {datAuf && onMoveDay && (
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Tag verschieben auf</span>
          <input type="date" defaultValue={date} onChange={(e) => { const v = e.target.value; if (isValidISO(v) && v !== date) { onMoveDay(date, v); setDatAuf(false); } }} className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-sm focus:border-emerald-400 focus:outline-none" />
          <button onClick={() => setDatAuf(false)} className="text-xs font-medium text-stone-400 hover:text-stone-600">Abbrechen</button>
          <span className="w-full text-xs text-stone-400">{items.length ? `${items.length} Programmpunkte wandern mit.` : "Tages-Infos wandern mit."} Ist am Zieldatum schon ein Tag, werden beide getauscht.</span>
        </div>
      )}
      {open && (
        <div className="p-3">
          {regenRisiko && outdoor && (
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-sky-100 px-3 py-2 text-xs text-sky-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{wetter.regen}% Regenwahrscheinlichkeit ({wetterText(wetter.code)}) – an diesem Tag sind Outdoor-Punkte geplant. Vielleicht mit einem Schlechtwetter-Tag tauschen?</span>
            </div>
          )}
          {wetter && wetter.sonnenaufgang && (
            <p className="mb-2 text-xs text-stone-400">Sonne: {wetter.sonnenaufgang}–{wetter.sonnenuntergang} Uhr · {wetterText(wetter.code)} · {wetter.tmin}–{wetter.tmax}°C</p>
          )}
          <div className="mb-3 flex items-center gap-2">
            <input value={meta.title || ""} onChange={(e) => setMeta({ title: e.target.value })} placeholder="Motto des Tages (optional)" className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
            <IconBtn onClick={duplicateDay} label="Tag duplizieren"><Copy className="h-4 w-4" /></IconBtn>
            <IconBtn onClick={clearDay} label="Tag leeren" tone="text-stone-400 hover:bg-rose-50 hover:text-rose-500"><Eraser className="h-4 w-4" /></IconBtn>
          </div>

          {sorted.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <GhostButton onClick={() => setKarteAuf((k) => !k)} className="px-2 py-1 text-xs"><MapIcon className="h-3.5 w-3.5 text-emerald-600" /> {karteAuf ? "Karte aus" : "Karte"}{mitKoord.length ? ` (${mitKoord.length})` : ""}</GhostButton>
              {mitKoord.length >= 2 && <GhostButton onClick={fahrzeitenBerechnen} disabled={fzBusy} className="px-2 py-1 text-xs">{fzBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" /> : <Car className="h-3.5 w-3.5 text-emerald-600" />} {fzBusy ? "rechnet …" : "Fahrzeiten"}</GhostButton>}
              {mitKoord.length >= 1 && <GhostButton onClick={detailsLaden} disabled={ohBusy} className="px-2 py-1 text-xs">{ohBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" /> : <Clock className="h-3.5 w-3.5 text-emerald-600" />} {ohBusy ? "lädt …" : "Öffnungszeiten"}</GhostButton>}
              {mitKoord.length >= 3 && <GhostButton onClick={nachNaehe} className="px-2 py-1 text-xs"><Route className="h-3.5 w-3.5 text-emerald-600" /> nach Nähe sortieren</GhostButton>}
              {ohneKoord.length > 0 && <GhostButton onClick={koordNachtragen} disabled={geoBusy} className="px-2 py-1 text-xs">{geoBusy ? <Loader2 className="h-3.5 w-3.5 text-emerald-600" /> : <MapPin className="h-3.5 w-3.5 text-emerald-600" />} {geoBusy ? "sucht …" : `${ohneKoord.length} verorten`}</GhostButton>}
            </div>
          )}
          {(fzErr || ohErr) && <div className="mb-2 text-xs text-rose-600">{[fzErr, ohErr].filter(Boolean).join(" · ")}</div>}

          {karteAuf && (
            mitKoord.length === 0 ? (
              <div className="mb-3 rounded-xl border border-dashed border-stone-300 p-4 text-center text-xs text-stone-500">Noch keine Punkte mit Koordinaten. Über „verorten" oder die OpenStreetMap-Suche im Ideen-Tab hinzufügen.</div>
            ) : (
              <div className="mb-3">
                <React.Suspense fallback={<div className="h-64 w-full rounded-xl border border-stone-200 bg-stone-100 p-10 text-center text-sm text-stone-500">Karte lädt …</div>}>
                  <DayMap punkte={mitKoord} />
                </React.Suspense>
                <p className="mt-1 text-xs text-stone-400">Nummern = Reihenfolge des Tages · Karte: OpenFreeMap, Daten © OpenStreetMap</p>
              </div>
            )
          )}

          {sorted.length === 0 && !dragging && <p className="px-1 py-2 text-sm text-stone-400">Noch nichts geplant. Unten hinzufügen, im Tab „Ideen" zuweisen oder per Griff hierher ziehen.</p>}
          <div>
            <DropZone day={date} index={0} active={isActive(0)} dragging={dragging} />
            {sorted.map((it, i) => (
              <React.Fragment key={it.id}>
                <PlannedItem item={it} tripId={trip.id} region={region} prev={sorted[i - 1]} isFirst={i === 0} isLast={i === sorted.length - 1} isDragged={dragId === it.id} onDragStart={onDragStart} onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => onRemove(it.id)} onPatch={(p) => onPatch(it.id, p)} onUnassign={() => onPatch(it.id, { day: null, order: 0 })} />
                <DropZone day={date} index={i + 1} active={isActive(i + 1)} dragging={dragging} />
              </React.Fragment>
            ))}
          </div>
          <DayAdder onAdd={(item) => onAdd({ ...item, day: date, order: sorted.length })} />
        </div>
      )}
    </section>
  );
}

function WeatherToggle({ value, onChange }) {
  const order = ["any", "sun", "rain"];
  const cur = WEATHER[value]; const Icon = cur.icon;
  return <button onClick={() => onChange(order[(order.indexOf(value) + 1) % order.length])} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cur.chip}`} title="Wetter-Eignung umschalten"><Icon className="h-3.5 w-3.5" /> {cur.label}</button>;
}

function PlannedItem({ item, tripId, region, prev, isFirst, isLast, isDragged, onDragStart, onUp, onDown, onRemove, onPatch, onUnassign }) {
  const [open, setOpen] = useState(false);
  const CatIcon = catByKey(item.kategorie).icon;
  const prio = PRIORITIES.find((p) => p.key === item.prio);
  return (
    <li className="list-none rounded-xl border border-stone-200 bg-stone-50" style={{ opacity: isDragged ? 0.4 : 1 }}>
      {prev && (
        <div className="flex items-center gap-2 px-3 pt-2 text-xs text-stone-400"><Car className="h-3.5 w-3.5" />{item.fahrzeit ? <span>{item.fahrzeit} ab „{prev.name || "vorher"}"</span> : <span className="italic">Fahrzeit?</span>}<a href={dirUrl(prev.name, item.name, region)} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">Route ›</a></div>
      )}
      <div className="flex items-start gap-2 p-3">
        <button onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {} onDragStart(item.id); }} className="mt-0.5 cursor-grab touch-none rounded p-1 text-stone-300 hover:text-stone-500" style={{ touchAction: "none" }} aria-label="Ziehen zum Verschieben"><GripVertical className="h-4 w-4" /></button>
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><CatIcon className="h-4 w-4" /></span>
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5"><span className="font-semibold text-stone-900">{item.name || "(unbenannt)"}</span>{prio && <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${prio.tone}`}>{prio.label}</span>}{item.notiz && <Info className="h-3.5 w-3.5 text-stone-400" />}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-stone-500">{item.zeit && <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" />{item.zeit}</span>}{item.gebiet && <span>{item.gebiet}</span>}{item.info && <span className="text-stone-400">· {item.info}</span>}</div>
          {(item.oeffnung || item.eintritt) && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {item.oeffnung && <span className="inline-flex items-center gap-0.5 text-sky-700" title={"laut OpenStreetMap: " + item.oeffnung}><Clock className="h-3 w-3 shrink-0" />{ohDeutsch(item.oeffnung)}</span>}
              {item.eintritt && <span className="inline-flex items-center gap-0.5 text-amber-700"><Ticket className="h-3 w-3 shrink-0" />{item.eintritt}</span>}
            </div>
          )}
        </button>
        <div className="flex shrink-0 flex-col items-center gap-0.5"><button onClick={onUp} disabled={isFirst} className="rounded p-0.5 text-stone-300 hover:text-stone-600 disabled:opacity-30" aria-label="hoch"><ChevronUp className="h-4 w-4" /></button><button onClick={onDown} disabled={isLast} className="rounded p-0.5 text-stone-300 hover:text-stone-600 disabled:opacity-30" aria-label="runter"><ChevronDown className="h-4 w-4" /></button></div>
        <div className="flex shrink-0 items-center gap-1">{item.kosten != null && item.kosten !== "" && <Pill className="bg-amber-100 text-amber-800">{eur(item.kosten)}</Pill>}<a href={mapsUrl(item.mapsSuche || item.name, region)} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-stone-400 hover:bg-emerald-50 hover:text-emerald-700" aria-label="Maps"><MapPin className="h-4 w-4" /></a></div>
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-2 border-t border-stone-200 p-3">
          <input value={item.name} onChange={(e) => onPatch({ name: e.target.value })} placeholder="Name" className={inputCls + " col-span-2"} />
          <input value={item.zeit || ""} onChange={(e) => onPatch({ zeit: e.target.value })} placeholder="Uhrzeit (z. B. 08:30)" className={inputCls} />
          <input value={item.fahrzeit || ""} onChange={(e) => onPatch({ fahrzeit: e.target.value })} placeholder="Fahrzeit (z. B. 25 Min)" className={inputCls} />
          <input value={item.gebiet || ""} onChange={(e) => onPatch({ gebiet: e.target.value })} placeholder="Ort / Gebiet" className={inputCls} />
          <input value={item.oeffnung || ""} onChange={(e) => onPatch({ oeffnung: e.target.value })} placeholder="Öffnungszeiten" className={inputCls} />
          <input value={item.eintritt || ""} onChange={(e) => onPatch({ eintritt: e.target.value })} placeholder="Eintritt" className={inputCls} />
          <select value={item.prio || ""} onChange={(e) => onPatch({ prio: e.target.value || null })} className={inputCls}><option value="">Priorität …</option>{PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
          <input value={item.info || ""} onChange={(e) => onPatch({ info: e.target.value })} placeholder="Info / Eckdaten" className={inputCls + " col-span-2"} />
          <textarea value={item.notiz || ""} onChange={(e) => onPatch({ notiz: e.target.value })} rows={2} placeholder="Notizen (Reservierung, Gedanken …)" className="col-span-2 w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Kosten geplant</span><input type="number" inputMode="decimal" value={item.kosten ?? ""} onChange={(e) => onPatch({ kosten: e.target.value === "" ? null : Number(e.target.value) })} placeholder="€" className={inputCls} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">Kosten tatsächlich</span><input type="number" inputMode="decimal" value={item.kostenIst ?? ""} onChange={(e) => onPatch({ kostenIst: e.target.value === "" ? null : Number(e.target.value) })} placeholder="€" className={inputCls} /></label>
          {item.season && <div className="col-span-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {item.season}</div>}
          <input value={item.season || ""} onChange={(e) => onPatch({ season: e.target.value })} placeholder="Saison-Hinweis (optional)" className={inputCls + " col-span-2"} />
          <div className="col-span-2 border-t border-stone-200 pt-3"><DocSection tripId={tripId} scope={item.id} title="Dokumente" /></div>
          <div className="col-span-2 flex items-center justify-between pt-1"><button onClick={onUnassign} className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-emerald-700"><Inbox className="h-3.5 w-3.5" /> zurück zu Ideen</button><button onClick={onRemove} className="inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> löschen</button></div>
        </div>
      )}
    </li>
  );
}

function DayAdder({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kat, setKat] = useState("sehenswuerdigkeit");
  const add = () => { if (!name.trim()) return; onAdd(mkItem({ kategorie: kat, name: name.trim(), maps_suche: name.trim() })); setName(""); setOpen(false); };
  if (!open) return <button onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-emerald-700"><Plus className="h-3.5 w-3.5" /> Programmpunkt</button>;
  return (
    <div className="mt-2 flex items-center gap-2">
      <select value={kat} onChange={(e) => setKat(e.target.value)} className="rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm focus:border-emerald-400 focus:outline-none">{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Name" className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
      <button onClick={add} className="shrink-0 rounded-lg bg-emerald-700 p-2 text-white hover:bg-emerald-800" aria-label="Hinzufügen"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

/* ════════════════════════ Tab: Karte (ganze Reise) ════════════════════════ */

function TripMapView({ trip, dayList, items, onPatch, onAdd }) {
  const [busy, setBusy] = useState(false);
  const [zeigeLinien, setZeigeLinien] = useState(true);
  const [suchtext, setSuchtext] = useState("");
  const [treffer, setTreffer] = useState([]);
  const [suchBusy, setSuchBusy] = useState(false);
  const [klickModus, setKlickModus] = useState(false);
  const [entwurf, setEntwurf] = useState(null);   // { name, info, lat, lon }
  const [zielTag, setZielTag] = useState("");     // "" = Ideen
  const [kategorie, setKategorie] = useState("sehenswuerdigkeit");
  const [regionKoord, setRegionKoord] = useState(null);

  useEffect(() => {
    let aktiv = true;
    const r = regionLabel(trip);
    if (r) findeKoordinaten(r).then((k) => { if (aktiv) setRegionKoord(k); });
    return () => { aktiv = false; };
  }, [trip.region, trip.land]);

  const suchen = async () => {
    if (suchtext.trim().length < 2) return;
    setSuchBusy(true); setTreffer([]);
    const res = await sucheOrte(suchtext, regionKoord ? regionKoord[0] : null, regionKoord ? regionKoord[1] : null);
    setTreffer(res); setSuchBusy(false);
  };

  const karteGeklickt = async (lat, lon) => {
    setKlickModus(false);
    setEntwurf({ name: "Eigener Punkt", info: "", lat, lon });
    const rev = await reverseSuche(lat, lon);
    if (rev) setEntwurf((e) => (e ? { ...e, name: rev.name, info: rev.info } : e));
  };

  const uebernehmen = () => {
    if (!entwurf || !entwurf.name.trim()) return;
    const proTag = items.filter((x) => x.day === (zielTag || null) && x.kategorie !== "kosten");
    onAdd(mkItem(
      { kategorie, name: entwurf.name.trim(), gebiet: "", info: entwurf.info || "", maps_suche: entwurf.name.trim() },
      { day: zielTag || null, order: proTag.length, lat: entwurf.lat, lon: entwurf.lon }
    ));
    setEntwurf(null); setSuchtext(""); setTreffer([]);
  };

  const geplant = items.filter((i) => i.kategorie !== "kosten" && i.day);
  const pool = items.filter((i) => i.kategorie !== "kosten" && !i.day);

  const punkte = geplant
    .filter((i) => i.lat != null && i.lon != null)
    .map((i) => {
      const tagIndex = dayList.indexOf(i.day);
      const proTag = geplant.filter((x) => x.day === i.day).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return {
        name: i.name, lat: i.lat, lon: i.lon,
        tagIndex: tagIndex < 0 ? 0 : tagIndex,
        farbe: farbeFuerTag(tagIndex < 0 ? 0 : tagIndex),
        label: proTag.findIndex((x) => x.id === i.id) + 1,
        tagText: tagIndex >= 0 ? `Tag ${tagIndex + 1} · ${fmtDate(i.day)}` : "",
      };
    })
    .sort((a, b) => a.tagIndex - b.tagIndex || a.label - b.label);

  const ohneKoord = geplant.filter((i) => i.lat == null || i.lon == null);

  // Entwurf pink mitzeichnen, damit sichtbar ist, wo der Punkt landet
  const kartenPunkte = entwurf
    ? [...punkte, { name: entwurf.name || "Neuer Punkt", lat: entwurf.lat, lon: entwurf.lon, farbe: "#ec4899", label: "+", tagIndex: -1, tagText: "neu" }]
    : punkte;

  const alleVerorten = async () => {
    if (!ohneKoord.length) return;
    setBusy(true);
    const region = regionLabel(trip);
    for (const it of ohneKoord) {
      if (!it.name) continue;
      const koord = await findeKoordinaten(`${it.name}, ${region}`);
      if (koord) onPatch(it.id, { lat: koord[0], lon: koord[1] });
      await new Promise((r) => setTimeout(r, 1100)); // fair gegenüber dem kostenlosen Dienst
    }
    setBusy(false);
  };

  if (!dayList.length) return <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">Setze zuerst Von und Bis.</div>;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Search className="h-4 w-4 text-emerald-700" /> Eigenen Punkt hinzufügen</h3>
        <div className="flex items-center gap-2">
          <input value={suchtext} onChange={(e) => setSuchtext(e.target.value)} onKeyDown={(e) => e.key === "Enter" && suchen()} placeholder="Ort, Restaurant, Hütte, Adresse …" className={inputCls} />
          <button onClick={suchen} disabled={suchBusy} className="shrink-0 rounded-lg bg-emerald-700 p-2 text-white hover:bg-emerald-800 disabled:opacity-50" aria-label="Suchen">
            {suchBusy ? <Loader2 className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </button>
        </div>

        {treffer.length > 0 && (
          <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
            {treffer.map((t, i) => (
              <li key={i}>
                <button onClick={() => { setEntwurf(t); setTreffer([]); }} className="flex w-full items-start justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-left hover:border-emerald-300">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-stone-900">{t.name}</span>
                    {t.info && <span className="block truncate text-xs text-stone-500">{t.info}</span>}
                  </span>
                  <Plus className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex items-center gap-2">
          <GhostButton onClick={() => { setKlickModus((m) => !m); setEntwurf(null); }} className={`flex-1 ${klickModus ? "border-emerald-400 text-emerald-800" : ""}`}>
            <Crosshair className="h-4 w-4 text-emerald-600" /> {klickModus ? "Tippe auf die Karte …" : "Punkt auf Karte setzen"}
          </GhostButton>
        </div>
        <p className="mt-2 text-xs text-stone-400">Suche findet echte Orte weltweit. „Punkt setzen" nimmt jede Stelle der Karte – auch ohne Namen.</p>
      </section>

      {entwurf && (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-emerald-800">Punkt übernehmen</h3>
          <div className="space-y-2">
            <input value={entwurf.name} onChange={(e) => setEntwurf({ ...entwurf, name: e.target.value })} placeholder="Name" className={inputCls} />
            <input value={entwurf.info || ""} onChange={(e) => setEntwurf({ ...entwurf, info: e.target.value })} placeholder="Info (optional)" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <select value={kategorie} onChange={(e) => setKategorie(e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <select value={zielTag} onChange={(e) => setZielTag(e.target.value)} className={inputCls}>
                <option value="">in Ideen</option>
                {dayList.map((d, i) => <option key={d} value={d}>Tag {i + 1} · {fmtDate(d)}</option>)}
              </select>
            </div>
            <p className="text-xs text-emerald-700">{entwurf.lat.toFixed(4)}, {entwurf.lon.toFixed(4)}</p>
            <div className="flex gap-2">
              <PrimaryButton onClick={uebernehmen} className="flex-1"><Plus className="h-4 w-4" /> Hinzufügen</PrimaryButton>
              <GhostButton onClick={() => setEntwurf(null)}>Abbrechen</GhostButton>
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Pill className="bg-emerald-50 text-emerald-700">{punkte.length} auf der Karte</Pill>
        {ohneKoord.length > 0 && <Pill className="bg-amber-100 text-amber-800">{ohneKoord.length} ohne Koordinaten</Pill>}
        {pool.length > 0 && <Pill>{pool.length} nur in Ideen</Pill>}
        <button onClick={() => setZeigeLinien((z) => !z)} className="ml-auto text-xs font-medium text-stone-500 hover:text-emerald-700">{zeigeLinien ? "Linien aus" : "Linien an"}</button>
      </div>

      {punkte.length === 0 && !entwurf ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <MapIcon className="mx-auto mb-3 h-8 w-8 text-stone-300" />
          <p className="text-sm text-stone-500">Noch keine Punkte mit Koordinaten. Oben suchen, auf die Karte tippen oder ältere Punkte unten verorten.</p>
        </div>
      ) : (
        <React.Suspense fallback={<div className="h-96 w-full rounded-xl border border-stone-200 bg-stone-100 p-16 text-center text-sm text-stone-500">Karte lädt …</div>}>
          <TripMap punkte={kartenPunkte} mitLinie={zeigeLinien} klickModus={klickModus} onKarteKlick={karteGeklickt} />
        </React.Suspense>
      )}

      {ohneKoord.length > 0 && (
        <GhostButton onClick={alleVerorten} disabled={busy} className="w-full">
          {busy ? <><Loader2 className="h-4 w-4 text-emerald-600" /> verortet … (dauert kurz)</> : <><MapPin className="h-4 w-4 text-emerald-600" /> {ohneKoord.length} Punkte verorten</>}
        </GhostButton>
      )}

      {punkte.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-800">Tage</h3>
          <div className="flex flex-wrap gap-2">
            {dayList.map((d, i) => {
              const anzahl = punkte.filter((p) => p.tagIndex === i).length;
              if (!anzahl) return null;
              return (
                <span key={d} className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: farbeFuerTag(i) }} />
                  Tag {i + 1} · {anzahl}
                </span>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-stone-400">Zahlen in den Punkten = Reihenfolge innerhalb des Tages · Karte: OpenFreeMap, Daten © OpenStreetMap</p>
        </section>
      )}
    </div>
  );
}

/* ════════════════════════ Klima & Feiertage im Zielland ════════════════════════ */

function KlimaFeiertageCard({ trip }) {
  const [klima, setKlima] = useState(null);
  const [klimaStatus, setKlimaStatus] = useState("laedt");
  const [feiertage, setFeiertage] = useState(null);
  const region = regionLabel(trip);
  const monat = isValidISO(trip.start) ? Number(trip.start.slice(5, 7)) : null;

  useEffect(() => {
    let aktiv = true;
    setKlima(null); setKlimaStatus("laedt");
    if (!region || !monat) { setKlimaStatus("nichts"); return; }
    findeKoordinaten(region).then((koord) => {
      if (!aktiv || !koord) { if (aktiv) setKlimaStatus("nichts"); return; }
      ladeKlima(koord[0], koord[1], monat).then((k) => { if (aktiv) { setKlima(k); setKlimaStatus(k ? "ok" : "nichts"); } });
    });
    return () => { aktiv = false; };
  }, [region, monat]);

  useEffect(() => {
    let aktiv = true;
    setFeiertage(null);
    if (!trip.land || !isValidISO(trip.start)) return;
    ladeFeiertageLand(trip.land, trip.start, trip.end || trip.start).then((f) => { if (aktiv) setFeiertage(f); });
    return () => { aktiv = false; };
  }, [trip.land, trip.start, trip.end]);

  const hatFeiertage = feiertage && feiertage.length > 0;
  if (klimaStatus !== "ok" && !hatFeiertage) return null;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      {klimaStatus === "ok" && klima && (
        <div className="mb-3">
          <h3 className="mb-1 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Thermometer className="h-4 w-4 text-emerald-700" /> Klima im {MONATSNAMEN[monat - 1]}</h3>
          <p className="text-sm text-stone-700">
            Durchschnitt {klima.jahreVon}–{klima.jahreBis}: <strong>{klima.tmax}° / {klima.tmin}°</strong>
            {klima.regentage != null && <> · etwa <strong>{klima.regentage} Regentage</strong> im Monat</>}
          </p>
          <p className="mt-1 text-xs text-stone-400">Langjährige Messwerte für {region} – kein Wetterbericht, sondern eine Einordnung der Reisezeit.</p>
        </div>
      )}

      {hatFeiertage && (
        <div className={klimaStatus === "ok" ? "border-t border-stone-100 pt-3" : ""}>
          <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><PartyPopper className="h-4 w-4 text-amber-600" /> Feiertage in {trip.land}</h3>
          <ul className="space-y-1">
            {feiertage.map((f) => (
              <li key={f.datum} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-1.5 text-sm">
                <span className="text-amber-900">{f.name}</span>
                <span className="text-xs font-medium text-amber-700">{fmtDate(f.datum)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-stone-400">An Feiertagen sind Läden und manche Sehenswürdigkeiten geschlossen.</p>
        </div>
      )}
    </section>
  );
}

/* ════════════════════════ Tab: Übersicht (Timeline) ════════════════════════ */

function Overview({ trip, dayList, onGoDays }) {
  if (!trip.start || !trip.end) return <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">Setze zuerst Von und Bis.</div>;
  const region = regionLabel(trip);
  return (
    <div className="space-y-3">
      <KlimaFeiertageCard trip={trip} />
      {dayList.map((date, idx) => {
        const meta = (trip.days || {})[date] || {};
        const its = allItems(trip).filter((i) => i.day === date && i.kategorie !== "kosten").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const w = WEATHER[meta.weather || "any"]; const WI = w.icon;
        const cost = its.reduce((s, i) => s + (Number(i.kosten) || 0), 0);
        return (
          <section key={date} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="flex h-7 w-7 flex-col items-center justify-center rounded-lg bg-emerald-700 text-xs font-bold text-white">{idx + 1}</span><div><p className="text-sm font-semibold text-stone-900">{fmtDate(date)}</p>{meta.title && <p className="text-xs text-stone-500">{meta.title}</p>}</div></div>
              <div className="flex items-center gap-2">{meta.weather && meta.weather !== "any" && <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${w.chip}`}><WI className="h-3 w-3" />{w.label}</span>}{cost > 0 && <Pill className="bg-amber-100 text-amber-800">{eur(cost)}</Pill>}</div>
            </div>
            {its.length === 0 ? <p className="text-sm text-stone-400">— leer —</p> : (
              <ol className="space-y-1">
                {its.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 text-sm">
                    <span className="w-12 shrink-0 tabular-nums text-xs text-stone-400">{i.zeit || "–"}</span>
                    <span className="min-w-0 flex-1 truncate text-stone-700">{i.name}{i.gebiet ? <span className="text-stone-400"> · {i.gebiet}</span> : ""}</span>
                    <a href={mapsUrl(i.mapsSuche || i.name, region)} target="_blank" rel="noreferrer" className="shrink-0 text-stone-300 hover:text-emerald-700" aria-label="Maps"><MapPin className="h-3.5 w-3.5" /></a>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
      <GhostButton onClick={onGoDays} className="w-full"><Calendar className="h-4 w-4 text-emerald-600" /> Zur Tagesplanung</GhostButton>
    </div>
  );
}

/* ════════════════════════ Tab: Ideen (kuratiert) ════════════════════════ */

function OsmFinder({ trip, items, onAdd }) {
  const [open, setOpen] = useState(false);
  const [ort, setOrt] = useState(regionLabel(trip) || "");
  const [kat, setKat] = useState("sehenswuerdigkeit");
  const [radius, setRadius] = useState(25);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  const [treffer, setTreffer] = useState([]);
  const [cacheInfo, setCacheInfo] = useState(false);

  const vorhanden = new Set((trip.items || []).map((i) => (i.name || "").toLowerCase()));

  const suchen = async () => {
    if (!ort.trim()) { setFehler("Bitte eine Region oder einen Ort eingeben."); return; }
    setBusy(true); setFehler(""); setTreffer([]); setCacheInfo(false);
    try {
      const koord = await findeKoordinaten(ort);
      if (!koord) { setFehler("Ort nicht gefunden. Anders schreiben oder größere Stadt/Region angeben."); setBusy(false); return; }
      const { items: gefunden, ausCache } = await ladePOIs(kat, koord[0], koord[1], radius);
      setTreffer(gefunden); setCacheInfo(ausCache);
      if (!gefunden.length) setFehler("Keine Treffer. Anderen Radius oder andere Kategorie probieren.");
    } catch (e) {
      setFehler(e && e.message ? e.message : "Abfrage fehlgeschlagen. Später erneut versuchen.");
    }
    setBusy(false);
  };

  const uebernehmen = (p) => {
    onAdd(mkItem({
      kategorie: p.kategorie, name: p.name, gebiet: p.gebiet,
      info: [p.info, p.oeffnung ? `Öffnungszeiten: ${p.oeffnung}` : ""].filter(Boolean).join(" · "),
      maps_suche: p.name,
    }, { day: null, order: 0, lat: p.lat, lon: p.lon }));
  };

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><Compass className="h-4 w-4 text-emerald-700" /> Aus OpenStreetMap laden</span>
        {open ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-stone-500">Findet echte Orte in der Umgebung und legt sie per „+" in deine Ideen.</p>
          <Field label="Region / Ort"><input value={ort} onChange={(e) => setOrt(e.target.value)} placeholder="z. B. Tirol, Gardasee, Rom" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Kategorie">
              <select value={kat} onChange={(e) => setKat(e.target.value)} className={inputCls}>
                {POI_KATEGORIEN.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Umkreis">
              <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className={inputCls}>
                <option value={10}>10 km</option><option value={25}>25 km</option><option value={50}>50 km</option>
              </select>
            </Field>
          </div>
          <PrimaryButton onClick={suchen} disabled={busy} className="w-full">{busy ? "sucht …" : <><Search className="h-4 w-4" /> Suchen</>}</PrimaryButton>

          {fehler && <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {fehler}</div>}

          {treffer.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{treffer.length} Treffer{cacheInfo ? " (gespeichert)" : ""}</p>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {treffer.map((p) => {
                  const drin = vorhanden.has(p.name.toLowerCase());
                  return (
                    <div key={p.osmId} className="flex items-start justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900">{p.name}</p>
                        {(p.gebiet || p.info) && <p className="text-xs text-stone-500">{[p.gebiet, p.info].filter(Boolean).join(" · ")}</p>}
                        {p.oeffnung && <p className="mt-0.5 text-xs text-stone-400">{p.oeffnung}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <a href={osmMapsUrl(p)} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-stone-400 hover:bg-emerald-50 hover:text-emerald-700" aria-label="Karte"><MapPin className="h-4 w-4" /></a>
                        {drin ? <span className="px-1.5 text-xs text-stone-400">drin</span> : <button onClick={() => uebernehmen(p)} className="rounded-lg bg-emerald-700 p-1.5 text-white hover:bg-emerald-800" aria-label="Übernehmen"><Plus className="h-4 w-4" /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <p className="text-xs text-stone-400">Daten: © OpenStreetMap-Mitwirkende (ODbL). Ergebnisse werden lokal gespeichert und sind danach offline verfügbar.</p>
        </div>
      )}
    </section>
  );
}

function PoolView({ trip, items, onAdd, onRemove, onPatch }) {
  const match = getSuggestions(regionLabel(trip));
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">Sammle Ideen und übernimm fertige Vorschläge. Per „zuweisen" wandern sie in die Tagesplanung.</p>
      <OsmFinder trip={trip} items={items} onAdd={onAdd} />
      {regionLabel(trip) && (
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100"><Mountain className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Wanderungen in der Region</div>
          <Wandern embedded defaultQuery={regionLabel(trip)} onAdd={(s) => onAdd(mkItem({ kategorie: s.kategorie || "wanderung", name: s.name, info: s.info, gebiet: s.gebiet, maps_suche: s.name }, { day: null, order: 0, lat: s.lat ?? null, lon: s.lon ?? null }))} />
        </section>
      )}
      {!match && regionLabel(trip) && <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Für „{regionLabel(trip)}" gibt es noch keine fertige Vorschlagsliste – du kannst alles manuell hinzufügen.</div>}
      {CATEGORIES.map((cat) => (
        <PoolCategory key={cat.key} cat={cat} trip={trip} suggestions={match ? (match.data[cat.key] || []) : []} items={items.filter((i) => i.kategorie === cat.key && !i.day)} onAdd={onAdd} onRemove={onRemove} onPatch={onPatch} />
      ))}
    </div>
  );
}

function PoolCategory({ cat, trip, suggestions, items, onAdd, onRemove, onPatch }) {
  const Icon = cat.icon;
  const [showSug, setShowSug] = useState(false);
  const accept = (s) => onAdd(mkItem(s, { day: null, order: 0 }));
  const addEmpty = () => onAdd({ id: uid(), kategorie: cat.key, name: "", gebiet: "", info: "", notiz: "", mapsSuche: "", kostenHinweis: "", kosten: null, kostenIst: null, prio: null, zeit: "", fahrzeit: "", season: "", weather: "any", day: null, order: 0 });
  const takenNames = new Set((trip.items || []).map((i) => (i.name || "").toLowerCase()));
  const freshSug = suggestions.filter((s) => !takenNames.has((s.name || "").toLowerCase()));
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Icon className="h-4 w-4" /></span><div><h3 className="text-sm font-bold uppercase tracking-wide text-stone-800">{cat.label}en</h3><span className="text-xs text-stone-400">{items.length} offen</span></div></div>
        {freshSug.length > 0 && <GhostButton onClick={() => setShowSug((v) => !v)}><Lightbulb className="h-4 w-4 text-emerald-600" /> Vorschläge ({freshSug.length})</GhostButton>}
      </div>

      {items.length > 0 && <ul className="mb-3 space-y-2">{items.map((it) => <PoolItem key={it.id} item={it} trip={trip} onRemove={() => onRemove(it.id)} onPatch={(p) => onPatch(it.id, p)} />)}</ul>}

      {showSug && freshSug.length > 0 && (
        <div className="mb-2 space-y-2 rounded-xl bg-emerald-50 p-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-emerald-700"><Lightbulb className="mr-1 inline h-3 w-3" /> Tippen zum Übernehmen</p>
          {freshSug.map((s, i) => { const w = WEATHER[s.wetter] || WEATHER.any; const WI = w.icon; return (
            <div key={i} className="rounded-lg border border-emerald-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5"><p className="font-semibold text-stone-900">{s.name}</p>{s.wetter && s.wetter !== "any" && <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${w.chip}`}><WI className="h-3 w-3" />{w.label}</span>}</div>
                  {s.gebiet && <p className="text-xs text-stone-500">{s.gebiet}</p>}
                  {s.info && <p className="mt-1 text-sm text-stone-600">{s.info}</p>}
                  {s.kosten_ca && <p className="mt-1 text-xs font-medium text-amber-700">{s.kosten_ca}</p>}
                </div>
                <button onClick={() => accept(s)} className="shrink-0 rounded-lg bg-emerald-700 p-1.5 text-white hover:bg-emerald-800" aria-label="Übernehmen"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          ); })}
        </div>
      )}

      <button onClick={addEmpty} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-emerald-700"><Plus className="h-3.5 w-3.5" /> manuell hinzufügen</button>
    </section>
  );
}

function PoolItem({ item, trip, onRemove, onPatch }) {
  const [open, setOpen] = useState(!item.name);
  const dayList = datesBetween(trip.start, trip.end);
  const w = WEATHER[item.weather || "any"]; const WI = w.icon;
  return (
    <li className="rounded-xl border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5"><span className="font-semibold text-stone-900">{item.name || "(unbenannt – tippen)"}</span>{item.weather && item.weather !== "any" && <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${w.chip}`}><WI className="h-3 w-3" />{w.label}</span>}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-stone-500">{item.gebiet && <span>{item.gebiet}</span>}{item.info && <span className="text-stone-400">· {item.info}</span>}</div>
        </button>
        <div className="flex shrink-0 items-center gap-1">{item.kosten != null && item.kosten !== "" && <Pill className="bg-amber-100 text-amber-800">{eur(item.kosten)}</Pill>}<a href={mapsUrl(item.mapsSuche || item.name, regionLabel(trip))} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-stone-400 hover:bg-emerald-50 hover:text-emerald-700" aria-label="Maps"><MapPin className="h-4 w-4" /></a><IconBtn onClick={onRemove} label="Entfernen" tone="text-stone-300 hover:bg-rose-50 hover:text-rose-500"><X className="h-4 w-4" /></IconBtn></div>
      </div>
      {dayList.length > 0 && (
        <div className="mt-2 flex items-center gap-2"><span className="text-xs text-stone-400">Tag:</span><select value="" onChange={(e) => e.target.value && onPatch({ day: e.target.value, order: 999 })} className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs focus:border-emerald-400 focus:outline-none"><option value="">zuweisen …</option>{dayList.map((d, i) => <option key={d} value={d}>Tag {i + 1} · {fmtDate(d)}</option>)}</select></div>
      )}
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-200 pt-3">
          <input value={item.name} onChange={(e) => onPatch({ name: e.target.value })} placeholder="Name" className={inputCls} />
          <input value={item.gebiet} onChange={(e) => onPatch({ gebiet: e.target.value })} placeholder="Ort / Gebiet" className={inputCls} />
          <input value={item.info} onChange={(e) => onPatch({ info: e.target.value })} placeholder="Info / Eckdaten" className={inputCls + " col-span-2"} />
          <div className="flex items-center gap-2"><input type="number" inputMode="decimal" value={item.kosten ?? ""} onChange={(e) => onPatch({ kosten: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Kosten €" className="w-28 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />{item.kostenHinweis && <span className="text-xs text-stone-400">Tipp: {item.kostenHinweis}</span>}</div>
          <select value={item.prio || ""} onChange={(e) => onPatch({ prio: e.target.value || null })} className={inputCls}><option value="">Priorität …</option>{PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
          <div className="col-span-2 border-t border-stone-200 pt-3"><DocSection tripId={trip.id} scope={item.id} title="Dokumente" /></div>
        </div>
      )}
    </li>
  );
}

/* ════════════════════════ Tab: Budget (Soll/Ist) ════════════════════════ */

function BudgetView({ trip, items, onAdd, onRemove, onPatch }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [ccat, setCcat] = useState("anfahrt");
  const days = datesBetween(trip.start, trip.end).length;
  const plan = planTotal(trip); const ist = istTotal(trip);
  const lines = items.filter((i) => (i.kosten != null && i.kosten !== "") || (i.kostenIst != null && i.kostenIst !== ""));
  const grouped = COST_CATS.map((c) => {
    const own = lines.filter((i) => (i.kategorie === "kosten" ? i.costCat === c.key : KAT_TO_COST[i.kategorie] === c.key));
    return { ...c, items: own, sum: own.reduce((s, i) => s + (Number(i.kosten) || 0), 0) };
  });
  const addLine = () => { if (!label.trim() && !amount) return; onAdd({ id: uid(), kategorie: "kosten", costCat: ccat, name: label.trim() || costCatByKey(ccat).label, gebiet: "", info: "", mapsSuche: "", kostenHinweis: "", kosten: amount === "" ? 0 : Number(amount), kostenIst: null, day: null }); setLabel(""); setAmount(""); };
  const diff = ist - plan;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Geplant</p><p className="text-2xl font-bold tabular-nums text-stone-900">{eur(plan)}</p>{days > 0 && <p className="text-xs text-stone-400">{eur(plan / days)} / Tag</p>}</div>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Tatsächlich</p><p className="text-2xl font-bold tabular-nums text-stone-900">{eur(ist)}</p>{ist > 0 && <p className={`text-xs ${diff > 0 ? "text-rose-500" : "text-emerald-700"}`}>{diff > 0 ? "+" : ""}{eur(diff)} ggü. Plan</p>}</div>
        </div>
        <div className="mt-4 space-y-2">
          {grouped.filter((g) => g.sum > 0).map((g) => { const Icon = g.icon; const pct = plan > 0 ? Math.round((g.sum / plan) * 100) : 0; return (
            <div key={g.key}><div className="mb-0.5 flex items-center justify-between text-xs"><span className="inline-flex items-center gap-1 text-stone-600"><Icon className="h-3.5 w-3.5" />{g.label}</span><span className="tabular-nums text-stone-500">{eur(g.sum)} · {pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: pct + "%" }} /></div></div>
          ); })}
          {plan === 0 && ist === 0 && <p className="text-sm text-stone-400">Noch keine Kosten erfasst.</p>}
        </div>
      </section>

      {grouped.map((g) => (
        <section key={g.key} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between"><h3 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800"><g.icon className="h-4 w-4 text-emerald-700" />{g.label}</h3><span className="text-sm font-semibold tabular-nums text-stone-500">{eur(g.sum)}</span></div>
          {g.items.length === 0 ? <p className="text-sm text-stone-400">—</p> : (
            <ul className="divide-y divide-stone-100">
              {g.items.map((it) => (
                <li key={it.id} className="py-2">
                  <div className="mb-1 flex items-center justify-between gap-2"><p className="min-w-0 truncate text-sm text-stone-700">{it.name}{it.kategorie !== "kosten" && <span className="text-xs text-stone-400"> · {catByKey(it.kategorie).label}{it.day ? ` · ${fmtDate(it.day)}` : ""}</span>}</p>{it.kategorie === "kosten" && <IconBtn onClick={() => onRemove(it.id)} label="Löschen" tone="text-stone-300 hover:text-rose-500"><X className="h-4 w-4" /></IconBtn>}</div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-stone-400">Plan<input type="number" inputMode="decimal" value={it.kosten ?? ""} onChange={(e) => onPatch(it.id, { kosten: e.target.value === "" ? null : Number(e.target.value) })} className="w-20 rounded-lg border border-stone-200 bg-white px-2 py-1 text-right text-sm tabular-nums focus:border-emerald-400 focus:outline-none" />€</label>
                    <label className="flex items-center gap-1 text-xs text-stone-400">Ist<input type="number" inputMode="decimal" value={it.kostenIst ?? ""} onChange={(e) => onPatch(it.id, { kostenIst: e.target.value === "" ? null : Number(e.target.value) })} className="w-20 rounded-lg border border-stone-200 bg-white px-2 py-1 text-right text-sm tabular-nums focus:border-emerald-400 focus:outline-none" />€</label>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-800">Posten hinzufügen</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select value={ccat} onChange={(e) => setCcat(e.target.value)} className="rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm focus:border-emerald-400 focus:outline-none">{COST_CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
          <input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLine()} placeholder="Bezeichnung" className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLine()} placeholder="€" className="w-24 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
          <button onClick={addLine} className="shrink-0 rounded-lg bg-amber-600 p-2 text-white hover:bg-amber-700" aria-label="Hinzufügen"><Plus className="h-4 w-4" /></button>
        </div>
      </section>
    </div>
  );
}

/* ════════════════════════ Tab: Packliste ════════════════════════ */

function PackingView({ trip, onChange }) {
  const list = trip.packing || [];
  const [text, setText] = useState("");
  const set = (next) => onChange({ packing: next });
  const add = () => { if (!text.trim()) return; set([...list, { id: uid(), text: text.trim(), done: false }]); setText(""); };
  const toggle = (id) => set(list.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));
  const remove = (id) => set(list.filter((p) => p.id !== id));
  const clearDone = () => set(list.filter((p) => !p.done));
  const suggest = () => { const existing = new Set(list.map((p) => (p.text || "").toLowerCase())); const toAdd = suggestPacking(trip).filter((s) => !existing.has(s.toLowerCase())).map((s) => ({ id: uid(), text: s, done: false })); set([...list, ...toAdd]); };
  const done = list.filter((p) => p.done).length;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold uppercase tracking-wide text-stone-800">Packliste</h3><span className="text-xs text-stone-400">{done}/{list.length} erledigt</span></div><GhostButton onClick={suggest}><Lightbulb className="h-4 w-4 text-emerald-600" /> Vorschlag</GhostButton></div>
        {list.length === 0 ? <p className="py-2 text-sm text-stone-400">Noch nichts auf der Liste. Unten hinzufügen oder Vorschlag holen.</p> : (
          <ul className="divide-y divide-stone-100">
            {list.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <button onClick={() => toggle(p.id)} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${p.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white text-transparent"}`} aria-label="abhaken">{p.done && <Check className="h-3.5 w-3.5" />}</button>
                <span className={`flex-1 text-sm ${p.done ? "text-stone-400 line-through" : "text-stone-700"}`}>{p.text}</span>
                <IconBtn onClick={() => remove(p.id)} label="Entfernen" tone="text-stone-300 hover:text-rose-500"><X className="h-4 w-4" /></IconBtn>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center gap-2"><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Eintrag hinzufügen" className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" /><button onClick={add} className="shrink-0 rounded-lg bg-emerald-700 p-2 text-white hover:bg-emerald-800" aria-label="Hinzufügen"><Plus className="h-4 w-4" /></button></div>
        {done > 0 && <button onClick={clearDone} className="mt-3 text-xs font-medium text-stone-400 hover:text-rose-500">Erledigte entfernen</button>}
      </section>
    </div>
  );
}

/* ════════════════════════ Export (Text) ════════════════════════ */

function buildExport(trip) {
  const L = [];
  L.push(`# ${trip.name || "Reise"}`);
  L.push(`${regionLabel(trip) || ""}  ·  ${fmtRange(trip)}`.trim());
  L.push(`Kosten geplant: ${eur(planTotal(trip))}${istTotal(trip) > 0 ? ` · tatsächlich: ${eur(istTotal(trip))}` : ""}`);
  if (trip.anreiseart) { const al = trip.anreiseart === "flug" ? "Flug" : trip.anreiseart === "auto" ? "Auto" : "Zug"; L.push(`Anreise: ${al}${[trip.von, trip.nach].filter(Boolean).length ? " " + [trip.von, trip.nach].filter(Boolean).join(" → ") : ""}`); }
  if (trip.stay && trip.stay.name) L.push(`Unterkunft: ${trip.stay.name}${trip.stay.adresse ? ", " + trip.stay.adresse : ""}`);
  L.push("");
  datesBetween(trip.start, trip.end).forEach((d, idx) => {
    const meta = (trip.days || {})[d] || {};
    const dItems = allItems(trip).filter((i) => i.day === d).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const w = WEATHER[meta.weather || "any"];
    L.push(`## Tag ${idx + 1} – ${fmtDateFull(d)}${meta.title ? `: ${meta.title}` : ""}${meta.weather && meta.weather !== "any" ? ` [${w.label}]` : ""}`);
    if (dItems.length === 0) L.push("  (noch nichts geplant)");
    dItems.forEach((i) => {
      const bits = [i.zeit, i.name].filter(Boolean).join(" ");
      const extra = [i.gebiet, i.info, i.prio ? PRIORITIES.find((p) => p.key === i.prio)?.label : "", i.kosten ? eur(i.kosten) : "", i.fahrzeit ? `Fahrt ${i.fahrzeit}` : "", i.season].filter(Boolean).join(" · ");
      L.push(`  - ${bits}${extra ? ` (${extra})` : ""}`);
      if (i.notiz) L.push(`      Notiz: ${i.notiz}`);
    });
    L.push("");
  });
  const pool = allItems(trip).filter((i) => i.kategorie !== "kosten" && !i.day);
  if (pool.length) { L.push("## Ideen (noch nicht verplant)"); pool.forEach((i) => L.push(`  - ${i.name}${i.gebiet ? ` – ${i.gebiet}` : ""}`)); L.push(""); }
  const packing = trip.packing || [];
  if (packing.length) { L.push("## Packliste"); packing.forEach((p) => L.push(`  - [${p.done ? "x" : " "}] ${p.text}`)); L.push(""); }
  return L.join("\n");
}

function ExportButton({ trip }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = buildExport(trip);
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {} };
  return (
    <>
      <IconBtn onClick={() => setOpen(true)} label="Exportieren"><Download className="h-4 w-4" /></IconBtn>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" style={{ maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3"><h3 className="font-semibold text-stone-900">Reise als Text</h3><IconBtn onClick={() => setOpen(false)} label="Schließen" tone="text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></IconBtn></div>
            <pre className="overflow-auto whitespace-pre-wrap bg-stone-50 p-4 text-xs text-stone-700" style={{ maxHeight: "55vh" }}>{text}</pre>
            <div className="flex gap-2 border-t border-stone-100 p-3"><PrimaryButton onClick={copy} className="flex-1">{copied ? <><Check className="h-4 w-4" /> Kopiert</> : <><Copy className="h-4 w-4" /> Text kopieren</>}</PrimaryButton></div>
          </div>
        </div>
      )}
    </>
  );
}
