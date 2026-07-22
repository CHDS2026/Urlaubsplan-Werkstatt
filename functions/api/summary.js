/* Cloudflare Pages Function → POST /api/summary
   Formuliert die REISE IN 3 SAETZEN aus den mitgeschickten Plandaten. Laeuft serverseitig,
   der KI-Zugang liegt im AI-Binding – KEIN Schluessel im Browser. Das Modell bekommt
   ausschliesslich die uebergebenen Fakten und die klare Anweisung, nichts zu erfinden.

   Einrichtung in Cloudflare: Pages-Projekt → Settings → Functions → Bindings →
   Workers AI hinzufuegen, Variablenname exakt: AI
   MODELL unten online gegenchecken: developers.cloudflare.com/workers-ai/models (Text/Chat). */

const MODELL = "@cf/meta/llama-3.1-8b-instruct"; // ← Modellnamen online verifizieren

const SYSTEM =
  "Du fasst Reiseplaene in genau drei kurzen, natuerlichen deutschen Saetzen zusammen. " +
  "Verwende ausschliesslich die Angaben aus den Daten. Erfinde nichts – keine Orte, Daten, " +
  "Uhrzeiten, Entfernungen, Fahrzeiten oder Preise, die nicht ausdruecklich genannt sind. " +
  "Keine Bewertungen. Fehlende Angaben laesst du weg. Antworte nur mit den drei Saetzen.";

const fmtDatum = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return iso || "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};

function planText(d) {
  const zeilen = [];
  const ort = [d.region, d.land].filter(Boolean).join(", ");
  if (ort) zeilen.push("Region: " + ort);
  if (d.start && d.end) zeilen.push(`Zeitraum: ${fmtDatum(d.start)} bis ${fmtDatum(d.end)}`);
  for (const t of (d.tage || [])) {
    const punkte = (t.punkte || []).filter(Boolean);
    if (punkte.length) zeilen.push(`Tag ${fmtDatum(t.datum)}: ${punkte.join(", ")}`);
  }
  const offen = (d.unverplant || []).filter(Boolean);
  if (offen.length) zeilen.push("Noch nicht eingeplant: " + offen.join(", "));
  return zeilen.join("\n");
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.AI) return json({ error: "KI-Binding fehlt – Workers-AI-Binding (Name: AI) in Cloudflare einrichten." }, 503);
    const daten = await request.json().catch(() => null);
    if (!daten) return json({ error: "Ungueltige Anfrage." }, 400);

    const text = planText(daten);
    if (!text.trim()) return json({ error: "Zu wenige Plandaten fuer eine Zusammenfassung." }, 400);

    const out = await env.AI.run(MODELL, {
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: "Reisedaten:\n" + text },
      ],
      temperature: 0.2,
      max_tokens: 220,
    });

    const zusammenfassung = String((out && (out.response ?? out.result ?? out.text)) || "").trim();
    if (!zusammenfassung) return json({ error: "Keine Antwort vom Modell." }, 502);
    return json({ zusammenfassung });
  } catch (e) {
    return json({ error: "Zusammenfassung fehlgeschlagen." }, 500);
  }
}
