/* ════════════════════════════════════════════════════════════════
   main.js — boot, routing, and every mutation

   The only file that writes to state. Screens render, travel.js
   calculates, content.js supplies the world, this decides.
   ════════════════════════════════════════════════════════════════ */

import * as store from "./store.js";
import * as S from "./state.js";
import { $, bindDelegate, on, toast, confirmAsk, esc } from "./ui.js";
import { bankScreen, mapScreen, bookScreen, settingsScreen, tabs } from "./screens.js";
import { nodeById } from "./travel.js";
import { SURVEY, startNode, mapFor, reconcile, placeName } from "./content.js";
import * as CU from "./charui.js";
import * as MV from "./mapview.js";
import * as RL from "./roller.js";
import * as CH from "./character.js";
import * as R from "./rules.js";
import { mulberry } from "./dice.js";

const r1 = v => Math.round(v * 10) / 10;

let acc = null;
let camp = null;
let tab = "bank";
let draft = { value: "", mode: "miles" };
let pasteOpen = false;
let draftPC = null;      // creation in progress

const map = () => mapFor(camp);

/* ── render ───────────────────────────────────────────────────
   Screens are rebuilt wholesale, which is fine at this size — but a
   rebuild must be INVISIBLE. Two things make it visible if you let
   them: the entrance animation replaying, and the scroll position
   snapping to the top. Both are handled by asking whether this is the
   same screen as last time. Tapping a skill halfway down a long list
   should change nothing but that skill. */
let lastView = null;

function viewKey() {
  if (draftPC) return "create:" + draftPC.step + ":" + (draftPC.method || "") + ":" + (draftPC.pool.length ? "placed" : "pick");
  if (tab === "map") return "map:" + (camp && camp.journey ? (camp.journey.pending ? "event" : "road") : "town");
  return "tab:" + tab;
}

function render() {
  const m = map();
  const key = viewKey();
  const same = key === lastView;
  const y = same ? window.scrollY : 0;

  let html;
  if (draftPC) {
    html = `<header class="top"><h1>Errantry</h1><span class="sub">signing on</span></header>` +
           CU.createScreen(draftPC);
  } else {
    const body =
      tab === "bank" ? bankScreen(acc, camp, draft) :
      tab === "map"  ? mapScreen(acc, camp, m) :
      tab === "book" ? (camp && camp.pc ? CU.sheetScreen(camp.pc) : bookScreen(acc, camp)) :
                       settingsScreen(acc, camp, m);
    const where = camp && camp.at ? placeName(nodeById(m, camp.at))
                : camp && camp.journey ? "on the road"
                : camp ? camp.name : "";
    html = `<header class="top"><h1>Errantry</h1><span class="sub">${esc(where || "")}</span></header>` +
           body + tabs(tab);
  }

  $("#app").innerHTML = html;
  if (!same) {
    const scr = $("#app").querySelector(".screen");
    if (scr) scr.classList.add("fresh");
  }
  /* restore before paint, so nothing is ever seen at the wrong offset */
  window.scrollTo(0, same ? y : 0);
  lastView = key;

  if (tab === "set" && pasteOpen) {
    const box = document.getElementById("pasteBox");
    if (box) box.hidden = false;
  }
  /* the map is redrawn from scratch each render, so its gestures have
     to be re-attached to the new element */
  if (tab === "map" && !draftPC) {
    MV.attach($("#app").querySelector(".mapwrap"), id => {
      camp.focus = (camp.focus === id) ? null : id;
      render();
    });
  }
}

function save() {
  S.saveAccount(acc);
  if (camp) S.saveCampaign(camp);
}

/* Creating a carrier is one action, not a chain of prompts — a warrant
   is signed at a desk, and the desk is at the seat of the survey. */
async function signOn(pc, mode) {
  if (camp) await S.saveCampaignNow(camp);
  camp = S.blankCampaign(pc.name, mode);
  camp.pc = pc;
  MV.resetFit();
  const start = startNode(SURVEY);
  camp.at = start ? start.id : null;
  if (start) camp.visited = { [start.id]: true };
  S.addLog(camp, `Took up the warrant at ${placeName(start)}.`);
  acc.campaigns.push({ id: camp.id, name: camp.name, deathMode: camp.deathMode, created: camp.created });
  acc.activeCampaign = camp.id;
  await S.saveCampaignNow(camp);
  await S.saveAccountNow(acc);
  tab = "map";
  render();
}

/* ── actions ──────────────────────────────────────────────────── */
on("tab", d => { tab = d.t; render(); });

on("pad", d => {
  const k = d.k;
  if (k === "del") draft.value = draft.value.slice(0, -1);
  else if (k === ".") { if (draft.mode === "miles" && !draft.value.includes(".")) draft.value += draft.value ? "." : "0."; }
  else if (draft.value.length < 7) draft.value += k;
  render();
});
on("mode", () => { draft.mode = draft.mode === "miles" ? "steps" : "miles"; draft.value = ""; render(); });

on("commit", () => {
  const raw = parseFloat(draft.value);
  if (!isFinite(raw) || raw <= 0) return;
  const miles = draft.mode === "steps" ? raw / acc.stepsPerMile : raw;
  const res = S.logMiles(acc, camp, miles, draft.mode);
  draft.value = "";
  save(); render();

  if (res.unlocked.length) toast(`${res.unlocked[0].name} — ${res.unlocked[0].note}`, 4200);
  else if (res.overflow > 0.05) toast(`${r1(res.banked)} banked. ${r1(res.overflow)} over the cap — it still counts toward conditioning.`, 4000);
  else toast(`${r1(res.banked)} miles in the bank.`);
});

on("undo", async d => {
  if (!await confirmAsk("Remove that entry? It comes off your lifetime total too.", "Remove")) return;
  S.undoEntry(acc, camp, d.id);
  save(); render();
});

/* travel */
on("depart", d => {
  const road = map().roads.find(r => r.id === d.road);
  if (!road) return;
  const dest = nodeById(map(), road.from === camp.at ? road.to : road.from);
  if (dest && dest.gate) { toast(dest.gate.note || "The way is shut.", 4500); return; }
  if (camp.bank <= 0) { toast("Nothing in the bank. Go walk."); return; }
  camp.focus = null;
  S.setOut(camp, road, "foot");
  S.addLog(camp, `Set out for ${placeName(dest)} — ${road.miles} miles.`);
  save(); render();
});

on("walk", d => {
  const want = parseFloat(d.n) || 0;
  const res = S.walk(camp, want);

  if (res.blocked === "bank-empty") { toast("The bank is empty."); render(); return; }

  if (res.arrived) {
    camp.visited = camp.visited || {};
    camp.visited[camp.at] = true;
    camp.focus = null;
    const here = nodeById(map(), camp.at);
    S.addLog(camp, `Reached ${placeName(here)}.`);
    toast(`You arrive at ${placeName(here)}.`);
  } else if (res.encounter) {
    S.addLog(camp, `Something on the road at mile ${r1(res.encounter.at)}.`);
  } else if (res.spent > 0) {
    toast(`${r1(res.spent)} miles walked.`);
  }
  save(); render();
});

on("resolve", () => { S.resolveEncounter(camp, { id: "stub" }); save(); render(); });

on("rollmode", x => {
  acc.rollMode = x.m === "hand" ? "hand" : "app";
  RL.setMode(acc.rollMode);
  save(); render();
  toast(acc.rollMode === "hand" ? "The app will ask what your dice showed." : "The app will roll and show you the dice.");
});

/* The tray — any roll you want, through the same gate as everything else. */
on("tray", async x => {
  const r = await RL.ask({ expr: x.x, adv: x.adv || null, label: "The tray" });
  const out = document.getElementById("trayOut");
  if (!out) return;
  const line = document.createElement("div");
  line.className = "trayout";
  line.innerHTML = `<b>${r.total}</b> &nbsp;${esc(x.x)}${x.adv ? " " + x.adv : ""} &nbsp;<span style="color:var(--ink-faint)">${r.dice.join(" ")}${r.byHand ? " · by hand" : ""}</span>`;
  out.prepend(line);
  while (out.children.length > 6) out.lastChild.remove();
});

on("mzoom", x => { MV.zoomBy(parseFloat(x.f) || 1); render(); });
on("mfit", () => { MV.resetFit(); render(); });

on("turnback", async () => {
  if (!await confirmAsk("Turn back? The ground you covered still has to be walked home.", "Turn back")) return;
  S.turnAround(camp);
  S.addLog(camp, "Turned back.");
  save(); render();
});

/* campaigns */
on("newcamp", () => {
  draftPC = CU.blankDraft();
  /* if you've said you roll your own, start there rather than making
     you decline the app's offer every time */
  if (acc.rollMode === "hand") draftPC.method = "own";
  render();
});

/* ── signing on ────────────────────────────────────────────────
   Every action reads and writes `draftPC` and re-renders. Going back
   never destroys a choice, so wandering the flow is free. */
const d = () => draftPC;

on("cnext", () => {
  const steps = CU.stepsFor(d());
  const i = steps.indexOf(d().step);
  if (i < steps.length - 1) { d().step = steps[i + 1]; render(); }
});
/* Back should undo the most recent decision, not leap over it. On the
   abilities step that means peeling off the scores before the method,
   and the method before leaving the step at all. */
on("cback", () => {
  const dr = d();
  if (dr.step === "abilities") {
    if (dr.pool.length) {                      // placed or placing → back to entry/chooser
      if (dr.method === "own" || dr.method === "real") { dr.pool = []; dr.assign = {}; dr.holding = null; dr.bonus = {}; render(); return; }
      dr.method = null; dr.pool = []; dr.assign = {}; dr.holding = null; dr.bonus = {}; render(); return;
    }
    if (dr.method) { dr.method = null; render(); return; }   // entry screen → chooser
  }
  const steps = CU.stepsFor(dr);
  const i = steps.indexOf(dr.step);
  if (i > 0) { dr.step = steps[i - 1]; render(); }
  else { draftPC = null; render(); }
});
on("canc", x => {
  d().ancestry = x.id;
  d().choice = {};
  d().bonus = {};
  render();
});
on("ccls", x => {
  if (d().klass !== x.id) { d().skills = []; d().expertise = []; d().cantrips = []; d().spells = []; d().subclass = null; }
  d().klass = x.id;
  const cls = R.classById(x.id);
  if (cls.subclassAt === 1 && cls.subclasses.length === 1) d().subclass = cls.subclasses[0].id;
  render();
});
on("csub", x => { d().subclass = x.id; render(); });
on("cchoice", x => { d().choice[x.k] = x.id; render(); });

on("cmethod", x => {
  d().method = x.m || null;
  if (!x.m) { d().pool = []; d().assign = {}; d().holding = null; d().bonus = {}; render(); return; }
  d().assign = {}; d().holding = null; d().bonus = {};
  if (x.m === "array") d().pool = [...CH.STANDARD_ARRAY];
  else if (x.m === "roll") { const a = CH.rollArray(); d().pool = a.scores; d().rolls = a.rolls; }
  else if (x.m === "own") { /* six boxes; nothing to pre-roll */ }
  else d().pool = [];
  render();
});
on("cown", () => {
  const vals = (d().own || []).map(v => +v);
  if (vals.length !== 6 || vals.some(n => !Number.isInteger(n) || n < 1 || n > 20)) {
    toast("Six whole numbers, 1 to 20."); return;
  }
  d().pool = vals;
  d().assign = {}; d().holding = null;
  render();
});
on("cownagain", () => { d().pool = []; d().assign = {}; d().holding = null; d().bonus = {}; render(); });
on("crealagain", () => { d().pool = []; d().assign = {}; d().holding = null; d().bonus = {}; render(); });

/* Empty every slot without losing the scores themselves. */
on("cclear", () => {
  const fixedStr = d().method === "real";
  d().assign = fixedStr ? { str: 0 } : {};
  d().holding = null;
  d().bonus = {};
  render();
});

/* Straight down the sheet in the order they came off the table. */
on("corder", () => {
  const order = ["str", "dex", "con", "int", "wis", "cha"];
  const fixedStr = d().method === "real";
  d().assign = fixedStr ? { str: 0 } : {};
  let next = fixedStr ? 1 : 0;
  for (const ab of order) {
    if (fixedStr && ab === "str") continue;
    if (next < d().pool.length) d().assign[ab] = next++;
  }
  d().holding = null;
  render();
});

on("creroll", () => {
  const a = CH.rollArray();
  d().pool = a.scores; d().rolls = a.rolls; d().assign = {}; d().holding = null;
  render();
});
on("creal", () => {
  const ht = parseFloat((document.getElementById("cHt") || {}).value);
  const lift = parseFloat((document.getElementById("cLift") || {}).value);
  if (!isFinite(lift) || lift <= 0) { toast("How much can you lift? An honest guess is fine."); return; }
  d().real = { heightIn: isFinite(ht) ? ht : "", liftLb: lift };
  const built = CH.realPersonArray(lift);
  d().pool = [built.str, ...built.others];
  d().assign = { str: 0 };                     // Strength is fixed by your own measure
  d().holding = null;
  if (isFinite(ht) && ht > 30 && ht < 96) { acc.heightIn = ht; acc.stepsPerMile = S.stepsPerMileFor(ht); save(); }
  render();
  toast(`Lift ${lift} lb — Strength ${built.str}. Stride set from your height.`, 4200);
});
on("chold", x => { d().holding = +x.i; render(); });
on("cplace", x => {
  const ab = x.ab;
  if (d().assign[ab] != null) { d().assign[ab] = null; d().holding = null; render(); return; }
  if (d().holding == null) return;
  d().assign[ab] = d().holding;
  d().holding = null;
  render();
});
on("cbonus", x => {
  const anc = R.ancestryById(d().ancestry);
  if (!anc.extraASI) return;
  const used = Object.values(d().bonus).reduce((s, v) => s + v, 0);
  if (d().bonus[x.ab]) delete d().bonus[x.ab];
  else if (used < anc.extraASI.n) d().bonus[x.ab] = 1;
  render();
});
on("ctrade", x => { d().trade = x.id; d().skills = []; d().expertise = []; render(); });

on("cskill", x => {
  const i = d().skills.indexOf(x.id);
  if (i >= 0) { d().skills.splice(i, 1); d().expertise = d().expertise.filter(e => e !== x.id); }
  else d().skills.push(x.id);
  render();
});
on("cexp", x => {
  const i = d().expertise.indexOf(x.id);
  if (i >= 0) d().expertise.splice(i, 1); else d().expertise.push(x.id);
  render();
});
on("ccant", x => {
  const i = d().cantrips.indexOf(x.id);
  if (i >= 0) d().cantrips.splice(i, 1); else d().cantrips.push(x.id);
  render();
});
on("cspell", x => {
  const i = d().spells.indexOf(x.id);
  if (i >= 0) d().spells.splice(i, 1); else d().spells.push(x.id);
  render();
});
on("cdeath", x => { d().deathMode = x.id; render(); });

on("cdone", async () => {
  const pc = CU.previewCharacter(d());
  const mode = d().deathMode;
  draftPC = null;
  await signOn(pc, mode);
  toast(`${pc.name} takes the warrant.`, 3500);
});

on("switch", async d => {
  if (camp) await S.saveCampaignNow(camp);
  const next = await S.loadCampaign(d.id);
  if (!next) { toast("That campaign is missing."); return; }
  camp = next;
  acc.activeCampaign = camp.id;
  const msg = reconcile(camp, mapFor(camp));
  await S.saveAccountNow(acc);
  await S.saveCampaignNow(camp);
  render();
  toast(msg || `Now carrying for ${camp.name}.`);
});

on("wipe", async () => {
  if (!camp) return;
  if (!await confirmAsk(`Erase ${camp.name}? Your walked miles and conditioning are kept — only the character goes.`, "Erase")) return;
  await S.deleteCampaign(camp.id);
  acc.campaigns = acc.campaigns.filter(c => c.id !== camp.id);
  acc.activeCampaign = acc.campaigns.length ? acc.campaigns[0].id : null;
  camp = acc.activeCampaign ? await S.loadCampaign(acc.activeCampaign) : null;
  if (camp) reconcile(camp, mapFor(camp));
  await S.saveAccountNow(acc);
  render();
});

/* survey override — for trying a map before it ships */
on("showpaste", () => { pasteOpen = !pasteOpen; render(); });

on("loadmap", () => {
  const box = document.getElementById("mapPaste");
  if (!box || !box.value.trim()) { toast("Paste the survey JSON first."); return; }
  let m;
  try { m = JSON.parse(box.value); }
  catch (e) { toast("That isn't valid JSON."); return; }
  if (!m || !Array.isArray(m.nodes) || !Array.isArray(m.roads) || !m.nodes.length) {
    toast("No places and roads in that survey."); return;
  }
  if (!camp) { toast("Sign on as a carrier first."); return; }
  camp.mapOverride = m;
  reconcile(camp, m);
  pasteOpen = false;
  save(); tab = "map"; render();
  toast(`${m.nodes.length} places, ${m.roads.length} roads.`);
});

on("dropoverride", async () => {
  if (!await confirmAsk("Go back to the survey that ships with the app?", "Go back")) return;
  delete camp.mapOverride;
  const msg = reconcile(camp, SURVEY);
  save(); render();
  toast(msg || "Back on the shipped survey.");
});

on("savestride", () => {
  const ht = parseFloat((document.getElementById("htIn") || {}).value);
  const spm = parseInt((document.getElementById("spm") || {}).value, 10);
  if (isFinite(ht) && ht > 30 && ht < 96) {
    acc.heightIn = ht;
    acc.stepsPerMile = S.stepsPerMileFor(ht);
  } else if (isFinite(spm) && spm > 500 && spm < 6000) {
    acc.stepsPerMile = spm;
  } else { toast("Give a height in inches, or a step count."); return; }
  save(); render();
  toast(`${acc.stepsPerMile} steps to the mile.`);
});

on("export", () => {
  const bundle = { account: acc, campaign: camp, exported: new Date().toISOString() };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }));
  a.download = "errantry-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

/* Update the running total and the Take-these button without rebuilding
   the screen, which would blur the box you're typing in. */
function ownTotals() {
  if (!draftPC) return;
  const vals = draftPC.own || [];
  const nums = vals.map(v => +v);
  const ready = vals.length === 6 && vals.every(v => {
    const n = +v; return v !== "" && Number.isInteger(n) && n >= 1 && n <= 20;
  });
  const sum = nums.reduce((t, n) => t + (n || 0), 0);
  const modSum = nums.reduce((t, n) => t + (n ? Math.floor((n - 10) / 2) : 0), 0);
  const stats = document.querySelectorAll(".screen .stat .v");
  if (stats[0]) stats[0].textContent = sum || "—";
  if (stats[1]) stats[1].textContent = ready ? (modSum >= 0 ? "+" : "") + modSum : "—";
  const btn = document.querySelector('[data-act="cown"]');
  if (btn) btn.disabled = !ready;
}

/* ── boot ─────────────────────────────────────────────────────── */
async function boot() {
  window.__storeName = store.backendName();
  acc = await S.loadAccount();
  RL.setMode(acc.rollMode || "app");

  if (acc.activeCampaign) camp = await S.loadCampaign(acc.activeCampaign);
  if (!camp && acc.campaigns.length) {
    camp = await S.loadCampaign(acc.campaigns[0].id);
    if (camp) acc.activeCampaign = camp.id;
  }

  let note = null;
  if (camp) {
    /* an older save may still carry the map inside it — lift it out so
       the campaign starts receiving updates from now on */
    if (camp.map && !camp.mapOverride) delete camp.map;
    if (!camp.visited) { camp.visited = {}; if (camp.at) camp.visited[camp.at] = true; }
    note = reconcile(camp, mapFor(camp));
    if (note) await S.saveCampaignNow(camp);
  }

  bindDelegate($("#app"));
  $("#app").addEventListener("input", e => {
    if (e.target.id === "entryVal") draft.value = e.target.value.replace(/[^0-9.]/g, "");
    if (e.target.id === "cName" && draftPC) draftPC.name = e.target.value;
    if (e.target.id === "cHt" && draftPC) draftPC.real.heightIn = e.target.value;
    if (e.target.id === "cLift" && draftPC) draftPC.real.liftLb = e.target.value;
    if (e.target.dataset && e.target.dataset.own != null && draftPC) {
      const i = +e.target.dataset.own;
      const clean = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
      if (e.target.value !== clean) e.target.value = clean;
      draftPC.own[i] = clean;
      ownTotals();          /* patch the numbers in place; never re-render mid-typing */
    }
  });

  if (camp) tab = "map";
  render();

  if (note) toast(note, 5000);
  else if (!store.isDurable()) toast("Storage is blocked here — nothing will be kept between visits.", 5000);

  addEventListener("pagehide", () => { S.saveAccountNow(acc); if (camp) S.saveCampaignNow(camp); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { S.saveAccountNow(acc); if (camp) S.saveCampaignNow(camp); }
  });

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
      .then(reg => { reg.update(); setInterval(() => { try { reg.update(); } catch (e) {} }, 30 * 60 * 1000); })
      .catch(() => {});
  }
}
boot();
