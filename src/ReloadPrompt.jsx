import React, { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/* Sichtbarer Update-Hinweis – ersetzt das manuelle „Service Worker abmelden + Cache leeren".
   Bei jedem Deploy erkennt der Service Worker die neue Version und blendet unten einen Toast
   ein; ein Tap auf „Neu laden" aktiviert sie sofort. „Offline bereit" erscheint einmalig nach
   der Erstinstallation. Prüft zusätzlich stündlich auf Updates, falls die App lange offen bleibt. */
export default function ReloadPrompt() {
  const [zu, setZu] = useState(false);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, r) { if (r) setInterval(() => r.update(), 60 * 60 * 1000); },
  });

  if (zu || (!offlineReady && !needRefresh)) return null;
  const schliessen = () => { setOfflineReady(false); setNeedRefresh(false); setZu(true); };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-lg dark:border-stone-700 dark:bg-stone-900">
        <span className="min-w-0 flex-1 text-sm text-stone-700 dark:text-stone-200">{needRefresh ? "Neue Version verfügbar." : "App ist offline bereit."}</span>
        {needRefresh && <button onClick={() => updateServiceWorker(true)} className="shrink-0 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800">Neu laden</button>}
        <button onClick={schliessen} className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">Später</button>
      </div>
    </div>
  );
}
