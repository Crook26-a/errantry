/* ════════════════════════════════════════════════════════════════
   roller.js — who rolls

   Every die the game needs goes through ask(). That's the whole point:
   one gate, so "I'd rather roll these myself" is a single setting
   rather than a feature bolted onto each screen.

   ask() is ASYNC even when the app is rolling, because in hand mode it
   has to wait for a human. Callers must await it. That's a real
   constraint on everything built after this — combat especially — and
   it's much cheaper to accept now than to retrofit later.
   ════════════════════════════════════════════════════════════════ */

import { rollDetail } from "./dice.js";
import { esc } from "./ui.js";

/* "app" — the app rolls and tells you.
   "hand" — the app tells you what to roll and waits. */
export const state = { mode: "app" };
export function setMode(m) { state.mode = (m === "hand") ? "hand" : "app"; }
export const byHand = () => state.mode === "hand";

/* Pull "2d6" apart so the modal can show the dice and the modifier
   separately — you roll the dice, the app owns the arithmetic. */
function parse(expr) {
  const m = /^\s*(\d+)?d(\d+)\s*$/i.exec(String(expr || "1d20"));
  if (!m) return { n: 1, sides: 20 };
  return { n: m[1] ? +m[1] : 1, sides: +m[2] };
}

/* spec: { expr, mod, label, note, adv }
     expr — dice only, e.g. "1d20", "2d6". No modifier in here.
     mod  — added by the app, shown but never typed.
     adv  — "adv" | "dis" | null, for d20s.
   resolves to { total, dice, mod, natural, byHand } */
export function ask(spec = {}) {
  const expr = spec.expr || "1d20";
  const mod = spec.mod || 0;
  const { n, sides } = parse(expr);
  const adv = spec.adv || null;

  if (!byHand()) {
    let dice, natural;
    if (adv && sides === 20) {
      const a = rollDetail(expr).total, b = rollDetail(expr).total;
      natural = adv === "adv" ? Math.max(a, b) : Math.min(a, b);
      dice = [a, b];
    } else {
      const r = rollDetail(expr);
      natural = r.total; dice = r.dice;
    }
    return Promise.resolve({ total: natural + mod, dice, mod, natural, byHand: false });
  }
  return handModal({ expr, mod, n, sides, adv, label: spec.label, note: spec.note });
}

/* Several rolls in a row without three separate modals — used by loot
   and anywhere a batch is needed. Resolves to an array. */
export async function askEach(specs) {
  const out = [];
  for (const s of specs) out.push(await ask(s));
  return out;
}

/* ── the hand-entry modal ─────────────────────────────────────── */
function handModal(o) {
  return new Promise(resolve => {
    const twin = !!(o.adv && o.sides === 20);
    const lo = o.n, hi = o.n * o.sides;
    const wrap = document.createElement("div");
    wrap.className = "rollmask";

    const draw = () => {
      const vals = [...wrap.querySelectorAll("[data-die]")].map(i => i.value.trim());
      const nums = vals.map(v => v === "" ? null : +v);
      const ok = nums.every(v => v != null && Number.isInteger(v) && v >= lo && v <= hi);
      let natural = null;
      if (ok) natural = twin ? (o.adv === "adv" ? Math.max(...nums) : Math.min(...nums)) : nums[0];
      const t = wrap.querySelector(".rolltotal");
      if (t) t.textContent = ok ? String(natural + o.mod) : "—";
      const b = wrap.querySelector("[data-take]");
      if (b) b.disabled = !ok;
      return { ok, natural, nums };
    };

    wrap.innerHTML = `
      <div class="rollcard">
        <div class="rolleyebrow">${esc(o.label || "Roll")}</div>
        <div class="rollask">${o.n}d${o.sides}${o.mod ? (o.mod > 0 ? " + " + o.mod : " − " + Math.abs(o.mod)) : ""}${
          twin ? `<span class="tag lead" style="margin-left:8px">${o.adv === "adv" ? "advantage" : "disadvantage"}</span>` : ""}</div>
        ${o.note ? `<p class="rollnote">${esc(o.note)}</p>` : ""}
        <div class="rollboxes">
          ${(twin ? [0, 1] : [0]).map(i => `<input data-die="${i}" class="big" inputmode="numeric"
            placeholder="—" maxlength="3" aria-label="Die result ${i + 1}">`).join("")}
        </div>
        <div class="rollsum"><span>Total</span><span class="rolltotal">—</span></div>
        <p class="rollnote" style="margin-top:2px">${twin ? `Roll both d20s and type each. The app takes the ${o.adv === "adv" ? "higher" : "lower"}.` :
          o.n > 1 ? `Roll ${o.n}d${o.sides} and type the sum — anything from ${lo} to ${hi}.` :
          `Type what the die showed.`}</p>
        <button class="btn primary" data-take disabled style="text-align:center">Take it</button>
        <button class="btn quiet" data-auto style="text-align:center;margin-bottom:0">Let the app roll this one</button>
      </div>`;

    wrap.addEventListener("input", e => {
      if (e.target.dataset.die != null) {
        const clean = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
        if (e.target.value !== clean) e.target.value = clean;
        draw();
      }
    });
    wrap.addEventListener("click", e => {
      if (e.target.closest("[data-take]")) {
        const { ok, natural, nums } = draw();
        if (!ok) return;
        wrap.remove();
        resolve({ total: natural + o.mod, dice: nums, mod: o.mod, natural, byHand: true });
      } else if (e.target.closest("[data-auto]")) {
        wrap.remove();
        const r = rollDetail(o.expr);
        let natural = r.total, dice = r.dice;
        if (twin) { const b = rollDetail(o.expr).total; dice = [natural, b];
                    natural = o.adv === "adv" ? Math.max(natural, b) : Math.min(natural, b); }
        resolve({ total: natural + o.mod, dice, mod: o.mod, natural, byHand: false });
      }
    });

    document.body.appendChild(wrap);
    const first = wrap.querySelector("[data-die]");
    if (first) setTimeout(() => first.focus(), 30);
    draw();
  });
}
