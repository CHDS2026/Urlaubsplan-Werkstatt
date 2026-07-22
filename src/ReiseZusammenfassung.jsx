import React, { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";

/* „Reise in 3 Sätzen" – ruft die Pages Function /api/summary mit den eigenen Plandaten auf.
   Schickt bewusst nur Fakten (Region, Zeitraum, Punkte je Tag); der Text wird serverseitig
   formuliert. Bitte-gegenlesen-Hinweis, weil auch formulierter Text abweichen kann. */

function baueNutzlast(trip) {
  const items = (trip.items || []).filter((i) => i && i.kategorie !== "kosten");
  const proTag = {};
  for (const it of items) {
    if (!it.day) continue;
    (proTag[it.day] = proTag[it.day] || []).push(it.name);
  }
  const tage = Object.keys(proTag).sort().map((datum) => ({ datum, punkte: proTag[datum] }));
  return {
    region: trip.region || "",
    land: trip.land || "",
    start: trip.start || "",
    end: trip.end || "",
    tage,
    unverplant: items.filter((i) => !i.day).map((i) => i.name),
  };
}

export default function ReiseZusammenfassung({ trip }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");

  const nutzlast = baueNutzlast(trip || {});
  const genugDaten = Boolean(nutzlast.region) || nutzlast.tage.length > 0;
  if (!genugDaten) return null;

  const holen = async () => {
    setBusy(true); setFehler(""); setText("");
    try {
      const r = await fetch("/api/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nutzlast),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) { setFehler(j.error || "Zusammenfassung nicht möglich."); return; }
      setText(String(j.zusammenfassung || "").trim());
    } catch (e) {
      setFehler("Server nicht erreichbar.");
    } finally { setBusy(false); }
  };

  return (
    <section className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-800 dark:text-stone-100">
          <Sparkles className="h-4 w-4 text-emerald-700" /> Reise in 3 Sätzen
        </span>
        <button onClick={holen} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : text ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Fasse zusammen…" : text ? "Neu" : "Erstellen"}
        </button>
      </div>
      {fehler && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{fehler}</p>}
      {text && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-700 dark:text-stone-200">{text}</p>}
      {text && <p className="mt-2 text-xs text-stone-400">Automatisch aus deinen Plandaten formuliert – bitte gegenlesen.</p>}
    </section>
  );
}
