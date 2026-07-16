/*
  Offlinekarte.jsx — Kartenausschnitt für unterwegs vorladen
  ----------------------------------------------------------
  Lädt die Kacheln einer Region vor, damit die Karten auch ohne Netz funktionieren
  (Alpen-Funkloch, Ausland ohne Roaming).

  WICHTIG – ehrlich:
  Vorladen allein reicht NICHT. Ausgeliefert wird offline nur, was der Service Worker
  aus dem Cache bedienen darf. Dafür muss EINMALIG eine Regel in die vite.config.js
  (vite-plugin-pwa / Workbox) – der genaue Schnipsel steht unten in der App.
  Ohne die Regel wärmt das Vorladen nur den Browser-Cache: hilft manchmal, ist aber
  nicht verlässlich. Das sagt die App offen, statt Offline-Fähigkeit vorzutäuschen.

  Technik: Die Kachel-URL wird ZUR LAUFZEIT aus dem Style gelesen
  (style -> sources.openmaptiles.url -> TileJSON -> tiles[]), nicht fest eingetragen.
  Mitgeladen werden auch Sprites und Schriften – sonst fehlt offline die Beschriftung.

  EINBAU: <Offlinekarte />
*/
import React, { useState, useEffect } from "react";
import { Download, Loader2, Info, HardDrive, Trash2, Check, Search, WifiOff, AlertTriangle } from "lucide-react";
import { STYLE_KARTE } from "./Reisekarte.jsx";

const enc = encodeURIComponent;
const CACHE = "karten-offline";
const mb = (n) => (n / 1048576).toFixed(1) + " MB";

const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * Math.pow(2, z));
const lat2y = (lat, z) => { const r = (lat * Math.PI) / 180; return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z)); };
const klemm = (v, a, b) => Math.max(a, Math.min(b, v));

const STUFEN = [
  { k: "ubersicht", l: "Übersicht", z: 11, txt: "Orte & Hauptstraßen" },
  { k: "normal", l: "Normal", z: 13, txt: "alle Straßen" },
  { k: "detail", l: "Detail", z: 14, txt: "Wege & Gebäude" },
];

async function jget(url, ms = 15000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}

/* Kachel-URL + Zubehör aus dem Style ableiten – nichts fest verdrahtet. */
async function quellen() {
  const style = await jget(STYLE_KARTE);
  const out = { tiles: [], maxzoom: 14, extra: [] };
  for (const key of Object.keys(style.sources || {})) {
    const s = style.sources[key];
    if (s.tiles) { out.tiles.push({ tpl: s.tiles[0], maxzoom: s.maxzoom != null ? s.maxzoom : 14 }); continue; }
    if (s.url) {
      try {
        const tj = await jget(s.url);
        if (tj && tj.tiles && tj.tiles[0]) out.tiles.push({ tpl: tj.tiles[0], maxzoom: tj.maxzoom != null ? tj.maxzoom : 14 });
      } catch (e) {}
    }
  }
  if (style.sprite) out.extra.push(style.sprite + ".json", style.sprite + ".png", style.sprite + "@2x.json", style.sprite + "@2x.png");
  if (style.glyphs) {
    const fonts = new Set();
    for (const l of style.layers || []) { const f = l.layout && l.layout["text-font"]; if (Array.isArray(f)) f.forEach((x) => fonts.add(x)); }
    for (const f of fonts) for (const r of ["0-255", "256-511"]) out.extra.push(style.glyphs.replace("{fontstack}", enc(f)).replace("{range}", r));
  }
  out.styleUrl = STYLE_KARTE;
  return out;
}

function kachelListe(q, bbox, maxZ) {
  const urls = [];
  for (const src of q.tiles) {
    const bis = Math.min(maxZ, src.maxzoom);
    for (let z = 5; z <= bis; z++) {
      const x1 = klemm(lon2x(bbox.w, z), 0, Math.pow(2, z) - 1), x2 = klemm(lon2x(bbox.e, z), 0, Math.pow(2, z) - 1);
      const y1 = klemm(lat2y(bbox.n, z), 0, Math.pow(2, z) - 1), y2 = klemm(lat2y(bbox.s, z), 0, Math.pow(2, z) - 1);
      for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) {
        urls.push(src.tpl.replace("{z}", z).replace("{x}", x).replace("{y}", y));
      }
    }
  }
  return urls;
}

export default function Offlinekarte() {
  const [ort, setOrt] = useState("");
  const [radius, setRadius] = useState(25);
  const [stufe, setStufe] = useState("normal");
  const [busy, setBusy] = useState("");
  const [prog, setProg] = useState([0, 0]);
  const [bytes, setBytes] = useState(0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [belegt, setBelegt] = useState(null);

  const zeigeBelegung = async () => {
    try {
      if (!("caches" in window)) { setBelegt(null); return; }
      const c = await caches.open(CACHE);
      const keys = await c.keys();
      setBelegt(keys.length);
    } catch (e) { setBelegt(null); }
  };
  useEffect(() => { zeigeBelegung(); }, []);

  async function laden() {
    const term = ort.trim();
    if (!term) { setErr("Bitte eine Region eingeben."); return; }
    if (busy) return;
    setBusy("laden"); setErr(""); setMsg(""); setBytes(0); setProg([0, 0]);
    try {
      const g = await jget(`https://photon.komoot.io/api/?q=${enc(term)}&limit=1&lang=de`);
      const f = g.features && g.features[0];
      if (!f || !f.geometry) throw new Error("Region nicht gefunden");
      const lon = f.geometry.coordinates[0], lat = f.geometry.coordinates[1];
      const dLat = radius / 111, dLon = radius / (111 * Math.cos((lat * Math.PI) / 180));
      const bbox = { n: lat + dLat, s: lat - dLat, w: lon - dLon, e: lon + dLon };

      const q = await quellen();
      const maxZ = (STUFEN.find((s) => s.k === stufe) || STUFEN[1]).z;
      const urls = [q.styleUrl, ...q.extra, ...kachelListe(q, bbox, maxZ)];
      if (urls.length > 6000) throw new Error(`${urls.length.toLocaleString("de-DE")} Kacheln – zu viel. Kleineren Umkreis oder weniger Detail wählen.`);

      const cache = "caches" in window ? await caches.open(CACHE) : null;
      let fertig = 0, sum = 0;
      setProg([0, urls.length]);
      const N = 6;
      for (let i = 0; i < urls.length; i += N) {
        await Promise.all(urls.slice(i, i + N).map(async (u) => {
          try {
            const r = await fetch(u, { cache: "reload" });
            if (r.ok) { const b = await r.clone().blob(); sum += b.size; if (cache) await cache.put(u, r); }
          } catch (e) {}
          fertig++;
        }));
        setProg([fertig, urls.length]); setBytes(sum);
      }
      await zeigeBelegung();
      setMsg(`${fertig.toLocaleString("de-DE")} Dateien geladen (${mb(sum)}) für ${f.properties && f.properties.name ? f.properties.name : term}, ${radius} km.`);
    } catch (e) { setErr(e.message || String(e)); }
    finally { setBusy(""); }
  }

  async function leeren() {
    if (!window.confirm("Alle vorgeladenen Karten löschen?")) return;
    setBusy("leeren");
    try { if ("caches" in window) await caches.delete(CACHE); setMsg("Vorgeladene Karten gelöscht."); await zeigeBelegung(); }
    catch (e) { setErr("Löschen fehlgeschlagen."); }
    finally { setBusy(""); }
  }

  const chip = (on) => "rounded-full px-3 py-1.5 text-xs font-medium transition " + (on ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300");
  const pct = prog[1] ? Math.round((prog[0] / prog[1]) * 100) : 0;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-800 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100"><WifiOff className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Offline-Karten</div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Kartenausschnitt vorladen – für Funklöcher und Ausland ohne Roaming.</p>

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 dark:border-stone-700 dark:bg-stone-900">
            <Search className="h-4 w-4 shrink-0 text-stone-400" />
            <input value={ort} onChange={(e) => setOrt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") laden(); }} placeholder="Region, z. B. Stans, Tirol" className="w-full bg-transparent py-2 text-sm focus:outline-none" />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-semibold text-stone-500 dark:text-stone-400">Umkreis</span>
          {[10, 25, 50].map((r) => <button key={r} onClick={() => setRadius(r)} className={chip(radius === r)}>{r} km</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-semibold text-stone-500 dark:text-stone-400">Detail</span>
          {STUFEN.map((s) => <button key={s.k} onClick={() => setStufe(s.k)} className={chip(stufe === s.k)}>{s.l}</button>)}
          <span className="text-xs text-stone-400 dark:text-stone-500">{(STUFEN.find((s) => s.k === stufe) || {}).txt}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={laden} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
          {busy === "laden" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Vorladen
        </button>
        <button onClick={leeren} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300">
          <Trash2 className="h-4 w-4" /> Leeren
        </button>
      </div>

      {busy === "laden" && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400"><span>{prog[0].toLocaleString("de-DE")} / {prog[1].toLocaleString("de-DE")} Dateien</span><span>{mb(bytes)}</span></div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"><div className="h-full bg-emerald-700 transition-all" style={{ width: pct + "%" }} /></div>
        </div>
      )}

      {msg && <div className="mt-2 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {msg}</div>}
      {err && <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err}</div>}
      {belegt != null && <div className="mt-2 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400"><HardDrive className="h-3.5 w-3.5" /> {belegt.toLocaleString("de-DE")} Dateien im Offline-Speicher</div>}

      <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span><b>Einmalig nötig:</b> Damit die Karten offline auch ausgeliefert werden, muss der Service Worker sie aus dem Cache bedienen dürfen. Dazu in <code>vite.config.js</code> beim <code>VitePWA</code>-Plugin ergänzen:
          <br /><code>workbox: {"{"} runtimeCaching: [{"{"} urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/, handler: "CacheFirst", options: {"{"} cacheName: "karten-offline", expiration: {"{"} maxEntries: 8000, maxAgeSeconds: 2592000 {"}"}, cacheableResponse: {"{"} statuses: [0, 200] {"}"} {"}"} {"}"}] {"}"}</code>
          <br />Ohne diese Regel wärmt „Vorladen“ nur den Browser-Cache – das hilft manchmal, ist aber nicht verlässlich.
        </span>
      </div>

      <div className="mt-2 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Kartendaten © OpenStreetMap-Mitwirkende, Kacheln von OpenFreeMap (frei, ohne Schlüssel). Die Kachel-Adresse wird aus dem Style gelesen, nicht fest eingetragen – ändert der Anbieter etwas, zieht die App automatisch mit. Mitgeladen werden Schriften und Symbole, sonst fehlt offline die Beschriftung. Tipp: Vorher unter „Datensicherung“ den dauerhaften Speicher aktivieren, sonst darf der Browser das alles wieder löschen.</span></div>
    </section>
  );
}
