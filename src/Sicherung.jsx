/*
  Sicherung.jsx — vollständige Datensicherung & Wiederherstellung
  ---------------------------------------------------------------
  Warum: Alles liegt lokal in IndexedDB auf EINEM Gerät. Handy weg / Browserdaten
  gelöscht / PWA neu installiert -> alles weg.

  Enthält:
   1. Dauerhafter Speicher: navigator.storage.persist() anfordern (verhindert, dass der
      Browser die Daten bei Speicherdruck automatisch löscht) + Status anzeigen.
   2. Speicherbelegung via navigator.storage.estimate().
   3. VOLLSICHERUNG als eine .json-Datei – inkl. Dokumente (Fotos/PDFs als Base64).
      Ohne Dokumente = klein; mit Dokumenten = groß (Größe wird vorher angezeigt).
   4. Wiederherstellung: ersetzt den kompletten Stand (IDs bleiben, Dokumente hängen
      wieder an der richtigen Reise).
   5. Erinnerung: merkt sich das Datum der letzten Sicherung (localStorage) und warnt.

  EINBAU: <Sicherung data={data} onRestore={(d) => save(d)} />
*/
import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, Download, Upload, HardDrive, Loader2, Info, Check } from "lucide-react";
import { listDocsByTrip, getBlob, addDoc, deleteDocsByTrip } from "./db.js";

const KEY = "up-lastbackup";
export const WARN_TAGE = 21;

export function letzteSicherung() {
  try { const v = localStorage.getItem(KEY); return v ? new Date(v) : null; } catch (e) { return null; }
}
export function tageSeitSicherung() {
  const d = letzteSicherung();
  if (!d || isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
const merkeSicherung = () => { try { localStorage.setItem(KEY, new Date().toISOString()); } catch (e) {} };

const mb = (n) => (n / 1048576).toFixed(1) + " MB";
const blobToB64 = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = () => rej(new Error("Lesefehler")); r.readAsDataURL(b); });
function b64ToBlob(b64, type) {
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: type || "application/octet-stream" });
}

export default function Sicherung({ data, onRestore }) {
  const [persist, setPersist] = useState(null);
  const [platz, setPlatz] = useState(null);
  const [docsInfo, setDocsInfo] = useState({ anzahl: 0, bytes: 0 });
  const [mitDocs, setMitDocs] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const tage = tageSeitSicherung();
  const trips = (data && data.trips) || [];

  useEffect(() => {
    if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(setPersist).catch(() => setPersist(null));
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then((e) => setPlatz(e)).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let n = 0, b = 0;
        for (const t of trips) { const ds = await listDocsByTrip(t.id); for (const d of ds || []) { n++; b += d.size || 0; } }
        if (alive) setDocsInfo({ anzahl: n, bytes: b });
      } catch (e) {}
    })();
    return () => { alive = false; };
  }, [trips.length]);

  async function dauerhaft() {
    if (!(navigator.storage && navigator.storage.persist)) { setErr("Dieser Browser unterstützt dauerhaften Speicher nicht."); return; }
    try { const ok = await navigator.storage.persist(); setPersist(ok); if (!ok) setErr("Der Browser hat dauerhaften Speicher abgelehnt. Tipp: Als App zum Startbildschirm hinzufügen erhöht die Chance."); else setErr(""); }
    catch (e) { setErr("Anfrage fehlgeschlagen."); }
  }

  async function sichern() {
    setBusy("export"); setErr(""); setMsg("");
    try {
      const paket = { app: "urlaubsplaner", version: 2, erstellt: new Date().toISOString(), planung: data, dokumente: [] };
      if (mitDocs) {
        for (const t of trips) {
          const ds = await listDocsByTrip(t.id);
          for (const d of ds || []) {
            const blob = await getBlob(d.id);
            if (!blob) continue;
            paket.dokumente.push({ tripId: t.id, scope: d.scope || "trip", name: d.name, type: d.type, size: d.size, b64: await blobToB64(blob) });
          }
        }
      }
      const blob = new Blob([JSON.stringify(paket)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "urlaubsplaner-sicherung-" + new Date().toISOString().slice(0, 10) + ".json"; a.click();
      URL.revokeObjectURL(url);
      merkeSicherung();
      setMsg(`Sicherung gespeichert (${mb(blob.size)}${mitDocs ? `, inkl. ${paket.dokumente.length} Dokumente` : ", ohne Dokumente"}). Leg sie irgendwo ab, wo sie das Handy überlebt.`);
    } catch (e) { setErr("Sicherung fehlgeschlagen: " + (e.message || e)); }
    finally { setBusy(""); }
  }

  async function wiederherstellen(file) {
    setBusy("import"); setErr(""); setMsg("");
    try {
      const txt = await file.text();
      const p = JSON.parse(txt);
      const planung = p && p.planung ? p.planung : (p && Array.isArray(p.trips) ? p : null);
      if (!planung || !Array.isArray(planung.trips)) throw new Error("Das ist keine Urlaubsplaner-Sicherung.");
      const anzD = Array.isArray(p.dokumente) ? p.dokumente.length : 0;
      if (!window.confirm(`Kompletten Stand ersetzen?\n\n${planung.trips.length} Reisen, ${(planung.wishlist || []).length} Ideen${anzD ? `, ${anzD} Dokumente` : ""}.\n\nDer aktuelle Stand auf diesem Gerät wird überschrieben.`)) { setBusy(""); return; }
      onRestore({
        trips: planung.trips || [], wishlist: planung.wishlist || [], visited: planung.visited || {},
        regions: planung.regions || {}, visitedRegions: planung.visitedRegions || {}, wishRegions: planung.wishRegions || {},
      });
      if (anzD) {
        const ids = Array.from(new Set(p.dokumente.map((d) => d.tripId)));
        for (const id of ids) { try { await deleteDocsByTrip(id); } catch (e) {} }
        for (const d of p.dokumente) {
          try { await addDoc(d.tripId, d.scope || "trip", new File([b64ToBlob(d.b64, d.type)], d.name || "datei", { type: d.type || "application/octet-stream" })); } catch (e) {}
        }
        try { window.dispatchEvent(new CustomEvent("up-docs", { detail: {} })); } catch (e) {}
      }
      merkeSicherung();
      setMsg(`Wiederhergestellt: ${planung.trips.length} Reisen${anzD ? `, ${anzD} Dokumente` : ""}.`);
    } catch (e) { setErr("Wiederherstellen fehlgeschlagen: " + (e.message || e)); }
    finally { setBusy(""); }
  }

  const faellig = tage === null || tage >= WARN_TAGE;

  return (
    <section className={"mt-4 rounded-2xl border p-4 shadow-sm " + (faellig ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950" : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900")}>
      <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
        {faellig ? <ShieldAlert className="h-4 w-4 text-amber-600" /> : <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />} Datensicherung
      </div>
      <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
        {tage === null ? "Noch nie gesichert. Alles liegt nur auf diesem Gerät – geht es verloren, sind alle Reisen weg."
          : tage >= WARN_TAGE ? `Letzte Sicherung vor ${tage} Tagen. Zeit für eine neue.`
          : `Letzte Sicherung vor ${tage} Tag${tage === 1 ? "" : "en"}.`}
      </p>

      <div className="mt-3 space-y-1.5 rounded-xl bg-white p-3 text-xs dark:bg-stone-900">
        <div className="flex items-start gap-2">
          {persist === true ? <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" /> : <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />}
          <span className="min-w-0 flex-1 text-stone-600 dark:text-stone-300">
            {persist === true ? "Dauerhafter Speicher aktiv – der Browser löscht die Daten nicht von selbst."
              : persist === false ? "Dauerhafter Speicher NICHT aktiv – der Browser darf die Daten bei Speicherdruck löschen."
              : "Dauerhafter Speicher: Status unbekannt (Browser unterstützt die Abfrage nicht)."}
          </span>
          {persist !== true && <button onClick={dauerhaft} className="shrink-0 rounded-lg bg-emerald-700 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-800">Aktivieren</button>}
        </div>
        {platz && platz.usage != null && (
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400"><HardDrive className="h-3.5 w-3.5 shrink-0" /> Belegt: {mb(platz.usage)}{platz.quota ? ` von ca. ${mb(platz.quota)}` : ""} · {docsInfo.anzahl} Dokument(e), {mb(docsInfo.bytes)}</div>
        )}
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
        <input type="checkbox" checked={mitDocs} onChange={(e) => setMitDocs(e.target.checked)} className="h-4 w-4 accent-emerald-700" />
        Dokumente mitsichern <span className="text-xs text-stone-400 dark:text-stone-500">({docsInfo.anzahl} Stück, {mb(docsInfo.bytes)}{docsInfo.bytes > 0 ? " → Datei wird ca. " + mb(docsInfo.bytes * 1.37) + " groß" : ""})</span>
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={sichern} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
          {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Sicherung speichern
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">
          {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Wiederherstellen
          <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) wiederherstellen(f); e.target.value = ""; }} />
        </label>
      </div>

      {msg && <div className="mt-2 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {msg}</div>}
      {err && <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err}</div>}

      <div className="mt-3 flex items-start gap-2 text-xs text-stone-400 dark:text-stone-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Die Sicherung enthält Reisen, Ideen, besuchte Regionen und optional alle Dokumente – als eine Datei, ohne Konto und ohne Cloud. „Wiederherstellen“ <b>ersetzt</b> den Stand auf diesem Gerät (der Reisen-Import in der Liste hängt dagegen Reisen zusätzlich an). Bewahre die Datei außerhalb des Handys auf – eine Sicherung auf demselben Gerät hilft bei Verlust nicht.</span></div>
    </section>
  );
}
