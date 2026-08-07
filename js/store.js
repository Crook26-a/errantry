/* ════════════════════════════════════════════════════════════════
   store.js — persistence

   One job: put a JS object somewhere durable and get it back.
   Three backends, tried in order, so the same build runs whether it's
   served from GitHub Pages, previewed in a sandbox, or opened in a
   private window with storage disabled.
   ════════════════════════════════════════════════════════════════ */

const MEM = new Map();
let backend = null;

function detect() {
  if (backend) return backend;
  try {
    const k = "__errantry_probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    backend = "local";
  } catch (e) {
    backend = (typeof window !== "undefined" && window.storage) ? "host" : "memory";
  }
  return backend;
}

export function backendName() { return detect(); }
export function isDurable() { return detect() !== "memory"; }

export async function get(key) {
  const b = detect();
  try {
    if (b === "local") {
      const raw = localStorage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    }
    if (b === "host") {
      const r = await window.storage.get(key);
      return r && r.value != null ? JSON.parse(r.value) : null;
    }
    return MEM.has(key) ? JSON.parse(MEM.get(key)) : null;
  } catch (e) {
    return null;                      // absent, or corrupt — treat the same
  }
}

export async function set(key, value) {
  const b = detect(), raw = JSON.stringify(value);
  try {
    if (b === "local") localStorage.setItem(key, raw);
    else if (b === "host") await window.storage.set(key, raw);
    else MEM.set(key, raw);
    return true;
  } catch (e) {
    // quota blown or storage yanked mid-session: keep the session alive in memory
    MEM.set(key, raw);
    return false;
  }
}

export async function del(key) {
  const b = detect();
  try {
    if (b === "local") localStorage.removeItem(key);
    else if (b === "host") await window.storage.delete(key);
    MEM.delete(key);
  } catch (e) { /* nothing to undo */ }
}

/* ── debounced writer ──────────────────────────────────────────
   Screens call save() freely; this collapses a burst into one write. */
const timers = new Map();
export function saveSoon(key, getValue, ms = 400) {
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    set(key, getValue());
  }, ms));
}
export async function flushSaves() {
  const pending = [...timers.keys()];
  for (const k of pending) clearTimeout(timers.get(k));
  timers.clear();
  return pending;
}
