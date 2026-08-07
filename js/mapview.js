/* ════════════════════════════════════════════════════════════════
   mapview.js — the survey, drawn

   Renders the same data the plotting table draws, at phone size. Pan
   and zoom state lives in this module rather than in the DOM, because
   the app rebuilds screens wholesale — so the map has to be able to be
   thrown away and redrawn without losing where you were looking.

   What's shown: everything. You're a carrier of a guild that navigates
   by a dead empire's survey, and the survey is public. What you have
   NOT done is walk it — so visited places are inked in and the rest
   are outlines, and a gate reads as a gate from across the map.
   ════════════════════════════════════════════════════════════════ */

import { esc } from "./ui.js";

export const view = { tx: 0, ty: 0, k: 1, fitted: false };
let box = { w: 320, h: 300 };

/* ── curves, matching the plotting table ──────────────────────── */
function crSegments(pts, closed) {
  const n = pts.length;
  const at = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  const out = [], last = closed ? n - 1 : n - 2;
  for (let i = 0; i <= last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    out.push({ p1, p2,
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 } });
  }
  return out;
}
function smoothPath(pts, closed) {
  if (!pts || pts.length < 2) return "";
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (const s of crSegments(pts, closed)) d += ` C${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.p2.x} ${s.p2.y}`;
  return d + (closed ? "Z" : "");
}
function sampleCurve(pts, closed, S) {
  if (!pts || pts.length < 2) return pts ? pts.slice() : [];
  S = S || 10;
  const out = [pts[0]];
  for (const s of crSegments(pts, closed)) {
    for (let i = 1; i <= S; i++) {
      const t = i / S, u = 1 - t;
      out.push({
        x: u*u*u*s.p1.x + 3*u*u*t*s.c1.x + 3*u*t*t*s.c2.x + t*t*t*s.p2.x,
        y: u*u*u*s.p1.y + 3*u*u*t*s.c1.y + 3*u*t*t*s.c2.y + t*t*t*s.p2.y });
    }
  }
  return out;
}
function polyAt(sm, frac) {
  let total = 0;
  for (let i = 1; i < sm.length; i++) total += Math.hypot(sm[i].x - sm[i-1].x, sm[i].y - sm[i-1].y);
  if (!total) return sm[0] || { x: 0, y: 0 };
  let want = total * frac, run = 0;
  for (let i = 1; i < sm.length; i++) {
    const seg = Math.hypot(sm[i].x - sm[i-1].x, sm[i].y - sm[i-1].y);
    if (run + seg >= want) {
      const t = seg ? (want - run) / seg : 0;
      return { x: sm[i-1].x + (sm[i].x - sm[i-1].x) * t, y: sm[i-1].y + (sm[i].y - sm[i-1].y) * t };
    }
    run += seg;
  }
  return sm[sm.length - 1];
}
const roadPts = (map, r) => {
  const a = map.nodes.find(n => n.id === r.from), b = map.nodes.find(n => n.id === r.to);
  if (!a || !b) return [];
  return [{ x: a.x, y: a.y }, ...((r.pts || []).map(p => ({ x: p.x, y: p.y }))), { x: b.x, y: b.y }];
};

/* ── terrain ──────────────────────────────────────────────────── */
const TERRAIN = {
  water:    { fill: "#9db6bc", stroke: "#4e737d", hachure: true },
  river:    { fill: "#8fadb4", stroke: "#4e737d", river: true },
  wood:     { fill: "#93a877", stroke: "#5e7a4e" },
  marsh:    { fill: "#a2a878", stroke: "#6e7748", dash: "5 4" },
  hills:    { fill: "#c6ae80", stroke: "#8a7346" },
  mountain: { fill: "#ad9878", stroke: "#6a583c" },
  impasse:  { fill: "none",    stroke: "#8a3520", barrier: true }
};

function riverBody(sm, w0, w1) {
  const n = sm.length; if (n < 2) return "";
  const L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = sm[Math.max(0, i-1)], b = sm[Math.min(n-1, i+1)];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const half = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
    L.push({ x: sm[i].x - dy/len*half, y: sm[i].y + dx/len*half });
    Rr.push({ x: sm[i].x + dy/len*half, y: sm[i].y - dx/len*half });
  }
  let d = `M${L[0].x} ${L[0].y}`;
  for (let i = 1; i < n; i++) d += ` L${L[i].x} ${L[i].y}`;
  for (let i = n-1; i >= 0; i--) d += ` L${Rr[i].x} ${Rr[i].y}`;
  return d + "Z";
}

/* ── marker glyphs, at radius ~9 ──────────────────────────────── */
const GLYPH = {
  city:    (f, s) => `<rect x="-9" y="-9" width="18" height="18" fill="${f}" stroke="${s}" stroke-width="1.6"/><rect x="-3.6" y="-3.6" width="7.2" height="7.2" fill="${s}"/>`,
  town:    (f, s) => `<rect x="-7.5" y="-7.5" width="15" height="15" fill="${f}" stroke="${s}" stroke-width="1.6"/>`,
  village: (f, s) => `<circle r="6.5" fill="${f}" stroke="${s}" stroke-width="1.6"/>`,
  post:    (f, s) => `<path d="M-7 7 L-7 -3 L0 -8 L7 -3 L7 7 Z" fill="${f}" stroke="${s}" stroke-width="1.6"/>`,
  stone:   (f, s) => `<path d="M-3.5 7 L-3.5 -4 Q0 -8 3.5 -4 L3.5 7 Z" fill="${f}" stroke="${s}" stroke-width="1.4"/>`,
  toll:    (f, s) => `<path d="M0 -8.5 L8.5 0 L0 8.5 L-8.5 0 Z" fill="${f}" stroke="${s}" stroke-width="1.6"/>`,
  ruin:    (f, s) => `<path d="M-8 8 L-8 -2 L-4 -2 L-4 -7 L0 -7 L0 -1 L4 -1 L4 -6 L8 -6 L8 8 Z" fill="${f}" stroke="${s}" stroke-width="1.4"/>`,
  cave:    (f, s) => `<path d="M-8 7 A8 8 0 0 1 8 7 Z" fill="${f}" stroke="${s}" stroke-width="1.6"/>`,
  wood:    (f, s) => `<path d="M0 -9 L8 6 L-8 6 Z" fill="${f}" stroke="${s}" stroke-width="1.6"/>`,
  camp:    (f, s) => `<path d="M0 -8 L7 7 L-7 7 Z" fill="none" stroke="${s}" stroke-width="2.2"/>`
};
const regionHex = (map, id) => {
  const r = (map.regions || []).find(x => x.id === id);
  return r ? r.hex : "#8a7a5c";
};

/* ── fitting ──────────────────────────────────────────────────── */
/* Fit to the PLACES, not the terrain. The sea and the impasses run far
   off past anywhere you can walk, and including them shrinks every town
   to a speck in one corner. Terrain is allowed to overflow the frame,
   which is what terrain does on a real map. */
export function bounds(map) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const eat = p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); };
  for (const n of map.nodes) eat(n);
  for (const r of (map.roads || [])) for (const p of (r.pts || [])) eat(p);
  if (x0 > x1) return { x0: -50, y0: -50, x1: 50, y1: 50 };
  /* a margin so terrain just past the last stone is still visible */
  const mx = Math.max(12, (x1 - x0) * 0.12), my = Math.max(12, (y1 - y0) * 0.12);
  return { x0: x0 - mx, y0: y0 - my, x1: x1 + mx, y1: y1 + my };
}
export function fit(map, w, h) {
  const b = bounds(map), pad = 30;
  const bw = Math.max(1, b.x1 - b.x0), bh = Math.max(1, b.y1 - b.y0);
  view.k = Math.max(0.4, Math.min(9, Math.min((w - pad*2) / bw, (h - pad*2) / bh)));
  view.tx = w/2 - (b.x0 + b.x1)/2 * view.k;
  view.ty = h/2 - (b.y0 + b.y1)/2 * view.k;
  view.fitted = true;
}
export function centreOn(pt, w, h, k) {
  if (k) view.k = k;
  view.tx = w/2 - pt.x * view.k;
  view.ty = h/2 - pt.y * view.k;
  view.fitted = true;
}

/* ══════════════════════════ DRAW ═════════════════════════════ */
export function mapSVG(map, camp, w, h) {
  box = { w, h };
  if (!view.fitted) fit(map, w, h);
  const inv = 1 / view.k;
  const visited = (camp && camp.visited) || {};
  const cleared = (camp && camp.cleared) || {};
  const here = camp ? camp.at : null;
  const j = camp ? camp.journey : null;

  /* terrain */
  let ter = "";
  for (const sh of (map.shapes || [])) {
    if (!sh.pts || sh.pts.length < 2) continue;
    const t = TERRAIN[sh.kind] || TERRAIN.wood;
    const d = smoothPath(sh.pts, sh.closed);
    const sm = sampleCurve(sh.pts, sh.closed, t.river ? 12 : 8);

    if (t.river) {
      ter += `<path d="${riverBody(sm, sh.w0 || 3, sh.w1 || 6)}" fill="${t.fill}" fill-opacity=".62" stroke="${t.stroke}" stroke-width="${0.7*inv}" stroke-opacity=".5"/>`;
    } else if (sh.closed && !t.barrier) {
      ter += `<path d="${d}" fill="${t.fill}" fill-opacity=".3" stroke="${t.stroke}" stroke-width="${1.2*inv}" stroke-opacity=".6" ${t.dash ? `stroke-dasharray="${t.dash}"` : ""}/>`;
    } else {
      ter += `<path d="${d}" fill="none" stroke="${t.stroke}" stroke-width="${(t.barrier ? 2.6 : 1.4)*inv}" stroke-opacity=".75" ${t.dash ? `stroke-dasharray="${t.dash}"` : ""}/>`;
    }
    if (t.hachure && !sh.closed) {
      const side = sh.side === -1 ? -1 : 1;
      for (let band = 1; band <= 3; band++) {
        let p = "";
        for (let i = 0; i < sm.length; i++) {
          const a = sm[Math.max(0, i-1)], b = sm[Math.min(sm.length-1, i+1)];
          const L = Math.hypot(b.x-a.x, b.y-a.y) || 1;
          p += (i ? " L" : "M") + (sm[i].x - (b.y-a.y)/L*side*band*2.2) + " " + (sm[i].y + (b.x-a.x)/L*side*band*2.2);
        }
        ter += `<path d="${p}" fill="none" stroke="${t.stroke}" stroke-width="${0.7*inv}" opacity="${0.34/band}"/>`;
      }
    }
    if (t.barrier) {
      for (let i = 1; i < sm.length; i += 3) {
        const a = sm[i-1], b = sm[i], L = Math.hypot(b.x-a.x, b.y-a.y) || 1;
        ter += `<line x1="${b.x}" y1="${b.y}" x2="${b.x - (b.y-a.y)/L*3.4}" y2="${b.y + (b.x-a.x)/L*3.4}" stroke="${t.stroke}" stroke-width="${1.1*inv}" opacity=".8"/>`;
      }
    }
  }

  /* roads */
  let rds = "";
  for (const r of map.roads) {
    const a = map.nodes.find(n => n.id === r.from), b = map.nodes.find(n => n.id === r.to);
    if (!a || !b) continue;
    const known = visited[a.id] || visited[b.id];
    const shut = a.gate || b.gate;
    const live = j && j.roadId === r.id;
    const d = smoothPath(roadPts(map, r), false);
    rds += `<path d="${d}" fill="none" stroke="${live ? "var(--lead)" : "var(--ink)"}"
      stroke-width="${(live ? 2.6 : 1.6) * inv}" stroke-linecap="round"
      opacity="${shut ? .22 : known ? .82 : .38}" ${shut ? `stroke-dasharray="${3*inv} ${3*inv}"` : ""}/>`;
    rds += `<path class="maphit" data-road="${esc(r.id)}" d="${d}" fill="none" stroke="transparent" stroke-width="${16*inv}"/>`;
  }

  /* markers */
  let nds = "";
  for (const n of map.nodes) {
    const hex = regionHex(map, n.region);
    const been = !!visited[n.id];
    const isHere = n.id === here;
    const fill = n.gate ? "var(--paper-deep)" : been ? hex : "var(--paper)";
    const stroke = n.gate ? "var(--ink-faint)" : "var(--ink)";
    const g = (GLYPH[n.kind] || GLYPH.stone)(fill, stroke);
    const unquiet = n.site && !cleared[n.id];

    nds += `<g transform="translate(${n.x} ${n.y}) scale(${inv})" opacity="${n.gate ? .55 : 1}">`;
    if (isHere) nds += `<circle r="17" fill="none" stroke="var(--lead)" stroke-width="2"/>
      <circle r="21" fill="none" stroke="var(--lead)" stroke-width="1" opacity=".45"/>`;
    nds += `<g data-node="${esc(n.id)}" style="cursor:pointer">${g}
      <circle r="15" fill="transparent"/></g>`;
    if (unquiet) nds += `<circle cx="8" cy="-8" r="3.4" fill="var(--lead)" stroke="var(--paper)" stroke-width="1.2"/>`;
    if (n.name) nds += `<text y="23" text-anchor="middle" font-size="10.5"
      font-family="var(--serif)" fill="var(--ink)" opacity="${been ? 1 : .55}"
      style="paint-order:stroke;stroke:var(--paper);stroke-width:3px">${esc(n.name)}</text>`;
    else if (n.stone) nds += `<text y="21" text-anchor="middle" font-size="9"
      font-family="var(--mono)" fill="var(--ink-faint)"
      style="paint-order:stroke;stroke:var(--paper);stroke-width:3px">${esc(n.stone)}</text>`;
    nds += `</g>`;
  }

  /* where you are, if you're between places */
  let pin = "";
  if (j) {
    const r = map.roads.find(x => x.id === j.roadId);
    if (r) {
      const sm = sampleCurve(roadPts(map, r), false, 12);
      const frac = j.total ? j.progress / j.total : 0;
      const fwd = r.from === j.fromId;
      const p = polyAt(sm, fwd ? frac : 1 - frac);
      pin = `<g transform="translate(${p.x} ${p.y}) scale(${inv})">
        <circle r="6.5" fill="var(--lead)" stroke="var(--paper)" stroke-width="2.5"/>
        <circle r="12" fill="none" stroke="var(--lead)" stroke-width="1.2" opacity=".5"/></g>`;
    }
  }

  return `<svg id="mapsvg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="touch-action:none;display:block">
    <g transform="translate(${view.tx} ${view.ty}) scale(${view.k})">
      ${ter}${rds}${nds}${pin}
    </g></svg>`;
}

/* ══════════════════════ pan & pinch ══════════════════════════ */
let pointers = new Map(), pinchStart = null, dragged = false;

export function attach(el, onTapNode) {
  if (!el) return;
  const svg = el.querySelector("#mapsvg");
  if (!svg) return;

  svg.addEventListener("pointerdown", e => {
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = { d: Math.hypot(a.x-b.x, a.y-b.y), k: view.k,
                     cx: (a.x+b.x)/2, cy: (a.y+b.y)/2, tx: view.tx, ty: view.ty };
    }
  });

  svg.addEventListener("pointermove", e => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x-b.x, a.y-b.y);
      const k = Math.max(0.4, Math.min(9, pinchStart.k * (d / pinchStart.d)));
      const r = svg.getBoundingClientRect();
      const cx = pinchStart.cx - r.left, cy = pinchStart.cy - r.top;
      const wx = (cx - pinchStart.tx) / pinchStart.k, wy = (cy - pinchStart.ty) / pinchStart.k;
      view.k = k; view.tx = cx - wx*k; view.ty = cy - wy*k;
      dragged = true;
      apply(svg);
      return;
    }
    if (pointers.size === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragged = true;
      view.tx += dx; view.ty += dy;
      apply(svg);
    }
  });

  const end = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    /* a tap, not a drag — and only then does it count as choosing a place */
    if (!dragged && pointers.size === 0) {
      const hit = e.target.closest && e.target.closest("[data-node]");
      if (hit && onTapNode) onTapNode(hit.dataset.node);
    }
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);

  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = (mx - view.tx) / view.k, wy = (my - view.ty) / view.k;
    view.k = Math.max(0.4, Math.min(9, view.k * (e.deltaY < 0 ? 1.15 : 1/1.15)));
    view.tx = mx - wx*view.k; view.ty = my - wy*view.k;
    apply(svg);
  }, { passive: false });
}

function apply(svg) {
  const g = svg.firstElementChild;
  if (g) g.setAttribute("transform", `translate(${view.tx} ${view.ty}) scale(${view.k})`);
}

export function zoomBy(f) {
  const k = Math.max(0.4, Math.min(9, view.k * f));
  const cx = box.w/2, cy = box.h/2;
  const wx = (cx - view.tx) / view.k, wy = (cy - view.ty) / view.k;
  view.k = k; view.tx = cx - wx*k; view.ty = cy - wy*k;
}
export function resetFit() { view.fitted = false; }
export { box };
