/* ════════════════════════════════════════════════════════════════
   screens.js — what you look at

   Each export returns an HTML string. State comes in as an argument;
   nothing here writes to it. Actions are marked with data-act and
   handled in main.js, so the flow of change is one-directional and
   easy to follow when this file gets long.
   ════════════════════════════════════════════════════════════════ */

import { esc, mi, gauge, emptyState, ICON } from "./ui.js";
import { CONDITIONING, bankCap, earnedPerks, nextPerk, recentDays } from "./state.js";
import { RIDE, roadsFrom, otherEnd, nodeById, remaining, fraction } from "./travel.js";

const r1 = v => Math.round(v * 10) / 10;

/* ══════════════════════════ BANK ══════════════════════════════ */
export function bankScreen(acc, camp, draft) {
  const cap = bankCap(acc.lifetimeMiles);
  const bank = camp ? camp.bank : 0;
  const frac = cap ? bank / cap : 0;
  const full = bank >= cap - 0.001;
  const near = bank >= cap * 0.87;
  const week = recentDays(acc, 7);
  const weekTotal = r1(week.reduce((s, d) => s + d.miles, 0));
  const np = nextPerk(acc.lifetimeMiles);

  return `
  <div class="screen">
    <div class="bankface">
      <span class="n ${bank < 1 ? "low" : ""}">${mi(bank)}</span>
      <span class="u">miles in the bank</span>
      ${gauge(frac, near)}
      <div style="font-size:11px;color:var(--ink-faint);margin-top:8px;font-family:var(--mono)">
        ${mi(bank)} / ${cap}${full ? " · full" : ""}
      </div>
    </div>

    ${!camp ? `<p class="note">No campaign is running, so miles you log will count toward conditioning but have nowhere to bank. Start one under Settings.</p>` : ""}
    ${full ? `<p class="note" style="color:var(--lead)">The bank is full. Keep walking — the miles still ratchet your conditioning — but spend some before they stop banking.</p>` : ""}

    <p class="eyebrow">Log what you walked</p>
    <div class="field">
      <input class="big" id="entryVal" inputmode="decimal" value="${esc(draft.value || "")}" placeholder="0">
      <div style="text-align:center;font-size:11px;color:var(--ink-faint);letter-spacing:.16em;text-transform:uppercase;margin-top:6px">
        ${draft.mode === "steps" ? `steps · ${acc.stepsPerMile} to the mile` : "miles"}
      </div>
    </div>
    <div class="numpad">
      ${[1,2,3,4,5,6,7,8,9].map(n => `<button data-act="pad" data-k="${n}">${n}</button>`).join("")}
      <button data-act="pad" data-k=".">·</button>
      <button data-act="pad" data-k="0">0</button>
      <button data-act="pad" data-k="del">←</button>
      <button data-act="mode" title="Switch between miles and steps">${draft.mode === "steps" ? "mi" : "steps"}</button>
    </div>
    <button class="btn primary" data-act="commit" ${draft.value ? "" : "disabled"}>
      Add to the book${draft.mode === "steps" && draft.value ? ` <span class="r">${mi(+draft.value / acc.stepsPerMile)} mi</span>` : ""}
    </button>

    <p class="eyebrow">This week</p>
    <div class="stat"><span class="k">Seven days</span><span class="v">${mi(weekTotal)} <small>mi</small></span></div>
    <div class="stat"><span class="k">Daily average</span><span class="v">${mi(weekTotal / 7)} <small>mi</small></span></div>
    <div class="stat"><span class="k">Walked all told</span><span class="v">${mi(acc.lifetimeMiles)} <small>mi</small></span></div>
    ${np ? `<div class="stat"><span class="k">Next conditioning</span><span class="v">${mi(np.mi - acc.lifetimeMiles)} <small>mi to ${esc(np.name)}</small></span></div>` : ""}

    <p class="eyebrow">Recent entries</p>
    ${acc.entries.length ? acc.entries.slice(0, 12).map(e => `
      <div class="entry">
        <span class="d">${esc(e.date.slice(5))}</span>
        <span class="m">${mi(e.miles)}</span>
        <span class="s">${e.banked < e.miles ? `${mi(e.banked)} banked, ${mi(e.miles - e.banked)} over` : "banked"}</span>
        <button class="x" data-act="undo" data-id="${esc(e.id)}" aria-label="Remove entry">×</button>
      </div>`).join("") : emptyState("Nothing logged yet.", "Put in today's miles and the road opens.")}
  </div>`;
}

/* ══════════════════════════ MAP / ROAD ════════════════════════ */
export function mapScreen(acc, camp) {
  if (!camp) return `<div class="screen">${emptyState("No campaign.", "Start one under Settings.")}</div>`;
  if (!camp.map || !camp.map.nodes || !camp.map.nodes.length) {
    return `<div class="screen">
      <h2 class="head">No survey loaded</h2>
      <p class="note">This campaign has no map yet. Export a survey from the plotting table and paste it in.</p>
      <div class="field"><label>Survey JSON</label><textarea id="mapPaste" spellcheck="false" placeholder="Paste the exported survey here"></textarea></div>
      <button class="btn primary" data-act="loadmap">Load the survey</button>
    </div>`;
  }
  return camp.journey ? roadView(camp) : townView(camp);
}

function townView(camp) {
  const map = camp.map;
  const here = nodeById(map, camp.at);
  if (!here) return `<div class="screen">${emptyState("Lost.", "This campaign's position isn't on the survey. Reload the map in Settings.")}</div>`;

  const out = roadsFrom(map, here.id).map(road => {
    const dest = nodeById(map, otherEnd(road, here.id));
    return { road, dest };
  }).sort((a, b) => a.road.miles - b.road.miles);

  const svcList = Object.entries(here.services || {}).filter(([, v]) => v)
    .map(([k]) => SERVICE_NAME[k] || k);

  return `
  <div class="screen">
    <div style="text-align:center;padding:6px 0 18px;border-bottom:1px solid var(--rule);margin-bottom:18px">
      <div style="font-family:var(--mono);font-size:13px;color:var(--lead);letter-spacing:.1em">${esc(here.stone ?? "—")}</div>
      <div style="font-family:var(--serif);font-size:26px;margin-top:2px">${esc(here.name || "Unnamed")}</div>
      <div style="font-size:11px;color:var(--ink-faint);letter-spacing:.08em;text-transform:uppercase;margin-top:6px">
        Day ${camp.day} · ${mi(camp.bank)} mi banked
      </div>
    </div>

    ${svcList.length ? `<div style="margin-bottom:20px">${svcList.map(s => `<span class="tag">${esc(s)}</span>`).join("")}</div>` : ""}

    <p class="eyebrow">Roads out</p>
    ${out.length ? out.map(({ road, dest }) => {
      const enough = camp.bank >= road.miles;
      return `<button class="btn" data-act="depart" data-road="${esc(road.id)}">
        ${esc(dest.name || "onward")}
        <span class="r">${mi(road.miles)} mi</span>
        <span class="sub">${esc(road.name || (road.density === "dense" ? "a hard road" : road.density === "quiet" ? "a quiet road" : "the road"))}${enough ? "" : ` — you're ${mi(road.miles - camp.bank)} short`}</span>
      </button>`;
    }).join("") : `<p class="note">No road leaves this place.</p>`}
  </div>`;
}

function roadView(camp) {
  const j = camp.journey, map = camp.map;
  const from = nodeById(map, j.fromId), to = nodeById(map, j.toId);
  const left = remaining(j);
  const pct = (fraction(j) * 100).toFixed(1);
  const canWalk = Math.min(camp.bank, left);
  const dry = camp.bank < 0.05;

  if (j.pending) {
    return `<div class="screen">
      <p class="eyebrow">On the road · mile ${mi(j.progress)}</p>
      <div class="card">
        <h3>Something on the road</h3>
        <p>The encounter layer isn't built yet — this is where the road interrupts you. For now you can note it and walk on.</p>
        <button class="btn primary" data-act="resolve">Deal with it and walk on</button>
      </div>
    </div>`;
  }

  return `
  <div class="screen">
    <div class="roadline">
      <div class="ends">
        <span>${esc(from ? from.name : "?")}</span>
        <span class="to">${esc(to ? to.name : "?")}</span>
      </div>
      <div class="track">
        <i style="width:${pct}%"></i>
        <div class="pin" style="left:${pct}%" data-mi="${mi(j.progress)}"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--ink-faint)">
        <span>${mi(j.progress)} walked</span>
        <span>${mi(left)} to go</span>
      </div>
    </div>

    ${j.ride !== "foot" ? `<p class="note"><span class="tag lead">${esc(RIDE[j.ride].label)}</span> ${mi(j.realMiles)} miles of road for ${mi(j.total)} of your own.</p>` : ""}

    ${dry ? `<div class="card">
        <h3>Camped where you stand</h3>
        <p>The bank is empty and there's ${mi(left)} miles of road left. Nothing here changes while you're away — go walk, and come back to it.</p>
      </div>` : ""}

    <p class="eyebrow">Press on</p>
    <button class="btn primary" data-act="walk" data-n="${canWalk}" ${dry ? "disabled" : ""}>
      Walk on <span class="r">${mi(canWalk)} mi</span>
      <span class="sub">Spends everything the bank will bear</span>
    </button>
    <div class="row">
      <button class="btn" data-act="walk" data-n="1" ${camp.bank < 1 ? "disabled" : ""} style="text-align:center">A mile</button>
      <button class="btn" data-act="walk" data-n="5" ${camp.bank < 1 ? "disabled" : ""} style="text-align:center">Five</button>
    </div>
    <button class="btn quiet" data-act="turnback">Turn back <span class="r">${mi(j.progress)} mi</span>
      <span class="sub">The way you came still has to be walked</span></button>
  </div>`;
}

const SERVICE_NAME = {
  inn: "Inn", stable: "Stables", coach: "Coach", board: "Board", office: "Errantry office",
  store: "Store", provision: "Provisioner", smith: "Smith", apothecary: "Apothecary",
  market: "Market", fence: "Fence", temple: "Temple", healer: "Healer",
  archive: "Archive", trainer: "Trainer", reeve: "Reeve"
};

/* ══════════════════════════ THE BOOK ══════════════════════════ */
export function bookScreen(acc, camp) {
  const earned = earnedPerks(acc.lifetimeMiles);
  return `
  <div class="screen">
    <p class="eyebrow">Conditioning</p>
    <p class="note">Every mile counts here, whether or not the bank had room for it. Nothing on this list is spendable.</p>
    ${CONDITIONING.map(c => {
      const got = acc.lifetimeMiles >= c.mi;
      return `<div class="perk ${got ? "" : "locked"}">
        <div class="t">${esc(c.name)}<span class="mi">${c.mi} mi${got ? "" : ` · ${mi(c.mi - acc.lifetimeMiles)} to go`}</span></div>
        <div class="n">${esc(c.note)}</div>
      </div>`;
    }).join("")}
    <div class="stat" style="margin-top:14px"><span class="k">Bank capacity earned</span><span class="v">${bankCap(acc.lifetimeMiles)} <small>mi</small></span></div>

    <p class="eyebrow">The road log</p>
    ${camp && camp.log.length ? camp.log.slice(0, 40).map(l => `
      <div class="entry"><span class="d">Day ${l.day}</span><span class="s" style="flex:1">${esc(l.text)}</span></div>
    `).join("") : emptyState("Nothing written yet.", "The log fills as you travel.")}
  </div>`;
}

/* ══════════════════════════ SETTINGS ══════════════════════════ */
export function settingsScreen(acc, camp) {
  const DEATH = {
    unbonded: ["Unbonded", "You carry your own risk. If you die, the campaign ends."],
    bonded: ["Bonded", "The Errantry recovers you. Walking back out to where you fell is your own obligation — half the miles the first time, then a quarter, then a tenth."],
    insured: ["Insured", "The guild eats the loss. Death costs coin instead of miles."]
  };
  return `
  <div class="screen">
    <p class="eyebrow">Campaign</p>
    ${camp ? `
      <div class="card">
        <h3>${esc(camp.name)}</h3>
        <p><span class="tag">${esc(DEATH[camp.deathMode][0])}</span> Day ${camp.day} · ${mi(camp.bank)} mi banked</p>
        <p style="font-size:13px">${esc(DEATH[camp.deathMode][1])}</p>
      </div>` : `<p class="note">No campaign is running.</p>`}
    ${acc.campaigns.length > 1 ? acc.campaigns.filter(c => c.id !== acc.activeCampaign).map(c => `
      <button class="btn" data-act="switch" data-id="${esc(c.id)}">Switch to ${esc(c.name)}
        <span class="sub">Miles you log go to whichever campaign is running</span></button>`).join("") : ""}
    <button class="btn" data-act="newcamp">Start a new campaign</button>

    <p class="eyebrow">The survey</p>
    ${camp && camp.map ? `<div class="stat"><span class="k">${esc(camp.map.title || "Loaded")}</span><span class="v">${camp.map.nodes.length} <small>places</small></span></div>
      <div class="stat"><span class="k">Road laid</span><span class="v">${mi((camp.map.roads || []).reduce((s, r) => s + r.miles, 0))} <small>mi</small></span></div>` : `<p class="note">No survey loaded.</p>`}
    <div class="field" style="margin-top:12px"><label>Paste a survey to load or replace</label><textarea id="mapPaste" spellcheck="false" placeholder="Exported JSON from the plotting table"></textarea></div>
    <button class="btn" data-act="loadmap">Load the survey</button>

    <p class="eyebrow">Your stride</p>
    <p class="note">Pedometers count steps, not miles. Your height sets how many steps make one.</p>
    <div class="row">
      <div class="field"><label>Height (inches)</label><input id="htIn" inputmode="numeric" value="${esc(acc.heightIn || "")}" placeholder="70"></div>
      <div class="field"><label>Steps per mile</label><input id="spm" inputmode="numeric" value="${acc.stepsPerMile}"></div>
    </div>
    <button class="btn" data-act="savestride">Save stride</button>

    <p class="eyebrow">Keeping it</p>
    <div class="stat"><span class="k">Storage</span><span class="v" style="font-size:12px">${esc(window.__storeName || "—")}</span></div>
    <button class="btn" data-act="export">Export everything</button>
    <button class="btn danger" data-act="wipe">Erase this campaign</button>
  </div>`;
}

export function tabs(cur) {
  const t = [["bank", "Bank", ICON.bank], ["map", "Road", ICON.map], ["book", "Book", ICON.book], ["set", "Settings", ICON.gear]];
  return `<nav class="tabs">${t.map(([id, label, ico]) =>
    `<button data-act="tab" data-t="${id}" class="${cur === id ? "on" : ""}">${ico}<span>${label}</span></button>`).join("")}</nav>`;
}
