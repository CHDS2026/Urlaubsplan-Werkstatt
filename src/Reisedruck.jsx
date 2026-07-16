/*
  Reisedruck.jsx — Reise als PDF / Ausdruck
  -----------------------------------------
  Bewusst OHNE zusätzliche Bibliothek (kein jsPDF & Co.): Es wird eine saubere,
  druckoptimierte Fassung der Reise ins Dokument gelegt und window.print() aufgerufen.
  Der Browser bietet dann "Als PDF speichern" an – am Handy wie am Rechner.
  Vorteile: nichts zu installieren, kein Schlüssel, funktioniert offline, Umlaute
  stimmen immer (Systemschrift statt eingebettetem Font).

  Technik: Die Druckfassung hängt per Portal direkt an <body> (damit die absolute
  Positionierung nicht an einem positionierten Eltern-Element hängt). Im Druck wird
  alles andere ausgeblendet.

  EINBAU (in der Reise-Kopfzeile): <Reisedruck trip={trip} />
*/
import React from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";

const isValidISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const datesBetween = (a, b) => { if (!isValidISO(a) || !isValidISO(b)) return []; const o = []; let c = a, g = 0; while (c <= b && g < 400) { o.push(c); c = addDays(c, 1); g++; } return o; };
const fmtDate = (s) => { const d = new Date(s + "T00:00:00"); return isNaN(d) ? s : d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }); };
const fmtKurz = (s) => { const d = new Date(s + "T00:00:00"); return isNaN(d) ? s : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); };
const eur = (n) => (Number(n) || 0).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";
const KAT = { sehenswuerdigkeit: "Sehenswürdigkeit", fotospot: "Fotospot", aussicht: "Aussichtspunkt", wanderung: "Wandertour", restaurant: "Restaurant", hotel: "Unterkunft", kosten: "Kosten" };
const ANREISE = { auto: "Auto", zug: "Zug", flug: "Flug" };

const S = {
  wrap: { fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", color: "#1c1917", fontSize: "11pt", lineHeight: 1.45 },
  h1: { fontSize: "20pt", fontWeight: 700, margin: "0 0 2mm" },
  sub: { fontSize: "10pt", color: "#57534e", margin: "0 0 5mm" },
  h2: { fontSize: "12pt", fontWeight: 700, margin: "6mm 0 2mm", borderBottom: "1px solid #d6d3d1", paddingBottom: "1mm" },
  tag: { margin: "0 0 4mm", pageBreakInside: "avoid", breakInside: "avoid" },
  tagKopf: { fontSize: "11pt", fontWeight: 700, background: "#f5f5f4", padding: "1.5mm 2mm", borderLeft: "3px solid #047857" },
  item: { padding: "1.5mm 0 1.5mm 2mm", borderBottom: "1px dotted #e7e5e4" },
  meta: { fontSize: "9pt", color: "#57534e" },
  klein: { fontSize: "9pt", color: "#78716c" },
  zeile: { display: "flex", justifyContent: "space-between", gap: "4mm", padding: "0.8mm 0" },
  fuss: { marginTop: "8mm", paddingTop: "2mm", borderTop: "1px solid #d6d3d1", fontSize: "8pt", color: "#a8a29e" },
};

export default function Reisedruck({ trip }) {
  if (!trip) return null;
  const items = trip.items || [];
  const tage = datesBetween(trip.start, trip.end);
  const pool = items.filter((i) => !i.day && i.kategorie !== "kosten");
  const geplant = items.reduce((s, i) => s + (Number(i.kosten) || 0), 0);
  const ist = items.reduce((s, i) => s + (Number(i.kostenIst) || 0), 0);
  const packliste = trip.packing || [];
  const stay = trip.stay || {};

  const druck = (
    <>
      <style media="print">{`
        body * { visibility: hidden !important; }
        #reise-druck, #reise-druck * { visibility: visible !important; }
        #reise-druck { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
        @page { size: A4; margin: 14mm; }
      `}</style>
      <div id="reise-druck" style={{ display: "none", ...S.wrap }}>
        <h1 style={S.h1}>{trip.name || "Reise"}</h1>
        <p style={S.sub}>
          {[trip.region, trip.land].filter(Boolean).join(", ")}
          {trip.start ? ` · ${fmtKurz(trip.start)}${trip.end ? ` – ${fmtKurz(trip.end)}` : ""}` : ""}
          {tage.length ? ` · ${tage.length} Tage` : ""}
        </p>

        {trip.hinweise && <p style={{ ...S.klein, margin: "0 0 4mm" }}>{trip.hinweise}</p>}

        {(trip.anreiseart || trip.von || trip.nach || (trip.auto && trip.auto.km)) && (
          <>
            <div style={S.h2}>Anreise</div>
            <div style={S.meta}>
              {ANREISE[trip.anreiseart] || trip.anreiseart || "—"}
              {trip.von || trip.nach ? ` · ${trip.von || "?"} → ${trip.nach || "?"}` : ""}
              {trip.auto && trip.auto.km ? ` · ${trip.auto.km} km` : ""}
            </div>
          </>
        )}

        {(stay.name || stay.adresse || stay.checkin) && (
          <>
            <div style={S.h2}>Unterkunft</div>
            <div style={S.meta}>
              {stay.name && <div style={{ fontWeight: 700, color: "#1c1917" }}>{stay.name}</div>}
              {stay.adresse && <div>{stay.adresse}</div>}
              {(stay.checkin || stay.checkout) && <div>Check-in {stay.checkin ? fmtKurz(stay.checkin) : "—"} · Check-out {stay.checkout ? fmtKurz(stay.checkout) : "—"}</div>}
            </div>
          </>
        )}

        {tage.length > 0 && <div style={S.h2}>Programm</div>}
        {tage.map((d, idx) => {
          const meta = (trip.days || {})[d] || {};
          const liste = items.filter((i) => i.day === d && i.kategorie !== "kosten").sort((a, b) => (a.order || 0) - (b.order || 0));
          return (
            <div key={d} style={S.tag}>
              <div style={S.tagKopf}>Tag {idx + 1} · {fmtDate(d)}{meta.title ? ` — ${meta.title}` : ""}</div>
              {liste.length === 0 && <div style={{ ...S.klein, padding: "1.5mm 0 0 2mm" }}>— nichts geplant —</div>}
              {liste.map((it) => (
                <div key={it.id} style={S.item}>
                  <div style={S.zeile}>
                    <span><b>{it.zeit ? it.zeit + " · " : ""}{it.name}</b>{it.prio === "must" ? " ★" : ""}</span>
                    <span style={S.klein}>{it.kosten != null && it.kosten !== "" ? eur(it.kosten) : ""}</span>
                  </div>
                  <div style={S.meta}>
                    {[KAT[it.kategorie] || "", it.gebiet, it.info].filter(Boolean).join(" · ")}
                  </div>
                  {(it.oeffnung || it.eintritt || it.fahrzeit) && (
                    <div style={S.klein}>
                      {it.fahrzeit ? `Fahrzeit: ${it.fahrzeit}` : ""}
                      {it.fahrzeit && (it.oeffnung || it.eintritt) ? " · " : ""}
                      {it.oeffnung ? `Öffnung: ${it.oeffnung}` : ""}
                      {it.oeffnung && it.eintritt ? " · " : ""}
                      {it.eintritt || ""}
                    </div>
                  )}
                  {it.notiz && <div style={{ ...S.klein, fontStyle: "italic" }}>{it.notiz}</div>}
                </div>
              ))}
            </div>
          );
        })}

        {pool.length > 0 && (
          <>
            <div style={S.h2}>Ideen (ohne festen Tag)</div>
            {pool.map((it) => (
              <div key={it.id} style={S.item}>
                <b>{it.name}</b>
                <div style={S.meta}>{[KAT[it.kategorie] || "", it.gebiet, it.info].filter(Boolean).join(" · ")}</div>
              </div>
            ))}
          </>
        )}

        {(geplant > 0 || ist > 0) && (
          <>
            <div style={S.h2}>Budget</div>
            <div style={S.zeile}><span>Geplant</span><b>{eur(geplant)}</b></div>
            <div style={S.zeile}><span>Tatsächlich</span><b>{eur(ist)}</b></div>
          </>
        )}

        {packliste.length > 0 && (
          <>
            <div style={S.h2}>Packliste</div>
            <div style={{ columns: 2, columnGap: "8mm" }}>
              {packliste.map((p) => (
                <div key={p.id} style={{ ...S.meta, breakInside: "avoid" }}>☐ {p.text}</div>
              ))}
            </div>
          </>
        )}

        <div style={S.fuss}>
          Urlaubsplaner · erstellt am {new Date().toLocaleDateString("de-DE")} · Angaben ohne Gewähr –
          Öffnungszeiten und Preise vor Ort prüfen.
        </div>
      </div>
    </>
  );

  return (
    <>
      <button onClick={() => window.print()} aria-label="Als PDF speichern / drucken" title="Als PDF speichern / drucken"
        className="rounded-lg p-1.5 text-stone-400 transition hover:bg-emerald-50 hover:text-emerald-700">
        <Printer className="h-4 w-4" />
      </button>
      {typeof document !== "undefined" ? createPortal(druck, document.body) : null}
    </>
  );
}
