/* ════════════════════════════════════════════════════════════════
   travel.js — the road

   Pure. No DOM, no storage, no imports. Everything here is a function
   from state to state, which means it can be tested in node and that
   saving the game is just JSON.stringify.

   The unit of account is the CHARGED mile — what comes out of the bank.
   On foot a charged mile is a real mile. Riding, a coach covers a road
   for a fraction of its miles, and encounters thin out by exactly the
   same fraction, because you are on that road for less of your life.
   ════════════════════════════════════════════════════════════════ */

export const RIDE = {
  foot:  { id: "foot",  label: "On foot",   factor: 1.00 },
  slow:  { id: "slow",  label: "Carrier's cart", factor: 0.75 },
  coach: { id: "coach", label: "Coach",     factor: 0.50 },
  post:  { id: "post",  label: "Post-chaise", factor: 0.25 }
};

/* Encounters are spaced by drawing a gap, not by rolling every mile.
   A per-mile roll clusters ugly — three quiet miles then two in a row.
   A tight gap around a two-mile mean reads as authored without being
   scripted, which is the whole aesthetic. */
const GAP_MIN = 0.8, GAP_SPAN = 2.4;      // mean 2.0 charged miles
const DENSITY = { quiet: 1.6, normal: 1.0, dense: 0.65 };

/* ── deterministic RNG ────────────────────────────────────────
   Seeded per journey so closing the app mid-road can't reroll the
   road's luck. Small, fast, and good enough for dice. */
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
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const r1 = v => Math.round(v * 10) / 10;

/* ── starting out ─────────────────────────────────────────────── */
export function beginJourney(road, fromId, rideId, seedKey) {
  const ride = RIDE[rideId] || RIDE.foot;
  const total = r1(road.miles * ride.factor);
  const j = {
    roadId: road.id,
    fromId,
    toId: road.from === fromId ? road.to : road.from,
    realMiles: road.miles,
    ride: ride.id,
    factor: ride.factor,
    total,                       // charged miles from end to end
    progress: 0,                 // charged miles walked
    density: road.density || "normal",
    seed: seedFrom(seedKey + "|" + road.id + "|" + fromId),
    draws: 0,                    // how many gaps we've drawn, for a stable stream
    nextAt: 0,
    pending: null,               // an encounter waiting to be resolved
    fired: []
  };
  j.nextAt = drawGap(j, 0);
  return j;
}

function drawGap(j, from) {
  const rnd = mulberry(j.seed + j.draws * 0x9E3779B9);
  j.draws++;
  const scale = DENSITY[j.density] ?? 1;
  return r1(from + (GAP_MIN + rnd() * GAP_SPAN) * scale);
}

/* ── advancing ────────────────────────────────────────────────
   Spends up to `miles` from the bank, stopping the moment anything
   demands attention. Returns what happened; never mutates the bank
   itself, only reports what it used. */
export function advance(j, miles) {
  const out = { spent: 0, arrived: false, encounter: null, blocked: null };
  if (!j) { out.blocked = "no-journey"; return out; }
  if (j.pending) { out.encounter = j.pending; out.blocked = "encounter"; return out; }
  if (miles <= 0) { out.blocked = "no-miles"; return out; }

  let left = miles;
  let guard = 0;
  while (left > 0.0001 && guard++ < 500) {
    const toArrival = r1(j.total - j.progress);
    const toEvent = r1(j.nextAt - j.progress);

    if (toArrival <= 0.0001) { out.arrived = true; break; }

    const step = Math.min(left, toArrival, toEvent > 0 ? toEvent : toArrival);
    j.progress = r1(j.progress + step);
    out.spent = r1(out.spent + step);
    left = r1(left - step);

    if (j.progress >= j.total - 0.0001) { j.progress = j.total; out.arrived = true; break; }
    if (j.progress >= j.nextAt - 0.0001) {
      j.pending = { at: j.progress, id: null };   // content layer fills this in
      out.encounter = j.pending;
      break;
    }
  }
  return out;
}

/* Called once the content layer has picked and resolved something. */
export function clearEncounter(j, record) {
  if (!j || !j.pending) return;
  j.fired.push(record || { at: j.pending.at });
  j.pending = null;
  j.nextAt = drawGap(j, j.progress);
}

/* Turning back: you walked out, you walk home. The ground already
   covered becomes the whole of the new journey. */
export function turnBack(j) {
  if (!j) return null;
  const back = {
    ...j,
    fromId: j.toId,
    toId: j.fromId,
    total: j.progress,
    realMiles: r1(j.progress / (j.factor || 1)),
    progress: 0,
    draws: j.draws,
    pending: null,
    fired: []
  };
  back.nextAt = drawGap(back, 0);
  return back;
}

export function remaining(j) { return j ? r1(j.total - j.progress) : 0; }
export function fraction(j) { return j && j.total ? j.progress / j.total : 0; }

/* ── the graph ────────────────────────────────────────────────── */
export function roadsFrom(map, nodeId) {
  return (map.roads || []).filter(r => r.from === nodeId || r.to === nodeId);
}
export function otherEnd(road, nodeId) {
  return road.from === nodeId ? road.to : road.from;
}
export function nodeById(map, id) {
  return (map.nodes || []).find(n => n.id === id) || null;
}

/* Shortest path by road-miles — used for "how far is it, really?"
   and for pricing a coach to somewhere several legs away. */
export function shortestPath(map, fromId, toId) {
  const dist = {}, prev = {};
  for (const n of map.nodes) dist[n.id] = Infinity;
  if (!(fromId in dist) || !(toId in dist)) return null;
  dist[fromId] = 0;
  const seen = new Set();
  while (true) {
    let best = null, bd = Infinity;
    for (const n of map.nodes) if (!seen.has(n.id) && dist[n.id] < bd) { bd = dist[n.id]; best = n.id; }
    if (best === null) break;
    if (best === toId) break;
    seen.add(best);
    for (const r of roadsFrom(map, best)) {
      const o = otherEnd(r, best);
      if (dist[best] + r.miles < dist[o]) { dist[o] = dist[best] + r.miles; prev[o] = { road: r, from: best }; }
    }
  }
  if (!isFinite(dist[toId])) return null;
  const legs = [];
  let cur = toId;
  while (cur !== fromId) { const p = prev[cur]; if (!p) return null; legs.unshift(p); cur = p.from; }
  return { miles: r1(dist[toId]), legs };
}
