/* ════════════════════════════════════════════════════════════════
   ui.js — the smallest useful view layer

   Screens are functions that return an HTML string. A screen re-renders
   wholesale; there is no diffing and no framework, because at this size
   the render is a fraction of a millisecond and the absence of a build
   step is worth more than the absence of a re-render.
   ════════════════════════════════════════════════════════════════ */

export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];

export const esc = s => String(s == null ? "" : s)
  .replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const r1 = v => Math.round(v * 10) / 10;
export const mi = v => (Math.round(v * 10) / 10).toString();

/* One delegated listener for the whole app. Screens just mark up
   [data-act]; main.js routes it. */
const handlers = new Map();
export function on(act, fn) { handlers.set(act, fn); }
export function bindDelegate(root) {
  root.addEventListener("click", e => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const fn = handlers.get(el.dataset.act);
    if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
  });
}

let toastT = null;
export function toast(msg, ms = 2400) {
  const old = $(".toast"); if (old) old.remove();
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = msg;
  document.body.appendChild(d);
  clearTimeout(toastT);
  toastT = setTimeout(() => d.remove(), ms);
}

export function confirmAsk(msg, yesLabel = "Yes") {
  return new Promise(resolve => {
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;inset:0;z-index:60;background:rgba(40,30,14,.5);display:grid;place-items:center;padding:20px";
    wrap.innerHTML = `<div class="card" style="max-width:340px;width:100%;margin:0">
      <p style="margin-bottom:14px">${esc(msg)}</p>
      <div class="row">
        <button class="btn quiet" data-no style="text-align:center;margin:0">Cancel</button>
        <button class="btn primary" data-yes style="text-align:center;margin:0">${esc(yesLabel)}</button>
      </div></div>`;
    wrap.addEventListener("click", e => {
      if (e.target.closest("[data-yes]")) { wrap.remove(); resolve(true); }
      else if (e.target.closest("[data-no]") || e.target === wrap) { wrap.remove(); resolve(false); }
    });
    document.body.appendChild(wrap);
  });
}

export const ICON = {
  bank: `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 20 L11 4"/><path d="M17 20 L13 4"/><path d="M9.4 12h5.2"/></svg>`,
  map: `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7z"/><path d="M9 4v13M15 7v13"/></svg>`,
  book: `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/></svg>`,
  gear: `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>`
};

export function gauge(frac, full) {
  const pct = Math.max(0, Math.min(1, frac)) * 100;
  return `<div class="gauge"><i class="${full ? "full" : ""}" style="width:${pct.toFixed(1)}%"></i></div>`;
}

export function emptyState(big, small) {
  return `<div class="empty"><div class="big">${esc(big)}</div><div>${esc(small)}</div></div>`;
}
