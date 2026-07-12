/*
  AppMenu.jsx — übergeordnetes Menü-Band mit Strukturbaum
  -------------------------------------------------------
  Immer oben auf dem Home-Screen (über allen Reitern). Aufklappbar:
    Reisen · Ziele · Bestpreis · Tools (Übersicht) -> Tool-Gruppen -> Tools
  Springt direkt in jeden Home-Bereich und jedes Tool.

  EINBAU in App.jsx (Home-Bereich, über der Tab-Leiste):
    <AppMenu homeTab={homeTab} setHomeTab={setHomeTab} toolKey={toolKey} setToolKey={setToolKey} />
*/
import React, { useState } from "react";
import { Menu, X, LayoutGrid, Calendar, Globe2, Wallet, Compass } from "lucide-react";
import { GROUPS } from "./ReiseTools.jsx";

const HOME = [
  { k: "reisen", label: "Reisen", Icon: Calendar },
  { k: "ziele", label: "Ziele", Icon: Globe2 },
  { k: "bestpreis", label: "Bestpreis", Icon: Wallet },
];
const ALL_TOOLS = GROUPS.flatMap((g) => g.items);

const rowBase = "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition";
const rowOn = "bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
const rowOff = "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800";
const subOff = "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800";

export default function AppMenu({ homeTab, setHomeTab, toolKey, setToolKey }) {
  const [open, setOpen] = useState(false);
  const setTool = setToolKey || (() => {});
  const goHome = (k) => { setHomeTab(k); setTool(null); setOpen(false); };
  const goTool = (k) => { setHomeTab("tools"); setTool(k); setOpen(false); };

  const curTool = ALL_TOOLS.find((t) => t.k === toolKey);
  const label = homeTab === "tools"
    ? "Tools" + (curTool ? " › " + curTool.label : "")
    : (HOME.find((h) => h.k === homeTab) || {}).label || "";

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-emerald-700">
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />} Menü
        </button>
        <div className="min-w-0 truncate text-sm text-stone-500 dark:text-stone-400">{label}</div>
      </div>

      {open && (
        <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          {/* Home-Bereiche */}
          {HOME.map((h) => {
            const Ico = h.Icon; const on = homeTab === h.k;
            return (
              <button key={h.k} onClick={() => goHome(h.k)} className={rowBase + " " + (on ? rowOn : rowOff)}>
                <Ico className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> {h.label}
              </button>
            );
          })}

          {/* Tools */}
          <button onClick={() => goTool(null)}
            className={rowBase + " mt-0.5 " + (homeTab === "tools" && !toolKey ? rowOn : rowOff)}>
            <Compass className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Tools · Übersicht
          </button>

          <div className="ml-3 mt-1 space-y-1.5 border-l border-stone-200 pl-2 dark:border-stone-700">
            {GROUPS.map((grp) => {
              const G = grp.gIcon;
              return (
                <div key={grp.g}>
                  <div className="flex items-center gap-1.5 px-1 py-0.5 text-xs font-bold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                    <G className="h-3.5 w-3.5" /> {grp.g}
                  </div>
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-stone-200 pl-2 dark:border-stone-700">
                    {grp.items.map((it) => {
                      const Ico = it.Icon; const on = homeTab === "tools" && toolKey === it.k;
                      return (
                        <button key={it.k} onClick={() => goTool(it.k)} className={rowBase + " " + (on ? rowOn : subOff)}>
                          <Ico className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> {it.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
