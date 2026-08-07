/* ════════════════════════════════════════════════════════════════
   dice.js — rolling

   Pure and dependency-free. Every random thing in the game comes
   through here, so a seeded generator can be handed in and the whole
   world becomes reproducible: the same cave gives the same loot, the
   same road gives the same trouble.

   Supported: "2d6", "1d8+3", "4d6-1", "3d6*10", "4d6kh3" (keep highest
   three, for ability scores), "2d20kl1" (keep lowest — disadvantage),
   and a plain number.
   ════════════════════════════════════════════════════════════════ */

export const rng = () => Math.random;

/* Small, fast, seedable. Same one travel.js uses. */
export function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedFrom(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function die(sides, rnd = Math.random) {
  return 1 + Math.floor(rnd() * sides);
}

const EXPR = /^\s*(\d+)?d(\d+)\s*(?:(kh|kl)(\d+))?\s*(?:([+\-*])\s*(\d+))?\s*$/i;

/* Returns { total, dice, dropped, expr } so callers can show the roll
   as well as the result — seeing the dice is half the pleasure. */
export function rollDetail(expr, rnd = Math.random) {
  if (typeof expr === "number") return { total: expr, dice: [], dropped: [], expr: String(expr) };
  const s = String(expr).trim();
  if (/^\d+$/.test(s)) return { total: +s, dice: [], dropped: [], expr: s };

  const m = EXPR.exec(s);
  if (!m) return { total: 0, dice: [], dropped: [], expr: s, error: true };

  const n = m[1] ? +m[1] : 1;
  const sides = +m[2];
  const keepMode = m[3] ? m[3].toLowerCase() : null;
  const keepN = m[4] ? +m[4] : 0;
  const op = m[5] || null;
  const mod = m[6] ? +m[6] : 0;

  let dice = [];
  for (let i = 0; i < n; i++) dice.push(die(sides, rnd));

  let dropped = [];
  if (keepMode) {
    const order = [...dice].sort((a, b) => keepMode === "kh" ? b - a : a - b);
    const keep = order.slice(0, keepN);
    dropped = order.slice(keepN);
    dice = keep;
  }

  let total = dice.reduce((a, b) => a + b, 0);
  if (op === "+") total += mod;
  else if (op === "-") total -= mod;
  else if (op === "*") total *= mod;

  return { total, dice, dropped, expr: s };
}

export function roll(expr, rnd = Math.random) { return rollDetail(expr, rnd).total; }

/* Inclusive both ends. */
export function between(lo, hi, rnd = Math.random) {
  return lo + Math.floor(rnd() * (hi - lo + 1));
}

export function pick(arr, rnd = Math.random) {
  return arr.length ? arr[Math.floor(rnd() * arr.length)] : null;
}

/* Weighted pick. Items may carry a `w`; missing means 1. */
export function pickWeighted(arr, rnd = Math.random) {
  if (!arr.length) return null;
  let total = 0;
  for (const it of arr) total += (it.w == null ? 1 : it.w);
  let r = rnd() * total;
  for (const it of arr) {
    r -= (it.w == null ? 1 : it.w);
    if (r <= 0) return it;
  }
  return arr[arr.length - 1];
}

/* Pick n distinct entries, weighted. Falls back to repeats if the pool
   is smaller than n, because an empty slot is worse than a duplicate. */
export function pickSome(arr, n, rnd = Math.random) {
  const pool = [...arr], out = [];
  for (let i = 0; i < n; i++) {
    if (!pool.length) { const any = pickWeighted(arr, rnd); if (any) out.push(any); continue; }
    const got = pickWeighted(pool, rnd);
    out.push(got);
    pool.splice(pool.indexOf(got), 1);
  }
  return out;
}

/* d20 with advantage / disadvantage, for when combat arrives. */
export function d20(mode = "flat", rnd = Math.random) {
  const a = die(20, rnd);
  if (mode === "flat") return { total: a, dice: [a] };
  const b = die(20, rnd);
  const total = mode === "adv" ? Math.max(a, b) : Math.min(a, b);
  return { total, dice: [a, b] };
}
