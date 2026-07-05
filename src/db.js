import Dexie from "dexie";

export const db = new Dexie("urlaubsplaner");
// v1: nur der App-Zustand (Reisen)
db.version(1).stores({ kv: "key" });
// v2: zusätzlich Dokumente – Metadaten und Blobs getrennt, damit Listen leicht bleiben
db.version(2).stores({
  kv: "key",
  docmeta: "id, tripId, [tripId+scope]",
  docblob: "id",
});

const KEY = "state";

export async function loadState() {
  try {
    const rec = await db.kv.get(KEY);
    if (rec && rec.value && Array.isArray(rec.value.trips)) return rec.value;
  } catch (e) { console.error("Laden fehlgeschlagen:", e); }
  return { trips: [] };
}

export async function saveState(state) {
  try {
    await db.kv.put({ key: KEY, value: state });
  } catch (e) { console.error("Speichern fehlgeschlagen:", e); }
}

/* ---------- Dokumente ---------- */

const docId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "doc-" + Date.now() + "-" + Math.round(Math.random() * 1e6);

// Große Bilder verkleinern (QR-Codes/kleine Bilder bleiben unangetastet); bei Fehler Original behalten
async function maybeCompress(file) {
  try {
    if (!file.type || !file.type.startsWith("image/")) return file;
    if (file.size < 1024 * 1024) return file; // < 1 MB: unverändert
    if (typeof createImageBitmap !== "function") return file;
    const bmp = await createImageBitmap(file);
    const maxDim = 1800;
    const longest = Math.max(bmp.width, bmp.height);
    if (longest <= maxDim) { if (bmp.close) bmp.close(); return file; }
    const scale = maxDim / longest;
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (blob && blob.size < file.size) {
      const base = (file.name || "bild").replace(/\.(png|jpg|jpeg|webp|heic|heif|gif|bmp)$/i, "");
      return new File([blob], base + ".jpg", { type: "image/jpeg" });
    }
    return file;
  } catch (e) { return file; }
}

export async function addDoc(tripId, scope, file) {
  const prepared = await maybeCompress(file);
  const id = docId();
  const meta = { id, tripId, scope, name: file.name || "Datei", type: prepared.type || file.type || "", size: prepared.size || 0, created: Date.now() };
  await db.docmeta.put(meta);
  await db.docblob.put({ id, blob: prepared });
  return id;
}

export async function listDocsByScope(tripId, scope) {
  try { return await db.docmeta.where("[tripId+scope]").equals([tripId, scope]).sortBy("created"); }
  catch (e) { return []; }
}
export async function listDocsByTrip(tripId) {
  try { return await db.docmeta.where("tripId").equals(tripId).sortBy("created"); }
  catch (e) { return []; }
}
export async function getBlob(id) {
  try { const r = await db.docblob.get(id); return r ? r.blob : null; }
  catch (e) { return null; }
}
export async function deleteDoc(id) {
  try { await db.docmeta.delete(id); await db.docblob.delete(id); } catch (e) {}
}
export async function deleteDocsByScope(tripId, scope) {
  try {
    const rows = await db.docmeta.where("[tripId+scope]").equals([tripId, scope]).toArray();
    await Promise.all(rows.map((r) => deleteDoc(r.id)));
  } catch (e) {}
}
export async function deleteDocsByTrip(tripId) {
  try {
    const rows = await db.docmeta.where("tripId").equals(tripId).toArray();
    await Promise.all(rows.map((r) => deleteDoc(r.id)));
  } catch (e) {}
}
