/* ── Datums-Helfer ──────────────────────────────────────────────────────────
   Lagen mehrfach in einzelnen Komponenten. Achtung beim Vergleich mit alten
   Fassungen: addDays rechnet mit ISO-Strings ("2026-08-28") in UTC – nicht mit
   Date-Objekten. Wochentipps hat bewusst eine eigene, tagesbasierte Variante
   (dort jetzt addTage genannt, damit der gleiche Name nicht zwei Dinge meint). */

export const isValidISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/* Ungültige Eingabe wird unverändert zurückgegeben (App.jsx nutzt bewusst eine
   eigene Variante, die in dem Fall "" liefert – deshalb dort nicht ersetzt). */
export const fmtDate = (s) => { const d = new Date(s + "T00:00:00"); return isNaN(d) ? s : d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }); };

export const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
export const MONATE_LANG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
