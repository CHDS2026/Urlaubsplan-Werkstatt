// Reise als .ics-Kalenderdatei – wird vollständig im Browser erzeugt.
// Kein Server, keine Übertragung: die Datei entsteht auf dem Gerät und wird dort gespeichert.

const pad = (n) => String(n).padStart(2, "0");

/* Text nach RFC 5545 maskieren */
const esc = (s) => String(s || "")
  .replace(/\\/g, "\\\\")
  .replace(/;/g, "\\;")
  .replace(/,/g, "\\,")
  .replace(/\r?\n/g, "\\n");

/* Zeilen über 75 Zeichen umbrechen (Fortsetzung beginnt mit Leerzeichen) */
function falte(zeile) {
  if (zeile.length <= 75) return zeile;
  const teile = [zeile.slice(0, 75)];
  let rest = zeile.slice(75);
  while (rest.length > 74) { teile.push(" " + rest.slice(0, 74)); rest = rest.slice(74); }
  if (rest) teile.push(" " + rest);
  return teile.join("\r\n");
}

const datumOhneStrich = (iso) => iso.replace(/-/g, "");
const naechsterTag = (iso) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

const jetztStempel = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};

const uid = (i) => `${Date.now()}-${i}-urlaubsplaner`;

/* "08:30" -> "0830"; ungültig -> null */
function zeitTeile(zeit) {
  const m = /^(\d{1,2}):(\d{2})$/.exec((zeit || "").trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${pad(h)}${pad(min)}00`;
}

function plusStunde(zeitStr) {
  const h = Number(zeitStr.slice(0, 2)), m = Number(zeitStr.slice(2, 4));
  const neu = (h + 1) % 24;
  return `${pad(neu)}${pad(m)}00`;
}

/**
 * Erzeugt den Inhalt einer .ics-Datei.
 * @param trip Reise
 * @param optionen { erinnerungMin: number|null }
 */
export function buildICS(trip, optionen = {}) {
  const erinnerung = optionen.erinnerungMin == null ? 60 : optionen.erinnerungMin;
  const stempel = jetztStempel();
  const ort = [trip.region, trip.land].filter(Boolean).join(", ");
  const L = [];
  let n = 0;

  L.push("BEGIN:VCALENDAR");
  L.push("VERSION:2.0");
  L.push("PRODID:-//Urlaubsplaner//DE");
  L.push("CALSCALE:GREGORIAN");
  L.push("METHOD:PUBLISH");

  // Ganztägiger Rahmen für die Reise
  if (trip.start) {
    const ende = trip.end || trip.start;
    L.push("BEGIN:VEVENT");
    L.push(`UID:${uid(n++)}`);
    L.push(`DTSTAMP:${stempel}`);
    L.push(`DTSTART;VALUE=DATE:${datumOhneStrich(trip.start)}`);
    L.push(`DTEND;VALUE=DATE:${datumOhneStrich(naechsterTag(ende))}`);
    L.push(falte(`SUMMARY:${esc(trip.name || "Reise")}`));
    if (ort) L.push(falte(`LOCATION:${esc(ort)}`));
    const besch = [
      trip.stay && trip.stay.name ? `Unterkunft: ${trip.stay.name}` : "",
      trip.anreiseart ? `Anreise: ${trip.anreiseart}` : "",
    ].filter(Boolean).join("\n");
    if (besch) L.push(falte(`DESCRIPTION:${esc(besch)}`));
    L.push("TRANSP:TRANSPARENT");
    L.push("END:VEVENT");
  }

  // Programmpunkte
  const punkte = (trip.items || []).filter((i) => i.kategorie !== "kosten" && i.day);
  punkte.sort((a, b) => (a.day > b.day ? 1 : a.day < b.day ? -1 : (a.order ?? 0) - (b.order ?? 0)));

  punkte.forEach((i) => {
    const zeit = zeitTeile(i.zeit);
    L.push("BEGIN:VEVENT");
    L.push(`UID:${uid(n++)}`);
    L.push(`DTSTAMP:${stempel}`);
    if (zeit) {
      L.push(`DTSTART:${datumOhneStrich(i.day)}T${zeit}`);
      L.push(`DTEND:${datumOhneStrich(i.day)}T${plusStunde(zeit)}`);
    } else {
      L.push(`DTSTART;VALUE=DATE:${datumOhneStrich(i.day)}`);
      L.push(`DTEND;VALUE=DATE:${datumOhneStrich(naechsterTag(i.day))}`);
    }
    L.push(falte(`SUMMARY:${esc(i.name || "Programmpunkt")}`));

    const orte = [i.gebiet, ort].filter(Boolean).join(", ");
    if (orte) L.push(falte(`LOCATION:${esc(orte)}`));
    if (i.lat != null && i.lon != null) L.push(`GEO:${i.lat};${i.lon}`);

    const text = [i.info, i.notiz, i.fahrzeit ? `Fahrzeit: ${i.fahrzeit}` : "", i.kosten ? `Kosten: ${i.kosten} €` : ""].filter(Boolean).join("\n");
    if (text) L.push(falte(`DESCRIPTION:${esc(text)}`));

    // Erinnerung nur bei Punkten mit Uhrzeit
    if (zeit && erinnerung) {
      L.push("BEGIN:VALARM");
      L.push(`TRIGGER:-PT${erinnerung}M`);
      L.push("ACTION:DISPLAY");
      L.push(falte(`DESCRIPTION:${esc(i.name || "Programmpunkt")}`));
      L.push("END:VALARM");
    }
    L.push("END:VEVENT");
  });

  L.push("END:VCALENDAR");
  return L.join("\r\n");
}

/** Datei im Browser herunterladen */
export function downloadICS(trip, optionen) {
  const inhalt = buildICS(trip, optionen);
  const name = (trip.name || "reise").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "reise";
  const blob = new Blob([inhalt], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}.ics`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
