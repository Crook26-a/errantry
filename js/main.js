/* ════════════════════════════════════════════════════════════════
   main.js — boot, routing, and every mutation

   The only file that writes to state. Screens render, travel.js
   calculates, this decides.
   ════════════════════════════════════════════════════════════════ */

import * as store from "./store.js";
import * as S from "./state.js";
import { $, bindDelegate, on, toast, confirmAsk, esc } from "./ui.js";
import { bankScreen, mapScreen, bookScreen, settingsScreen, tabs } from "./screens.js";
import { roadsFrom, nodeById } from "./travel.js";

const r1 = v => Math.round(v * 10) / 10;

let acc = null;
let camp = null;
let tab = "bank";
let draft = { value: "", mode: "miles" };

/* ── render ───────────────────────────────────────────────────── */
function render() {
  const app = $("#app");
  const body =
    tab === "bank" ? bankScreen(acc, camp, draft) :
    tab === "map" ? mapScreen(acc, camp) :
    tab === "book" ? bookScreen(acc, camp) :
    settingsScreen(acc, camp);

  const title = camp ? camp.name : "Errantry";
  const sub = camp && camp.at && camp.map ? (nodeById(camp.map, camp.at)?.name || "") :
              camp && camp.journey ? "on the road" : "";

  app.innerHTML =
    `<header class="top"><h1>Errantry</h1><span class="sub">${esc(sub || title)}</span></header>` +
    body + tabs(tab);
}

function save() {
  S.saveAccount(acc);
  if (camp) S.saveCampaign(camp);
}

/* ── actions ──────────────────────────────────────────────────── */
on("tab", d => { tab = d.t; render(); });

/* numeric pad */
on("pad", d => {
  const k = d.k;
  if (k === "del") draft.value = draft.value.slice(0, -1);
  else if (k === "." ) { if (draft.mode === "miles" && !draft.value.includes(".")) draft.value += draft.value ? "." : "0."; }
  else if (draft.value.length < 7) draft.value += k;
  render();
});
on("mode", () => { draft.mode = draft.mode === "miles" ? "steps" : "miles"; draft.value = ""; render(); });

on("commit", async () => {
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
  const road = camp.map.roads.find(r => r.id === d.road);
  if (!road) return;
  if (camp.bank <= 0) { toast("Nothing in the bank. Go walk."); return; }
  S.setOut(camp, road, "foot");
  const dest = nodeById(camp.map, camp.journey.toId);
  S.addLog(camp, `Set out for ${dest ? dest.name : "the next stone"} — ${road.miles} miles.`);
  save(); render();
});

on("walk", d => {
  const want = parseFloat(d.n) || 0;
  const before = camp.journey ? camp.journey.toId : null;
  const res = S.walk(camp, want);

  if (res.blocked === "bank-empty") { toast("The bank is empty."); return; }

  if (res.arrived) {
    const here = nodeById(camp.map, camp.at);
    S.addLog(camp, `Reached ${here ? here.name : "the next stone"}.`);
    toast(`You arrive at ${here ? here.name : "the stone"}.`);
  } else if (res.encounter) {
    S.addLog(camp, `Something on the road at mile ${r1(res.encounter.at)}.`);
  } else if (res.spent > 0) {
    toast(`${r1(res.spent)} miles walked.`);
  }
  save(); render();
});

on("resolve", () => {
  S.resolveEncounter(camp, { id: "stub" });
  save(); render();
});

on("turnback", async () => {
  if (!await confirmAsk("Turn back? The ground you covered still has to be walked home.", "Turn back")) return;
  S.turnAround(camp);
  S.addLog(camp, "Turned back.");
  save(); render();
});

/* settings */
on("loadmap", () => {
  const box = document.getElementById("mapPaste");
  if (!box || !box.value.trim()) { toast("Paste the survey JSON first."); return; }
  let m;
  try { m = JSON.parse(box.value); }
  catch (e) { toast("That isn't valid JSON."); return; }
  if (!m || !Array.isArray(m.nodes) || !Array.isArray(m.roads) || !m.nodes.length) {
    toast("No places and roads in that survey."); return;
  }
  if (!camp) { toast("Start a campaign first."); return; }
  camp.map = m;
  if (!camp.at || !nodeById(m, camp.at)) {
    const start = m.nodes.find(n => n.seat) || m.nodes.find(n => n.kind === "city") || m.nodes[0];
    camp.at = start.id;
    camp.journey = null;
    S.addLog(camp, `Took up the warrant at ${start.name || "the first stone"}.`);
  }
  save(); tab = "map"; render();
  toast(`${m.nodes.length} places, ${m.roads.length} roads.`);
});

on("newcamp", async () => {
  const name = prompt("Name this carrier:", "A carrier");
  if (name === null) return;
  const mode = prompt("Warrant — unbonded (death ends it), bonded (walk back), or insured (pay coin)?", "bonded");
  if (mode === null) return;
  const m = ["unbonded", "bonded", "insured"].includes((mode || "").trim().toLowerCase())
    ? mode.trim().toLowerCase() : "bonded";

  if (camp) await S.saveCampaignNow(camp);
  camp = S.blankCampaign(name.trim() || "A carrier", m);
  acc.campaigns.push({ id: camp.id, name: camp.name, deathMode: camp.deathMode, created: camp.created });
  acc.activeCampaign = camp.id;
  await S.saveCampaignNow(camp);
  await S.saveAccountNow(acc);
  tab = "map"; render();
});

on("switch", async d => {
  if (camp) await S.saveCampaignNow(camp);
  const next = await S.loadCampaign(d.id);
  if (!next) { toast("That campaign is missing."); return; }
  camp = next; acc.activeCampaign = camp.id;
  await S.saveAccountNow(acc);
  render();
  toast(`Now carrying for ${camp.name}.`);
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

on("export", async () => {
  const bundle = { account: acc, campaign: camp, exported: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "errantry-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

on("wipe", async () => {
  if (!camp) return;
  if (!await confirmAsk(`Erase ${camp.name}? Your walked miles and conditioning are kept — only the character goes.`, "Erase")) return;
  await S.deleteCampaign(camp.id);
  acc.campaigns = acc.campaigns.filter(c => c.id !== camp.id);
  acc.activeCampaign = acc.campaigns[0]?.id || null;
  camp = acc.activeCampaign ? await S.loadCampaign(acc.activeCampaign) : null;
  await S.saveAccountNow(acc);
  render();
});

/* ── boot ─────────────────────────────────────────────────────── */
async function boot() {
  window.__storeName = store.backendName();
  acc = await S.loadAccount();
  if (acc.activeCampaign) camp = await S.loadCampaign(acc.activeCampaign);
  if (!camp && acc.campaigns.length) {
    camp = await S.loadCampaign(acc.campaigns[0].id);
    if (camp) acc.activeCampaign = camp.id;
  }
  bindDelegate($("#app"));

  /* keep the typed value when the numeric field is edited directly */
  $("#app").addEventListener("input", e => {
    if (e.target.id === "entryVal") draft.value = e.target.value.replace(/[^0-9.]/g, "");
  });

  render();

  if (!store.isDurable()) toast("Storage is blocked here — nothing will be kept between visits.", 5000);

  /* never lose an in-flight write */
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
