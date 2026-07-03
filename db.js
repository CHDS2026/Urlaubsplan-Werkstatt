import Dexie from "dexie";

export const db = new Dexie("urlaubsplaner");
db.version(1).stores({ kv: "key" });

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
